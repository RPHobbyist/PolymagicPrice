/*
 * PolymagicPrice
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



import { QuoteData, QuoteRevision, Material, Machine, CostConstant, Customer, CustomerReview, MaterialSpool, CompanySettings, QuoteStatus, Employee, StoredGcode, AISettings, AIAuditEntry, AIChatMessageRecord, BridgeSettings, QuoteCarbon, CarbonSettings } from "@/types/quote";
import { calculateJobCarbon, toStoredCarbon } from "@/lib/carbon/carbonCalculator";
import { GRID_CONSTANT_ID } from "@/lib/carbon/carbonFactors";
import { ProductionJob, ProductionSettings } from "@/types/production";
import { sanitize, sanitizeObject, sanitizeAPIKey, isPortForbidden, isValidLocalAIPort } from "../sanitization";
import { wrapSecret, unwrapSecret } from "../security";
import { Notification, NotificationStatus } from "@/types/notifications";
import { isAIAllowed } from "../utils";

export const generateId = (): string => {
    try {
        return crypto.randomUUID();
    } catch {
        // Fallback for older browsers or non-secure contexts
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
};

/**
 * Safely parse JSON from localStorage with a fallback.
 * Prevents app crashes from corrupted/malformed localStorage data.
 */
function safeParse<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (err: unknown) {
        console.warn(`[Storage] Corrupted data in "${key}", using defaults.`, err);
        return fallback;
    }
}

/** Announced whenever a write is refused, so the UI can tell the shop what happened. */
export const STORAGE_FAILED_EVENT = "session_storage_failed";

export interface StorageFailure {
    /** Which collection could not be written. */
    key: string;
    /** True when the browser refused for lack of room rather than for some other reason. */
    full: boolean;
    /** Something a shop owner can act on, not the browser's wording. */
    message: string;
}

/** A write that was refused. Carries a message worth showing, unlike the browser's own. */
export class StorageWriteError extends Error {
    readonly failure: StorageFailure;
    constructor(failure: StorageFailure) {
        super(failure.message);
        this.name = "StorageWriteError";
        this.failure = failure;
    }
}

/**
 * Every browser spells a full quota differently: DOMException code 22, code 1014 on Firefox, and
 * name variants on Safari. A refusal with something already stored is the reliable signal.
 */
const isQuotaError = (err: unknown): boolean => {
    if (!(err instanceof Error)) return false;
    const name = err.name;
    const code = (err as DOMException).code;
    return (
        name === "QuotaExceededError" ||
        name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        code === 22 ||
        code === 1014
    );
};

/**
 * The single place this module writes to storage.
 *
 * Reads have gone through `safeParse` for a long time; writes went straight to
 * `localStorage.setItem` in sixty-one places with nothing around them. That mattered most on the
 * one path that writes from a React effect — the kanban board persists on every job change — where
 * a throw is caught by the root error boundary and replaces the whole application with the crash
 * screen. Reloading re-ran the same effect against the same oversized data and crashed again, so a
 * full quota locked a shop out of its own app permanently.
 *
 * Quotes and production jobs both carry base64 thumbnails inside the same ~5 MB origin quota, so
 * running out of room is an ordinary Tuesday for a busy shop, not an exotic failure.
 *
 * Throws `StorageWriteError` so the call sites that already show a toast keep working and say
 * something useful, and announces the failure on the window so the app can react even when a
 * caller swallows the error. Use `tryWriteStore` where a failure must not propagate.
 */
function writeStore(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (err: unknown) {
        const full = isQuotaError(err);
        const failure: StorageFailure = {
            key,
            full,
            message: full
                ? "Your browser storage is full, so this change was not saved. Export a backup from Database Manager, then remove old quotes or completed jobs to free up room."
                : "This change could not be saved to browser storage. If you are browsing privately or have site data blocked, the app cannot keep your data on this device.",
        };

        console.error(`[Storage] Write to "${key}" was refused.`, err);
        try {
            window.dispatchEvent(new CustomEvent<StorageFailure>(STORAGE_FAILED_EVENT, { detail: failure }));
        } catch {
            // No window (tests, SSR): the throw below is the whole report.
        }

        throw new StorageWriteError(failure);
    }
}

/**
 * A write whose failure must never reach React — the effect-driven persistence paths.
 * Returns false when the write was refused; the failure has already been announced.
 */
function tryWriteStore(key: string, value: string): boolean {
    try {
        writeStore(key, value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Whether this browser will let the app keep data at all.
 *
 * Reading `localStorage` throws outright where site data is blocked, in some private-browsing
 * modes and under certain enterprise policies. `initializeDefaults` runs before React mounts, so
 * such a throw used to leave the user staring at a blank page with nothing rendered and nothing
 * logged. Everything this app does is local-first, so it is worth saying plainly that it cannot
 * work here rather than appearing to be broken.
 */
export const isStorageAvailable = (): boolean => {
    try {
        const probe = "__polymagic_probe__";
        localStorage.setItem(probe, "1");
        localStorage.removeItem(probe);
        return true;
    } catch {
        return false;
    }
};

const defaultMaterials: Material[] = [
    { id: "fdm-pla", name: "PLA", cost_per_unit: 25, unit: "kg", print_type: "FDM" },
    { id: "fdm-pla-plus", name: "PLA+", cost_per_unit: 28, unit: "kg", print_type: "FDM" },
    { id: "fdm-pla-silk", name: "PLA Silk", cost_per_unit: 32, unit: "kg", print_type: "FDM" },
    { id: "fdm-abs", name: "ABS", cost_per_unit: 28, unit: "kg", print_type: "FDM" },
    { id: "fdm-asa", name: "ASA", cost_per_unit: 35, unit: "kg", print_type: "FDM" },
    { id: "fdm-petg", name: "PETG", cost_per_unit: 30, unit: "kg", print_type: "FDM" },
    { id: "fdm-petg-cf", name: "PETG-CF", cost_per_unit: 55, unit: "kg", print_type: "FDM" },
    { id: "fdm-tpu", name: "TPU", cost_per_unit: 45, unit: "kg", print_type: "FDM" },
    { id: "fdm-nylon", name: "Nylon", cost_per_unit: 50, unit: "kg", print_type: "FDM" },
    { id: "fdm-pc", name: "Polycarbonate (PC)", cost_per_unit: 55, unit: "kg", print_type: "FDM" },
    { id: "fdm-pla-cf", name: "PLA-CF", cost_per_unit: 50, unit: "kg", print_type: "FDM" },
    { id: "resin-standard", name: "Standard Resin", cost_per_unit: 35, unit: "liter", print_type: "Resin" },
    { id: "resin-water-washable", name: "Water Washable Resin", cost_per_unit: 45, unit: "liter", print_type: "Resin" },
    { id: "resin-abs-like", name: "ABS-Like Resin", cost_per_unit: 50, unit: "liter", print_type: "Resin" },
    { id: "resin-tough", name: "Tough Resin", cost_per_unit: 55, unit: "liter", print_type: "Resin" },
    { id: "resin-flexible", name: "Flexible Resin", cost_per_unit: 60, unit: "liter", print_type: "Resin" },
    { id: "resin-8k", name: "8K High-Detail Resin", cost_per_unit: 50, unit: "liter", print_type: "Resin" },
    { id: "resin-castable", name: "Castable Resin", cost_per_unit: 80, unit: "liter", print_type: "Resin" },
    { id: "resin-clear", name: "Clear/Transparent Resin", cost_per_unit: 55, unit: "liter", print_type: "Resin" },
];

const defaultMachines: Machine[] = [
    { id: "fdm-ender3", name: "Ender 3", hourly_cost: 2, power_consumption_watts: 350, print_type: "FDM", buildVolume: "220 x 220 x 250 mm" },
    { id: "fdm-ender3-v2", name: "Ender 3 V2", hourly_cost: 2.5, power_consumption_watts: 350, print_type: "FDM", buildVolume: "220 x 220 x 250 mm" },
    { id: "fdm-ender3-v3", name: "Ender 3 V3", hourly_cost: 3, power_consumption_watts: 300, print_type: "FDM", buildVolume: "220 x 220 x 250 mm" },
    { id: "fdm-creality-k1", name: "Creality K1", hourly_cost: 6, power_consumption_watts: 350, print_type: "FDM", buildVolume: "220 x 220 x 250 mm" },
    { id: "fdm-creality-k1-max", name: "Creality K1 Max", hourly_cost: 8, power_consumption_watts: 500, print_type: "FDM", buildVolume: "300 x 300 x 300 mm" },
    { id: "fdm-prusa-mk3", name: "Prusa i3 MK3S+", hourly_cost: 5, power_consumption_watts: 120, print_type: "FDM", buildVolume: "250 x 210 x 210 mm", isOffline: true },
    { id: "fdm-prusa-mk4", name: "Prusa MK4", hourly_cost: 6, power_consumption_watts: 150, print_type: "FDM", buildVolume: "250 x 210 x 210 mm", isOffline: true },
    { id: "fdm-bambu-a1-mini", name: "Bambu Lab A1 Mini", hourly_cost: 5, power_consumption_watts: 150, print_type: "FDM", buildVolume: "180 x 180 x 180 mm", isOffline: true },
    { id: "fdm-bambu-a1", name: "Bambu Lab A1", hourly_cost: 6, power_consumption_watts: 200, print_type: "FDM", buildVolume: "256 x 256 x 256 mm", isOffline: true },
    { id: "fdm-bambu-p1s", name: "Bambu Lab P1S", hourly_cost: 8, power_consumption_watts: 350, print_type: "FDM", buildVolume: "256 x 256 x 256 mm", isOffline: true },
    { id: "fdm-bambu-x1c", name: "Bambu Lab X1 Carbon", hourly_cost: 10, power_consumption_watts: 400, print_type: "FDM", buildVolume: "256 x 256 x 256 mm", isOffline: true },
    { id: "fdm-voron-24", name: "Voron 2.4", hourly_cost: 7, power_consumption_watts: 400, print_type: "FDM", buildVolume: "350 x 350 x 350 mm", isOffline: true },
    { id: "fdm-artillery-x3", name: "Artillery Sidewinder X3", hourly_cost: 4, power_consumption_watts: 450, print_type: "FDM", buildVolume: "240 x 240 x 260 mm", isOffline: true },
    { id: "fdm-qidi-x-max3", name: "QIDI X-Max 3", hourly_cost: 7, power_consumption_watts: 500, print_type: "FDM", buildVolume: "325 x 325 x 315 mm", isOffline: true },
    { id: "resin-elegoo-mars3", name: "Elegoo Mars 3", hourly_cost: 3, power_consumption_watts: 45, print_type: "Resin", buildVolume: "143 x 90 x 175 mm", isOffline: true },
    { id: "resin-elegoo-mars4", name: "Elegoo Mars 4 Ultra", hourly_cost: 4, power_consumption_watts: 48, print_type: "Resin", buildVolume: "153 x 77 x 165 mm", isOffline: true },
    { id: "resin-elegoo-saturn3", name: "Elegoo Saturn 3", hourly_cost: 5, power_consumption_watts: 60, print_type: "Resin", buildVolume: "218 x 122 x 250 mm", isOffline: true },
    { id: "resin-elegoo-saturn4", name: "Elegoo Saturn 4 Ultra", hourly_cost: 6, power_consumption_watts: 65, print_type: "Resin", buildVolume: "219 x 123 x 220 mm", isOffline: true },
    { id: "resin-anycubic", name: "Anycubic Photon Mono", hourly_cost: 4, power_consumption_watts: 50, print_type: "Resin", buildVolume: "130 x 80 x 165 mm", isOffline: true },
    { id: "resin-anycubic-m5s", name: "Anycubic Photon Mono M5s", hourly_cost: 5, power_consumption_watts: 55, print_type: "Resin", buildVolume: "218 x 123 x 200 mm", isOffline: true },
    { id: "resin-halot-mage", name: "Creality Halot Mage", hourly_cost: 4, power_consumption_watts: 50, print_type: "Resin", buildVolume: "228 x 128 x 250 mm" },
    { id: "resin-halot-ray", name: "Creality Halot Ray", hourly_cost: 3, power_consumption_watts: 45, print_type: "Resin", buildVolume: "198 x 123 x 210 mm" },
    { id: "resin-phrozen-mini8k", name: "Phrozen Sonic Mini 8K", hourly_cost: 5, power_consumption_watts: 50, print_type: "Resin", buildVolume: "165 x 72 x 180 mm" },
    { id: "resin-phrozen-mega8k", name: "Phrozen Sonic Mega 8K", hourly_cost: 7, power_consumption_watts: 80, print_type: "Resin", buildVolume: "330 x 185 x 400 mm" },
    { id: "fdm-bambu-p2s", name: "Bambu Lab P2S", hourly_cost: 9, power_consumption_watts: 350, print_type: "FDM", buildVolume: "256 x 256 x 256 mm" },
    { id: "fdm-bambu-h2s", name: "Bambu Lab H2S (Large)", hourly_cost: 12, power_consumption_watts: 500, print_type: "FDM", buildVolume: "350 x 350 x 350 mm" },
    { id: "fdm-prusa-core-one", name: "Prusa CORE One L", hourly_cost: 11, power_consumption_watts: 450, print_type: "FDM", buildVolume: "300 x 300 x 330 mm" },
    { id: "fdm-prusa-mk4s", name: "Prusa MK4S", hourly_cost: 6, power_consumption_watts: 150, print_type: "FDM", buildVolume: "250 x 210 x 210 mm" },
    { id: "fdm-prusa-xl-5", name: "Prusa XL (5-Tool)", hourly_cost: 15, power_consumption_watts: 600, print_type: "FDM", buildVolume: "360 x 360 x 360 mm" },
    { id: "fdm-creality-k2-plus", name: "Creality K2 Plus", hourly_cost: 10, power_consumption_watts: 600, print_type: "FDM", buildVolume: "350 x 350 x 350 mm" },
    { id: "fdm-creality-e3-v3", name: "Creality Ender 3 V3 (CoreXZ)", hourly_cost: 4, power_consumption_watts: 350, print_type: "FDM", buildVolume: "220 x 220 x 250 mm" },
    { id: "fdm-anycubic-kobra3", name: "Anycubic Kobra 3", hourly_cost: 5, power_consumption_watts: 400, print_type: "FDM", buildVolume: "250 x 250 x 260 mm" },
    { id: "fdm-anycubic-kobra3-max", name: "Anycubic Kobra 3 Max", hourly_cost: 8, power_consumption_watts: 600, print_type: "FDM", buildVolume: "420 x 420 x 500 mm" },
    { id: "resin-anycubic-m7-pro", name: "Anycubic Photon Mono M7 Pro", hourly_cost: 6, power_consumption_watts: 120, print_type: "Resin", buildVolume: "223 x 126 x 230 mm" },
    { id: "fdm-bambu-x2d", name: "Bambu Lab X2D", hourly_cost: 11, power_consumption_watts: 450, print_type: "FDM", buildVolume: "256 x 256 x 260 mm" },
    { id: "fdm-bambu-h2d", name: "Bambu Lab H2D", hourly_cost: 15, power_consumption_watts: 600, print_type: "FDM", buildVolume: "350 x 350 x 350 mm" },
    { id: "fdm-anycubic-kobra4", name: "Anycubic Kobra 4", hourly_cost: 5, power_consumption_watts: 400, print_type: "FDM", buildVolume: "250 x 250 x 260 mm" },
    { id: "fdm-anycubic-kobra4-max", name: "Anycubic Kobra 4 Max", hourly_cost: 9, power_consumption_watts: 650, print_type: "FDM", buildVolume: "420 x 420 x 450 mm" },
    { id: "fdm-prusa-core-one-plus", name: "Prusa CORE One+", hourly_cost: 13, power_consumption_watts: 500, print_type: "FDM", buildVolume: "250 x 220 x 270 mm" },
    { id: "fdm-qidi-plus4", name: "QIDI Tech Plus 4", hourly_cost: 8, power_consumption_watts: 450, print_type: "FDM", buildVolume: "305 x 305 x 280 mm" },
    { id: "resin-elegoo-saturn4-16k", name: "Elegoo Saturn 4 Ultra 16K", hourly_cost: 7, power_consumption_watts: 75, print_type: "Resin", buildVolume: "219 x 123 x 220 mm" },
];

/**
 * Constants the app owns. They are forced hidden on read, which also keeps them out of the
 * calculator's consumable picker — important for the grid factor, because a visible constant is
 * selectable as a consumable and would be ADDED TO THE PRICE of a quote.
 */
export const SYSTEM_CONSTANT_IDS = ["electricity", "labor", "overhead", "markup", "grid_intensity"];

const defaultConstants: CostConstant[] = [
    { id: "electricity", name: "Electricity Rate", value: 0.12, unit: "/kWh", is_visible: false, description: "Cost per kilowatt-hour" },
    // The unit must not begin with "/" — the constants table prefixes the currency symbol to any
    // unit that does, which would render this as "₹/kWh".
    { id: "grid_intensity", name: "Grid Emission Factor", value: 473, unit: "gCO2e/kWh", is_visible: false, description: "Carbon intensity of your grid electricity. Defaults to the world average until you pick your region." },
    { id: "labor", name: "Labor Rate", value: 15, unit: "/hr", is_visible: false, description: "Hourly labor cost" },
    { id: "overhead", name: "Overhead Rate", value: 10, unit: "%", is_visible: false, description: "Overhead percentage" },
    { id: "markup", name: "Default Markup", value: 30, unit: "%", is_visible: false, description: "Default profit margin" },
    { id: "paint-acrylic-standard", name: "Acrylic Paint (Standard)", value: 0.10, unit: "/ml", is_visible: true, description: "Standard hobby painting. Usage Rate: 0.02ml/cm2" },
    { id: "paint-spray-primer", name: "Spray Primer", value: 0.08, unit: "/ml", is_visible: true, description: "Base coat primer. Usage Rate: 0.03ml/cm2" },
    { id: "paint-clear-coat", name: "Clear Coat Varnish", value: 0.12, unit: "/ml", is_visible: true, description: "Protective finish. Usage Rate: 0.02ml/cm2" },
    { id: "paint-enamel", name: "Enamel Paint", value: 0.15, unit: "/ml", is_visible: true, description: "Durable detail work. Usage Rate: 0.02ml/cm2" },
];

const STORAGE_KEYS = {
    QUOTES: "session_quotes",
    MATERIALS: "session_materials",
    MACHINES: "session_machines",
    CONSTANTS: "session_constants",
    CUSTOMERS: "session_customers",
    REVIEWS: "session_reviews",
    SPOOLS: "session_spools",
    COMPANY: "session_company",
    EMPLOYEES: "session_employees",
    GCODES: "session_gcodes",
    AI_SETTINGS: "session_ai_settings",
    NOTIFICATIONS: "session_notifications",
    AI_AUDIT: "session_ai_audit",
    AI_CHAT: "session_ai_chat",
    INITIALIZED: "session_initialized",
    BRIDGE_SETTINGS: "session_bridge_settings",
    PRODUCTION_JOBS: "session_production_jobs",
    PRODUCTION_SETTINGS: "session_production_settings",
    CARBON_SETTINGS: "session_carbon_settings",
};



const encryptQuote = (q: QuoteData): QuoteData => ({
    ...q,
    projectName: wrapSecret(q.projectName),
    clientName: q.clientName ? wrapSecret(q.clientName) : q.clientName,
    notes: q.notes ? wrapSecret(q.notes) : q.notes
});

const decryptQuote = (q: QuoteData): QuoteData => ({
    ...q,
    projectName: unwrapSecret(q.projectName),
    clientName: q.clientName ? unwrapSecret(q.clientName) : q.clientName,
    notes: q.notes ? unwrapSecret(q.notes) : q.notes,
    revisions: q.revisions?.map(r => ({
        ...r,
        notes: r.notes ? unwrapSecret(r.notes) : r.notes
    }))
});

const encryptCustomer = (c: Customer): Customer => ({
    ...c,
    name: wrapSecret(c.name),
    email: c.email ? wrapSecret(c.email) : c.email,
    phone: c.phone ? wrapSecret(c.phone) : c.phone,
    address: c.address ? wrapSecret(c.address) : c.address,
    notes: c.notes ? wrapSecret(c.notes) : c.notes
});

const decryptCustomer = (c: Customer): Customer => ({
    ...c,
    name: unwrapSecret(c.name),
    email: c.email ? unwrapSecret(c.email) : c.email,
    phone: c.phone ? unwrapSecret(c.phone) : c.phone,
    address: c.address ? unwrapSecret(c.address) : c.address,
    notes: c.notes ? unwrapSecret(c.notes) : c.notes
});

const encryptEmployee = (e: Employee): Employee => ({
    ...e,
    name: wrapSecret(e.name),
    email: e.email ? wrapSecret(e.email) : e.email,
    phone: e.phone ? wrapSecret(e.phone) : e.phone
});

const decryptEmployee = (e: Employee): Employee => ({
    ...e,
    name: unwrapSecret(e.name),
    email: e.email ? unwrapSecret(e.email) : e.email,
    phone: e.phone ? unwrapSecret(e.phone) : e.phone
});

const encryptCompanySettings = (s: CompanySettings): CompanySettings => ({
    ...s,
    name: wrapSecret(s.name),
    address: wrapSecret(s.address),
    email: wrapSecret(s.email),
    phone: wrapSecret(s.phone),
    website: wrapSecret(s.website),
    taxId: s.taxId ? wrapSecret(s.taxId) : s.taxId
});

const decryptCompanySettings = (s: CompanySettings): CompanySettings => ({
    ...s,
    name: unwrapSecret(s.name),
    address: unwrapSecret(s.address),
    email: unwrapSecret(s.email),
    phone: unwrapSecret(s.phone),
    website: unwrapSecret(s.website),
    taxId: s.taxId ? unwrapSecret(s.taxId) : s.taxId
});

const encryptMachine = (m: Machine): Machine => ({
    ...m,
    serialNumber: m.serialNumber ? wrapSecret(m.serialNumber) : m.serialNumber,
    accessCode: m.accessCode ? wrapSecret(m.accessCode) : m.accessCode,
    apiKey: m.apiKey ? wrapSecret(m.apiKey) : m.apiKey
});

const decryptMachine = (m: Machine): Machine => ({
    ...m,
    serialNumber: m.serialNumber ? unwrapSecret(m.serialNumber) : m.serialNumber,
    accessCode: m.accessCode ? unwrapSecret(m.accessCode) : m.accessCode,
    apiKey: m.apiKey ? unwrapSecret(m.apiKey) : m.apiKey
});

const encryptSpool = (s: MaterialSpool): MaterialSpool => ({
    ...s,
    notes: s.notes ? wrapSecret(s.notes) : s.notes
});

const decryptSpool = (s: MaterialSpool): MaterialSpool => ({
    ...s,
    notes: s.notes ? unwrapSecret(s.notes) : s.notes
});

const encryptReview = (r: CustomerReview): CustomerReview => ({
    ...r,
    comment: r.comment ? wrapSecret(r.comment) : r.comment
});

const decryptReview = (r: CustomerReview): CustomerReview => ({
    ...r,
    comment: r.comment ? unwrapSecret(r.comment) : r.comment
});

const encryptProductionJob = (j: ProductionJob): ProductionJob => ({
    ...j,
    // The board never renders a preview image, yet every job carried a full base64 copy of its
    // quote's thumbnail — a second copy of the largest field in the app, inside the same ~5 MB
    // origin quota that the quotes themselves are competing for. Dropping it on the way to
    // storage is the cheapest space the app can recover, and nothing reads it back: production
    // only ever writes individual fields (status, failedUnits, actualPrintTime) to a quote.
    quote: encryptQuote({ ...j.quote, thumbnail: undefined })
});

const decryptProductionJob = (j: ProductionJob): ProductionJob => ({
    ...j,
    quote: decryptQuote(j.quote)
});

const encryptNotification = (n: Notification): Notification => ({
    ...n,
    title: wrapSecret(n.title),
    message: wrapSecret(n.message)
});

const decryptNotification = (n: Notification): Notification => ({
    ...n,
    title: unwrapSecret(n.title),
    message: unwrapSecret(n.message)
});

const encryptGcode = (g: StoredGcode): StoredGcode => ({
    ...g,
    name: wrapSecret(g.name),
    filePath: wrapSecret(g.filePath)
});

const decryptGcode = (g: StoredGcode): StoredGcode => ({
    ...g,
    name: unwrapSecret(g.name),
    filePath: unwrapSecret(g.filePath)
});


export const getSpecsByMachineName = (name: string): Partial<Machine> | null => {
    const lowerName = name.trim().toLowerCase();
    if (!lowerName) return null;

    const exactMatch = defaultMachines.find(m => m.name.toLowerCase() === lowerName);
    if (exactMatch) return { buildVolume: exactMatch.buildVolume, power_consumption_watts: exactMatch.power_consumption_watts, print_type: exactMatch.print_type };

    const matches = defaultMachines.filter(m => 
        lowerName.includes(m.name.toLowerCase()) || 
        m.name.toLowerCase().includes(lowerName)
    ).sort((a, b) => b.name.length - a.name.length);

    if (matches.length > 0) {
        return {
            buildVolume: matches[0].buildVolume,
            power_consumption_watts: matches[0].power_consumption_watts,
            print_type: matches[0].print_type
        };
    }
    return null;
};

/**
 * Seeds a fresh install and tops up an existing one.
 *
 * Returns false when storage is unavailable, so the entry point can say so instead of letting a
 * throw escape before React has mounted anything.
 */
export const initializeDefaults = (): boolean => {
    if (!isStorageAvailable()) {
        console.error("[Storage] Browser storage is unavailable; the app cannot keep data on this device.");
        return false;
    }

    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
        writeStore(STORAGE_KEYS.QUOTES, JSON.stringify([]));
        writeStore(STORAGE_KEYS.MATERIALS, JSON.stringify(defaultMaterials));
        writeStore(STORAGE_KEYS.MACHINES, JSON.stringify(defaultMachines));
        writeStore(STORAGE_KEYS.CONSTANTS, JSON.stringify(defaultConstants));
        writeStore(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
        writeStore(STORAGE_KEYS.REVIEWS, JSON.stringify([]));
        writeStore(STORAGE_KEYS.SPOOLS, JSON.stringify([]));
        writeStore(STORAGE_KEYS.GCODES, JSON.stringify([]));
        writeStore(STORAGE_KEYS.COMPANY, JSON.stringify(null));
        writeStore(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
        writeStore(STORAGE_KEYS.AI_SETTINGS, JSON.stringify(DEFAULT_AI_SETTINGS));
        writeStore(STORAGE_KEYS.BRIDGE_SETTINGS, JSON.stringify({
            port: 50505,
            enabled: false
        }));
        writeStore(STORAGE_KEYS.PRODUCTION_JOBS, JSON.stringify([]));
        writeStore(STORAGE_KEYS.PRODUCTION_SETTINGS, JSON.stringify({
            efficiency: 85,
            turnoverMinutes: 15,
            workHoursPerDay: 8,
            enabledMachineIds: []
        }));
        writeStore(STORAGE_KEYS.INITIALIZED, "true");
    } else {
        syncLatestDefaultMachines();
        syncLatestDefaultConstants();
    }

    return true;
};

/**
 * Adds system constants introduced after a shop's first run.
 *
 * The block above writes the default list only on a fresh install, so a constant added in a later
 * version would never reach an existing user — the same trap `syncLatestDefaultMachines` exists to
 * avoid. Only missing ids are added; anything already stored is left exactly as the shop set it.
 */
export const syncLatestDefaultConstants = (): boolean => {
    const current = safeParse<CostConstant[]>(STORAGE_KEYS.CONSTANTS, []);
    const currentIds = new Set(current.map(c => c.id));
    const missing = defaultConstants.filter(
        dc => SYSTEM_CONSTANT_IDS.includes(dc.id) && !currentIds.has(dc.id)
    );

    if (missing.length === 0) return false;

    console.log(`[Storage] Adding ${missing.length} new system constant(s).`);
    writeStore(STORAGE_KEYS.CONSTANTS, JSON.stringify([...current, ...missing]));
    return true;
};

/**
 * Hydrates the machine list with any new defaults that don't exist in current storage.
 * This ensures users get 2026 models without resetting their custom hardware.
 */
export const syncLatestDefaultMachines = () => {
    const currentMachines = getMachines();
    const currentIds = new Set(currentMachines.map(m => m.id));
    
    // Find machines in defaults that aren't in current list
    const missingMachines = defaultMachines.filter(dm => !currentIds.has(dm.id));
    
    if (missingMachines.length > 0) {
        console.log(`[Storage] Hydrating with ${missingMachines.length} new models.`);
        const nextMachines = [...currentMachines, ...missingMachines];
        writeStore(STORAGE_KEYS.MACHINES, JSON.stringify(nextMachines.map(encryptMachine)));
        return true;
    }
    return false;
};


const notifyQuotesUpdated = () => {
    window.dispatchEvent(new CustomEvent('session_quotes_updated'));
};

const notifyMachinesUpdated = () => {
    window.dispatchEvent(new CustomEvent('session_machines_updated'));
};

/**
 * Builds a short, human-readable quote id that is checked for uniqueness against the
 * quotes already in storage.
 *
 * The previous scheme was `<4 hex chars><quotes.length + 1>`. That counter is not
 * monotonic (it repeats after any deletion) and 4 hex chars is only 65k possibilities,
 * so collisions were reachable within a few hundred quotes — and a collision silently
 * OVERWROTE the older quote, because saveQuote treats a matching id as an update.
 */
export const generateShortQuoteId = (existingQuotes: QuoteData[]): string => {
    const taken = new Set(existingQuotes.map(q => (typeof q.id === 'string' ? q.id.trim() : '')));
    for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = generateId().replace(/-/g, '').substring(0, 8).toUpperCase();
        if (!taken.has(candidate)) return candidate;
    }
    // Astronomically unlikely; fall back to a full unique id rather than risk an overwrite.
    return generateId().toUpperCase();
};

export const getQuotes = (): QuoteData[] => {
    const rawQuotes = safeParse<QuoteData[]>(STORAGE_KEYS.QUOTES, []);
    return rawQuotes.map((q: QuoteData) => {
        const decrypted = decryptQuote(q);
        return {
            ...decrypted,
            status: decrypted.status || 'PENDING',
            statusTimeline: decrypted.statusTimeline || { PENDING: decrypted.createdAt },
            assignedMachineId: decrypted.assignedMachineId || undefined,
            actualPrintTime: decrypted.actualPrintTime || undefined
        };
    });
};

export const saveQuote = (quote: QuoteData): QuoteData => {
    const quotes = getQuotes();

    // Guard against stored records that lack an id (older/hand-edited backups): without this,
    // one such record made every subsequent save throw on q.id.trim().
    const existingIndex = quote.id ? quotes.findIndex(q => typeof q.id === 'string' && q.id.trim() === quote.id.trim()) : -1;

    const newId = generateShortQuoteId(quotes);

    const newQuote: QuoteData = {
        ...quote,
        projectName: sanitize(quote.projectName),
        clientName: quote.clientName ? sanitize(quote.clientName) : quote.clientName,
        notes: quote.notes ? sanitize(quote.notes) : quote.notes,
        id: quote.id || newId,
        createdAt: quote.createdAt || new Date().toISOString(),
    };

    if (existingIndex !== -1) {
        quotes[existingIndex] = newQuote;
    } else {
        quotes.unshift(newQuote);
    }

    writeStore(STORAGE_KEYS.QUOTES, JSON.stringify(quotes.map(encryptQuote)));
    notifyQuotesUpdated();
    return newQuote;
};

export const deleteQuote = (id: string): void => {
    const quotes = getQuotes().filter(q => q.id !== id);
    writeStore(STORAGE_KEYS.QUOTES, JSON.stringify(quotes.map(encryptQuote)));
    notifyQuotesUpdated();
};

export const updateQuoteNotes = (id: string, notes: string): void => {
    const quotes = getQuotes().map(q =>
        q.id === id ? { ...q, notes: sanitize(notes) } : q
    );
    writeStore(STORAGE_KEYS.QUOTES, JSON.stringify(quotes.map(encryptQuote)));
    notifyQuotesUpdated();
};
/**
 * Recomputes a quote's frozen footprint from whatever the quote currently says.
 *
 * Used after an edit and again when production reconciles actuals, so the two paths can never
 * drift apart. Returns undefined when there is nothing to compute — the surfaces then omit the
 * line rather than showing a stale or empty figure.
 */
export const recomputeQuoteCarbon = (quote: QuoteData): QuoteCarbon | undefined => {
    const machines = getMachines();
    const materials = getMaterials();

    const machineId = (quote.assignedMachineId || quote.parameters?.machineId) as string | undefined;
    const materialId = quote.parameters?.materialId as string | undefined;
    const spoolId = quote.parameters?.selectedSpoolId as string | undefined;

    const breakdown = calculateJobCarbon({
        printType: quote.printType === "Resin" ? "Resin" : "FDM",
        quantity: quote.quantity,
        printTimePerUnit: quote.parameters?.printTime as string | undefined,
        actualPrintTime: quote.actualPrintTime,
        perUnitMaterial: (quote.parameters?.filamentWeight ?? quote.parameters?.resinVolume) as string | undefined,
        actualMaterialUsed: quote.actualMaterialUsed,
        failedUnits: quote.failedUnits,
        featureWeights: quote.featureWeights,
        washingTimeMinutes: quote.parameters?.washingTime as string | undefined,
        curingTimeMinutes: quote.parameters?.curingTime as string | undefined,
        // Fall back to the names stored on the quote: a job imported from the bridge may carry
        // those without ids.
        machine: machines.find(m => m.id === machineId)
            ?? machines.find(m => m.name === quote.parameters?.machineName),
        material: materials.find(m => m.id === materialId)
            ?? materials.find(m => m.name === quote.parameters?.materialName),
        spool: spoolId ? getSpools().find(s => s.id === spoolId) : undefined,
        gridGPerKWh: getConstants().find(c => c.id === GRID_CONSTANT_ID)?.value,
        eolPath: getCarbonSettings().defaultEolPath,
    });

    return breakdown ? toStoredCarbon(breakdown) : undefined;
};

const DEFAULT_CARBON_SETTINGS: CarbonSettings = {
    regionConfirmed: false,
    defaultEolPath: "landfill",
};

/** Shop-wide carbon choices. Absent keys fall back to the conservative defaults above. */
export const getCarbonSettings = (): CarbonSettings => ({
    ...DEFAULT_CARBON_SETTINGS,
    ...safeParse<CarbonSettings>(STORAGE_KEYS.CARBON_SETTINGS, {} as CarbonSettings),
});

export const saveCarbonSettings = (settings: Partial<CarbonSettings>): CarbonSettings => {
    const next = { ...getCarbonSettings(), ...settings };
    writeStore(STORAGE_KEYS.CARBON_SETTINGS, JSON.stringify(next));
    return next;
};

/**
 * Recalculates stored footprints against today's factors.
 *
 * Records are frozen on purpose — last year's reported total must not drift because a factor was
 * edited this morning — so restating history is an explicit, logged act rather than something that
 * happens quietly. Shops do get a factor wrong early on (virgin where they buy recycled is a 2.3×
 * error), and without this the mistake would be permanent.
 *
 * `auto` refreshes only figures that came entirely from the library. `all` also replaces those
 * built on a factor the shop entered for a material or a spool.
 */
export const recalculateCarbonHistory = (
    scope: "auto" | "all" = "auto"
): { updated: number; untouched: number } => {
    const quotes = getQuotes();
    let updated = 0;
    let untouched = 0;

    const next = quotes.map(quote => {
        const usesShopData = quote.carbon?.src.ef === "material"
            || quote.carbon?.src.ef === "spool"
            || quote.carbon?.src.watts === "measured";

        if (scope === "auto" && usesShopData) {
            untouched++;
            return quote;
        }

        const carbon = recomputeQuoteCarbon(quote);
        if (!carbon) {
            untouched++;
            return quote;
        }

        updated++;
        return { ...quote, carbon };
    });

    writeStore(STORAGE_KEYS.QUOTES, JSON.stringify(next.map(encryptQuote)));
    notifyQuotesUpdated();
    console.log(`[Carbon] Recalculated ${updated} footprint(s), left ${untouched} untouched (scope: ${scope}).`);

    return { updated, untouched };
};

/** Edits that move the footprint. Anything else leaves the stored figure alone. */
const CARBON_RELEVANT_FIELDS: (keyof QuoteData)[] = [
    "quantity", "parameters", "actualPrintTime", "actualMaterialUsed", "failedUnits", "featureWeights", "printType",
];

export const updateQuote = (id: string, updates: Partial<QuoteData>): void => {
    const quotes = getQuotes().map(q => {
        if (q.id === id) {
            const hasSignificantChanges = updates.parameters || updates.totalPrice || updates.materialCost;
            const updatedRevisions = [...(q.revisions || [])];
            
            if (hasSignificantChanges) {
                const revision: QuoteRevision = {
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    materialCost: q.materialCost,
                    machineTimeCost: q.machineTimeCost,
                    electricityCost: q.electricityCost,
                    laborCost: q.laborCost,
                    overheadCost: q.overheadCost,
                    subtotal: q.subtotal,
                    markup: q.markup,
                    totalPrice: q.totalPrice,
                    parameters: { ...q.parameters },
                    notes: q.notes ? wrapSecret(q.notes) : q.notes
                };
                updatedRevisions.push(revision);
            }

            const sanitizedUpdates = { ...updates };
            if ('projectName' in updates) {
                sanitizedUpdates.projectName = updates.projectName ? sanitize(updates.projectName) : updates.projectName;
            }
            if ('clientName' in updates) {
                sanitizedUpdates.clientName = updates.clientName ? sanitize(updates.clientName) : updates.clientName;
            }
            if ('notes' in updates) {
                sanitizedUpdates.notes = updates.notes ? sanitize(updates.notes) : updates.notes;
            }

            const merged: QuoteData = {
                ...q,
                ...sanitizedUpdates,
                statusTimeline: sanitizedUpdates.status && sanitizedUpdates.status !== q.status ? {
                    ...q.statusTimeline,
                    [sanitizedUpdates.status]: new Date().toISOString()
                } : q.statusTimeline,
                revisions: updatedRevisions
            };

            // Changing the quantity or the parameters moves the footprint, and the details dialog
            // can change both — without this the quote would keep showing the figure it was first
            // priced with. A caller that computed its own (production, from real actuals) wins.
            const touchesCarbon = CARBON_RELEVANT_FIELDS.some(field => field in updates);
            if (!("carbon" in updates) && touchesCarbon) {
                merged.carbon = recomputeQuoteCarbon(merged);
            }

            return merged;
        }
        return q;
    });
    
    writeStore(STORAGE_KEYS.QUOTES, JSON.stringify(quotes.map(encryptQuote)));
    notifyQuotesUpdated();
};
export const updateQuoteStatus = (id: string, status: QuoteStatus): void => {
    const quotes = getQuotes().map(q => {
        if (q.id === id) {
            return {
                ...q,
                status,
                statusTimeline: {
                    ...q.statusTimeline,
                    [status]: new Date().toISOString()
                },
                ...(status === 'DONE' && !q.statusTimeline?.DONE ? { actualPrintTime: q.actualPrintTime } : {})
            };
        }
        return q;
    });
    
    writeStore(STORAGE_KEYS.QUOTES, JSON.stringify(quotes.map(encryptQuote)));
    notifyQuotesUpdated();
};

export const updateMachineRuntime = (id: string, hours: number): void => {
    const machines = getMachines().map(m => {
        if (m.id === id) {
            return {
                ...m,
                totalRuntimeHours: (m.totalRuntimeHours || 0) + hours
            };
        }
        return m;
    });
    writeStore(STORAGE_KEYS.MACHINES, JSON.stringify(machines.map(encryptMachine)));
    notifyMachinesUpdated();
};


export const getMaterials = (printType?: "FDM" | "Resin"): Material[] => {
    const materials: Material[] = safeParse<Material[]>(STORAGE_KEYS.MATERIALS, []);
    return printType ? materials.filter(m => m.print_type === printType) : materials;
};

export const saveMaterial = (material: Omit<Material, "id"> & { id?: string }): Material => {
    const materials = getMaterials();
    const sanitizedMaterial = {
        ...material,
        name: sanitize(material.name),
        description: material.description ? sanitize(material.description) : material.description,
        unit: material.unit ? sanitize(material.unit) : material.unit,
    };
    if (sanitizedMaterial.id) {
        const index = materials.findIndex(m => m.id === sanitizedMaterial.id);
        if (index !== -1) {
            materials[index] = sanitizedMaterial as Material;
        }
    } else {
        const newMaterial: Material = {
            ...sanitizedMaterial,
            id: generateId(),
        } as Material;
        materials.push(newMaterial);
    }
    writeStore(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    return sanitizedMaterial.id
        ? materials.find(m => m.id === sanitizedMaterial.id)!
        : materials[materials.length - 1];
};

export const deleteMaterial = (id: string, force: boolean = false): { success: boolean, message?: string } => {
    // 1. Safety Check: Is it currently in use?
    const activeJobs = getProductionJobs().filter(j => 
        j.quote.parameters.materialId === id && j.status !== 'completed'
    );
    if (activeJobs.length > 0 && !force) {
        return { 
            success: false, 
            message: `Cannot delete material. It is used by ${activeJobs.length} active jobs.` 
        };
    }

    const materials = getMaterials().filter(m => m.id !== id);
    writeStore(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));

    // Cleanup orphaned spools
    const spools = getSpools();
    const filteredSpools = spools.filter(s => s.materialId !== id);
    if (spools.length !== filteredSpools.length) {
        writeStore(STORAGE_KEYS.SPOOLS, JSON.stringify(filteredSpools.map(encryptSpool)));
    }

    return { success: true };
};

export const getMachines = (printType?: "FDM" | "Resin"): Machine[] => {
    const machines: Machine[] = safeParse<Machine[]>(STORAGE_KEYS.MACHINES, []);
    const processed = machines.map(decryptMachine);

    return printType ? processed.filter(m => m.print_type === printType) : processed;
};

export const saveMachine = (machine: Omit<Machine, "id"> & { id?: string }): Machine => {
    const machines = getMachines();
    const sanitizedMachine = {
        ...machine,
        name: sanitize(machine.name),
        serialNumber: sanitizeAPIKey(machine.serialNumber || ""),
        accessCode: sanitizeAPIKey(machine.accessCode || ""),
        ipAddress: machine.ipAddress ? sanitize(machine.ipAddress) : machine.ipAddress,
        apiKey: machine.apiKey ? sanitizeAPIKey(machine.apiKey) : machine.apiKey,
        buildVolume: machine.buildVolume ? sanitize(machine.buildVolume) : machine.buildVolume,
        totalRuntimeHours: typeof machine.totalRuntimeHours === 'number' && !isNaN(machine.totalRuntimeHours) ? Math.max(0, machine.totalRuntimeHours) : (machine.totalRuntimeHours || 0),
        totalPowerCost: typeof machine.totalPowerCost === 'number' && !isNaN(machine.totalPowerCost) ? Math.max(0, machine.totalPowerCost) : (machine.totalPowerCost || 0)
    };
    
    let result: Machine;
    if (sanitizedMachine.id) {
        const index = machines.findIndex(m => m.id === sanitizedMachine.id);
        if (index !== -1) {
            machines[index] = sanitizedMachine as Machine;
            result = machines[index];
        } else {
            result = sanitizedMachine as Machine;
        }
    } else {
        const newMachine: Machine = {
            ...sanitizedMachine,
            id: generateId(),
            print_type: machine.print_type,
        } as Machine;
        machines.push(newMachine);
        result = newMachine;
    }
    writeStore(STORAGE_KEYS.MACHINES, JSON.stringify(machines.map(encryptMachine)));
    notifyMachinesUpdated();
    return result;
};

export const deleteMachine = (id: string, force: boolean = false): { success: boolean, message?: string } => {
    const activeJobs = getProductionJobs().filter(j => j.machineId === id && j.status !== 'completed');
    if (activeJobs.length > 0 && !force) {
        return { 
            success: false, 
            message: `Cannot delete machine. It is assigned to ${activeJobs.length} active jobs.` 
        };
    }

    const machines = getMachines().filter(m => m.id !== id);
    writeStore(STORAGE_KEYS.MACHINES, JSON.stringify(machines.map(encryptMachine)));
    notifyMachinesUpdated();

    // Cleanup production settings
    try {
        const settingsStr = localStorage.getItem(STORAGE_KEYS.PRODUCTION_SETTINGS);
        if (settingsStr) {
            let settings;
            try {
                settings = JSON.parse(unwrapSecret(settingsStr));
            } catch {
                settings = JSON.parse(settingsStr);
            }

            if (settings.enabledMachineIds && Array.isArray(settings.enabledMachineIds)) {
                settings.enabledMachineIds = settings.enabledMachineIds.filter((mId: string) => mId !== id);
                writeStore(STORAGE_KEYS.PRODUCTION_SETTINGS, wrapSecret(JSON.stringify(settings)));
            }
        }
    } catch (err) {
        console.error("Failed to cleanup machine from production settings", err);
    }

    return { success: true };
};

export const getConstants = (): CostConstant[] => {
    const constants = safeParse<CostConstant[]>(STORAGE_KEYS.CONSTANTS, []);

    // Enforce system constants to be hidden
    const systemIds = SYSTEM_CONSTANT_IDS;
    const systemNames = ["Electricity Rate", "Labor Rate", "Overhead Rate", "Default Markup", "Grid Emission Factor"];

    // Migrate legacy units: strip hardcoded '$' prefix from units (e.g. '$/ml' → '/ml')
    let needsMigration = false;
    const migrated = constants.map((c: CostConstant) => {
        let unit = c.unit;
        if (unit && unit.startsWith('$')) {
            unit = unit.substring(1);
            needsMigration = true;
        }
        const result = { ...c, unit };
        if (systemIds.includes(c.id) || systemNames.includes(c.name)) {
            result.is_visible = false;
        }
        return result;
    });

    // Persist migration once to avoid re-checking every time
    if (needsMigration) {
        writeStore(STORAGE_KEYS.CONSTANTS, JSON.stringify(migrated));
    }

    return migrated;
};

export const saveConstant = (constant: Omit<CostConstant, "id"> & { id?: string }): CostConstant => {
    const constants = getConstants();
    // Only sanitize fields that were actually supplied. Blindly rebuilding every field meant a
    // partial update (e.g. the AI's `{ id, value }`) wiped name/unit/description — and the paint
    // "Usage Rate: …ml/cm2" lives in that description, so paint pricing silently reset.
    const sanitizedConstant: Partial<CostConstant> & { id?: string } = { ...constant };
    if (constant.name !== undefined) sanitizedConstant.name = sanitize(constant.name);
    if (constant.unit !== undefined) sanitizedConstant.unit = sanitize(constant.unit || "");
    if (constant.description !== undefined) sanitizedConstant.description = constant.description ? sanitize(constant.description) : constant.description;

    if (sanitizedConstant.id) {
        const index = constants.findIndex(c => c.id === sanitizedConstant.id);
        if (index !== -1) {
            // Merge, so unspecified fields on the existing record survive.
            constants[index] = { ...constants[index], ...sanitizedConstant } as CostConstant;
        } else {
            // An id that is not in the list used to fall straight through: nothing was written,
            // the caller was told it had succeeded, and the return below handed back undefined
            // behind a non-null assertion. It happens whenever a system constant has been deleted,
            // or is set before the defaults are seeded — the AI setting the grid factor, say.
            // Fill in the defaults for a known id so the row still has a name and a unit.
            const template = defaultConstants.find(c => c.id === sanitizedConstant.id);
            constants.push({
                ...(template ?? { name: sanitizedConstant.id, unit: "", value: 0 }),
                ...sanitizedConstant,
            } as CostConstant);
        }
    } else {
        const newConstant: CostConstant = {
            ...sanitizedConstant,
            id: generateId(),
        } as CostConstant;
        constants.push(newConstant);
    }
    writeStore(STORAGE_KEYS.CONSTANTS, JSON.stringify(constants));
    return sanitizedConstant.id
        ? constants.find(c => c.id === sanitizedConstant.id)!
        : constants[constants.length - 1];
};

export const deleteConstant = (id: string): void => {
    const constants = getConstants().filter(c => c.id !== id);
    writeStore(STORAGE_KEYS.CONSTANTS, JSON.stringify(constants));
};

// Reset all session data
export const resetSessionData = (): void => {
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    localStorage.removeItem(STORAGE_KEYS.QUOTES);
    localStorage.removeItem(STORAGE_KEYS.MATERIALS);
    localStorage.removeItem(STORAGE_KEYS.MACHINES);
    localStorage.removeItem(STORAGE_KEYS.CONSTANTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
    localStorage.removeItem(STORAGE_KEYS.SPOOLS);
    localStorage.removeItem(STORAGE_KEYS.GCODES);
    localStorage.removeItem(STORAGE_KEYS.COMPANY);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.AI_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.AI_AUDIT);
    localStorage.removeItem(STORAGE_KEYS.AI_CHAT);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.BRIDGE_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTION_JOBS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTION_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.CARBON_SETTINGS);
    initializeDefaults();
};


export const getCustomers = (): Customer[] => {
    const rawCustomers = safeParse<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    return rawCustomers.map(decryptCustomer);
};

export const saveCustomer = (customer: Omit<Customer, "id" | "createdAt"> & { id?: string, createdAt?: string }): Customer => {
    const customers = getCustomers();
    const sanitizedCustomer = {
        ...customer,
        name: sanitize(customer.name),
        company: customer.company ? sanitize(customer.company) : customer.company,
        email: customer.email ? sanitize(customer.email).toLowerCase() : customer.email,
        phone: customer.phone ? sanitize(customer.phone) : customer.phone,
        address: customer.address ? sanitize(customer.address) : customer.address,
        notes: customer.notes ? sanitize(customer.notes) : customer.notes,
        tags: customer.tags ? customer.tags.map(t => sanitize(t)) : customer.tags,
    };

    // Reject malformed emails
    if (sanitizedCustomer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedCustomer.email)) {
        throw new Error("Invalid email format rejected by security layer.");
    }
    let result: Customer;
    if (sanitizedCustomer.id) {
        const index = customers.findIndex(c => c.id === sanitizedCustomer.id);
        if (index !== -1) {
            customers[index] = { ...customers[index], ...sanitizedCustomer };
            result = customers[index];
        } else {
            result = sanitizedCustomer as Customer;
        }
    } else {
        const newCustomer: Customer = {
            ...sanitizedCustomer,
            id: generateId(),
            createdAt: new Date().toISOString(),
        } as Customer;
        customers.unshift(newCustomer);
        result = newCustomer;
    }
    writeStore(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers.map(encryptCustomer)));
    return result;
};

export const deleteCustomer = (id: string): void => {
    const customers = getCustomers().filter(c => c.id !== id);
    writeStore(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers.map(encryptCustomer)));
};

export const getCustomer = (id: string): Customer | undefined => {
    return getCustomers().find(c => c.id === id);
};

export const getCustomerStats = (customerId: string) => {
    const quotes = getQuotes();
    const customerQuotes = quotes.filter(q => q.customerId === customerId);

    const totalSpent = customerQuotes.reduce((sum, q) => sum + (q.totalPrice || 0), 0);
    const orderCount = customerQuotes.length;
    const lastOrderDate = customerQuotes.length > 0
        ? customerQuotes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0].createdAt
        : null;

    return {
        totalSpent,
        orderCount,
        lastOrderDate,
        quotes: customerQuotes
    };
};



export const getEmployees = (): Employee[] => {
    const rawEmployees = safeParse<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
    return rawEmployees.map(decryptEmployee);
};

export const saveEmployee = (employee: Omit<Employee, "id" | "createdAt"> & { id?: string }): Employee => {
    const employees = getEmployees();
    const sanitizedEmployee = {
        ...employee,
        name: sanitize(employee.name),
        jobPosition: sanitize(employee.jobPosition),
        email: employee.email ? sanitize(employee.email) : employee.email,
        phone: employee.phone ? sanitize(employee.phone) : employee.phone,
    };
    if (sanitizedEmployee.id) {
        // Update existing
        const index = employees.findIndex(e => e.id === sanitizedEmployee.id);
        if (index !== -1) {
            employees[index] = { ...employees[index], ...sanitizedEmployee };
        }
    } else {
        // Add new
        const newEmployee: Employee = {
            ...sanitizedEmployee,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        employees.unshift(newEmployee);
    }
    writeStore(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees.map(encryptEmployee)));
    return sanitizedEmployee.id
        ? employees.find(e => e.id === sanitizedEmployee.id)!
        : employees[0];
};

export const deleteEmployee = (id: string): void => {
    const employees = getEmployees().filter(e => e.id !== id);
    writeStore(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees.map(encryptEmployee)));
};

export const getEmployee = (id: string): Employee | undefined => {
    return getEmployees().find(e => e.id === id);
};



export const getReviews = (customerId?: string): CustomerReview[] => {
    const rawReviews = safeParse<CustomerReview[]>(STORAGE_KEYS.REVIEWS, []);
    const decrypted = rawReviews.map(decryptReview);
    return customerId ? decrypted.filter(r => r.customerId === customerId) : decrypted;
};

export const saveReview = (review: Omit<CustomerReview, "id" | "createdAt"> & { id?: string }): CustomerReview => {
    const reviews = getReviews();
    const sanitizedReview = {
        ...review,
        comment: review.comment ? sanitize(review.comment) : review.comment,
        tags: review.tags ? review.tags.map(t => sanitize(t)) : review.tags
    };
    if (sanitizedReview.id) {
        const index = reviews.findIndex(r => r.id === sanitizedReview.id);
        if (index !== -1) {
            reviews[index] = { ...reviews[index], ...sanitizedReview } as CustomerReview;
        }
    } else {
        const newReview: CustomerReview = {
            ...sanitizedReview,
            id: generateId(),
            createdAt: new Date().toISOString(),
        } as CustomerReview;
        reviews.unshift(newReview);
    }
    writeStore(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews.map(encryptReview)));

    // Update customer's average rating
    updateCustomerRating(review.customerId);

    // Fire notification for new review
    if (!review.id) {
        saveNotification({
            type: 'INFO',
            title: 'New Customer Feedback',
            message: `A client left a ${review.rating}-star review for their recent order.`,
            metadata: { customerId: review.customerId }
        });
    }

    return review.id ? reviews.find(r => r.id === review.id)! : reviews[0];
};

export const deleteReview = (id: string): void => {
    const reviews = getReviews();
    const review = reviews.find(r => r.id === id);
    const filtered = reviews.filter(r => r.id !== id);
    writeStore(STORAGE_KEYS.REVIEWS, JSON.stringify(filtered.map(encryptReview)));

    if (review) {
        updateCustomerRating(review.customerId);
    }
};

export const getCustomerAverageRating = (customerId: string): { average: number; count: number } => {
    const reviews = getReviews(customerId);
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
};

const updateCustomerRating = (customerId: string): void => {
    const { average, count } = getCustomerAverageRating(customerId);
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === customerId);
    if (index !== -1) {
        customers[index].averageRating = average;
        customers[index].reviewCount = count;
        writeStore(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers.map(encryptCustomer)));
    }
};


export const getSpools = (materialId?: string): MaterialSpool[] => {
    const rawSpools = safeParse<MaterialSpool[]>(STORAGE_KEYS.SPOOLS, []);
    const decrypted = rawSpools.map(decryptSpool);
    return materialId ? decrypted.filter(s => s.materialId === materialId) : decrypted;
};

export const saveSpool = (spool: Omit<MaterialSpool, "id"> & { id?: string }): MaterialSpool => {
    const spools = getSpools();
    const sanitizedSpool = {
        ...spool,
        name: sanitize(spool.name),
        colour: spool.colour ? sanitize(spool.colour) : spool.colour,
        location: spool.location ? sanitize(spool.location) : spool.location,
        notes: spool.notes ? sanitize(spool.notes) : spool.notes,
    };
    if (sanitizedSpool.id) {
        const index = spools.findIndex(s => s.id === sanitizedSpool.id);
        if (index !== -1) {
            spools[index] = sanitizedSpool as MaterialSpool;
        }
    } else {
        const newSpool: MaterialSpool = {
            ...sanitizedSpool,
            id: generateId(),
        };
        spools.push(newSpool);
    }
    writeStore(STORAGE_KEYS.SPOOLS, JSON.stringify(spools.map(encryptSpool)));
    updateMaterialStock(sanitizedSpool.materialId);
    return sanitizedSpool.id ? spools.find(s => s.id === sanitizedSpool.id)! : spools[spools.length - 1];
};

export const deleteSpool = (id: string): void => {
    const spools = getSpools();
    const spool = spools.find(s => s.id === id);
    const filtered = spools.filter(s => s.id !== id);
    writeStore(STORAGE_KEYS.SPOOLS, JSON.stringify(filtered.map(encryptSpool)));

    if (spool) {
        updateMaterialStock(spool.materialId);
    }
};

export const findBestSpoolMatch = (materialName: string, colour: string = ''): MaterialSpool | null => {
    const materials = getMaterials();
    const material = materials.find(m => m.name === materialName);
    if (!material) return null;

    const spools = getSpools(material.id);
    if (spools.length === 0) return null;

    const quoteColour = colour.toLowerCase().trim();
    let targetSpool = spools.find(s =>
        s.colour?.toLowerCase().includes(quoteColour) ||
        s.name?.toLowerCase().includes(quoteColour)
    );

    if (!targetSpool) {
        targetSpool = spools.reduce((max, s) => s.currentWeight > max.currentWeight ? s : max, spools[0]);
    }

    return targetSpool;
};

/**
 * Removes `amount` from a spool and returns the amount ACTUALLY removed.
 *
 * Two things matter here:
 *  - Stock is clamped to [0, 1_000_000]. It used to be allowed down to -1,000,000, and a
 *    negative balance was then excluded from low-stock alerts by `getLowStockMaterials`.
 *  - The applied amount is returned rather than a bare boolean, so a caller that later
 *    reverts the deduction restores exactly what was taken. Returning `true` after a
 *    clamped (partial) deduction would let the revert put back more than was ever removed.
 *
 * The number is falsy at 0, so existing `if (deductFromSpool(...))` checks keep working.
 */
export const deductFromSpool = (spoolId: string, amount: number): number => {
    const spools = getSpools();
    const index = spools.findIndex(s => s.id === spoolId);
    if (index === -1) return 0;

    const current = Number.isFinite(spools[index].currentWeight) ? spools[index].currentWeight : 0;
    const delta = Number.isFinite(amount) ? amount : 0;
    const newWeight = Math.min(1000000, Math.max(0, current - delta));
    const applied = current - newWeight;

    spools[index].currentWeight = newWeight;

    writeStore(STORAGE_KEYS.SPOOLS, JSON.stringify(spools.map(encryptSpool)));
    updateMaterialStock(spools[index].materialId);
    return applied;
};

/**
 * Validates incoming quote data from the Bridge or API.
 */
export const validateQuoteData = (data: unknown): boolean => {
    // This validates the CALCULATOR FORM payload the bridge builds, where every numeric
    // field is a string. The previous schema demanded `quantity: number` and an `id` that
    // form data never carries, so it rejected 100% of files received from the slicer.
    const quoteSchema = {
        projectName: 'string',
        printTime: 'string',
        filamentWeight: 'string',
        quantity: 'string'
    };
    return validateSchema(data as Record<string, unknown>, quoteSchema);
};


/** Returns the amount actually returned to the spool (negative deduction). */
export const restoreToSpool = (spoolId: string, amount: number): number => {
    return -deductFromSpool(spoolId, -amount);
};

export const getMaterialStock = (materialId: string): number => {
    const spools = getSpools(materialId);
    return spools.reduce((sum, s) => sum + s.currentWeight, 0);
};

export const getLowStockMaterials = (threshold?: number): Material[] => {
    const materials = getMaterials();
    return materials.filter(m => {
        const stock = getMaterialStock(m.id);
        const limit = m.lowStockThreshold ?? threshold ?? 200; // Default 200g threshold
        // Note: no `stock >= 0` condition. That previously excluded fully depleted /
        // over-drawn materials — exactly the ones that most need an alert.
        return Number.isFinite(stock) && stock < limit;
    });
};

const updateMaterialStock = (materialId: string): void => {
    const stock = getMaterialStock(materialId);
    const materials = getMaterials();
    const index = materials.findIndex(m => m.id === materialId);
    if (index !== -1) {
        materials[index].totalInStock = stock;
        writeStore(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    }
};

export const getGcodes = (): StoredGcode[] => {
    const raw = safeParse<StoredGcode[]>(STORAGE_KEYS.GCODES, []);
    return raw.map(decryptGcode);
};

export const saveGcode = (gcode: Omit<StoredGcode, "id"> & { id?: string }): StoredGcode => {
    const gcodes = getGcodes();
    const sanitizedGcode = {
        ...gcode,
        name: sanitize(gcode.name),
        filePath: sanitize(gcode.filePath),
        machineName: gcode.machineName ? sanitize(gcode.machineName) : gcode.machineName,
        materialName: gcode.materialName ? sanitize(gcode.materialName) : gcode.materialName,
    };
    if (sanitizedGcode.id) {
        // Update existing
        const index = gcodes.findIndex(g => g.id === sanitizedGcode.id);
        if (index !== -1) {
            gcodes[index] = { ...gcodes[index], ...sanitizedGcode } as StoredGcode;
        }
    } else {
        // Add new
        const newGcode: StoredGcode = {
            ...sanitizedGcode,
            id: generateId(),
        } as StoredGcode;
        gcodes.push(newGcode);
    }
    writeStore(STORAGE_KEYS.GCODES, JSON.stringify(gcodes.map(encryptGcode)));
    return sanitizedGcode.id
        ? gcodes.find(g => g.id === sanitizedGcode.id)!
        : gcodes[gcodes.length - 1];
};

/**
 * Updates G-code metadata (estimated time) based on a real-world print result.
 */
export const updateGcodeMetadata = (filePath: string, actualTime: number): void => {
    // GUARD: Ignore extremely short prints (< 15 mins) as they are often failed starts or tiny tests
    // and would skew the industrial average unfairly.
    if (actualTime < 0.25) {
        console.warn(`[ClosedLoop] Ignoring metadata update for ${filePath}: Print time ${actualTime}h is too short.`);
        return;
    }

    const gcodes = getGcodes();
    const index = gcodes.findIndex(g => g.filePath === filePath);
    if (index !== -1) {
        const current = gcodes[index].printTime;
        
        // Weighted moving average (0.8 old, 0.2 new) for long-term consistency
        const newValue = (current * 0.8) + (actualTime * 0.2);
        
        gcodes[index].printTime = Math.min(10000, Math.max(0, Math.round(newValue * 100) / 100));
        writeStore(STORAGE_KEYS.GCODES, JSON.stringify(gcodes.map(encryptGcode)));
        console.log(`[ClosedLoop] Updated G-code metadata for ${filePath}: ${current}h -> ${gcodes[index].printTime}h`);
    }
};

export const deleteGcode = (id: string): void => {
    const gcodes = getGcodes().filter(g => g.id !== id);
    writeStore(STORAGE_KEYS.GCODES, JSON.stringify(gcodes.map(encryptGcode)));
};


export const getProductionJobs = (): ProductionJob[] => {
    const raw = safeParse<ProductionJob[]>(STORAGE_KEYS.PRODUCTION_JOBS, []);
    return raw.map(decryptProductionJob);
};

/**
 * Persists the production board. Written from a React effect on every job change, so a refusal
 * must be reported rather than thrown: an exception here reaches the root error boundary and takes
 * the whole app down, and does so again on the next load, which is a permanent lockout.
 *
 * Returns false when the write was refused; the failure has already been announced on the window.
 */
export const saveProductionJobs = (jobs: ProductionJob[]): boolean => {
    return tryWriteStore(STORAGE_KEYS.PRODUCTION_JOBS, JSON.stringify(jobs.map(encryptProductionJob)));
};

export const getProductionSettings = (): ProductionSettings => {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTION_SETTINGS);
    const fallback: ProductionSettings = { 
        efficiency: 85, 
        turnoverMinutes: 15, 
        workHoursPerDay: 8,
        enabledMachineIds: [] 
    };

    if (!raw) return fallback;

    try {
        const decrypted = unwrapSecret(raw);
        const parsed = JSON.parse(decrypted);
        // Merge rather than return the parsed value. The fallback only covered a throw, so a
        // stored "null" or a record written by an older version came back missing `efficiency`
        // and `workHoursPerDay`, and every consumer read those straight off it.
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
        return { ...fallback, ...parsed };
    } catch (err) {
        console.warn("[Storage] Failed to decrypt production settings, using defaults.", err);
        return fallback;
    }
};

/** Also written from an effect — see saveProductionJobs for why this one cannot throw either. */
export const saveProductionSettings = (settings: ProductionSettings): boolean => {
    const encrypted = wrapSecret(JSON.stringify(settings));
    return tryWriteStore(STORAGE_KEYS.PRODUCTION_SETTINGS, encrypted);
};

/**
 * Closed-Loop Logic: Machine Maintenance Helper
 * Returns true if the machine has exceeded its maintenance interval.
 */
export const isMachineMaintenanceDue = (machine: Machine): boolean => {
    if (!machine.totalRuntimeHours || !machine.maintenanceIntervalHours) return false;
    const hoursSinceMaintenance = machine.totalRuntimeHours - (machine.lastMaintenanceHours || 0);
    return hoursSinceMaintenance >= machine.maintenanceIntervalHours;
};

/**
 * Resets the machine's maintenance counter to the current runtime hours.
 */
export const performMachineMaintenance = (machineId: string): void => {
    const machines = getMachines();
    const index = machines.findIndex(m => m.id === machineId);
    if (index !== -1) {
        machines[index].lastMaintenanceHours = machines[index].totalRuntimeHours || 0;
        machines[index].lastMaintenanceDate = new Date().toISOString();
        writeStore(STORAGE_KEYS.MACHINES, JSON.stringify(machines.map(encryptMachine)));
        notifyMachinesUpdated();
    }
};





export const getCompanySettings = (): CompanySettings | null => {
    const raw = safeParse<CompanySettings | null>(STORAGE_KEYS.COMPANY, null);
    return raw ? decryptCompanySettings(raw) : null;
};

export const saveCompanySettings = (settings: CompanySettings): void => {
    const sanitizedSettings = {
        ...settings,
        name: sanitize(settings.name),
        address: sanitize(settings.address),
        email: sanitize(settings.email),
        phone: sanitize(settings.phone),
        website: sanitize(settings.website),
        taxId: settings.taxId ? sanitize(settings.taxId) : settings.taxId,
        footerText: settings.footerText ? sanitize(settings.footerText) : settings.footerText,
    };
    writeStore(STORAGE_KEYS.COMPANY, JSON.stringify(encryptCompanySettings(sanitizedSettings)));
};


export interface SettingsExport {
    version: string;
    exportDate: string;
    materials: Material[];
    machines: Machine[];
    constants: CostConstant[];
    customers: Customer[];
    reviews?: CustomerReview[];
    spools?: MaterialSpool[];
    gcodes?: StoredGcode[];
    company?: CompanySettings | null;
    employees?: Employee[];
    quotes?: QuoteData[];
    notifications?: Notification[];
    aiSettings?: AISettings;
    productionJobs?: ProductionJob[];
    productionSettings?: ProductionSettings;
    /** Optional: older backups predate carbon, and import treats a missing block as "leave as is". */
    carbonSettings?: CarbonSettings;
}

/**
 * Strict schema validation for import data.
 */
const validateSchema = (item: Record<string, unknown> | null | undefined, schema: Record<string, string>): boolean => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;

    // Prototype pollution protection: reject dangerous KEYS. (This previously compared
    // the forbidden names against values, which protected nothing.)
    const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of Object.keys(item)) {
        if (forbiddenKeys.includes(key)) return false;
    }

    for (const [key, type] of Object.entries(schema)) {
        if (!(key in item)) return false;

        const value = item[key];

        if (type === 'array') {
            if (!Array.isArray(value)) return false;
        } else if (type === 'object') {
            // null and arrays are not acceptable records
            if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
        } else if (type === 'number') {
            // Reject NaN/Infinity: they survive JSON round-trips as null and poison every total.
            if (typeof value !== 'number' || !Number.isFinite(value)) return false;
        } else if (typeof value !== type) {
            return false;
        }
    }
    return true;
};

const SCHEMAS = {
    MATERIAL: { id: 'string', name: 'string', cost_per_unit: 'number', unit: 'string', print_type: 'string' },
    // power_consumption_watts is intentionally not required: it is legitimately null for
    // machines saved without a wattage, and requiring it would drop them on import.
    MACHINE: { id: 'string', name: 'string', hourly_cost: 'number', print_type: 'string' },
    CONSTANT: { id: 'string', name: 'string', value: 'number', unit: 'string' },
    CUSTOMER: { id: 'string', name: 'string', createdAt: 'string' },
    REVIEW: { id: 'string', customerId: 'string', rating: 'number', createdAt: 'string' },
    SPOOL: { id: 'string', materialId: 'string', initialWeight: 'number', currentWeight: 'number' },
    GCODE: { id: 'string', name: 'string', filePath: 'string', printTime: 'number', createdAt: 'string' },
    COMPANY: { name: 'string', address: 'string', email: 'string', phone: 'string' },
    EMPLOYEE: { id: 'string', name: 'string', jobPosition: 'string', createdAt: 'string' },
    // `id` is required: a quote without one breaks every later saveQuote (it dereferences q.id).
    QUOTE: { id: 'string', materialCost: 'number', machineTimeCost: 'number', totalPrice: 'number', quantity: 'number', projectName: 'string', parameters: 'object' },
    // Notification uses `timestamp: string` (see types/notifications.ts). Requiring a
    // non-existent `createdAt: number` silently rejected every notification on import.
    NOTIFICATION: { id: 'string', title: 'string', message: 'string', status: 'string', timestamp: 'string' },
    // Only the fields every historical export is guaranteed to carry: newer
    // options are filled in by normalizeAISettings after import.
    AI_SETTINGS: { enabled: 'boolean', port: 'number', model: 'string' }
};

// Export all settings to JSON
export const exportAllSettings = (): SettingsExport => {
    return {
        version: "1.1",
        exportDate: new Date().toISOString(),
        materials: getMaterials(),
        machines: getMachines(),
        constants: getConstants(),
        customers: getCustomers(),
        reviews: getReviews(),
        spools: getSpools(),
        gcodes: getGcodes(),
        company: getCompanySettings(),
        employees: getEmployees(),
        quotes: getQuotes(),
        notifications: getNotifications(),
        aiSettings: getAISettings(),
        // The production queue and its settings are part of the shop's state; without them
        // a "full backup" silently lost every job on the board.
        productionJobs: getProductionJobs(),
        productionSettings: getProductionSettings(),
        carbonSettings: getCarbonSettings(),
    };
};

// Import settings from JSON
export const importAllSettings = (data: SettingsExport): { success: boolean; message: string } => {
    try {
        const sanitizedData = sanitizeObject(data) as unknown as SettingsExport;

        // Validate structure of sanitized data
        if (!sanitizedData || typeof sanitizedData !== 'object' || !sanitizedData.version || !sanitizedData.materials || !sanitizedData.machines || !sanitizedData.constants) {
            return { success: false, message: "Invalid settings file format or corrupted payload" };
        }

        // Validate arrays
        if (!Array.isArray(sanitizedData.materials) || !Array.isArray(sanitizedData.machines) || !Array.isArray(sanitizedData.constants) || !Array.isArray(sanitizedData.constants)) {
            return { success: false, message: "Settings data is corrupted" };
        }

        // Validate customers (optional for backward compatibility)
        if (sanitizedData.customers && !Array.isArray(sanitizedData.customers)) {
            return { success: false, message: "Customer data is corrupted" };
        }

        // Validate non-array objects
        if (sanitizedData.company && !validateSchema(sanitizedData.company as unknown as Record<string, unknown>, SCHEMAS.COMPANY)) {
            return { success: false, message: "Company settings format is invalid" };
        }
        if (sanitizedData.aiSettings && !validateSchema(sanitizedData.aiSettings as unknown as Record<string, unknown>, SCHEMAS.AI_SETTINGS)) {
            return { success: false, message: "AI settings format is invalid" };
        }

        const commitMap: Record<string, string> = {};

        const validMaterials = sanitizedData.materials.filter((m: unknown) => validateSchema(m as Record<string, unknown>, SCHEMAS.MATERIAL));
        if (validMaterials.length === 0 && sanitizedData.materials.length > 0) {
            return { success: false, message: "Material data is invalid" };
        }
        commitMap[STORAGE_KEYS.MATERIALS] = JSON.stringify(validMaterials);

        const validMachines = sanitizedData.machines.filter((m: unknown) => validateSchema(m as Record<string, unknown>, SCHEMAS.MACHINE));
        if (validMachines.length === 0 && sanitizedData.machines.length > 0) {
            return { success: false, message: "Machine data is invalid" };
        }
        commitMap[STORAGE_KEYS.MACHINES] = JSON.stringify(validMachines);

        const validConstants = sanitizedData.constants.filter((c: unknown) => validateSchema(c as Record<string, unknown>, SCHEMAS.CONSTANT));
        commitMap[STORAGE_KEYS.CONSTANTS] = JSON.stringify(validConstants);

        // Optional arrays
        const optionalImports = [
            { key: STORAGE_KEYS.CUSTOMERS, data: sanitizedData.customers, schema: SCHEMAS.CUSTOMER, label: 'customers' },
            { key: STORAGE_KEYS.REVIEWS, data: sanitizedData.reviews, schema: SCHEMAS.REVIEW, label: 'reviews' },
            { key: STORAGE_KEYS.SPOOLS, data: sanitizedData.spools, schema: SCHEMAS.SPOOL, label: 'spools' },
            { key: STORAGE_KEYS.GCODES, data: sanitizedData.gcodes, schema: SCHEMAS.GCODE, label: 'stored files' },
            { key: STORAGE_KEYS.EMPLOYEES, data: sanitizedData.employees, schema: SCHEMAS.EMPLOYEE, label: 'employees' },
            { key: STORAGE_KEYS.QUOTES, data: sanitizedData.quotes, schema: SCHEMAS.QUOTE, label: 'quotes' },
            { key: STORAGE_KEYS.NOTIFICATIONS, data: sanitizedData.notifications, schema: SCHEMAS.NOTIFICATION, label: 'notifications' }
        ];

        // Track anything the validator rejects so the result can say so instead of
        // reporting a clean success while silently dropping records.
        const droppedRecords: string[] = [];
        const noteDropped = (label: string, total: number, kept: number) => {
            if (total > kept) droppedRecords.push(`${total - kept} ${label}`);
        };

        noteDropped('materials', sanitizedData.materials.length, validMaterials.length);
        noteDropped('machines', sanitizedData.machines.length, validMachines.length);
        noteDropped('constants', sanitizedData.constants.length, validConstants.length);

        for (const imp of optionalImports) {
            if (imp.data) {
                const validItems = imp.data.filter((item: unknown) => validateSchema(item as Record<string, unknown>, imp.schema));
                noteDropped(imp.label, imp.data.length, validItems.length);
                commitMap[imp.key] = JSON.stringify(validItems);
            }
        }

        // Company settings were validated above but never committed, so they were exported
        // and silently never restored.
        if (sanitizedData.company) {
            commitMap[STORAGE_KEYS.COMPANY] = JSON.stringify(encryptCompanySettings(sanitizedData.company));
        }

        if (sanitizedData.productionJobs && Array.isArray(sanitizedData.productionJobs)) {
            commitMap[STORAGE_KEYS.PRODUCTION_JOBS] = JSON.stringify(sanitizedData.productionJobs.map(encryptProductionJob));
        }

        if (sanitizedData.productionSettings && typeof sanitizedData.productionSettings === 'object') {
            commitMap[STORAGE_KEYS.PRODUCTION_SETTINGS] = wrapSecret(JSON.stringify(sanitizedData.productionSettings));
        }

        if (sanitizedData.carbonSettings && typeof sanitizedData.carbonSettings === 'object') {
            commitMap[STORAGE_KEYS.CARBON_SETTINGS] = JSON.stringify(sanitizedData.carbonSettings);
        }

        // Import AI Settings (explicitly if present)
        // Normalising here clamps the host to loopback, the port to a real port
        // and every numeric option to its safe range, so an edited settings file
        // cannot point the assistant at an arbitrary address.
        if (sanitizedData.aiSettings) {
            const normalizedAI = normalizeAISettings(sanitizedData.aiSettings);
            if (normalizedAI.port !== sanitizedData.aiSettings.port) {
                console.warn('[Security] Import contained an invalid AI port. Reset to default 11434.');
            }
            commitMap[STORAGE_KEYS.AI_SETTINGS] = JSON.stringify(normalizedAI);
        }

        // Commit. If a write fails part-way (most likely a storage quota error), report the
        // partial state honestly rather than claiming a clean failure over half-replaced data.
        const written: string[] = [];
        try {
            for (const [key, value] of Object.entries(commitMap)) {
                writeStore(key, value);
                written.push(key);
            }
        } catch (writeErr: unknown) {
            console.error("Import commit failed:", writeErr);
            return {
                success: false,
                message: written.length === 0
                    ? "Failed to import: your browser storage rejected the write (it may be full)."
                    : `Import stopped part-way: ${written.length} of ${Object.keys(commitMap).length} sections were replaced before storage ran out of space. Please re-import or restore a backup.`
            };
        }

        return {
            success: true,
            message: droppedRecords.length > 0
                ? `Settings imported. Skipped ${droppedRecords.join(', ')} that did not match the expected format.`
                : `Settings imported successfully.`
        };
    } catch (error: unknown) {
        console.error("Import error:", error);
        return { success: false, message: "Failed to import settings" };
    }
};



export const DEFAULT_AI_SETTINGS: AISettings = {
    enabled: false,
    host: 'localhost',
    port: 11434,
    model: "llama3",
    contextLength: 4096,
    // Shop analytics wants repeatable answers, not creative ones.
    temperature: 0.3,
    requestTimeoutMs: 90_000,
    redactPII: true,
    persistChat: true,
    customInstructions: "",
};

/** Fired whenever AI settings change, so hooks can react without a reload. */
export const AI_SETTINGS_EVENT = "ai_settings_updated";

const clamp = (value: number, min: number, max: number, fallback: number): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
};

/**
 * Fills in every field a stored blob may predate and clamps it to a safe range.
 * Settings written before a field existed read as `undefined`, so merging over
 * the defaults here is what keeps older installs working after an upgrade.
 */
export const normalizeAISettings = (partial: Partial<AISettings> | null | undefined): AISettings => {
    const merged = { ...DEFAULT_AI_SETTINGS, ...(partial || {}) };
    return {
        ...merged,
        enabled: Boolean(merged.enabled),
        host: merged.host === '127.0.0.1' ? '127.0.0.1' : 'localhost',
        port: isValidLocalAIPort(merged.port) ? Number(merged.port) : DEFAULT_AI_SETTINGS.port,
        model: sanitize(merged.model || DEFAULT_AI_SETTINGS.model),
        contextLength: clamp(merged.contextLength, 1024, 131072, DEFAULT_AI_SETTINGS.contextLength),
        temperature: clamp(merged.temperature, 0, 1, DEFAULT_AI_SETTINGS.temperature),
        requestTimeoutMs: clamp(merged.requestTimeoutMs, 10_000, 300_000, DEFAULT_AI_SETTINGS.requestTimeoutMs),
        redactPII: merged.redactPII !== false,
        persistChat: merged.persistChat !== false,
        customInstructions: (merged.customInstructions || "").slice(0, 1000),
    };
};

export const getAISettings = (): AISettings => {
    // Local AI is allowed on Desktop or Localhost (Dev)
    const raw = localStorage.getItem(STORAGE_KEYS.AI_SETTINGS);

    let stored: Partial<AISettings> | null = null;
    if (raw) {
        try {
            // Transparent industrial decryption layer
            stored = JSON.parse(unwrapSecret(raw));
        } catch {
            // Fallback for transition from unencrypted legacy data or corruption.
            // importAllSettings writes this key unencrypted, so this branch stays.
            try {
                stored = JSON.parse(raw);
            } catch {
                stored = null;
            }
        }
    }

    const settings = normalizeAISettings(stored);

    // Security & Infrastructure Restriction:
    // Enforce Local AI as disabled on production web-hosted environments
    // to prevent confusing cross-origin or connectivity errors.
    // Allowed on Desktop or Localhost (Dev).
    if (!isAIAllowed) {
        return { ...settings, enabled: false };
    }

    return settings;
};

export const saveAISettings = (settings: AISettings) => {
    const normalized = normalizeAISettings(settings);
    const encrypted = wrapSecret(JSON.stringify(normalized));
    writeStore(STORAGE_KEYS.AI_SETTINGS, encrypted);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AI_SETTINGS_EVENT));
    }
};



/** Cap on the local AI audit trail; oldest entries are dropped first. */
const MAX_AI_AUDIT_ENTRIES = 200;

/**
 * Local, append-only record of what the assistant proposed and what the user
 * allowed. The system prompt tells the model its actions are logged — this is
 * that log. It never leaves the device.
 */
export const appendAIAudit = (entry: Omit<AIAuditEntry, "timestamp">): void => {
    try {
        const entries = getAIAudit();
        entries.push({ ...entry, timestamp: new Date().toISOString() });
        const trimmed = entries.slice(-MAX_AI_AUDIT_ENTRIES);
        writeStore(STORAGE_KEYS.AI_AUDIT, wrapSecret(JSON.stringify(trimmed)));
    } catch (err) {
        console.warn("[AI Audit] Could not record entry:", err);
    }
};

export const getAIAudit = (): AIAuditEntry[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_AUDIT);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(unwrapSecret(raw));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const clearAIAudit = (): void => {
    localStorage.removeItem(STORAGE_KEYS.AI_AUDIT);
};



/** Cap on the persisted chat transcript. */
const MAX_AI_CHAT_MESSAGES = 50;

/**
 * Chat transcripts contain customer names and financials, so they are
 * obfuscated like quotes and capped. Only stored when `persistChat` is on.
 */
export const getAIChat = (): AIChatMessageRecord[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_CHAT);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(unwrapSecret(raw));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const saveAIChat = (messages: AIChatMessageRecord[]): void => {
    try {
        const trimmed = messages.slice(-MAX_AI_CHAT_MESSAGES);
        writeStore(STORAGE_KEYS.AI_CHAT, wrapSecret(JSON.stringify(trimmed)));
    } catch (err) {
        console.warn("[AI Chat] Could not persist transcript:", err);
    }
};

export const clearAIChat = (): void => {
    localStorage.removeItem(STORAGE_KEYS.AI_CHAT);
};



export const getBridgeSettings = (): BridgeSettings => {
    const raw = localStorage.getItem(STORAGE_KEYS.BRIDGE_SETTINGS);
    const fallback: BridgeSettings = {
        enabled: false,
        port: 50505
    };

    if (!raw) return fallback;

    try {
        const decrypted = unwrapSecret(raw);
        return JSON.parse(decrypted);
    } catch {
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    }
};

export const saveBridgeSettings = (settings: BridgeSettings): void => {
    const sanitized = {
        ...settings,
        port: isPortForbidden(settings.port) ? 50505 : settings.port
    };
    const encrypted = wrapSecret(JSON.stringify(sanitized));
    writeStore(STORAGE_KEYS.BRIDGE_SETTINGS, encrypted);
};



export const getNotifications = (): Notification[] => {
    const raw = safeParse<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return raw.map(decryptNotification);
};

export const saveNotification = (notification: Omit<Notification, "id" | "timestamp" | "status">): Notification => {
    const notifications = getNotifications();
    const newNotification: Notification = {
        source: 'SYSTEM', // Default to SYSTEM provenance
        ...notification,
        title: sanitize(notification.title),
        message: sanitize(notification.message),
        metadata: notification.metadata ? Object.entries(notification.metadata).reduce((acc, [key, val]) => ({
            ...acc,
            [key]: typeof val === 'string' ? sanitize(val) : val
        }), {}) : undefined,
        id: generateId(),
        timestamp: new Date().toISOString(),
        status: 'NEW'
    };
    notifications.unshift(newNotification);
    writeStore(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications.slice(0, 100).map(encryptNotification)));
    return newNotification;
};

export const updateNotificationStatus = (id: string, status: NotificationStatus): void => {
    const notifications = getNotifications().map(n => 
        n.id === id ? { ...n, status } : n
    );
    writeStore(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications.map(encryptNotification)));
};

export const deleteNotification = (id: string): void => {
    const notifications = getNotifications().filter(n => n.id !== id);
    writeStore(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications.map(encryptNotification)));
};

export const clearAllNotifications = (): void => {
    writeStore(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
};


export const getSystemHealthIssues = () => {
    const issues: Omit<Notification, "id" | "timestamp" | "status">[] = [];
    
    // 1. Low Stock
    const lowStock = getLowStockMaterials();
    lowStock.forEach(m => {
        issues.push({
            title: `Low Stock: ${m.name}`,
            message: `Current stock is ${m.totalInStock}${m.unit}. Consider ordering more.`,
            type: 'WARNING',
            source: 'SYSTEM'
        });
    });
    
    // 2. Machine Maintenance
    const machines = getMachines();
    machines.forEach(m => {
        if (isMachineMaintenanceDue(m)) {
            issues.push({
                title: `Maintenance Due: ${m.name}`,
                message: `Printer has reached ${Math.floor(m.totalRuntimeHours || 0)} hours. Perform scheduled maintenance.`,
                type: 'WARNING',
                source: 'SYSTEM'
            });
        }
    });

    // 3. Delayed Orders
    const quotes = getQuotes();
    const now = new Date();
    const delayThreshold = 48 * 60 * 60 * 1000; // 48 hours
    
    quotes.filter(q => q.status !== 'DONE' && q.status !== 'CANCELLED' && q.status !== 'DELIVERED').forEach(q => {
        const currentStatus = q.status || 'PENDING';
        const enteredAt = q.statusTimeline?.[currentStatus] || q.createdAt || new Date().toISOString();
        const timeInStage = now.getTime() - new Date(enteredAt).getTime();
        
        if (timeInStage > delayThreshold) {
            issues.push({
                title: `Order Delayed: ${q.projectName}`,
                message: `Order has been in ${currentStatus} for over 48 hours.`,
                type: 'INFO',
                source: 'SYSTEM'
            });
        }
    });
    
    return issues;
};

