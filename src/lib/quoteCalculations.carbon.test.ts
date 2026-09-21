import { describe, it, expect } from "vitest";
import { calculateFDMQuote, summariseQuote } from "./quoteCalculations";
import { FDMFormData, Machine, Material } from "@/types/quote";

const machine: Machine = {
    id: "m1",
    name: "Bambu Lab P1S",
    hourly_cost: 8,
    power_consumption_watts: 350,
    print_type: "FDM",
    measuredWatts: 110,
};

const material: Material = {
    id: "mat1",
    name: "PLA",
    cost_per_unit: 25,
    unit: "kg",
    print_type: "FDM",
};

const form = (overrides: Partial<FDMFormData> = {}): FDMFormData => ({
    projectName: "Bracket",
    printColour: "Black",
    materialId: "mat1",
    machineId: "m1",
    printTime: "4",
    filamentWeight: "250",
    laborHours: "0",
    overheadPercentage: "0",
    markupPercentage: "0",
    quantity: "2",
    selectedConsumableIds: [],
    ...overrides,
} as FDMFormData);

describe("carbon on a calculated quote", () => {
    it("freezes a footprint onto the quote alongside the price", () => {
        const quote = calculateFDMQuote({
            formData: form(),
            material,
            machine,
            electricityRate: 0.12,
            laborRate: 15,
            gridGPerKWh: 710,
        });

        // 2 units × 4 h = 8 h at 110 W → 0.88 kWh → 0.625 kg, plus 0.5 kg of PLA at 5.76.
        expect(quote.carbon?.kWh).toBeCloseTo(0.88, 3);
        expect(quote.carbon?.kg).toBeCloseTo(3.505, 2);
        expect(quote.carbon?.grade).toBe("ESTIMATE");
        expect(quote.carbon?.src.watts).toBe("measured");
    });

    it("keeps the per-part figure in the same place the money comes from", () => {
        const quote = calculateFDMQuote({
            formData: form(), material, machine, electricityRate: 0.12, laborRate: 15, gridGPerKWh: 710,
        });

        const summary = summariseQuote(quote);
        expect(summary.carbonKg).toBeCloseTo(3.505, 2);
        expect(summary.carbonPerPart).toBeCloseTo(1.752, 2);
        expect(summary.carbonGrade).toBe("ESTIMATE");
    });

    it("suppresses per-part on a batch master, whose quantity is 1 for the whole batch", () => {
        const quote = calculateFDMQuote({
            formData: form(), material, machine, electricityRate: 0.12, laborRate: 15, gridGPerKWh: 710,
        });

        const summary = summariseQuote({ ...quote, isBatch: true });
        expect(summary.carbonKg).toBeCloseTo(3.505, 2);
        expect(summary.carbonPerPart).toBeUndefined();
    });

    it("prices a quote normally when there is no footprint to compute", () => {
        const quote = calculateFDMQuote({
            formData: form({ printTime: "", filamentWeight: "", quantity: "1" }),
            material,
            machine,
            electricityRate: 0.12,
            laborRate: 15,
        });

        expect(quote.carbon).toBeUndefined();
        expect(Number.isFinite(quote.totalPrice)).toBe(true);
        expect(summariseQuote(quote).carbonKg).toBeUndefined();
    });

    it("falls back to the world-average grid factor when a caller omits it", () => {
        const quote = calculateFDMQuote({
            formData: form(), material, machine, electricityRate: 0.12, laborRate: 15,
        });
        expect(quote.carbon?.gridGPerKWh).toBe(473);
    });
});
