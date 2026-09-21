import { describe, it, expect, beforeEach } from "vitest";
import { analyzeShop } from "./shopIntelligence";
import { recalculateCarbonHistory, saveQuote, getQuotes } from "./core/sessionStorage";
import { QuoteCarbon, QuoteData } from "@/types/quote";

const carbon = (overrides: Partial<QuoteCarbon> = {}): QuoteCarbon => ({
    kg: 4, energyKg: 1.6, materialKg: 2.2, wasteKg: 0.2, kWh: 2, deliveredKg: 0.4,
    gridGPerKWh: 710, efKgPerKg: 5.76, wattsUsed: 100,
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
    createdAt: "2026-08-02T00:00:00.000Z",
    statusTimeline: { DONE: "2026-08-20T00:00:00.000Z" },
    parameters: { printTime: "2", filamentWeight: "100", machineName: "Bambu Lab P1S", materialName: "PLA" },
    carbon: carbon(),
    ...overrides,
} as QuoteData);

const snapshot = (quotes: QuoteData[], now: Date) => ({
    quotes, machines: [], materials: [], spools: [], jobs: [], constants: [], lowStock: [], now,
});

describe("carbon findings", () => {
    const september = new Date("2026-09-15T00:00:00.000Z");

    it("summarises the month just gone, keyed so next month's summary also gets through", () => {
        const findings = analyzeShop(snapshot([quote(), quote()], september));
        const digest = findings.find(f => f.kind === "CARBON_DIGEST")!;

        expect(digest).toBeDefined();
        expect(digest.severity).toBe("INFO");
        expect(digest.metadata.period).toBe("2026-08");
        expect(digest.message).toContain("8.0 kgCO₂e");
    });

    it("says nothing when the month just gone had no completed work", () => {
        const findings = analyzeShop(snapshot([quote({ statusTimeline: { DONE: "2026-05-02T00:00:00.000Z" } })], september));
        expect(findings.find(f => f.kind === "CARBON_DIGEST")).toBeUndefined();
    });

    it("suggests metering the thirstiest unmeasured machine once there is enough history", () => {
        const many = Array.from({ length: 5 }, () => quote());
        const findings = analyzeShop(snapshot(many, september));
        const suggestion = findings.find(f => f.kind === "CARBON_METER_SUGGESTION")!;

        expect(suggestion.severity).toBe("INFO");
        expect(suggestion.metadata.machineName).toBe("Bambu Lab P1S");
    });

    it("stays quiet in a brand new shop", () => {
        const findings = analyzeShop(snapshot([quote()], september));
        expect(findings.find(f => f.kind === "CARBON_METER_SUGGESTION")).toBeUndefined();
    });

    it("never outranks a real production problem", () => {
        const findings = analyzeShop(snapshot([quote(), quote()], september));
        const carbonFindings = findings.filter(f => f.kind.startsWith("CARBON_"));

        expect(carbonFindings.length).toBeGreaterThan(0);
        expect(carbonFindings.every(f => f.severity === "INFO")).toBe(true);
    });
});

describe("recalculateCarbonHistory", () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem("session_materials", JSON.stringify([
            { id: "mat1", name: "PLA", cost_per_unit: 25, unit: "kg", print_type: "FDM" },
        ]));
        localStorage.setItem("session_machines", JSON.stringify([
            { id: "m1", name: "Bambu Lab P1S", hourly_cost: 8, power_consumption_watts: 350, print_type: "FDM" },
        ]));
        localStorage.setItem("session_constants", JSON.stringify([
            { id: "grid_intensity", name: "Grid Emission Factor", value: 100, unit: "gCO2e/kWh", is_visible: false },
        ]));
    });

    it("restates figures that came from the library", () => {
        saveQuote(quote({
            id: "q1",
            parameters: { printTime: "4", filamentWeight: "250", materialId: "mat1", machineId: "m1" },
            carbon: carbon({ kg: 999 }),
        }));

        const { updated } = recalculateCarbonHistory("auto");

        expect(updated).toBe(1);
        expect(getQuotes()[0].carbon!.kg).toBeLessThan(999);
        expect(getQuotes()[0].carbon!.gridGPerKWh).toBe(100);
    });

    it("leaves a shop's own figures alone unless asked for everything", () => {
        saveQuote(quote({
            id: "q2",
            parameters: { printTime: "4", filamentWeight: "250", materialId: "mat1", machineId: "m1" },
            carbon: carbon({ kg: 999, src: { time: "actual", mass: "actual", watts: "library", ef: "material" } }),
        }));

        expect(recalculateCarbonHistory("auto")).toEqual({ updated: 0, untouched: 1 });
        expect(getQuotes()[0].carbon!.kg).toBe(999);

        expect(recalculateCarbonHistory("all").updated).toBe(1);
        expect(getQuotes()[0].carbon!.kg).toBeLessThan(999);
    });
});
