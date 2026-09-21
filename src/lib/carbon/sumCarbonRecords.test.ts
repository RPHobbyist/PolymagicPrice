import { describe, it, expect } from "vitest";
import { sumCarbonRecords } from "./carbonCalculator";
import { QuoteCarbon } from "@/types/quote";

const record = (overrides: Partial<QuoteCarbon> = {}): QuoteCarbon => ({
    kg: 3,
    energyKg: 1,
    materialKg: 1.8,
    wasteKg: 0.2,
    kWh: 1.4,
    deliveredKg: 0.5,
    gridGPerKWh: 710,
    efKgPerKg: 5.76,
    wattsUsed: 110,
    src: { time: "actual", mass: "actual", watts: "measured", ef: "library" },
    grade: "MEASURED",
    ...overrides,
});

describe("sumCarbonRecords", () => {
    it("adds the totals of a batch's children", () => {
        const total = sumCarbonRecords([
            record(),
            record({ kg: 2, energyKg: 0.5, materialKg: 1.4, wasteKg: 0.1, kWh: 0.7, deliveredKg: 0.3 }),
        ])!;

        expect(total.kg).toBeCloseTo(5, 4);
        expect(total.energyKg).toBeCloseTo(1.5, 4);
        expect(total.materialKg).toBeCloseTo(3.2, 4);
        expect(total.wasteKg).toBeCloseTo(0.3, 4);
        expect(total.kWh).toBeCloseTo(2.1, 4);
        // Delivered mass has to add up too, or the batch's intensity would be wrong.
        expect(total.deliveredKg).toBeCloseTo(0.8, 4);
    });

    it("takes the weakest grade, so one estimated child keeps the batch an estimate", () => {
        const total = sumCarbonRecords([
            record({ grade: "MEASURED" }),
            record({ grade: "ESTIMATE" }),
            record({ grade: "ACTUAL" }),
        ])!;

        expect(total.grade).toBe("ESTIMATE");
    });

    it("marks the result as an aggregate, because its per-unit fields describe one child", () => {
        const total = sumCarbonRecords([record(), record({ efKgPerKg: 2.47 })])!;
        expect(total.flags).toContain("aggregate");
    });

    it("passes a single record through untouched and handles an empty batch", () => {
        const single = record();
        expect(sumCarbonRecords([single])).toBe(single);
        expect(sumCarbonRecords([])).toBeUndefined();
        expect(sumCarbonRecords([undefined, undefined])).toBeUndefined();
    });
});
