import { describe, it, expect } from "vitest";
import { carbonBookingDate, computeQuoteStats, quoteHasRun } from "./quoteStats";
import { QuoteCarbon, QuoteData } from "@/types/quote";

const carbon = (kg: number, energyKg = kg * 0.3, deliveredKg = 0.5): QuoteCarbon => ({
    kg,
    energyKg,
    materialKg: kg - energyKg,
    wasteKg: 0,
    kWh: 1,
    deliveredKg,
    gridGPerKWh: 710,
    efKgPerKg: 5.76,
    wattsUsed: 110,
    src: { time: "actual", mass: "actual", watts: "measured", ef: "library" },
    grade: "ACTUAL",
});

const quote = (overrides: Partial<QuoteData> = {}): QuoteData => ({
    id: Math.random().toString(36).slice(2),
    projectName: "Part",
    printType: "FDM",
    quantity: 1,
    materialCost: 10,
    machineTimeCost: 5,
    electricityCost: 1,
    laborCost: 0,
    overheadCost: 0,
    totalPrice: 40,
    createdAt: new Date().toISOString(),
    parameters: { printTime: "2", filamentWeight: "100" },
    ...overrides,
} as QuoteData);

describe("shop carbon totals", () => {
    it("counts only work that actually ran", () => {
        const stats = computeQuoteStats([
            quote({ status: "DONE", actualPrintTime: 2, carbon: carbon(4) }),
            quote({ status: "PENDING", carbon: carbon(10) }), // priced, never printed
        ]);

        expect(stats.totalCarbonKg).toBeCloseTo(4, 4);
        expect(stats.quotedNotPrintedKg).toBeCloseTo(10, 4);
    });

    it("counts a cancelled job that had already printed", () => {
        // Its revenue is excluded, but the spool was deducted and the printer drew power.
        const stats = computeQuoteStats([
            quote({ status: "CANCELLED", actualPrintTime: 3, carbon: carbon(2) }),
        ]);

        expect(stats.totalRevenue).toBe(0);
        expect(stats.totalCarbonKg).toBeCloseTo(2, 4);
        expect(stats.quotedNotPrintedKg).toBeUndefined();
    });

    it("reports nothing rather than zero when no job has completed", () => {
        const stats = computeQuoteStats([quote({ status: "PENDING" })]);

        expect(stats.totalCarbonKg).toBeUndefined();
        expect(stats.carbonPerPart).toBeUndefined();
        expect(stats.carbonPerKg).toBeUndefined();
    });

    it("derives per-part, intensity and the energy share", () => {
        const stats = computeQuoteStats([
            quote({ status: "DONE", quantity: 4, actualPrintTime: 8, carbon: carbon(10, 4, 2) }),
        ]);

        expect(stats.carbonPerPart).toBeCloseTo(2.5, 4);   // 10 kg over 4 parts
        expect(stats.carbonPerKg).toBeCloseTo(5, 4);       // 10 kg over 2 kg delivered
        expect(stats.carbonEnergyShare).toBeCloseTo(0.4, 4);
    });

    it("counts a batch master by its items, not as a single part", () => {
        const stats = computeQuoteStats([
            quote({
                status: "DONE",
                quantity: 1,
                isBatch: true,
                batchItems: [quote(), quote(), quote(), quote()],
                actualPrintTime: 8,
                carbon: carbon(10, 4, 2),
            }),
        ]);

        expect(stats.carbonPerPart).toBeCloseTo(2.5, 4);
    });
});

describe("quoteHasRun and carbonBookingDate", () => {
    it("treats actuals as proof a job ran, whatever its status says", () => {
        expect(quoteHasRun(quote({ status: "PENDING", actualPrintTime: 1 }))).toBe(true);
        expect(quoteHasRun(quote({ status: "APPROVED" }))).toBe(false);
        expect(quoteHasRun(quote({ status: "DELIVERED" }))).toBe(true);
    });

    it("books a footprint on the day the work finished, not the day it was quoted", () => {
        const q = quote({
            createdAt: "2026-01-10T00:00:00.000Z",
            statusTimeline: { DONE: "2026-03-04T00:00:00.000Z" },
        });

        expect(carbonBookingDate(q)).toBe("2026-03-04T00:00:00.000Z");
        expect(carbonBookingDate(quote({ createdAt: "2026-01-10T00:00:00.000Z" })))
            .toBe("2026-01-10T00:00:00.000Z");
    });
});
