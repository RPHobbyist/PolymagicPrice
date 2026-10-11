import { describe, it, expect } from "vitest";
import { quoteBreakdownRows, buildQuoteText } from "./quoteExportRows";
import { calculateFDMQuote } from "./quoteCalculations";
import { FDMFormData, Machine, Material } from "@/types/quote";

const quote = calculateFDMQuote({
    formData: {
        projectName: "Bracket", printColour: "Black", materialId: "m", machineId: "p", printTime: "2", filamentWeight: "50",
        laborHours: "0.5", overheadPercentage: "10", markupPercentage: "30", quantity: "3", selectedConsumableIds: [],
        paintingTime: "0.25",
    } as FDMFormData,
    material: { id: "m", name: "PLA", cost_per_unit: 25, unit: "kg", print_type: "FDM" } as Material,
    machine: { id: "p", name: "P", hourly_cost: 2, power_consumption_watts: 120, print_type: "FDM" } as Machine,
    electricityRate: 0.15,
    laborRate: 18,
    consumables: [{ name: "Glue", value: 0.4 }],
});

describe("quote export rows", () => {
    it("lists lines that add up to the subtotal, and subtotal + markup to the total", () => {
        const rows = quoteBreakdownRows(quote);
        const amount = (label: string) => rows.find(r => r.label === label)!.amount;
        const lines = rows.filter(r => !r.emphasis).reduce((sum, r) => sum + r.amount, 0);
        expect(Math.round(lines * 100) / 100).toBe(amount("Subtotal"));
        expect(Math.round((amount("Subtotal") + amount("Profit markup")) * 100) / 100).toBe(amount("TOTAL PRICE"));
        expect(amount("Consumables")).toBeGreaterThan(0);
        expect(amount("Painting")).toBeGreaterThan(0);
    });

    it("prints quantity and the same total in the text", () => {
        const text = buildQuoteText(quote, n => n.toFixed(2));
        expect(text).toContain("Quantity: 3");
        expect(text).toContain(quote.totalPrice.toFixed(2));
    });
});
