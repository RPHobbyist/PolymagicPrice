import { describe, it, expect } from "vitest";
import { computeQuoteStats } from "./quoteStats";
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
