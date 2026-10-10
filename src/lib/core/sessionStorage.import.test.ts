/*
 * What a restored backup leaves on disk.
 *
 * Every save path in this module maps its records through an `encrypt*` helper before writing, but
 * the import loop committed the optional collections with a bare JSON.stringify. Because
 * `unwrapSecret` passes an unprefixed string straight through, nothing ever looked broken: a shop
 * that restored a backup simply had its customer names, emails, phone numbers, addresses, quote
 * project names and notes sitting readable in localStorage from then on.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    importAllSettings,
    exportAllSettings,
    getCustomers,
    getQuotes,
    getGcodes,
    getNotifications,
} from "./sessionStorage";

const ENC_PREFIX = "v1:enc:";

/** Reads a collection back as it physically sits in storage, with no decryption. */
const rawRecords = (key: string): Record<string, unknown>[] =>
    JSON.parse(localStorage.getItem(key) || "[]");

const aBackup = () => ({
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    materials: [{ id: "m1", name: "PLA", cost_per_unit: 25, unit: "kg", print_type: "FDM" }],
    machines: [{ id: "mac1", name: "P1S", hourly_cost: 2, print_type: "FDM" }],
    constants: [{ id: "electricity", name: "Electricity Rate", value: 0.15, unit: "/kWh" }],
    customers: [{
        id: "c1",
        name: "Priya Sharma",
        email: "priya@example.com",
        phone: "+91 98765 43210",
        address: "12 Residency Road, Bengaluru",
        notes: "Prefers matte finish",
        createdAt: new Date().toISOString(),
    }],
    reviews: [{ id: "r1", customerId: "c1", rating: 5, comment: "Lovely print", createdAt: new Date().toISOString() }],
    spools: [{ id: "s1", materialId: "m1", initialWeight: 1000, currentWeight: 750, notes: "Opened in March" }],
    gcodes: [{ id: "g1", name: "bracket-v3", filePath: "D:/jobs/bracket-v3.gcode", printTime: 2, createdAt: new Date().toISOString() }],
    employees: [{ id: "e1", name: "Arun Kumar", jobPosition: "Operator", createdAt: new Date().toISOString() }],
    quotes: [{
        id: "q1",
        projectName: "Prosthetic jig",
        clientName: "Priya Sharma",
        notes: "Rush order, do not discuss publicly",
        materialCost: 10,
        machineTimeCost: 5,
        totalPrice: 30,
        quantity: 1,
        parameters: {},
    }],
    notifications: [{ id: "n1", title: "Low Stock: PLA", message: "Current stock is 120g", status: "NEW", timestamp: new Date().toISOString() }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

describe("a restored backup", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("reports success on a well-formed file", () => {
        const result = importAllSettings(aBackup());
        expect(result.success).toBe(true);
    });

    it("leaves no customer PII readable in storage", () => {
        importAllSettings(aBackup());

        const [stored] = rawRecords("session_customers");
        expect(stored.name).toMatch(ENC_PREFIX);
        expect(stored.email).toMatch(ENC_PREFIX);
        expect(stored.phone).toMatch(ENC_PREFIX);
        expect(stored.address).toMatch(ENC_PREFIX);
        expect(stored.notes).toMatch(ENC_PREFIX);

        // The plaintext must not appear anywhere in that key.
        expect(localStorage.getItem("session_customers")).not.toContain("Priya Sharma");
        expect(localStorage.getItem("session_customers")).not.toContain("priya@example.com");
    });

    it("leaves no quote project name, client or note readable in storage", () => {
        importAllSettings(aBackup());

        const [stored] = rawRecords("session_quotes");
        expect(stored.projectName).toMatch(ENC_PREFIX);
        expect(stored.clientName).toMatch(ENC_PREFIX);
        expect(stored.notes).toMatch(ENC_PREFIX);
        expect(localStorage.getItem("session_quotes")).not.toContain("do not discuss publicly");
    });

    it("encrypts the remaining collections that carry free text", () => {
        importAllSettings(aBackup());

        expect(rawRecords("session_gcodes")[0].name).toMatch(ENC_PREFIX);
        expect(rawRecords("session_gcodes")[0].filePath).toMatch(ENC_PREFIX);
        expect(rawRecords("session_notifications")[0].title).toMatch(ENC_PREFIX);
        expect(rawRecords("session_reviews")[0].comment).toMatch(ENC_PREFIX);
        expect(rawRecords("session_spools")[0].notes).toMatch(ENC_PREFIX);
        expect(rawRecords("session_employees")[0].name).toMatch(ENC_PREFIX);
    });

    it("still reads every value back exactly as it went in", () => {
        importAllSettings(aBackup());

        const customer = getCustomers()[0];
        expect(customer.name).toBe("Priya Sharma");
        expect(customer.email).toBe("priya@example.com");
        expect(customer.address).toBe("12 Residency Road, Bengaluru");

        const quote = getQuotes()[0];
        expect(quote.projectName).toBe("Prosthetic jig");
        expect(quote.notes).toBe("Rush order, do not discuss publicly");

        expect(getGcodes()[0].name).toBe("bracket-v3");
        expect(getNotifications()[0].title).toBe("Low Stock: PLA");
    });

    describe("when storage refuses a section part-way", () => {
        let setItem: ReturnType<typeof vi.spyOn>;

        /**
         * A quota the way a browser enforces one: writes are accepted while the store fits inside
         * a byte budget and refused when it would not. A blanket "throw after N calls" mock would
         * also refuse the rollback's own writes, which is not how a full store behaves — removing
         * the oversized value frees the room the restore needs.
         */
        const withQuotaOf = (budgetBytes: number) => {
            const real = globalThis.localStorage.setItem.bind(globalThis.localStorage);
            setItem = vi.spyOn(globalThis.localStorage, "setItem").mockImplementation(((key: string, value: string) => {
                let used = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i)!;
                    if (k !== key) used += k.length + (localStorage.getItem(k) || "").length;
                }
                if (used + key.length + value.length > budgetBytes) {
                    const err = new Error("Setting the value exceeded the quota.");
                    err.name = "QuotaExceededError";
                    throw err;
                }
                real(key, value);
            }) as typeof localStorage.setItem);
        };

        afterEach(() => {
            setItem?.mockRestore();
        });

        it("puts the shop's existing data back instead of leaving a half-replaced database", () => {
            // Something is already stored: the shop's own materials and quotes.
            importAllSettings(aBackup());
            const materialsBefore = localStorage.getItem("session_materials");
            const quotesBefore = localStorage.getItem("session_quotes");

            const usedNow = Object.keys(localStorage).reduce(
                (sum, k) => sum + k.length + (localStorage.getItem(k) || "").length,
                0
            );

            // Room for a little more than what is already stored, but not for a backup whose
            // records are much longer.
            withQuotaOf(usedNow + 400);

            const incoming = aBackup();
            incoming.materials[0].name = "Replaced PLA " + "x".repeat(2000);
            incoming.quotes[0].projectName = "Replaced project " + "y".repeat(2000);

            const result = importAllSettings(incoming);

            expect(result.success).toBe(false);
            expect(result.message).toContain("left exactly as it was");
            expect(localStorage.getItem("session_materials")).toBe(materialsBefore);
            expect(localStorage.getItem("session_quotes")).toBe(quotesBefore);
        });

        it("removes keys that did not exist before the failed import", () => {
            localStorage.clear();
            withQuotaOf(600);

            const result = importAllSettings(aBackup());

            expect(result.success).toBe(false);
            expect(localStorage.getItem("session_customers")).toBeNull();
            expect(localStorage.getItem("session_quotes")).toBeNull();
        });
    });

    it("round-trips through an export without double-encrypting", () => {
        importAllSettings(aBackup());

        // Export reads through the getters, so it holds plaintext; re-importing it must land
        // encrypted again and still read back cleanly rather than accumulating "v1:enc:" layers.
        const second = importAllSettings(exportAllSettings());
        expect(second.success).toBe(true);

        expect(rawRecords("session_customers")[0].name).toMatch(ENC_PREFIX);
        expect(getCustomers()[0].name).toBe("Priya Sharma");
        expect(getQuotes()[0].projectName).toBe("Prosthetic jig");
    });
});
