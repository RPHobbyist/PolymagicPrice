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

/*
 * SECURITY POSTURE
 * ----------------
 * This module protects a chat with a LOCAL model that has READ-ONLY access to
 * shop data and can only act through the approved [CMD:...] blocks validated in
 * ./commands.ts. It deliberately does NOT try to police the model's prose:
 *
 *  - Rendering safety belongs to the renderer. AIChatDialog renders with
 *    react-markdown `skipHtml`, an element blocklist and a `urlTransform` that
 *    only allows http/https/mailto/tel — that is what stops HTML, javascript:
 *    and data: URLs. Rewriting words like "fetch(" or "localStorage" in prose
 *    protected nothing and mangled real answers.
 *  - Keyword blocklists for "code" and "unsafe topics" were removed: they
 *    rejected ordinary shop questions ("print a knife handle", "trigger a
 *    reprint", "a package from last month") while a determined user could
 *    rephrase around them in seconds. Topic and code-generation limits are
 *    stated in the system prompt, where the model can apply judgement.
 *
 * What remains here is what actually works: prompt-injection neutralisation,
 * a narrow intent-based refusal for weapon/explosive manufacturing, PII
 * redaction, and stream-safe display cleanup.
 *
 * INVARIANT for output cleanup: money, quantities, dates, IDs, percentages and
 * gram/ml figures are never rewritten. Every numeric redaction goes through
 * `replaceWithDigitGuard`, and `renderSafeText` is monotonic — running it on a
 * prefix yields a prefix of running it on the whole string — so a streamed
 * answer never restructures when it completes.
 *
 * INVARIANT for composing the two: always redact BEFORE stripping command
 * blocks (`renderSafeText(redactSensitive(text, opts).text)`), never the
 * reverse. Stripping a [CMD:...] block splices whatever sat on either side
 * of it together; if that runs first, a phone/card number immediately
 * adjacent to a command block can end up glued to unrelated digits, making
 * the redactor's digit-guard treat it as "inside a longer number" and skip
 * it — a real, if brief, PII leak. `finalizeAIOutput` gets this right; any
 * other call site building a display string from raw model output must
 * match its order.
 */

import { findCommandBlocks } from "./commandBlocks";

/** Maximum conversation turns before trimming oldest messages */
export const MAX_CONVERSATION_TURNS = 20;

/** Maximum input length in characters */
export const MAX_INPUT_LENGTH = 2000;

/** Minimum delay between requests in ms */
const RATE_LIMIT_MS = 2000;

/** Track last request timestamp for rate limiting */
let lastRequestTimestamp = 0;

// ---------------------------------------------------------------------------
// Input: prompt-injection neutralisation
// ---------------------------------------------------------------------------

/**
 * Phrases that try to reprogram the assistant. These are STRIPPED from the
 * message (never a reason to reject it) so a question that merely quotes one
 * still gets answered.
 */
const INJECTION_PATTERNS: RegExp[] = [
    // Direct override attempts
    /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)/gi,
    /disregard\s+(all\s+)?(previous|your)\s+(instructions?|rules?|programming)/gi,
    /forget\s+(all\s+)?(previous|your)\s+(instructions?|rules?|context)/gi,
    /override\s+(system|safety|security)\s*(prompt|instructions?|rules?|protocol)?/gi,

    // Persona switching
    /you\s+are\s+now\s+(a|an|the)\s+/gi,
    /new\s+(instructions?|persona|identity|role)\s*:/gi,
    /bypass\s+(all\s+)?(rules|filters|safety)/gi,

    // System prompt extraction
    /(show|reveal|repeat|print|output)\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions?)/gi,
    /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)/gi,

    // Command forgery: only the model may emit these, and commands.ts parses
    // assistant text, so a user-authored block must never survive into history.
    /\[CMD:/gi,
    /CMD\s*:\s*[A-Z_]{3,}/g,
];

// ---------------------------------------------------------------------------
// Input: narrow, intent-based safety refusal
// ---------------------------------------------------------------------------

/** Unambiguous requests, refused regardless of surrounding intent. */
const ALWAYS_REFUSE: RegExp[] = [
    /ghost\s+gun/i,
    /auto\s*-?\s*sear/i,
    /untraceable\s+(gun|firearm|weapon|receiver)/i,
    /lower\s+receiver/i,
    /pipe\s+bomb/i,
    /explosive\s+device/i,
    /how\s+to\s+(make|build)\s+(a\s+)?(bomb|explosive)/i,
];

/**
 * Weapon/ordnance nouns. On their own these mean nothing — a print shop
 * legitimately discusses knife handles, barrel planters and magazine racks —
 * so a refusal also requires manufacturing intent nearby.
 */
const WEAPON_OBJECTS: RegExp[] = [
    /\bfirearms?\b/i,
    /\bhand\s?guns?\b/i,
    /\bpistols?\b/i,
    /\brifles?\b/i,
    /\bshotguns?\b/i,
    /\brevolvers?\b/i,
    /\bguns?\b/i,
    /\bfiring\s+pin\b/i,
    /\bammunition\b/i,
    /\bbullets?\b/i,
    /\bgrenades?\b/i,
    /\bdetonators?\b/i,
    /\bbombs?\b/i,
];

/**
 * "Silencer"/"suppressor" are excluded from WEAPON_OBJECTS above: unlike
 * "firearm" or "pistol", they have a common, benign meaning in a print shop
 * (fan/noise-reduction enclosures — "a silencer box to quiet my cooling
 * fan"), so manufacturing intent alone isn't enough signal. These only
 * refuse when a firearm-context term is ALSO nearby.
 */
const AMBIGUOUS_WEAPON_OBJECTS: RegExp[] = [
    /\bsilencers?\b/i,
    /\bsuppressors?\b/i,
];

const FIREARM_CONTEXT = /\b(guns?|firearms?|pistols?|handguns?|rifles?|shotguns?|revolvers?|ammo|ammunition|caliber|barrel|muzzle|ar-?15|ak-?47|glock|9\s?mm)\b/i;

/**
 * Everyday shop phrases that contain a weapon noun. Neutralised before the
 * weapon scan so "glue gun" and "toy gun" never look like ordnance.
 */
const BENIGN_COMPOUNDS: RegExp[] = [
    /\b(glue|hot\s*glue|heat|nail|spray|staple|grease|caulk|water|toy|nerf|paint|solder(ing)?|air)\s+guns?\b/gi,
    /\bgun\s*-?\s*metal\b/gi,
    /\bgun\s+(mount|holder|rack|stand|case|grip\s+jig)\b/gi,
    // Accessory hardware for an existing, legally-owned firearm (scope
    // mounts, slings, cases) is a routine maker project, distinct from
    // printing the firearm or a regulated part of it.
    /\b(rifle|pistol|handgun)\s+(scope(\s+mount)?|sling|bipod|case|rack|stand|holder|grip)\b/gi,
];

/** Manufacturing / commercial intent that turns a weapon noun into a request. */
const MAKE_INTENT = /\b(3d[-\s]?print(ing|ed|s)?|print(ing|ed|s)?|make|making|manufactur\w*|fabricat\w*|produc\w*|build(ing)?|design(ing)?|model(ling|ing)?|stl|sell(ing)?|quote)\b/i;

/** How close (in characters) the intent verb must be to the weapon noun. */
const INTENT_WINDOW = 80;

export type InputVerdict =
    | { action: 'allow'; text: string }
    | { action: 'refuse'; text: string; reason: string; rule: string };

const REFUSAL_WEAPON =
    "I can't help with designing or producing weapons, ammunition or explosives. Ask me about quoting, materials, machines, orders or shop management instead.";

/**
 * Pure classifier — exported so the guardrail corpus can be tested without React.
 */
export function classifyInput(input: string): InputVerdict {
    if (!input || !input.trim()) {
        return { action: 'refuse', text: "", reason: "Empty input", rule: 'empty' };
    }

    if (input.length > MAX_INPUT_LENGTH) {
        return {
            action: 'refuse',
            text: "",
            reason: `Input too long (max ${MAX_INPUT_LENGTH} characters)`,
            rule: 'length',
        };
    }

    for (const pattern of ALWAYS_REFUSE) {
        if (pattern.test(input)) {
            return { action: 'refuse', text: input, reason: REFUSAL_WEAPON, rule: `always:${pattern.source}` };
        }
    }

    // Blank out benign compounds so their weapon noun can't be matched below.
    let scan = input;
    for (const compound of BENIGN_COMPOUNDS) {
        compound.lastIndex = 0;
        scan = scan.replace(compound, m => " ".repeat(m.length));
    }

    for (const objectPattern of WEAPON_OBJECTS) {
        const match = objectPattern.exec(scan);
        if (!match) continue;

        const start = Math.max(0, match.index - INTENT_WINDOW);
        const end = Math.min(scan.length, match.index + match[0].length + INTENT_WINDOW);
        if (MAKE_INTENT.test(scan.slice(start, end))) {
            return {
                action: 'refuse',
                text: input,
                reason: REFUSAL_WEAPON,
                rule: `intent:${objectPattern.source}`,
            };
        }
    }

    for (const objectPattern of AMBIGUOUS_WEAPON_OBJECTS) {
        const match = objectPattern.exec(scan);
        if (!match) continue;

        const start = Math.max(0, match.index - INTENT_WINDOW);
        const end = Math.min(scan.length, match.index + match[0].length + INTENT_WINDOW);
        const window = scan.slice(start, end);
        // Requires make-intent AND a firearm-context term nearby — "print a
        // silencer" alone is exactly as likely to mean a fan enclosure.
        if (MAKE_INTENT.test(window) && FIREARM_CONTEXT.test(window)) {
            return {
                action: 'refuse',
                text: input,
                reason: REFUSAL_WEAPON,
                rule: `intent+context:${objectPattern.source}`,
            };
        }
    }

    // Neutralise injection phrasing, but let the question through.
    let cleaned = input;
    for (const pattern of INJECTION_PATTERNS) {
        pattern.lastIndex = 0;
        cleaned = cleaned.replace(pattern, "[removed]");
    }

    return { action: 'allow', text: cleaned.trim() };
}

/**
 * Validates and sanitizes user input before sending to the AI model.
 * Thin wrapper over `classifyInput` kept for call-site compatibility.
 */
export function sanitizeAIInput(input: string): { safe: boolean; sanitized: string; reason?: string } {
    const verdict = classifyInput(input);
    if (verdict.action === 'refuse') {
        console.warn(`[Guardrail] Refused input (${verdict.rule})`);
        return { safe: false, sanitized: verdict.text, reason: verdict.reason };
    }
    return { safe: true, sanitized: verdict.text };
}

// ---------------------------------------------------------------------------
// Output: display cleanup and PII redaction
// ---------------------------------------------------------------------------

/**
 * Cleans a streamed partial for display. Monotonic and idempotent: safe to call
 * on every chunk, and the finished message never restructures.
 */
export function renderSafeText(partial: string): string {
    if (!partial) return "";

    // Balanced-brace scan, not a regex — see commandBlocks.ts for why: a
    // non-greedy `\{[\s\S]*?\}` cuts a payload short (and leaks its raw JSON
    // tail into the chat) if a string value inside it ever contains `}]`.
    let cleaned = partial;
    const blocks = findCommandBlocks(partial);
    for (let i = blocks.length - 1; i >= 0; i--) {
        cleaned = cleaned.slice(0, blocks[i].start) + cleaned.slice(blocks[i].end);
    }

    // Hide a command block that is still arriving, so raw JSON never flashes.
    // Only when it's genuinely incomplete (no "]" anywhere after it yet) — a
    // block that finished but didn't parse (findCommandBlocks skipped it) is
    // left visible rather than swallowing every real word that follows it.
    const openIndex = cleaned.lastIndexOf("[CMD:");
    if (openIndex !== -1 && !cleaned.slice(openIndex).includes("]")) {
        cleaned = cleaned.slice(0, openIndex);
    } else {
        // ...and hide a marker that is only half-typed ("[", "[C", "[CMD"),
        // which is what keeps this function monotonic across stream chunks.
        const lastBracket = cleaned.lastIndexOf("[");
        if (lastBracket !== -1 && "[CMD:".startsWith(cleaned.slice(lastBracket))) {
            cleaned = cleaned.slice(0, lastBracket);
        }
    }

    return cleaned.replace(/\n{3,}/g, "\n\n").replace(/^\s+/, "");
}

/**
 * Numeric redaction that refuses to touch anything sitting inside a larger
 * number — this is what keeps "1234567.89", "$12,345.67" and "#1234" intact.
 */
function replaceWithDigitGuard(text: string, pattern: RegExp, replacement: string): { text: string; hits: number } {
    let hits = 0;
    pattern.lastIndex = 0;
    const out = text.replace(pattern, (match, ...args) => {
        const offset = args[args.length - 2] as number;
        const source = args[args.length - 1] as string;
        const before = offset > 0 ? source[offset - 1] : "";
        const after = source.slice(offset + match.length, offset + match.length + 2);

        // Sitting inside a longer number or hyphenated reference: not contact detail.
        if (/[\d.,$€£₹¥-]/.test(before)) return match;
        if (/^\d/.test(after)) return match;
        // A separator only counts as "inside a number" when a digit follows it,
        // so a sentence-ending period doesn't shield a real phone number.
        if (/^[.,-]\d/.test(after)) return match;

        hits++;
        return replacement;
    });
    return { text: out, hits };
}

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** Requires separators or parentheses — a bare run of digits is a quantity, not a phone. */
const PHONE_PATTERN = /(?:\+\d{1,3}[-.\s]\d[\d\-.\s]{6,}\d|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)/g;

const CARD_PATTERN = /\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/g;

export interface RedactionResult {
    text: string;
    findings: string[];
}

/**
 * Redacts contact details that the model may have echoed out of shop data.
 * Idempotent, so it can run on every streamed partial as well as on the final
 * message without the text shifting when the stream ends.
 */
export function redactSensitive(text: string, opts: { redactPII: boolean }): RedactionResult {
    if (!text) return { text: "", findings: [] };
    if (!opts.redactPII) return { text, findings: [] };

    const findings: string[] = [];
    let cleaned = text;

    const emailHits = (cleaned.match(EMAIL_PATTERN) || []).length;
    if (emailHits > 0) {
        cleaned = cleaned.replace(EMAIL_PATTERN, "[email redacted]");
        findings.push(`${emailHits} email address(es)`);
    }

    const card = replaceWithDigitGuard(cleaned, CARD_PATTERN, "[card redacted]");
    cleaned = card.text;
    if (card.hits > 0) findings.push(`${card.hits} card number(s)`);

    const phone = replaceWithDigitGuard(cleaned, PHONE_PATTERN, "[phone redacted]");
    cleaned = phone.text;
    if (phone.hits > 0) findings.push(`${phone.hits} phone number(s)`);

    return { text: cleaned, findings };
}

/**
 * Final pass once a response is complete: display text plus a note of what was
 * redacted (recorded in the AI audit trail).
 */
export function finalizeAIOutput(full: string, opts: { redactPII: boolean }): { display: string; findings: string[] } {
    const redacted = redactSensitive(full, opts);
    return { display: renderSafeText(redacted.text), findings: redacted.findings };
}

// ---------------------------------------------------------------------------
// Pacing
// ---------------------------------------------------------------------------

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
 * The system message is rebuilt per request and is not part of this history.
 */
export function trimConversationHistory<T extends { role: string; content: string }>(
    history: T[],
    maxTurns: number = MAX_CONVERSATION_TURNS
): T[] {
    if (history.length <= maxTurns * 2) return history;

    // Keep the last N*2 messages (each turn = user + assistant)
    return history.slice(-(maxTurns * 2));
}
