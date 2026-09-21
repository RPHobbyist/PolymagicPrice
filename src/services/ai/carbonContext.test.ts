import { describe, it, expect } from "vitest";
import { buildSystemMessages, renderContext, selectGlossary, ShopContext } from "./contextManager";
import { executeHILCommand, processAICommands } from "./commands";
import { getConstants } from "@/lib/core/sessionStorage";
import { makeFormatters } from "@/lib/currencyFormat";
import { CURRENCIES } from "@/types/currency";
import { QuoteStats } from "@/types/quote";

const fmt = makeFormatters(CURRENCIES[0], 1);

const stats = {
    totalQuotes: 10, totalRevenue: 1000, totalProfit: 300, avgQuoteValue: 100,
    fdmCount: 10, resinCount: 0, recentQuotes: 2, totalPrintTime: 40,
    totalFilamentUsed: 4, totalResinUsed: 0, failedPrintsCount: 1, repeatCustomerRate: 0,
    topCustomers: [], revenueGrowth: 0, totalLaborCost: 100, totalElectricityCost: 20,
    totalMaterialCost: 400, totalOverheadCost: 50, avgMargin: 30, statusDistribution: { DONE: 10 },
} as QuoteStats;

const shop: ShopContext = {
    companyName: "Test Shop",
    stats,
    load: {
        queuedOrders: 0, queuedUnits: 0, queuedPrintHours: 0, machineCount: 1,
        utilizationPercent: 10, estimatedDays: 0, completionDate: new Date(), bottleneck: null,
    },
    findings: [],
    machines: [{ name: "Bambu Lab P1S", type: "FDM", hourlyRate: 8, runtime: 100, measuredWatts: 110 }],
    materials: [{ name: "PLA", type: "FDM", costPerUnit: 25, unit: "kg", inStock: 2000, co2PerKg: 5.76 }],
    constants: [],
    lowStockAlerts: [],
    topMaterials: [],
    topMachines: [],
    performance: { avgTimeDeviation: 0, highestFailureProjects: [] },
    carbon: { gridGPerKWh: 710, totalKg: 41.2, perPart: 2.1, perKg: 4.4, energySharePct: 38, quotedNotPrintedKg: 12 },
};

const CAPS = { machines: 8, materials: 10, alerts: 8, customers: 5, constants: 8, carbon: 1 };

describe("carbon in the assistant's context", () => {
    it("states the grid factor, which the constants list would have hidden", () => {
        const rendered = renderContext(shop, fmt, CAPS);

        expect(rendered).toContain("CARBON (estimates)");
        expect(rendered).toContain("710 gCO2e/kWh");
        expect(rendered).toContain("41.2 kgCO2e total");
    });

    it("keeps quoted-but-unprinted work out of the total it reports", () => {
        const rendered = renderContext(shop, fmt, CAPS);
        expect(rendered).toContain("not part of the total above");
    });

    it("carries per-machine wattage and per-material factors", () => {
        const rendered = renderContext(shop, fmt, CAPS);
        expect(rendered).toContain("110W measured");
        expect(rendered).toContain("5.76 kgCO2e/kg");
    });

    it("drops the carbon block on the tightest budget rung", () => {
        const rendered = renderContext(shop, fmt, { ...CAPS, carbon: 0 });
        expect(rendered).not.toContain("CARBON (estimates)");
    });

    it("says nothing has a footprint yet rather than reporting zero", () => {
        const empty = { ...shop, carbon: { gridGPerKWh: 473 } };
        expect(renderContext(empty, fmt, CAPS)).toContain("No completed job has a footprint yet");
    });

    it("forbids environmental claims and recomputation in the rules", () => {
        const message = buildSystemMessages(shop, { fmt });

        expect(message.content).toContain("carbon neutral");
        expect(message.content).toContain("never recalculate");
        // And the model is told the carbon command exists — the validator alone is not enough.
        expect(message.content).toContain("grid_intensity");
    });

    it("explains carbon terms from the app's own glossary", () => {
        const terms = selectGlossary("what does kgCO2e mean?", []).map(([term]) => term);
        expect(terms.join(" ")).toContain("kgCO2e");
    });
});

describe("the grid factor as an AI command", () => {
    it("is parsed and held for the user to approve", () => {
        const [result] = processAICommands('[CMD:SET_CONSTANT {"id":"grid_intensity","value":500}]');

        expect(result.command).toBe("SET_CONSTANT");
        expect(result.pending).toBe(true);
        expect(result.executed).toBe(false); // nothing happens without approval
    });

    it("applies a plausible factor once approved", () => {
        localStorage.clear();
        const result = executeHILCommand("SET_CONSTANT", { id: "grid_intensity", value: 500 });

        expect(result.executed).toBe(true);
        expect(getConstants().find(c => c.id === "grid_intensity")?.value).toBe(500);
    });

    it("refuses one outside the accepted range, even after approval", () => {
        localStorage.clear();
        const result = executeHILCommand("SET_CONSTANT", { id: "grid_intensity", value: 5000 });

        expect(result.executed).toBe(false);
        expect(result.message).toContain("0-1200");
    });
});
