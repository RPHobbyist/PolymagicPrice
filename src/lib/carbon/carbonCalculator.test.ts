import { describe, it, expect } from "vitest";
import { calculateJobCarbon, formatCarbon, toStoredCarbon } from "./carbonCalculator";
import { Machine, Material, MaterialSpool } from "@/types/quote";

const machine = (overrides: Partial<Machine> = {}): Machine => ({
    id: "m1",
    name: "Bambu Lab P1S",
    hourly_cost: 8,
    power_consumption_watts: 350,
    print_type: "FDM",
    ...overrides,
});

const material = (overrides: Partial<Material> = {}): Material => ({
    id: "mat1",
    name: "PLA",
    cost_per_unit: 25,
    unit: "kg",
    print_type: "FDM",
    ...overrides,
});

describe("calculateJobCarbon", () => {
    it("matches the worked example by hand", () => {
        // 1 kg of virgin PLA, 40 h on a machine measured at 110 W, India at 710 gCO2e/kWh.
        // 110 W × 40 h = 4.4 kWh → 3.124 kg energy, plus 1 kg × 5.76 material.
        const result = calculateJobCarbon({
            printType: "FDM",
            quantity: 1,
            actualPrintTime: 40,
            perUnitMaterial: 1000,
            machine: machine({ measuredWatts: 110 }),
            material: material(),
            gridGPerKWh: 710,
        })!;

        expect(result.kWh).toBeCloseTo(4.4, 3);
        expect(result.energyKg).toBeCloseTo(3.124, 3);
        expect(result.materialKg).toBeCloseTo(5.76, 3);
        expect(result.kg).toBeCloseTo(8.884, 3);
        expect(result.grade).toBe("MEASURED");
    });

    it("divides by quantity for the per-part figure without re-scaling the actual", () => {
        const result = calculateJobCarbon({
            printType: "FDM",
            quantity: 4,
            printTimePerUnit: "10",
            actualPrintTime: 40, // whole job, already covers all four units
            perUnitMaterial: 250,
            machine: machine({ measuredWatts: 110 }),
            material: material(),
            gridGPerKWh: 710,
        })!;

        expect(result.jobHours).toBe(40);
        expect(result.kg).toBeCloseTo(8.884, 3);
        expect(result.perPart).toBeCloseTo(2.221, 3);
    });

    it("prefers the spool's factor, then the material's, then the library", () => {
        const base = {
            printType: "FDM" as const,
            quantity: 1,
            printTimePerUnit: "1",
            perUnitMaterial: 1000,
            machine: machine({ measuredWatts: 100 }),
            gridGPerKWh: 0, // isolate the material term
        };
        const spool: MaterialSpool = {
            id: "s1", materialId: "mat1", initialWeight: 1000, currentWeight: 500, co2PerKg: 2.47,
        };

        const fromLibrary = calculateJobCarbon({ ...base, material: material() })!;
        const fromMaterial = calculateJobCarbon({ ...base, material: material({ co2PerKg: 4 }) })!;
        const fromSpool = calculateJobCarbon({ ...base, material: material({ co2PerKg: 4 }), spool })!;

        expect(fromLibrary.efKgPerKg).toBeCloseTo(5.76, 2);
        expect(fromLibrary.src.ef).toBe("library");
        expect(fromMaterial.efKgPerKg).toBe(4);
        expect(fromMaterial.src.ef).toBe("material");
        expect(fromSpool.efKgPerKg).toBeCloseTo(2.47, 2);
        expect(fromSpool.src.ef).toBe("spool");
    });

    it("never produces zero energy for a machine saved without a wattage", () => {
        const result = calculateJobCarbon({
            printType: "FDM",
            quantity: 1,
            printTimePerUnit: "5",
            perUnitMaterial: 100,
            machine: machine({ name: "Some Unlisted Printer", power_consumption_watts: null }),
            material: material(),
            gridGPerKWh: 473,
        })!;

        expect(result.wattsUsed).toBeGreaterThan(0);
        expect(result.energyKg).toBeGreaterThan(0);
        expect(result.src.watts).toBe("library");
    });

    it("ignores an FDM nameplate, which rates the power supply rather than the draw", () => {
        const result = calculateJobCarbon({
            printType: "FDM",
            quantity: 1,
            printTimePerUnit: "1",
            perUnitMaterial: 100,
            machine: machine({ name: "Creality Ender 3", power_consumption_watts: 350 }),
            material: material(),
        })!;
        // Published measurements put this class at 75-125 W, not the 350 W rating.
        expect(result.wattsUsed).toBeLessThanOrEqual(130);
        expect(result.src.watts).toBe("library");
    });

    it("trusts a resin machine's rated wattage, which tracks its real draw", () => {
        const result = calculateJobCarbon({
            printType: "Resin",
            quantity: 1,
            printTimePerUnit: "1",
            perUnitMaterial: 100,
            machine: machine({ name: "Anycubic Photon Mono M7 Pro", print_type: "Resin", power_consumption_watts: 120 }),
            material: material({ name: "Standard Resin", print_type: "Resin" }),
        })!;

        expect(result.wattsUsed).toBe(120);
        expect(result.src.watts).toBe("nameplate");
    });

    it("converts resin volume to mass in both the material and the waste terms", () => {
        // 100 ml at 1.10 g/cm³ = 0.11 kg per unit. One failed unit doubles the material mass and
        // sends 0.11 kg to disposal. Incineration for the resin preset is 0.65 × 44/12 = 2.3833.
        const result = calculateJobCarbon({
            printType: "Resin",
            quantity: 1,
            printTimePerUnit: "2",
            perUnitMaterial: 100,
            actualMaterialUsed: 200, // the failed unit's resin was deducted too
            failedUnits: 1,
            eolPath: "incineration",
            machine: machine({ name: "Elegoo Mars 3", print_type: "Resin", power_consumption_watts: 45 }),
            material: material({ name: "Standard Resin", print_type: "Resin" }),
            gridGPerKWh: 473,
        })!;

        expect(result.massKg).toBeCloseTo(0.22, 4);
        expect(result.wasteMassKg).toBeCloseTo(0.11, 4);
        expect(result.wasteKg).toBeCloseTo(0.11 * (0.65 * 44 / 12), 3);
    });

    it("bills resin wash and cure to their own stations, not the printer", () => {
        const withStations = calculateJobCarbon({
            printType: "Resin",
            quantity: 1,
            printTimePerUnit: "2",
            perUnitMaterial: 100,
            washingTimeMinutes: "30",
            curingTimeMinutes: "30",
            machine: machine({ name: "Elegoo Mars 3", print_type: "Resin" }),
            material: material({ name: "Standard Resin", print_type: "Resin" }),
            gridGPerKWh: 473,
        })!;
        const printOnly = calculateJobCarbon({
            printType: "Resin",
            quantity: 1,
            printTimePerUnit: "2",
            perUnitMaterial: 100,
            machine: machine({ name: "Elegoo Mars 3", print_type: "Resin" }),
            material: material({ name: "Standard Resin", print_type: "Resin" }),
            gridGPerKWh: 473,
        })!;

        // 0.5 h wash at 30 W + 0.5 h cure at 40 W = 0.035 kWh on top of the print itself.
        expect(withStations.kWh - printOnly.kWh).toBeCloseTo(0.035, 4);
    });

    it("counts supports and unattributed mass as waste only for disposal", () => {
        const result = calculateJobCarbon({
            printType: "FDM",
            quantity: 1,
            printTimePerUnit: "1",
            perUnitMaterial: 100,
            featureWeights: { walls: 60, infill: 20, supports: 15, waste: 5 },
            eolPath: "landfill",
            machine: machine({ measuredWatts: 100 }),
            material: material(),
            gridGPerKWh: 0,
        })!;

        // 20 g avoidable → 0.02 kg at the landfill factor of 0.01.
        expect(result.wasteMassKg).toBeCloseTo(0.02, 4);
        expect(result.wasteKg).toBeCloseTo(0.0002, 6);
        // Production of that mass is already inside the material term, never counted twice.
        expect(result.materialKg).toBeCloseTo(0.1 * 5.76, 4);
        expect(result.deliveredKg).toBeCloseTo(0.08, 4);
    });

    it("grades the figure by its weakest input", () => {
        const estimate = calculateJobCarbon({
            printType: "FDM", quantity: 1, printTimePerUnit: "4", perUnitMaterial: 100,
            machine: machine({ measuredWatts: 110 }), material: material(),
        })!;
        const actual = calculateJobCarbon({
            printType: "FDM", quantity: 1, printTimePerUnit: "4", actualPrintTime: 5,
            perUnitMaterial: 100, machine: machine(), material: material(),
        })!;
        const measured = calculateJobCarbon({
            printType: "FDM", quantity: 1, printTimePerUnit: "4", actualPrintTime: 5,
            perUnitMaterial: 100, machine: machine({ measuredWatts: 110 }), material: material(),
        })!;

        expect(estimate.grade).toBe("ESTIMATE");
        expect(actual.grade).toBe("ACTUAL");
        expect(measured.grade).toBe("MEASURED");
    });

    it("flags what it could not know", () => {
        const result = calculateJobCarbon({
            printType: "FDM", quantity: 1, printTimePerUnit: "1", perUnitMaterial: 100,
            material: material(),
        })!;
        expect(result.flags).toContain("no-machine");
        expect(result.flags).toContain("no-feature-data");
    });

    it("returns undefined when there is nothing to measure, and never throws", () => {
        expect(calculateJobCarbon({ printType: "FDM" })).toBeUndefined();
        expect(calculateJobCarbon({ printType: "FDM", quantity: 2, printTimePerUnit: "abc" })).toBeUndefined();
    });

    it("keeps the stored record compact", () => {
        const breakdown = calculateJobCarbon({
            printType: "FDM", quantity: 1, actualPrintTime: 40, perUnitMaterial: 1000,
            machine: machine({ measuredWatts: 110 }), material: material(), gridGPerKWh: 710,
        })!;
        const stored = toStoredCarbon(breakdown);

        expect(stored).not.toHaveProperty("perPart");
        expect(stored).not.toHaveProperty("factorLabel");
        expect(JSON.stringify(stored).length).toBeLessThan(400);
    });
});

describe("formatCarbon", () => {
    it("shows grams for small prints and tonnes for shop totals", () => {
        expect(formatCarbon(0.054)).toBe("54 gCO₂e");
        expect(formatCarbon(0.42)).toBe("0.42 kgCO₂e");
        expect(formatCarbon(41.2)).toBe("41.2 kgCO₂e");
        expect(formatCarbon(1500)).toBe("1.50 tCO₂e");
        expect(formatCarbon(0)).toBe("0 gCO₂e");
        expect(formatCarbon(Number.NaN)).toBe("0 gCO₂e");
    });
});
