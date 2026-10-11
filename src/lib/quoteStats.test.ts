import { describe, it, expect } from "vitest";
import { computeQuoteStats, isRevenueQuote } from "./quoteStats";
import { QuoteData } from "@/types/quote";

/**
 * Golden fixture. computeQuoteStats was lifted out of useSavedQuotes so the AI
 * assistant and the reports quote the same figures as the dashboard — these
 * numbers are what the dashboard produced before the move.
 */
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const quote = (overrides: Partial<QuoteData>): QuoteData => ({
    id: Math.random().toString(36).slice(2),
    projectName: "Part",
    printType: "FDM",
    quantity: 1,
    materialCost: 10,
    machineTimeCost: 5,
    electricityCost: 1,
    laborCost: 4,
    overheadCost: 2,
    totalPrice: 40,
    status: "DONE",
    createdAt: daysAgo(3),
    parameters: { printTime: "2", filamentWeight: "100" },
    ...overrides,
} as QuoteData);

describe("computeQuoteStats", () => {
    it("computes revenue, profit and margin from the quote book", () => {
        const stats = computeQuoteStats([
            quote({}),
            quote({ totalPrice: 60, materialCost: 20 }),
        ]);

        expect(stats.totalQuotes).toBe(2);
        expect(stats.totalRevenue).toBe(100);
        // (40 - 22) + (60 - 32)
        expect(stats.totalProfit).toBe(46);
        expect(stats.avgQuoteValue).toBe(50);
        expect(stats.avgMargin).toBeCloseTo(46, 5);
    });

    it("excludes cancelled quotes from revenue but still counts them", () => {
        const stats = computeQuoteStats([quote({}), quote({ status: "CANCELLED" })]);
        expect(stats.totalQuotes).toBe(2);
        expect(stats.totalRevenue).toBe(40);
        expect(stats.statusDistribution.CANCELLED).toBe(1);
    });

    it("scales time-based costs by actual vs estimated print time", () => {
        const withActual = computeQuoteStats([
            quote({ actualPrintTime: 4, parameters: { printTime: "2", filamentWeight: "100" } }),
        ]);
        // labor+electricity+machine (10) double, so profit drops by 10
        expect(withActual.totalProfit).toBe(8);
    });

    it("does not rescale costs when a multi-unit job lands on its estimate", () => {
        // 4 units × 2 h each = 8 h planned, and the job took 8 h in total, so nothing should move.
        // The whole-job actual used to be compared against the PER-UNIT estimate, giving a ratio of
        // 4 and inflating labour, electricity and machine cost on every multi-unit quote.
        const stats = computeQuoteStats([
            quote({ quantity: 4, actualPrintTime: 8, parameters: { printTime: "2", filamentWeight: "100" } }),
        ]);

        // 40 − (material 10 + labour 4 + electricity 1 + machine 5 + overhead 2)
        expect(stats.totalProfit).toBe(18);
        // The actual is already the whole job; it must not be multiplied by quantity again.
        expect(stats.totalPrintTime).toBe(8);
    });

    it("reads H:MM print times the way production does", () => {
        const stats = computeQuoteStats([
            quote({ quantity: 2, parameters: { printTime: "1:30", filamentWeight: "100" } }),
        ]);
        // parseFloat used to read "1:30" as 1, so this reported 2 h instead of 3.
        expect(stats.totalPrintTime).toBeCloseTo(3, 5);
    });

    it("reports 30-day revenue growth against the prior 30 days", () => {
        const stats = computeQuoteStats([
            quote({ createdAt: daysAgo(5), totalPrice: 150 }),
            quote({ createdAt: daysAgo(45), totalPrice: 100 }),
        ]);

        expect(stats.revenueGrowth).toBeCloseTo(50, 5);
    });

    it("converts material usage to kg and litres", () => {
        const stats = computeQuoteStats([
            quote({ printType: "FDM", quantity: 2, parameters: { printTime: "1", filamentWeight: "500" } }),
            quote({ printType: "Resin", quantity: 1, parameters: { printTime: "1", resinVolume: "250" } }),
        ]);
        expect(stats.totalFilamentUsed).toBeCloseTo(1, 5);
        expect(stats.totalResinUsed).toBeCloseTo(0.25, 5);
    });

    it("handles an empty shop without dividing by zero", () => {
        const stats = computeQuoteStats([]);
        expect(stats.totalRevenue).toBe(0);
        expect(stats.avgQuoteValue).toBe(0);
        expect(stats.avgMargin).toBe(0);
        expect(stats.repeatCustomerRate).toBe(0);
    });
});

describe("revenue definition", () => {
    it("counts only accepted work as revenue and keeps offers as pipeline", () => {
        const stats = computeQuoteStats([
            quote({ status: "DELIVERED", totalPrice: 100 }),
            quote({ status: "APPROVED", totalPrice: 50 }),
            quote({ status: "PENDING", totalPrice: 400 }),
            quote({ status: "FAILED", totalPrice: 70 }),
            quote({ status: "CANCELLED", totalPrice: 30 }),
        ]);
        expect(stats.totalQuotes).toBe(5);
        expect(stats.revenueQuotes).toBe(2);
        expect(stats.totalRevenue).toBe(150);
        expect(stats.pipelineValue).toBe(400);
        expect(isRevenueQuote(quote({ status: undefined }))).toBe(false);
    });

    it("averages over the quotes that are in revenue, not every quote", () => {
        const stats = computeQuoteStats([
            quote({ status: "DONE", totalPrice: 100 }),
            quote({ status: "CANCELLED", totalPrice: 900 }),
            quote({ status: "PENDING", totalPrice: 900 }),
        ]);
        expect(stats.avgQuoteValue).toBe(100);
    });

    it("books growth on the approval date and ignores future dates", () => {
        const stats = computeQuoteStats([
            // quoted 50 days ago but won 5 days ago -> last 30 days
            quote({ createdAt: daysAgo(50), statusTimeline: { APPROVED: daysAgo(5) }, totalPrice: 100 }),
            quote({ createdAt: daysAgo(45), totalPrice: 100 }),
            quote({ createdAt: daysAgo(-10), totalPrice: 5000 }),
        ]);
        expect(stats.revenueGrowth).toBeCloseTo(0, 5);
    });

    it("does not call anonymous customers repeat customers", () => {
        const stats = computeQuoteStats([
            quote({}), quote({}), quote({ clientName: "Valued Customer" }),
            quote({ clientName: "Asha" }), quote({ clientName: "asha " }), quote({ clientName: "Ben" }),
        ]);
        expect(stats.topCustomers.map(c => c.name).sort()).toEqual(["Asha", "Ben"]);
        expect(stats.repeatCustomerRate).toBe(50);
    });

    it("ignores unaccepted offers in material and time totals", () => {
        const stats = computeQuoteStats([
            quote({ status: "PENDING", parameters: { printTime: "10", filamentWeight: "1000" } }),
        ]);
        expect(stats.totalPrintTime).toBe(0);
        expect(stats.totalFilamentUsed).toBe(0);
    });
});

describe("batch masters", () => {
    it("reads time and material from the items when the master has none of its own", () => {
        const master = quote({
            isBatch: true,
            quantity: 1,
            parameters: { materialName: "Batch" },
            batchItems: [
                quote({ quantity: 2, parameters: { printTime: "1", filamentWeight: "100" } }),
                quote({ quantity: 1, parameters: { printTime: "3", filamentWeight: "50" } }),
            ],
        });
        const stats = computeQuoteStats([master]);
        expect(stats.totalPrintTime).toBeCloseTo(5, 5);          // 2x1h + 1x3h
        expect(stats.totalFilamentUsed).toBeCloseTo(0.25, 5);    // 200 g + 50 g
    });
});

describe("cost breakdown reconciles with profit", () => {
    it("revenue minus profit equals the sum of every listed cost", () => {
        const stats = computeQuoteStats([
            quote({ totalPrice: 100, paintingCost: 3, machineTimeCost: 5, parameters: { printTime: "2", filamentWeight: "100", consumablesTotal: 1.5, overheadPercentage: "10" }, quantity: 2 }),
        ]);
        const costs = stats.totalMaterialCost + stats.totalMachineCost! + stats.totalLaborCost + stats.totalElectricityCost
            + stats.totalPaintingCost! + stats.totalConsumablesCost! + stats.totalOverheadCost;
        expect(stats.totalRevenue - stats.totalProfit).toBeCloseTo(costs, 6);
    });

    it("moves overhead with the costs it is a percentage of when time is rescaled", () => {
        const base = { totalPrice: 100, quantity: 1, laborCost: 10, machineTimeCost: 10, electricityCost: 0, materialCost: 0, overheadCost: 2, parameters: { printTime: "4", overheadPercentage: "10" } };
        const stats = computeQuoteStats([quote({ ...base, actualPrintTime: 2 })]); // half the time
        expect(stats.totalOverheadCost).toBeCloseTo(1, 6);                         // 10 % of (5 + 5)
    });
});

describe("shipping is a pass-through", () => {
    it("is not counted as revenue or profit", () => {
        const stats = computeQuoteStats([quote({ totalPrice: 50, shippingCost: 10 })]);
        expect(stats.totalRevenue).toBe(40);
        expect(stats.totalProfit).toBe(40 - 22);
    });
});
