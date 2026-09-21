import { describe, it, expect } from "vitest";
import { renderContext, estimateTokens, selectGlossary, buildSystemMessages, ShopContext } from "./contextManager";
import { makeFormatters } from "@/lib/currencyFormat";
import { CURRENCIES } from "@/types/currency";
import { QuoteStats } from "@/types/quote";

const fmt = makeFormatters(CURRENCIES[0], 1);

const stats: QuoteStats = {
    totalQuotes: 420,
    totalRevenue: 125000,
    totalProfit: 41000,
    avgQuoteValue: 297.6,
    fdmCount: 300,
    resinCount: 120,
    recentQuotes: 18,
    totalPrintTime: 5400,
    totalFilamentUsed: 210,
    totalResinUsed: 34,
    failedPrintsCount: 26,
    repeatCustomerRate: 38,
    topCustomers: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: `Customer ${i}`, count: 10 - i, revenue: 9000 - i * 500 })),
    revenueGrowth: 12.5,
    totalLaborCost: 30000,
    totalElectricityCost: 4000,
    totalMaterialCost: 38000,
    totalOverheadCost: 12000,
    avgMargin: 32.8,
    statusDistribution: { PENDING: 40, PRINTING: 12, DONE: 350, CANCELLED: 18 },
};

/** A shop far larger than a hobbyist's: 200 materials, 40 machines, 30 alerts. */
const bigShop: ShopContext = {
    companyName: "Volume Print Co",
    stats,
    load: {
        queuedOrders: 52,
        queuedUnits: 310,
        queuedPrintHours: 940,
        machineCount: 40,
        utilizationPercent: 88,
        estimatedDays: 6.4,
        completionDate: new Date(),
        bottleneck: { machineName: "X1C-14", hoursOccupied: 51 },
    },
    findings: Array.from({ length: 30 }, (_, i) => ({
        kind: 'DELAY' as const,
        severity: 'WARNING' as const,
        title: "Order Delay Alert",
        message: `Order #${1000 + i} (Enclosure Bracket Revision ${i}) is delaying in printing stage.`,
        metadata: { type: 'DELAY' },
    })),
    machines: Array.from({ length: 40 }, (_, i) => ({
        name: `Machine ${i} X1-Carbon`,
        type: "FDM",
        hourlyRate: 2.5 + i / 10,
        runtime: 1200 + i,
        maintenanceInterval: 500,
    })),
    materials: Array.from({ length: 200 }, (_, i) => ({
        name: `Material ${i} Premium PETG Filament`,
        type: "FDM",
        costPerUnit: 0.02 + i / 1000,
        unit: "g",
        inStock: 3400 - i,
    })),
    constants: Array.from({ length: 25 }, (_, i) => ({ id: `c${i}`, name: `Consumable ${i}`, value: i, unit: "/ml" })),
    lowStockAlerts: Array.from({ length: 12 }, (_, i) => ({ name: `Material ${i}`, stock: 90 - i, threshold: 200, unit: "g" })),
    topMaterials: [{ name: "PETG Black", count: 90 }],
    topMachines: [{ name: "X1C-01", count: 120 }],
    performance: {
        avgTimeDeviation: 8.4,
        highestFailureProjects: [{ name: "Bracket", count: 9 }],
    },
    carbon: {
        gridGPerKWh: 710,
        totalKg: 1840.5,
        perPart: 2.2,
        perKg: 4.1,
        energySharePct: 38,
        quotedNotPrintedKg: 260.4,
    },
};

const CAPS = { machines: 8, materials: 10, alerts: 8, customers: 5, constants: 8, carbon: 1 };

describe("AI context budget", () => {
    it("keeps a very large shop inside the data budget", () => {
        const rendered = renderContext(bigShop, fmt, CAPS);
        expect(estimateTokens(rendered)).toBeLessThanOrEqual(1400);
    });

    it("caps long lists and says how many were left out", () => {
        const rendered = renderContext(bigShop, fmt, CAPS);
        expect(rendered).toContain("...and 190 more");
        expect(rendered).toContain("MATERIALS (200)");
    });

    it("uses the configured currency, and each material's own unit", () => {
        const euro = makeFormatters(CURRENCIES.find(c => c.code === "EUR") || CURRENCIES[0], 1);
        const rendered = renderContext(bigShop, euro, CAPS);
        expect(rendered).toContain("€");
        expect(rendered).not.toContain("$");
    });

    it("includes capacity from the shared capacity engine", () => {
        const rendered = renderContext(bigShop, fmt, CAPS);
        expect(rendered).toContain("Utilization: 88%");
        expect(rendered).toContain("X1C-14");
    });

    it("builds one system message that leaves room to answer in a 4096-token model", () => {
        const message = buildSystemMessages(bigShop, { fmt, userMessage: "how is my shop?" });

        expect(message.role).toBe("system");
        // Rules + commands + data + glossary. Half the smallest supported context
        // is the ceiling; the old prompt used ~2,660 tokens before any shop data.
        expect(estimateTokens(message.content)).toBeLessThan(2048);
        expect(message.content).toContain("[DATA_START]");
        expect(message.content).toContain("[DATA_END]");
    });

    it("appends the shop's own instructions after the built-in rules", () => {
        const message = buildSystemMessages(bigShop, {
            fmt,
            customInstructions: "Always quote in batches of 10.",
        });
        expect(message.content).toContain("Always quote in batches of 10.");
        expect(message.content.indexOf("RULES")).toBeLessThan(message.content.indexOf("Always quote in batches of 10."));
    });

    it("only pulls in glossary terms that are actually in play", () => {
        expect(selectGlossary("what is my revenue?", [])).toHaveLength(0);
        expect(selectGlossary("is the AMS jamming?", []).map(([term]) => term)).toContain("AMS");
        expect(selectGlossary(undefined, ["Bambu X1-Carbon"]).map(([term]) => term)).toContain("X1-Carbon");
    });
});
