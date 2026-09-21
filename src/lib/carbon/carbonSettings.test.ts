import { describe, it, expect, beforeEach } from "vitest";
import {
    exportAllSettings,
    getCarbonSettings,
    importAllSettings,
    saveCarbonSettings,
} from "@/lib/core/sessionStorage";
import { selectPooledMachines } from "./carbonStats";
import { calculateJobCarbon } from "./carbonCalculator";
import { Machine, Material } from "@/types/quote";

describe("shop-wide carbon settings", () => {
    beforeEach(() => localStorage.clear());

    it("starts on the conservative defaults", () => {
        const settings = getCarbonSettings();

        expect(settings.defaultEolPath).toBe("landfill");
        expect(settings.regionConfirmed).toBe(false);
    });

    it("survives a backup and restore", () => {
        saveCarbonSettings({ regionId: "in", regionConfirmed: true, defaultEolPath: "incineration" });

        const backup = exportAllSettings();
        localStorage.clear();
        importAllSettings(backup);

        const restored = getCarbonSettings();
        expect(restored.regionId).toBe("in");
        expect(restored.regionConfirmed).toBe(true);
        expect(restored.defaultEolPath).toBe("incineration");
    });

    it("leaves the defaults alone when restoring a backup made before carbon existed", () => {
        const backup = exportAllSettings();
        delete backup.carbonSettings;

        importAllSettings(backup);

        expect(getCarbonSettings().defaultEolPath).toBe("landfill");
    });
});

describe("selectPooledMachines", () => {
    const machine = (id: string): Machine => ({
        id, name: id, hourly_cost: 5, power_consumption_watts: 350, print_type: "FDM",
    });

    it("keeps only the machines in the production pool", () => {
        const all = [machine("a"), machine("b"), machine("c")];
        expect(selectPooledMachines(all, ["a", "c"]).map(m => m.id)).toEqual(["a", "c"]);
    });

    it("counts every machine when no pool has been curated", () => {
        const all = [machine("a"), machine("b")];
        expect(selectPooledMachines(all, [])).toHaveLength(2);
        expect(selectPooledMachines(all, undefined)).toHaveLength(2);
    });
});

describe("disposal precedence", () => {
    const base = {
        printType: "FDM" as const,
        quantity: 1,
        printTimePerUnit: "1",
        perUnitMaterial: 1000,
        failedUnits: 1,
        machine: { id: "m", name: "P1S", hourly_cost: 5, power_consumption_watts: 350, print_type: "FDM" } as Machine,
        gridGPerKWh: 0, // isolate the waste term
    };
    const material = (overrides: Partial<Material> = {}): Material => ({
        id: "mat", name: "PLA", cost_per_unit: 25, unit: "kg", print_type: "FDM", ...overrides,
    });

    it("uses the shop default when the material says nothing", () => {
        const landfill = calculateJobCarbon({ ...base, material: material(), eolPath: "landfill" })!;
        const burned = calculateJobCarbon({ ...base, material: material(), eolPath: "incineration" })!;

        expect(burned.wasteKg).toBeGreaterThan(landfill.wasteKg);
    });

    it("lets a material's own route win over the shop default", () => {
        // The shop burns its waste, but this polymer is recycled — the specific statement wins.
        const result = calculateJobCarbon({
            ...base,
            material: material({ eolPath: "recycling" }),
            eolPath: "incineration",
        })!;

        expect(result.wasteKg).toBe(0);
    });
});
