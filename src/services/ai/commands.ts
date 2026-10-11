/*
 * PolymagicPrice - AI Command Layer
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
 * The ONLY way the assistant can change anything. Every command is parsed from
 * the model's text, schema-checked, range-checked, and then held for explicit
 * user approval before it runs. Nothing here executes on parse.
 */

import { appendAIAudit, getConstants, saveConstant, getCustomers, saveCustomer } from "@/lib/core/sessionStorage";
import { CostConstant } from "@/types/quote";
import { toast } from "sonner";
import { sanitizeObject, sanitize } from "@/lib/sanitization";
import { generateShopReport, ShopReportType } from "@/lib/reportGenerator";
import { findCommandBlocks } from "./commandBlocks";
import { RATE_STORAGE_KEY } from "@/lib/currencyFormat";

/** Maximum CMD blocks the AI is allowed to emit per single response */
export const MAX_COMMANDS_PER_RESPONSE = 3;

/**
 * Strict per-constant safety limits.
 * Each key maps to [min, max] allowed values.
 */
const COMMAND_LIMITS: Record<string, { min: number; max: number; description: string }> = {
    labor: { min: 0, max: 200, description: "Labor rate (per hour)" },
    electricity: { min: 0, max: 5, description: "Electricity rate (per kWh)" },
    overhead: { min: 0, max: 100, description: "Overhead percentage (%)" },
    markup: { min: 0, max: 500, description: "Markup percentage (%)" },
    failRate: { min: 0, max: 50, description: "Fail rate (%)" },
    wastePercent: { min: 0, max: 50, description: "Material waste (%)" },
    minimumCharge: { min: 0, max: 100000, description: "Minimum job charge" },
    // The ceiling is above the dirtiest national grid on record, and 0 is allowed only because a
    // shop running entirely on its own generation can legitimately claim it.
    grid_intensity: { min: 0, max: 1200, description: "Grid emission factor (gCO2e/kWh)" },
};

/** Allowed command types */
export const ALLOWED_COMMANDS = ["SET_CONSTANT", "GENERATE_REPORT", "ADD_CLIENT", "CREATE_NOTIFICATION"] as const;
export type AllowedCommand = typeof ALLOWED_COMMANDS[number];

/** Allowed report types */
const ALLOWED_REPORT_TYPES: ShopReportType[] = ["FINANCIAL", "MATERIAL", "USAGE", "CARBON"];

export interface CommandResult {
    executed: boolean;
    /** True if the command is valid but waiting for the user's approval. */
    pending?: boolean;
    command: string;
    message: string;
    payload?: Record<string, unknown>;
}

export type AddNotification = (notification: Record<string, unknown>) => void;

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
 * Parses command blocks out of an assistant message.
 * Nothing is executed here — valid commands come back as `pending` for approval.
 */
export function processAICommands(content: string): CommandResult[] {
    const results: CommandResult[] = [];
    // Balanced-brace scan, not a regex — see commandBlocks.ts. A block whose
    // payload has no arguments at all is still reported as malformed, not
    // silently dropped: findCommandBlocks only skips genuinely incomplete
    // blocks (still streaming), never ones with an empty payload.
    const blocks = findCommandBlocks(content);
    let commandCount = 0;

    for (const block of blocks) {
        const command = block.command as AllowedCommand;
        const rawPayload = block.payloadRaw;

        commandCount++;
        if (commandCount > MAX_COMMANDS_PER_RESPONSE) {
            const msg = `Command flood blocked: more than ${MAX_COMMANDS_PER_RESPONSE} commands in one response.`;
            console.error(`Security: ${msg}`);
            toast.error("Security: Command flood detected.");
            appendAIAudit({ event: 'BLOCKED', command, detail: msg });
            break;
        }

        if (!ALLOWED_COMMANDS.includes(command)) {
            const msg = `Unknown command: ${command}`;
            console.error(`Guardrail: ${msg}`);
            toast.error(`Security: ${msg}`);
            appendAIAudit({ event: 'BLOCKED', command, detail: msg });
            results.push({ executed: false, command, message: msg });
            continue;
        }

        if (!rawPayload) {
            const msg = `${command} was emitted without a JSON payload and cannot be executed.`;
            console.warn(`Guardrail: ${msg}`);
            appendAIAudit({ event: 'BLOCKED', command, detail: msg });
            results.push({ executed: false, command, message: msg });
            continue;
        }

        try {
            const payload = sanitizeObject(JSON.parse(rawPayload)) as Record<string, unknown>;

            const schemaCheck = validateCommandSchema(command, payload);
            if (!schemaCheck.valid) {
                const msg = `Schema violation: ${schemaCheck.reason}`;
                console.error(`Guardrail: ${msg}`);
                toast.error("Security: Malformed payload rejected");
                appendAIAudit({ event: 'BLOCKED', command, detail: msg });
                results.push({ executed: false, command, message: msg });
                continue;
            }

            appendAIAudit({ event: 'PROPOSED', command, detail: JSON.stringify(payload) });
            results.push({
                executed: false,
                pending: true,
                command,
                message: "Approval required",
                payload,
            });
        } catch (e: unknown) {
            const msg = `Invalid JSON in command: ${e instanceof Error ? e.message : String(e)}`;
            console.error(`Guardrail: ${msg}`);
            toast.error("Security: Malformed AI command rejected");
            appendAIAudit({ event: 'BLOCKED', command, detail: msg });
            results.push({ executed: false, command, message: msg });
        }
    }

    return results;
}

/**
 * Runs a command the user has approved.
 */
export function executeHILCommand(
    command: string,
    payload: Record<string, unknown>,
    addNotification?: AddNotification
): CommandResult {
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
        result = { executed: false, command, message: "Unknown command for approval" };
    }

    appendAIAudit({
        event: result.executed ? 'EXECUTED' : 'REJECTED',
        command,
        detail: result.message,
    });

    return result;
}

/** Records a user's explicit rejection of a proposed command. */
export function recordCommandRejection(command: string): void {
    appendAIAudit({ event: 'REJECTED', command, detail: 'Rejected by user' });
}

/** Constants whose value is an amount of money; the rest are percentages or emission factors. */
const MONEY_CONSTANTS = ["labor", "electricity", "minimumCharge"];

/**
 * The assistant and the user speak in the display currency, but constants are stored in the base
 * currency and multiplied by the conversion rate for display. Without this, "set labor to 15"
 * under a rate of 2 would show back as 30.
 */
export function displayToBaseMoney(id: string, value: number, conversionRate: number): number {
    if (!MONEY_CONSTANTS.includes(id)) return value;
    const rate = Number.isFinite(conversionRate) && conversionRate > 0 ? conversionRate : 1;
    return Math.round((value / rate) * 1e6) / 1e6;
}

function storedConversionRate(): number {
    try {
        return parseFloat(localStorage.getItem(RATE_STORAGE_KEY) ?? "") || 1;
    } catch {
        return 1;
    }
}

function executeSetConstant(payload: Record<string, unknown>, addNotification?: AddNotification): CommandResult {
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
        const msg = `SET_CONSTANT: ${id} must be ${limits.min}-${limits.max} (got ${val})`;
        toast.error(`Security: ${msg}`);
        return { executed: false, command: "SET_CONSTANT", message: msg };
    }

    saveConstant({ ...payload, value: displayToBaseMoney(id, val, storedConversionRate()) } as unknown as CostConstant);

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
    const reportType = typeof type === "string" ? (type.toUpperCase() as ShopReportType) : undefined;

    if (!reportType || !ALLOWED_REPORT_TYPES.includes(reportType)) {
        const msg = `GENERATE_REPORT: Invalid type '${type}'. Allowed: ${ALLOWED_REPORT_TYPES.join(", ")}`;
        toast.error(`Security: ${msg}`);
        return { executed: false, command: "GENERATE_REPORT", message: msg };
    }

    const outcome = generateShopReport(reportType);
    if (!outcome.opened) {
        toast.error(outcome.message);
        return { executed: false, command: "GENERATE_REPORT", message: outcome.message };
    }

    toast.success(`Opened ${reportType.toLowerCase()} report`);
    return { executed: true, command: "GENERATE_REPORT", message: outcome.message };
}

function executeAddClient(payload: Record<string, unknown>, addNotification?: AddNotification): CommandResult {
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

function executeCreateNotification(payload: Record<string, unknown>, addNotification?: AddNotification): CommandResult {
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

    // The AI must not mint the metadata types the deterministic analyzer owns,
    // or its notifications would collide with the ones IntelligenceProvider
    // de-duplicates against.
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
            message: sanitize(message.trim()),
            type: finalType,
            source: 'AI', // STRICT PROVENANCE
            metadata: { ...sanitizedMetadata, source: "AI_ASSISTANT" }
        });
        toast.success(`AI Action: Created notification "${title}"`);
        return { executed: true, command: "CREATE_NOTIFICATION", message: `Created notification: ${title}` };
    }

    const msg = "CREATE_NOTIFICATION: Notification service unavailable";
    console.warn(msg);
    return { executed: false, command: "CREATE_NOTIFICATION", message: msg };
}
