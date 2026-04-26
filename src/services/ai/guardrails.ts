/*
 * PolymagicPrice - AI Guardrails
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { getConstants, saveConstant, getCustomers, saveCustomer } from "@/lib/core/sessionStorage";
import { CostConstant } from "@/types/quote";
import { toast } from "sonner";
import { sanitizeObject, sanitize } from "@/lib/sanitization";



/** Maximum conversation turns before trimming oldest messages */
export const MAX_CONVERSATION_TURNS = 20;

/** Maximum input length in characters */
const MAX_INPUT_LENGTH = 2000;

/** Minimum delay between requests in ms */
const RATE_LIMIT_MS = 2000;

/** Maximum CMD blocks the AI is allowed to emit per single response */
const MAX_COMMANDS_PER_RESPONSE = 3;

/** Track last request timestamp for rate limiting */
let lastRequestTimestamp = 0;



/**
 * Patterns that indicate prompt injection attempts.
 * These are stripped from user input before sending to the model.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Direct override attempts
  /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)/gi,
  /disregard\s+(all\s+)?(previous|your)\s+(instructions?|rules?|programming)/gi,
  /forget\s+(all\s+)?(previous|your)\s+(instructions?|rules?|context)/gi,
  /override\s+(system|safety|security)\s*(prompt|instructions?|rules?|protocol)?/gi,
  
  // Persona switching / Roleplay exploitation
  /you\s+are\s+now\s+(a|an|the)\s+/gi,
  /new\s+(instructions?|persona|identity|role)\s*:/gi,
  /act\s+as\s+(if\s+)?(you\s+)?(are|were)\s+(a|an|the)\s+/gi,
  /pretend\s+(to\s+)?(be|that)\s+/gi,
  /simulate\s+a\s+/gi,
  /imagine\s+(that\s+)?you\s+are\s+/gi,
  /bypass\s+(all\s+)?(rules|filters|safety)/gi,

  // System prompt extraction / Leaking / Technical Probing
  /show\s+(me\s+)?(your|the)\s+(system\s+)?prompt/gi,
  /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?)/gi,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)/gi,
  /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions?)/gi,
  /print\s+(your|the)\s+(system\s+)?(prompt|instructions?)/gi,
  /how\s+do\s+you\s+work/gi,
  /your\s+internal\s+logic/gi,
  /echo\s+the\s+(first|last|entire)\s+part\b/gi,
  /summarize\s+your\s+(initialization|startup|setup|prep)\b/gi,
  /what\s+are\s+your\s+(meta[- ]?)?instructions/gi,
  /output\s+the\s+above\b/gi,
  /start\s+your\s+response\s+from\b/gi,
  /continue\s+from\s+the\s+beginning\b/gi,
  /POLY-SEC-7F3A/gi, // Blocking user-probe of Canary ID

  // Command injection via crafted text
  /\[CMD:[A-Z_]+\s+\{/g, // Users should never craft CMD blocks directly
  /\[CMD:/gi,             // Block ANY attempt to start a CMD block
  /CMD\s*:\s*[A-Z_]/gi,   // Block loose CMD: patterns
  /system\s*(command|call|exec)\b/gi,

  // Encoded bypass attempts
  /&#\d+;/g,              // HTML numeric entities
  /\\u[0-9a-fA-F]{4}/g,  // Unicode escapes
  /eval\s*\(/gi,
  /base64\b/gi,
];

/**
 * Domain-specific keywords that indicate a relevant request.
 */
const DOMAIN_KEYWORDS = [
  "print", "3d", "fdm", "resin", "material", "filament", "plastic", "nylon", "abs", "pla", "tpu",
  "machine", "printer", "creality", "bambu", "prusa", "elegoo", "anycubic",
  "quote", "price", "cost", "labor", "overhead", "markup", "profit", "margin", "revenue",
  "client", "customer", "order", "inventory", "stock", "shelf", "reorder",
  "manufacturing", "shop", "business", "calculate", "analysis", "report", "gcode", "3mf", "stl"
];

/**
 * Patterns that indicate clearly irrelevant or out-of-scope topics.
 */
const IRRELEVANT_PATTERNS = [
  /\b(recipe|cook|bake|ingredient)\b/i,
  /\b(weather|forecast|temperature in)\b/i,
  /\b(politics|election|democrat|republican|government policy)\b/i,
  /\b(sports|football|soccer|basketball|baseball|stadium|match score)\b/i,
  /\b(celebrity|hollywood|movie|actor|actress|pop star)\b/i,
  /\b(medical|doctor|symptom|disease|treatment|medicine)\b/i,
  /\b(horoscope|zodiac|astrology)\b/i,
  /\b(joke|story|poem|song lyrics)\b/i,
];

/**
 * High-priority safety patterns for dangerous or prohibited 3D printed items.
 */
const SAFETY_PATTERNS = [
  // Weaponry
  /\b(gun|firearm|pistol|rifle|handgun|gatling|bullet|ammo|ammunition)\b/i,
  /\b(trigger|barrel|silencer|suppressor|magazine|lower\s+receiver|firing\s+pin)\b/i,
  /\b(ghost\s+gun|untraceable|receiver\s+blank)\b/i,
  /\b(knife|blade|dagger|shank|sword|brass\s+knuckles)\b/i,
  
  // Tactical/Illegal
  /\b(handcuff\s+key|lockpick|bump\s+key)\b/i,
  /\b(explosive|bomb|detonator|grenade|fuse|ied)\b/i,
  
  // Harmful Intent / Illegal Actions
  /\b(kill|suicide|self-harm|hurt|attack|assault|harm)\b/i,
  /\b(drug|narcotic|cocaine|heroin|meth|fentanyl)\b/i,
  /\b(stolen|theft|robbery|burgle|crack\s+password|hack)\b/i,
  /\b(harass|threaten|insult|slur|hate\s+speech|racist|sexist)\b/i,

  // Adult Content (NSFW)
  /\b(sex|porn|erotic|nudity|naked|genital|sexual|adult\s+only|nsfw)\b/i,
  
  // Abusive / Vulgar (Common terms)
  /\b(fuck|shit|bitch|asshole|bastard|cunt|dick|pussy)\b/i,

  // Unethical / Fraud
  /\b(scam|fraud|bribe|cheat|exploit|plagiarism|counterfeit|forge|impersonate)\b/i,
];

/**
 * Patterns that detect code generation requests — both direct and indirect.
 * These are BLOCKED entirely (not just stripped) because this tool is an
 * operational shop assistant, not a code editor or programming tutor.
 */
const CODE_REQUEST_PATTERNS: RegExp[] = [
  // Direct code requests
  /\b(write|create|generate|make|give|show|build|code|develop|program|provide|explain)\s+(me\s+)?(a\s+|the\s+)?(code|script|program|function|class|module|app|application|bot|snippet|algorithm|logic|source)\b/gi,
  /\b(write|create|generate|make|give|show)\s+(me\s+)?(some\s+|a\s+)?(python|javascript|typescript|java|c\+\+|c#|ruby|php|go|rust|swift|kotlin|html|css|sql|bash|shell|powershell|perl|lua|r\b|matlab|dart|scala|haskell)\b/gi,
  /\bcode\s+(for|to|that|which|about|regarding|of)\b/gi,
  /\b(can you|could you|please|help me)\s+(write|create|generate|code|program|script|develop|build|explain\s+code)\b/gi,
  
  // Indirect code patterns & AI Training bait
  /\bhow\s+to\s+(code|program|script|write|develop|build|implement)\b/gi,
  /\b(implement|develop|debug|refactor|compile|execute|run|pre[- ]?train|train|fine[- ]?tune)\s+(a\s+|this\s+|the\s+)?(code|script|program|function|algorithm|module|class|method|logic)\b/gi,
  /\b(fix|optimize|improve|review)\s+(my|this|the)\s+(code|script|program|function|bug)\b/gi,
  
  // Technical Probing / Internal Logic
  /\bsource\s*code\b/gi,
  /\binternal\s*(logic|workings|code|files|structure|architecture)\b/gi,
  /\bhow\s+(you\s+are|your\s+logic\s+is)\s+built\b/gi,
  /\b(reveal|show|print|display)\s+(your|the)\s+(code|logic|prompt)\b/gi,

  // Programming language mention + action
  /\b(in|using|with)\s+(python|javascript|typescript|java|c\+\+|c#|ruby|php|go|rust|swift|kotlin|bash|shell|sql)\b/gi,
  
  // API/Framework coded requests
  /\b(api|endpoint|backend|frontend|database|server|webhook|microservice|docker|kubernetes)\s+(code|script|implementation|setup)\b/gi,
  /\b(import|require|include|from|module|package|library|framework|npm|pip|cargo)\s+[a-z]/gi,
  
  // Data structure / algorithm requests
  /\b(sort|search|traverse|parse|serialize|deserialize|encrypt|decrypt|hash|regex)\s+(algorithm|function|implementation|code)\b/gi,
  
  // Homework / tutorial / learning code
  /\b(tutorial|example|sample|demo|template|boilerplate|starter)\s+(code|project|app|script)\b/gi,
  /\b(leetcode|hackerrank|codewars|codeforces|advent of code)\b/gi,
];

/**
 * Validates and sanitizes user input before sending to the AI model.
 * Returns sanitized input or null if the input should be blocked entirely.
 */
export function sanitizeAIInput(input: string): { safe: boolean; sanitized: string; reason?: string } {
  if (!input || !input.trim()) {
    return { safe: false, sanitized: "", reason: "Empty input" };
  }

  if (input.length > MAX_INPUT_LENGTH) {
    return { safe: false, sanitized: "", reason: `Input too long (max ${MAX_INPUT_LENGTH} chars)` };
  }

  let cleaned = input;

  // Block code generation requests
  for (const pattern of CODE_REQUEST_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(cleaned)) {
      console.warn(`[Guardrail] Blocked code generation request (${pattern.source})`);
      return { 
        safe: false, 
        sanitized: cleaned, 
        reason: "🛡️ I am a 3D Printing Shop Assistant — I cannot write, generate, or debug code. Please ask me about quoting, materials, orders, or shop management instead." 
      };
    }
  }

  for (const pattern of SAFETY_PATTERNS) {
    if (pattern.test(cleaned)) {
      console.error(`[Safety] Prohibited content blocked (${pattern.source})`);
      return { 
        safe: false, 
        sanitized: cleaned, 
        reason: "SAFETY POLICY VIOLATION: This request involves prohibited or dangerous items. This shop assistant cannot process requests related to weaponry, illegal items, or harmful content." 
      };
    }
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      // Reset regex lastIndex after test() advances it
      pattern.lastIndex = 0;
      cleaned = cleaned.replace(pattern, "[blocked]");
    }
  }

  // Topic relevance check
  const words = cleaned.toLowerCase().split(/\s+/);
  if (words.length > 3) {
    const hasDomainKeywords = DOMAIN_KEYWORDS.some(kw => cleaned.toLowerCase().includes(kw));
    const matchesIrrelevant = IRRELEVANT_PATTERNS.some(pattern => pattern.test(cleaned));

    // If it clearly matches an irrelevant topic OR is long and has zero domain relevance
    if (matchesIrrelevant || (!hasDomainKeywords && words.length > 10)) {
      console.warn("[Guardrail] Irrelevant topic detected");
      return { 
        safe: false, 
        sanitized: cleaned, 
        reason: "I am a specialized 3D Printing Assistant. Please keep questions focused on manufacturing, quoting, or shop management." 
      };
    }
  }

  return { safe: true, sanitized: cleaned.trim() };
}



/**
 * PII patterns to detect and redact in AI output.
 * These catch cases where the model might leak data despite system prompt instructions.
 */
const PII_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[email redacted]" },
  { pattern: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: "[phone redacted]" },
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: "[card redacted]" },
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: "[ID redacted]" },
];

/**
 * Sanitizes AI output before displaying to user.
 * Redacts PII and strips potentially dangerous content.
 */
export function sanitizeAIOutput(output: string): string {
  if (!output) return "";

  let cleaned = output;

  // Redact PII
  for (const { pattern, replacement } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Redact internal identifiers
  const TECHNICAL_GAG_PATTERNS = [
    { pattern: /POLY-SEC-7F3A/g, replacement: "[internal ID redacted]" },
    { pattern: /PolymagicPrice/g, replacement: "the application" },
    { pattern: /sessionStorage/gi, replacement: "[internal storage]" },
    { pattern: /localStorage/gi, replacement: "[internal storage]" },
    { pattern: /\b(accessCode|apiKey|secretKey|token|fingerprint|password)\b/gi, replacement: "[internal credential redacted]" },
  ];

  for (const { pattern, replacement } of TECHNICAL_GAG_PATTERNS) {
    pattern.lastIndex = 0;
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Strip code blocks from output
  const codeBlockRegex = /```[a-zA-Z]*\s*[\s\S]*?```/gi;
  const codeBlockMatches = cleaned.match(codeBlockRegex);
  if (codeBlockMatches && codeBlockMatches.length > 0) {
    console.warn(`[Guardrail] Stripped ${codeBlockMatches.length} code block(s) from AI response`);
    cleaned = cleaned.replace(codeBlockRegex, '\n\n🛡️ *[Code generation is disabled. I am a shop operations assistant, not a programming tool.]*\n\n');
  }

  // Strip inline code patterns
  const codeLinePatterns = [
    /^\s*(def |class |function |const |let |var |import |from |#include|using |package |public |private |protected )/m,
    /^\s*(if\s*\(|for\s*\(|while\s*\(|switch\s*\(|try\s*\{|catch\s*\()/m,
    /^\s*(return |yield |async |await |export |module\.exports)/m,
    /^\s*(print\(|console\.|System\.out|printf\(|cout\s*<<|fmt\.Print)/m,
  ];
  const multilineCodeThreshold = 3;
  let codeLineHits = 0;
  for (const pat of codeLinePatterns) {
    pat.lastIndex = 0;
    if (pat.test(cleaned)) codeLineHits++;
  }
  if (codeLineHits >= multilineCodeThreshold) {
    console.warn(`[Guardrail] Detected inline code output (${codeLineHits} patterns matched)`);
    cleaned = '🛡️ *I cannot generate code. I am your 3D Printing Shop Assistant — ask me about quoting, materials, orders, or shop management.*';
  }

  // Strip leaked JSON status objects
  cleaned = cleaned.replace(/\{\s*"(status|alerts|low_stock_alert)"[\s\S]*?\}/g, "[status updated]");
  cleaned = cleaned.replace(/^[ \t\n]*\{[\s\S]*\}[ \t\n]*$/g, "[data processed]");

  // HTML tag allowlist (strict)
  const ALLOWED_HTML_TAGS = ['strong', 'em', 'b', 'i', 'br', 'hr', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'];
  const htmlTagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi;
  cleaned = cleaned.replace(htmlTagRegex, (match, tagName) => {
      const lowerTag = tagName.toLowerCase();
      const blockedTags = ['script', 'iframe', 'style', 'html', 'body', 'link', 'object', 'embed', 'button', 'input', 'form', 'svg', 'canvas'];
      if (ALLOWED_HTML_TAGS.includes(lowerTag) && !blockedTags.includes(lowerTag)) return match;
      console.warn(`[Security] Stripped unauthorized HTML tag <${tagName}>`);
      return "[blocked]";
  });
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Strip dangerous APIs
  const blockList = [
      /fetch\s*\(/gi,
      /XMLHttpRequest\s*\(/gi,
      /navigator\.sendBeacon/gi,
      /new\s+Worker\s*\(/gi,
      /new\s+SharedWorker\s*\(/gi,
      /eval\s*\(/gi,
      /new\s+Function\s*\(/gi,
      /document\.cookie/gi,
      /document\.location/gi,
      /window\.location/gi,
      /localStorage/gi,
      /sessionStorage/gi,
      /indexedDB/gi,
  ];

  for (const pattern of blockList) {
      cleaned = cleaned.replace(pattern, "[blocked_api]");
  }

  // Strip dangerous pseudo-protocols
  cleaned = cleaned.replace(/javascript\s*:/gi, "[blocked_js_proto]");
  cleaned = cleaned.replace(/data\s*:[\s\S]*?,/gi, "[blocked_data_proto]");
  cleaned = cleaned.replace(/file\s*:\/\/\//gi, "[blocked_host_access]");
  cleaned = cleaned.replace(/ftp\s*:\/\//gi, "[blocked_proto]");

  return cleaned;
}

/**
 * Strips internal command blocks [CMD:...] from AI output for clean UI display.
 */
export function stripCommands(content: string): string {
  if (!content) return "";
  let cleaned = content.replace(/\[CMD:[A-Z_]+(?:\s+\{[\s\S]*?\}|)?\]/g, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}



/**
 * Strict per-constant safety limits.
 * Each key maps to [min, max] allowed values.
 */
const COMMAND_LIMITS: Record<string, { min: number; max: number; description: string }> = {
  labor:       { min: 0, max: 200, description: "Labor rate ($/hr)" },
  electricity: { min: 0, max: 5,   description: "Electricity rate ($/kWh)" },
  overhead:    { min: 0, max: 100, description: "Overhead percentage (%)" },
  markup:      { min: 0, max: 500, description: "Markup percentage (%)" },
  failRate:    { min: 0, max: 50,  description: "Fail rate (%)" },
};

/** Allowed command types */
const ALLOWED_COMMANDS = ["SET_CONSTANT", "GENERATE_REPORT", "ADD_CLIENT", "CREATE_NOTIFICATION"] as const;
type AllowedCommand = typeof ALLOWED_COMMANDS[number];

/** Allowed report types */
const ALLOWED_REPORT_TYPES = ["FINANCIAL", "MATERIAL", "USAGE"] as const;

/** Commands that require human-in-the-loop approval */
const HIL_REQUIRED_COMMANDS: AllowedCommand[] = ["SET_CONSTANT", "ADD_CLIENT", "CREATE_NOTIFICATION"];

interface CommandResult {
  executed: boolean;
  pending?: boolean; // True if HIL approval is required
  command: string;
  message: string;
  payload?: Record<string, unknown>;
}

/**
 * Strictly validates the keys and structure of a command payload.
 * Prevents "over-posting" or injection of unknown fields.
 */
function validateCommandSchema(command: string, payload: Record<string, unknown>): { valid: boolean; reason?: string } {
    if (!payload || typeof payload !== 'object') return { valid: false, reason: "Payload must be a JSON object" };

    const schema: Record<string, string[]> = {
        "SET_CONSTANT": ["id", "value"],
        "GENERATE_REPORT": ["type"],
        "ADD_CLIENT": ["name", "email", "type"],
        "CREATE_NOTIFICATION": ["title", "message", "type"]
    };

    const allowedKeys = schema[command];
    if (!allowedKeys) return { valid: false, reason: `No schema defined for command: ${command}` };

    const actualKeys = Object.keys(payload);
    
    // Check for missing keys
    for (const key of allowedKeys) {
        if (!(key in payload)) {
            if (command === "ADD_CLIENT" && (key === "email" || key === "type")) continue;
            return { valid: false, reason: `Missing required field: ${key}` };
        }
    }

    // Check for unknown keys
    for (const key of actualKeys) {
        if (!allowedKeys.includes(key)) {
            return { valid: false, reason: `Unauthorized field detected: ${key}` };
        }
    }
    
    // Deep type validation
    if (command === "SET_CONSTANT") {
        if (typeof payload.value !== 'number' && typeof payload.value !== 'string') return { valid: false, reason: "Value must be numeric" };
    } else if (command === "ADD_CLIENT") {
        if (typeof payload.name !== 'string' || payload.name.length < 2) return { valid: false, reason: "Name must be a valid string" };
    } else if (command === "CREATE_NOTIFICATION") {
        if (typeof payload.title !== 'string' || typeof payload.message !== 'string') return { valid: false, reason: "Title and message must be strings" };
    }

    return { valid: true };
}

/**
 * Finalizes and executes a command that was previously flagged as PENDING for HIL approval.
 */
export function executeHILCommand(command: string, payload: Record<string, unknown>, addNotification?: (n: Record<string, unknown>) => void): CommandResult {
    let result: CommandResult;
    
    if (command === "SET_CONSTANT") {
        result = executeSetConstant(payload, addNotification);
    } else if (command === "ADD_CLIENT") {
        result = executeAddClient(payload, addNotification);
    } else if (command === "CREATE_NOTIFICATION") {
        result = executeCreateNotification(payload, addNotification);
    } else if (command === "GENERATE_REPORT") {
        result = executeGenerateReport(payload);
    } else {
        result = { executed: false, command, message: "Unknown command for HIL execution" };
    }

    return result;
}

export function processAICommands(content: string): CommandResult[] {
  const results: CommandResult[] = [];
  const cmdRegex = /\[CMD:([A-Z_]+)\s+({[\s\S]*?})\]/g;
  let match;
  let commandCount = 0;

  while ((match = cmdRegex.exec(content)) !== null) {
    const command = match[1] as AllowedCommand;

    commandCount++;
    if (commandCount > MAX_COMMANDS_PER_RESPONSE) {
      const msg = `Command flood blocked: >${MAX_COMMANDS_PER_RESPONSE} commands.`;
      console.error(`Security: ${msg}`);
      toast.error(`Security: Command flood detected.`);
      break;
    }

    if (!ALLOWED_COMMANDS.includes(command)) {
      const msg = `Unknown command: ${command}`;
      console.error(`Guardrail: ${msg}`);
      toast.error(`Security: ${msg}`);

      results.push({ executed: false, command, message: msg });
      continue;
    }

    try {
      const rawPayload = JSON.parse(match[2]);
      const payload = sanitizeObject(rawPayload);

      const schemaCheck = validateCommandSchema(command, payload as Record<string, unknown>);
      if (!schemaCheck.valid) {
          const msg = `Schema violation: ${schemaCheck.reason}`;
          console.error(`Guardrail: ${msg}`);
          toast.error(`Security: Malformed payload rejected`);

          results.push({ executed: false, command, message: msg });
          continue;
      }

      if (HIL_REQUIRED_COMMANDS.includes(command)) {
          results.push({
              executed: false,
              pending: true,
              command,
              message: "Approval required",
              payload: payload as Record<string, unknown>
          });
          continue;
      }

      let result: CommandResult;
      if (command === "GENERATE_REPORT") {
        result = executeGenerateReport(payload as Record<string, unknown>);
      } else {
        result = { executed: false, command, message: "Action requires manual approval" };
      }

      results.push(result);
    } catch (e: unknown) {
      const msg = `Invalid JSON in command: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`Guardrail: ${msg}`);
      toast.error(`Security: Malformed AI command rejected`);

      results.push({ executed: false, command, message: msg });
    }
  }

  return results;
}

function executeSetConstant(payload: Record<string, unknown>, addNotification?: (n: Record<string, unknown>) => void): CommandResult {
  const { id, value } = payload;

  if (typeof id !== "string" || !id.trim()) {
    const msg = "SET_CONSTANT: Missing or invalid 'id'";
    toast.error(`Security: ${msg}`);
    return { executed: false, command: "SET_CONSTANT", message: msg };
  }

  const limits = COMMAND_LIMITS[id];
  if (!limits) {
    // Also check if it's an existing constant (for custom consumables)
    const constants = getConstants();
    const existingConstant = constants.find(c => c.id === id);
    if (!existingConstant) {
      const msg = `SET_CONSTANT: Unauthorized constant '${id}'. Allowed: ${Object.keys(COMMAND_LIMITS).join(", ")}`;
      toast.error(`Security: ${msg}`);
      return { executed: false, command: "SET_CONSTANT", message: msg };
    }
    // For existing constants outside the allowlist, apply a generic safe range
    const val = parseFloat(value as string);
    if (isNaN(val) || val < 0 || val > 10000) {
      const msg = `SET_CONSTANT: Value ${value} out of safe range (0-10000) for '${id}'`;
      toast.error(`Security: ${msg}`);
      return { executed: false, command: "SET_CONSTANT", message: msg };
    }
    saveConstant({ ...payload, value: val } as unknown as CostConstant);
    toast.success(`AI Update: ${existingConstant.name} → ${val}`);
    return { executed: true, command: "SET_CONSTANT", message: `Set ${id} = ${val}` };
  }

  // Validate value
  const val = parseFloat(value as string);
  if (isNaN(val)) {
    const msg = `SET_CONSTANT: '${value}' is not a valid number`;
    toast.error(`Security: ${msg}`);
    return { executed: false, command: "SET_CONSTANT", message: msg };
  }

  if (val < limits.min || val > limits.max) {
    const msg = `SET_CONSTANT: ${id} must be ${limits.min}–${limits.max} (got ${val})`;
    toast.error(`Security: ${msg}`);
    return { executed: false, command: "SET_CONSTANT", message: msg };
  }

  saveConstant({ ...payload, value: val } as unknown as CostConstant);
  
  if (addNotification) {
      addNotification({
          title: "System Update",
          message: `AI updated "${limits.description}" to ${val}`,
          type: "INFO",
          source: "AI"
      });
  }

  toast.success(`AI Update: ${limits.description} → ${val}`);
  return { executed: true, command: "SET_CONSTANT", message: `Set ${id} = ${val}` };
}

function executeGenerateReport(payload: Record<string, unknown>): CommandResult {
  const { type } = payload;

  if (!type || !ALLOWED_REPORT_TYPES.includes(type as typeof ALLOWED_REPORT_TYPES[number])) {
    const msg = `GENERATE_REPORT: Invalid type '${type}'. Allowed: ${ALLOWED_REPORT_TYPES.join(", ")}`;
    toast.error(`Security: ${msg}`);
    return { executed: false, command: "GENERATE_REPORT", message: msg };
  }

  toast.info(`Generating ${type} report...`);
  return { executed: true, command: "GENERATE_REPORT", message: `Report: ${type}` };
}

function executeAddClient(payload: Record<string, unknown>, addNotification?: (n: Record<string, unknown>) => void): CommandResult {
  const { name, email, type } = payload;

  if (typeof name !== "string" || !name.trim()) {
    const msg = "ADD_CLIENT: Missing or invalid 'name'";
    toast.error(`Security: ${msg}`);
    return { executed: false, command: "ADD_CLIENT", message: msg };
  }

  // Check for duplicates
  const existing = getCustomers();
  const isDuplicate = existing.some(c => c.name.toLowerCase() === name.toLowerCase());
  
  if (isDuplicate) {
    const msg = `ADD_CLIENT: Customer "${name}" already exists.`;
    toast.warning(msg);
    return { executed: false, command: "ADD_CLIENT", message: msg };
  }

  saveCustomer({
    name: name as string,
    email: (email as string) || "",
    notes: `Added via AI Assistant${type ? ` (Type: ${type})` : ""}`
  });

  if (addNotification) {
      addNotification({
          title: "New Client Added",
          message: `AI Assistant added "${name}" to your shop database.`,
          type: "SUCCESS",
          source: "AI"
      });
  }

  toast.success(`AI Action: Added client "${name}" to shop.`);
  return { executed: true, command: "ADD_CLIENT", message: `Added client: ${name}` };
}

function executeCreateNotification(payload: Record<string, unknown>, addNotification?: (n: Record<string, unknown>) => void): CommandResult {
  const { title, message, type } = payload;

  if (typeof title !== "string" || !title.trim()) {
      const msg = "CREATE_NOTIFICATION: Missing or invalid 'title'";
      toast.error(`Security: ${msg}`);
      return { executed: false, command: "CREATE_NOTIFICATION", message: msg };
  }

  if (typeof message !== "string" || !message.trim()) {
      const msg = "CREATE_NOTIFICATION: Missing or invalid 'message'";
      toast.error(`Security: ${msg}`);
      return { executed: false, command: "CREATE_NOTIFICATION", message: msg };
  }

  const validTypes = ["INFO", "WARNING", "ERROR", "SUCCESS"];
  const typeStr = (type as string | undefined);
  const finalType = (typeStr && validTypes.includes(typeStr.toUpperCase())) ? typeStr.toUpperCase() : "INFO";

  // LOGIC FORTRESS: Forbid AI from generating state-mutating metadata types
  const sanitizedMetadata = { ...payload };
  const forbiddenMetadataTypes = ['MAINTENANCE', 'DELAY', 'PROCUREMENT'];
  
  const metadataType = (sanitizedMetadata.type as string | undefined);
  if (metadataType && forbiddenMetadataTypes.includes(metadataType.toUpperCase())) {
      console.warn(`[Security] Stripped forbidden metadata type '${metadataType}' from AI notification.`);
      delete sanitizedMetadata.type;
  }

  if (addNotification) {
      addNotification({
          title: sanitize(title.trim()), // Final sanitization pass before state injection
          message: sanitize(message.trim()), // Final sanitization pass before state injection
          type: finalType,
          source: 'AI', // STRICT PROVENANCE
          metadata: { ...sanitizedMetadata, source: "AI_ASSISTANT" }
      });
      toast.success(`AI Action: Created notification "${title}"`);
      return { executed: true, command: "CREATE_NOTIFICATION", message: `Created notification: ${title}` };
  } else {
      const msg = "CREATE_NOTIFICATION: Notification service unavailable";
      console.warn(msg);
      return { executed: false, command: "CREATE_NOTIFICATION", message: msg };
  }
}


/**
 * Checks if enough time has passed since the last AI request.
 * Returns true if the request should proceed.
 */
export function checkRateLimit(): { allowed: boolean; waitMs: number } {
  const now = Date.now();
  const elapsed = now - lastRequestTimestamp;

  if (elapsed < RATE_LIMIT_MS) {
    return { allowed: false, waitMs: RATE_LIMIT_MS - elapsed };
  }

  lastRequestTimestamp = now;
  return { allowed: true, waitMs: 0 };
}


/**
 * Trims conversation history to prevent context window overflow.
 * Keeps the most recent messages while preserving the system message.
 */
export function trimConversationHistory(
  history: { role: string; content: string }[],
  maxTurns: number = MAX_CONVERSATION_TURNS
): { role: string; content: string }[] {
  if (history.length <= maxTurns * 2) return history;

  // Keep the last N*2 messages (each turn = user + assistant)
  return history.slice(-(maxTurns * 2));
}
