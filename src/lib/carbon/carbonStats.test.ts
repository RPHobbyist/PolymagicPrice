import { describe, it, expect } from "vitest";
import { buildCarbonOverview, computeIdleOverheadKg } from "./carbonStats";
import { Machine, QuoteCarbon, QuoteData } from "@/types/quote";

const carbon = (overrides: Partial<QuoteCarbon> = {}): QuoteCarbon => ({
    kg: 3,
    energyKg: 1,
    materialKg: 1.8,
    wasteKg: 0.2,
    kWh: 1.4,
    deliveredKg: 0.5,
    gridGPerKWh: 710,
    efKgPerKg: 5.76,
    wattsUsed: 100,
    src: { time: "actual", mass: "actual", watts: "library", ef: "library" },
    grade: "ACTUAL",
    ...overrides,
});

const quote = (overrides: Partial<QuoteData> = {}): QuoteData => ({
    id: Math.random().toString(36).slice(2),
    projectName: "Part",
    printType: "FDM",
    quantity: 1,
    status: "DONE",
    materialCost: 1, machineTimeCost: 1, electricityCost: 0, laborCost: 0, overheadCost: 0,
    totalPrice: 10,
    createdAt: "2026-01-05T00:00:00.000Z",
    parameters: { printTime: "2", filamentWeight: "100", machineName: "Bambu Lab P1S", materialName: "PLA" },
    carbon: carbon(),
    ...overrides,
} as QuoteData);

describe("buildCarbonOverview", () => {
    it("books each job in the month it was completed, not the month it was quoted", () => {
        const overview = buildCarbonOverview([
            quote({
                createdAt: "2026-01-05T00:00:00.000Z",
                statusTimeline: { DONE: "2026-03-20T00:00:00.000Z" },
            }),
        ]);

        expect(overview.months).toHaveLength(1);
        expect(overview.months[0].month).toBe("2026-03");
    });

    it("leaves out work that was only quoted", () => {
        const overview = buildCarbonOverview([
            quote({ status: "DONE" }),
            quote({ status: "PENDING", statusTimeline: undefined }),
        ]);

        expect(overview.jobs).toHaveLength(1);
    });

    it("groups the fleet and compares machines on kWh per print-hour", () => {
        const overview = buildCarbonOverview([
            quote({ parameters: { machineName: "Printer A", printTime: "2" }, carbon: carbon({ kWh: 2, wattsUsed: 100 }) }),
            quote({ parameters: { machineName: "Printer A", printTime: "2" }, carbon: carbon({ kWh: 1, wattsUsed: 100 }) }),
            quote({ parameters: { machineName: "Printer B", printTime: "2" }, carbon: carbon({ kWh: 6, wattsUsed: 300 }) }),
        ]);

        const a = overview.fleet.find(f => f.machineName === "Printer A")!;
        const b = overview.fleet.find(f => f.machineName === "Printer B")!;

        expect(a.jobs).toBe(2);
        expect(a.hours).toBeCloseTo(30, 4);       // 3 kWh at 100 W
        expect(a.energyRate).toBeCloseTo(0.1, 4); // 100 W
        expect(b.energyRate).toBeCloseTo(0.3, 4); // 300 W
    });

    it("names the unmeasured machine carrying the most energy as the one to meter", () => {
        const overview = buildCarbonOverview([
            quote({ parameters: { machineName: "Small" }, carbon: carbon({ kWh: 1 }) }),
            quote({ parameters: { machineName: "Thirsty" }, carbon: carbon({ kWh: 9 }) }),
            quote({
                parameters: { machineName: "Already metered" },
                carbon: carbon({ kWh: 20, src: { time: "actual", mass: "actual", watts: "measured", ef: "library" } }),
            }),
        ]);

        expect(overview.meterNext).toBe("Thirsty");
    });

    it("splits the total by source", () => {
        const overview = buildCarbonOverview([quote(), quote()]);

        expect(overview.sources.energyKg).toBeCloseTo(2, 4);
        expect(overview.sources.materialKg).toBeCloseTo(3.6, 4);
        expect(overview.sources.wasteKg).toBeCloseTo(0.4, 4);
    });
});

describe("computeIdleOverheadKg", () => {
    const machine = (name: string, idleWatts?: number): Machine => ({
        id: name, name, hourly_cost: 5, power_consumption_watts: 350, print_type: "FDM", idleWatts,
    });

    it("charges standby power only for the hours a machine was not printing", () => {
        const now = new Date("2026-09-20T00:00:00.000Z");
        // 10 W idle × 720 h in the window × 473 g/kWh = 3.4 kg when the printer never runs.
        const idleOnly = computeIdleOverheadKg([], [machine("Idle One", 10)], 473, 30, now);
        expect(idleOnly).toBeCloseTo((10 * 720 / 1000) * 473 / 1000, 3);
    });

    it("never goes negative for a machine with years of history", () => {
        const now = new Date("2026-09-20T00:00:00.000Z");
        // A job whose recorded runtime exceeds the window: lifetime hours must not be subtracted.
        const busy = quote({
            statusTimeline: { DONE: "2026-09-19T00:00:00.000Z" },
            parameters: { machineName: "Veteran" },
            carbon: carbon({ kWh: 500, wattsUsed: 100 }), // 5,000 hours
        });

        expect(computeIdleOverheadKg([busy], [machine("Veteran", 10)], 473, 30, now)).toBe(0);
    });

    it("falls back to a typical standby figure when none was entered", () => {
        const now = new Date("2026-09-20T00:00:00.000Z");
        expect(computeIdleOverheadKg([], [machine("No Idle Set")], 473, 30, now)).toBeGreaterThan(0);
    });
});
