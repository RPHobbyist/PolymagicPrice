/*
 * What Database Manager's backup, restore and reset actually do to a shop's data.
 *
 * The bar for a backup is that restoring it changes nothing. Import used to run every string
 * through the destructive `sanitize`, so a restore quietly renamed "Tom's Prints & Co." to
 * "Toms Prints  Co." — and the shop's currency was never in the file at all, so a restore onto a
 * new device showed every price in rupees at a rate of 1.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
    initializeDefaults,
    exportAllSettings,
    importAllSettings,
    resetSessionData,
    saveCustomer,
    saveQuote,
    saveEmployee,
    saveSpool,
    saveReview,
    saveGcode,
    saveCompanySettings,
    saveAISettings,
    saveBridgeSettings,
    saveProductionJobs,
    saveBatchItems,
    getAISettings,
    getProductionJobs,
    SettingsExport,
} from "./sessionStorage";
import { QuoteData } from "@/types/quote";
import { ProductionJob } from "@/types/production";

const SHOP = "Tom's Prints & Co.";

const aQuote = (overrides: Partial<QuoteData> = {}): QuoteData => ({
    materialCost: 10,
    machineTimeCost: 5,
    electricityCost: 1,
    laborCost: 2,
    overheadCost: 1,
    subtotal: 19,
    markup: 6,
    totalPrice: 25,
    unitPrice: 25,
    quantity: 1,
    printType: "FDM",
    projectName: 'Rook bracket 3/4" & 1/2"',
    printColour: "Black",
    clientName: SHOP,
    notes: "Customer's own spool — don't swap",
    parameters: { materialId: "fdm-pla", machineId: "fdm-bambu-p1s", printTime: "1:30", filamentWeight: "42" },
    ...overrides,
} as QuoteData);

/** A shop with something in every collection, written through the app's own save paths. */
const seedShop = () => {
    const customer = saveCustomer({ name: SHOP, company: 'O"Neil & Sons', notes: 'Wants a 12" plate', email: "tom@example.com" });
    const quote = saveQuote(aQuote({ customerId: customer.id }));
    saveEmployee({ name: "Arun D'Souza", jobPosition: "Operator & QA" });
    saveSpool({ materialId: "fdm-pla", name: 'PLA "Galaxy" Black', initialWeight: 1000, currentWeight: 640 });
    saveReview({ customerId: customer.id, rating: 5, comment: "Quick & tidy — they'll be back" });
    saveGcode({ id: "gc-1", name: "Rook's bracket", filePath: "D:/jobs/rook's bracket.gcode", printTime: 1.5, filamentWeight: 42, createdAt: new Date().toISOString() });
    saveCompanySettings({ name: SHOP, address: "12 Residency Road", email: "hello@example.com", phone: "+91 98765 43210", website: "https://example.com/?a=1&b=2" } as never);
    saveAISettings({ ...getAISettings(), customInstructions: "Line one.\nLine two: don't round prices." });
    saveBridgeSettings({ enabled: true, port: 50600 });
    saveProductionJobs([{
        id: "job-1",
        quote,
        status: "queued",
        machineId: null,
        priority: "normal",
        createdAt: new Date().toISOString(),
        order: 0,
    } as ProductionJob]);
    localStorage.setItem("preferred-currency", "USD");
    localStorage.setItem("conversion-rate", "0.012");
};

/** Everything but the timestamp, which is meant to differ. */
const contentOf = (backup: SettingsExport) => ({ ...backup, exportDate: undefined });

describe("a backup restored onto a fresh device", () => {
    beforeEach(() => {
        localStorage.clear();
        initializeDefaults();
    });

    it("comes back exactly as it was exported", () => {
        seedShop();
        const backup = exportAllSettings();

        localStorage.clear();
        initializeDefaults();
        const result = importAllSettings(JSON.parse(JSON.stringify(backup)));

        expect(result.success).toBe(true);
        expect(result.skipped).toEqual([]);
        expect(contentOf(exportAllSettings())).toEqual(contentOf(backup));
    });

    it("keeps apostrophes, ampersands and quote marks in names and notes", () => {
        seedShop();
        importAllSettings(exportAllSettings());

        const restored = exportAllSettings();
        expect(restored.customers[0].name).toBe(SHOP);
        expect(restored.customers[0].notes).toBe('Wants a 12" plate');
        expect(restored.company?.name).toBe(SHOP);
        expect(restored.quotes?.[0].projectName).toBe('Rook bracket 3/4" & 1/2"');
    });

    it("still strips markup from a tampered file", () => {
        const backup = exportAllSettings();
        backup.customers = [{ id: "c1", name: "<img src=x onerror=alert(1)>Eve", createdAt: new Date().toISOString() }];

        importAllSettings(backup);

        expect(exportAllSettings().customers[0].name).not.toMatch(/[<>]/);
    });

    it("brings the shop's currency and conversion rate with it", () => {
        seedShop();
        const backup = exportAllSettings();
        expect(backup.currency).toBe("USD");
        expect(backup.conversionRate).toBe(0.012);

        localStorage.clear();
        initializeDefaults();
        importAllSettings(backup);

        expect(localStorage.getItem("preferred-currency")).toBe("USD");
        expect(localStorage.getItem("conversion-rate")).toBe("0.012");
    });

    it("ignores a currency or rate the app would not accept", () => {
        const backup = { ...exportAllSettings(), currency: "XYZ", conversionRate: -4 };

        importAllSettings(backup);

        expect(localStorage.getItem("preferred-currency")).toBeNull();
        expect(localStorage.getItem("conversion-rate")).toBeNull();
    });

    it("skips a production job with no quote, and says so, rather than importing a crash", () => {
        seedShop();
        const backup = exportAllSettings();
        backup.productionJobs = [
            ...(backup.productionJobs ?? []),
            { id: "broken", status: "queued" } as unknown as ProductionJob,
            { id: "no-params", status: "queued", quote: { id: "q" } } as unknown as ProductionJob,
        ];

        const result = importAllSettings(backup);

        expect(result.success).toBe(true);
        expect(result.skipped).toEqual(["2 production jobs"]);
        expect(getProductionJobs().map(j => j.id)).toEqual(["job-1"]);
    });
});

describe("checking a backup before it is imported", () => {
    beforeEach(() => {
        localStorage.clear();
        initializeDefaults();
    });

    it("reports what the file holds and what it would skip, and writes nothing", () => {
        seedShop();
        const backup = exportAllSettings();
        backup.quotes = [...(backup.quotes ?? []), { id: "bad" } as unknown as QuoteData];

        localStorage.clear();
        initializeDefaults();
        const before = JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));

        const preview = importAllSettings(backup, { dryRun: true });

        expect(preview.success).toBe(true);
        expect(preview.counts?.quotes).toBe(1);
        expect(preview.counts?.customers).toBe(1);
        expect(preview.counts?.["production jobs"]).toBe(1);
        expect(preview.skipped).toEqual(["1 quote"]);
        expect(preview.exportDate).toBe(backup.exportDate);
        expect(JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])))).toBe(before);
    });

    it("refuses a file that is not a backup, as the real import would", () => {
        const preview = importAllSettings({ hello: "world" } as unknown as SettingsExport, { dryRun: true });
        expect(preview.success).toBe(false);
    });
});

describe("resetting the database", () => {
    beforeEach(() => {
        localStorage.clear();
        initializeDefaults();
    });

    it("also empties the calculator's batch tray", () => {
        saveBatchItems([aQuote({ id: "b1" })]);

        resetSessionData();

        expect(localStorage.getItem("batch_quote_items")).toBeNull();
    });

    it("returns the currency and conversion rate to their defaults", () => {
        localStorage.setItem("preferred-currency", "EUR");
        localStorage.setItem("conversion-rate", "0.011");

        resetSessionData();

        expect(localStorage.getItem("preferred-currency")).toBeNull();
        expect(localStorage.getItem("conversion-rate")).toBeNull();
    });
});

describe("a tampered backup", () => {
    it("has markup stripped from strings inside arrays too", () => {
        localStorage.clear();
        initializeDefaults();
        const backup = exportAllSettings();
        backup.customers = [{ id: "c1", name: "Eve", tags: ["<img src=x onerror=alert(1)>vip"], createdAt: new Date().toISOString() }];

        importAllSettings(backup);

        expect(exportAllSettings().customers[0].tags?.[0]).not.toMatch(/[<>]/);
    });
});
