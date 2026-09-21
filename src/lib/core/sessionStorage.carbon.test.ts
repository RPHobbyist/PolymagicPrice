import { describe, it, expect, beforeEach } from "vitest";
import { getQuotes, recomputeQuoteCarbon, saveQuote, updateQuote } from "./sessionStorage";
import { QuoteData } from "@/types/quote";

const quote = (overrides: Partial<QuoteData> = {}): QuoteData => ({
    id: "q1",
    projectName: "Bracket",
    printType: "FDM",
    quantity: 2,
    materialCost: 10,
    machineTimeCost: 5,
    electricityCost: 1,
    laborCost: 0,
    overheadCost: 0,
    subtotal: 16,
    markup: 0,
    unitPrice: 8,
    totalPrice: 16,
    printColour: "Black",
    parameters: { printTime: "4", filamentWeight: "250", materialId: "mat1", machineId: "m1" },
    ...overrides,
} as QuoteData);

describe("recomputing a quote's footprint", () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem("session_materials", JSON.stringify([
            { id: "mat1", name: "PLA", cost_per_unit: 25, unit: "kg", print_type: "FDM" },
        ]));
        localStorage.setItem("session_machines", JSON.stringify([
            { id: "m1", name: "Bambu Lab P1S", hourly_cost: 8, power_consumption_watts: 350, print_type: "FDM", measuredWatts: 110 },
        ]));
        localStorage.setItem("session_constants", JSON.stringify([
            { id: "grid_intensity", name: "Grid Emission Factor", value: 710, unit: "gCO2e/kWh", is_visible: false },
        ]));
    });

    it("resolves the machine, material and grid factor from storage", () => {
        // 2 units × 4 h = 8 h at 110 W → 0.88 kWh → 0.625 kg, plus 0.5 kg of PLA at 5.76.
        const carbon = recomputeQuoteCarbon(quote())!;

        expect(carbon.kg).toBeCloseTo(3.505, 2);
        expect(carbon.gridGPerKWh).toBe(710);
        expect(carbon.grade).toBe("ESTIMATE");
    });

    it("grades a job with real runtime as an actual, and scales with it", () => {
        const carbon = recomputeQuoteCarbon(quote({ actualPrintTime: 10, actualMaterialUsed: 520 }))!;

        // 10 h at 110 W → 1.1 kWh → 0.781 kg, plus 0.52 kg of PLA.
        expect(carbon.kg).toBeCloseTo(0.781 + 0.52 * 5.76, 2);
        expect(carbon.grade).toBe("MEASURED"); // actual time and a measured wattage
        expect(carbon.src.mass).toBe("actual");
    });

    it("refreshes the stored figure when an edit changes the quantity", () => {
        saveQuote(quote());
        const before = getQuotes()[0].carbon;

        updateQuote("q1", { quantity: 4 });
        const after = getQuotes()[0].carbon;

        expect(before).toBeUndefined(); // saveQuote stores what it is given; nothing was computed yet
        expect(after?.kg).toBeGreaterThan(0);
        expect(after?.kg).toBeCloseTo(7.01, 1); // twice the two-unit figure
    });

    it("leaves a figure the caller computed itself alone", () => {
        saveQuote(quote());

        const supplied = recomputeQuoteCarbon(quote({ actualPrintTime: 10 }))!;
        updateQuote("q1", { actualPrintTime: 10, carbon: supplied });

        expect(getQuotes()[0].carbon?.kg).toBeCloseTo(supplied.kg, 6);
    });

    it("returns to an estimate when a revert clears the actuals", () => {
        saveQuote(quote({ actualPrintTime: 10, actualMaterialUsed: 520 }));
        updateQuote("q1", { actualPrintTime: 10, actualMaterialUsed: 520 });
        expect(getQuotes()[0].carbon?.grade).toBe("MEASURED");

        updateQuote("q1", { actualPrintTime: undefined, actualMaterialUsed: undefined });
        expect(getQuotes()[0].carbon?.grade).toBe("ESTIMATE");
    });
});
