/*
 * Golden fixtures for the pricing engine.
 *
 * These pin the arithmetic the calculators produce today, line item by line item, so that any
 * later change to the engine has to declare itself: a fix should move exactly the numbers it
 * means to move and leave the rest alone. Every expectation below was worked out by hand from
 * the formula in quoteCalculations.ts, not copied from a run.
 */
import { describe, it, expect } from "vitest";
import {
    calculateFDMQuote,
    calculateResinQuote,
    costPerBaseUnit,
    isRecognisedMaterialUnit,
    isFlatConsumable,
    effectiveWatts,
    summariseQuote,
    validateFDMForm,
    validateResinForm,
} from "./quoteCalculations";
import { FDMFormData, Machine, Material, ResinFormData } from "@/types/quote";

const filament = (overrides: Partial<Material> = {}): Material => ({
    id: "mat-pla",
    name: "PLA",
    cost_per_unit: 25,
    unit: "kg",
    print_type: "FDM",
    ...overrides,
});

const resin = (overrides: Partial<Material> = {}): Material => ({
    id: "mat-resin",
    name: "Standard Resin",
    cost_per_unit: 45,
    unit: "liter",
    print_type: "Resin",
    ...overrides,
});

const printer = (overrides: Partial<Machine> = {}): Machine => ({
    id: "mac-1",
    name: "Test Printer",
    hourly_cost: 2,
    power_consumption_watts: 120,
    print_type: "FDM",
    ...overrides,
});

const fdmForm = (overrides: Partial<FDMFormData> = {}): FDMFormData => ({
    projectName: "Bracket",
    printColour: "Black",
    materialId: "mat-pla",
    machineId: "mac-1",
    printTime: "3.5",
    filamentWeight: "22",
    laborHours: "0.5",
    overheadPercentage: "10",
    markupPercentage: "40",
    quantity: "2",
    selectedConsumableIds: [],
    ...overrides,
});

const resinForm = (overrides: Partial<ResinFormData> = {}): ResinFormData => ({
    projectName: "Miniature",
    printColour: "Grey",
    materialId: "mat-resin",
    machineId: "mac-1",
    printTime: "4",
    resinVolume: "18",
    washingTime: "6",
    curingTime: "12",
    isopropylCost: "0.2",
    laborHours: "0.25",
    overheadPercentage: "15",
    markupPercentage: "40",
    quantity: "1",
    selectedConsumableIds: [],
    ...overrides,
});

describe("calculateFDMQuote", () => {
    /*
     * 22 g of PLA at 25/kg, 3.5 h on a 120 W printer costing 2/h, 0.15/kWh, half an hour of
     * labour at 18/h, 0.50 of consumables, 10 % overhead, 40 % markup, two units.
     *
     *   material      0.022 kg x 25      = 0.55
     *   machine       3.5 h x 2          = 7.00
     *   electricity   3.5 x 0.12 x 0.15  = 0.063
     *   labour        0.5 h x 18         = 9.00
     *   consumables                      = 0.50
     *   -> before overhead                 17.113
     *   overhead      10 %                 1.7113
     *   -> subtotal                        18.8243
     *   markup        40 %                 7.52972
     *   -> unit price                      26.35402
     *   -> total x2                        52.70804
     */
    const quote = calculateFDMQuote({
        formData: fdmForm(),
        material: filament(),
        machine: printer(),
        electricityRate: 0.15,
        laborRate: 18,
        consumables: [{ name: "Glue stick", value: 0.5 }],
    });

    it("stores every cost line already multiplied by quantity", () => {
        expect(quote.materialCost).toBe(1.1);
        expect(quote.machineTimeCost).toBe(14);
        expect(quote.electricityCost).toBe(0.13);
        expect(quote.laborCost).toBe(18);
        expect(quote.overheadCost).toBe(3.42);
        expect(quote.markup).toBe(15.06);
        expect(quote.subtotal).toBe(37.65);
    });

    it("stores the unit price per part and the total for the whole job", () => {
        expect(quote.unitPrice).toBe(26.35);
        expect(quote.quantity).toBe(2);
        expect(quote.totalPrice).toBe(52.71);
    });

    it("snapshots the rates the job was priced with", () => {
        expect(quote.parameters?.electricityRate).toBe(0.15);
        expect(quote.parameters?.laborRate).toBe(18);
        expect(quote.parameters?.consumablesTotal).toBe(0.5);
    });

    it("treats an empty markup as zero rather than letting NaN through", () => {
        const q = calculateFDMQuote({
            formData: fdmForm({ markupPercentage: "", overheadPercentage: "", quantity: "1" }),
            material: filament(),
            machine: printer(),
            electricityRate: 0.15,
            laborRate: 18,
        });
        // 0.55 + 7 + 0.063 + 9, no overhead, no markup
        expect(q.markup).toBe(0);
        expect(q.overheadCost).toBe(0);
        expect(q.totalPrice).toBe(16.61);
    });

    it("never prices fewer than one unit", () => {
        const q = calculateFDMQuote({
            formData: fdmForm({ quantity: "0" }),
            material: filament(),
            machine: printer(),
            electricityRate: 0.15,
            laborRate: 18,
        });
        expect(q.quantity).toBe(1);
    });

    it("costs nothing for power when the machine has no wattage on file", () => {
        const q = calculateFDMQuote({
            formData: fdmForm({ quantity: "1" }),
            material: filament(),
            machine: printer({ power_consumption_watts: null }),
            electricityRate: 0.15,
            laborRate: 18,
        });
        expect(q.electricityCost).toBe(0);
    });
});

describe("calculateResinQuote", () => {
    /*
     *   material      0.018 L x 45 + 0.20 IPA   = 1.01
     *   process time  4 h + 6 min + 12 min      = 4.3 h
     *   machine       4.3 x 1.5                 = 6.45
     *   electricity   4.3 x 0.06 x 0.15         = 0.0387
     *   labour        0.25 x 18                 = 4.50
     *   -> before overhead                        11.9987
     *   overhead      15 %                         1.799805
     *   -> subtotal                                13.798505
     *   markup        40 %                         5.519402
     *   -> unit price                              19.317907
     */
    const quote = calculateResinQuote({
        formData: resinForm(),
        material: resin(),
        machine: printer({ hourly_cost: 1.5, power_consumption_watts: 60, print_type: "Resin" }),
        electricityRate: 0.15,
        laborRate: 18,
    });

    it("bills wash and cure time to the machine as well as the print itself", () => {
        expect(quote.machineTimeCost).toBe(6.45);
        expect(quote.electricityCost).toBe(0.04);
    });

    it("folds the isopropyl cost into the material line", () => {
        expect(quote.materialCost).toBe(1.01);
    });

    it("produces the expected total", () => {
        expect(quote.overheadCost).toBe(1.8);
        expect(quote.subtotal).toBe(13.8);
        expect(quote.markup).toBe(5.52);
        expect(quote.totalPrice).toBe(19.32);
    });
});

describe("summariseQuote", () => {
    it("agrees with the total the calculator stored", () => {
        const quote = calculateFDMQuote({
            formData: fdmForm(),
            material: filament(),
            machine: printer(),
            electricityRate: 0.15,
            laborRate: 18,
            consumables: [{ name: "Glue stick", value: 0.5 }],
        });

        const totals = summariseQuote(quote);

        expect(totals.subtotal).toBe(quote.subtotal);
        expect(totals.total).toBe(quote.totalPrice);
    });

    it("rounds its own output, so a breakdown cannot carry binary float debris", () => {
        const quote = calculateFDMQuote({
            formData: fdmForm(),
            material: filament(),
            machine: printer(),
            electricityRate: 0.15,
            laborRate: 18,
            consumables: [{ name: "Glue stick", value: 0.5 }],
        });

        // 1.1 + 14 + 0.13 + 1 + 18 + 3.42 sums to 37.650000000000006 in binary floating point.
        // Carbon is deliberately excluded: kilograms are not money and must keep their precision.
        const totals = summariseQuote(quote);
        const money = [
            totals.consumablesTotal, totals.manufacturing, totals.labour,
            totals.painting, totals.overhead, totals.subtotal, totals.markup, totals.total,
        ];
        for (const value of money) {
            expect(value).toBe(Math.round((value + Number.EPSILON) * 100) / 100);
        }
    });

    it("scales the per-unit consumables figure up to the job quantity", () => {
        const quote = calculateFDMQuote({
            formData: fdmForm({ quantity: "10" }),
            material: filament(),
            machine: printer(),
            electricityRate: 0.15,
            laborRate: 18,
            consumables: [{ name: "Glue stick", value: 2 }],
        });

        // The stored figure is per unit; the summary must charge for all ten.
        expect(quote.parameters?.consumablesTotal).toBe(2);
        expect(summariseQuote(quote).consumablesTotal).toBe(20);
    });

    it("reads a hand-written record without throwing on missing fields", () => {
        const totals = summariseQuote({ id: "x", projectName: "Legacy" } as never);
        expect(totals.total).toBe(0);
        expect(totals.quantity).toBe(1);
    });
});

describe("costPerBaseUnit", () => {
    it("leaves the units every existing shop already uses exactly as they are", () => {
        expect(costPerBaseUnit(filament({ cost_per_unit: 25, unit: "kg" }), "FDM")).toBe(25);
        expect(costPerBaseUnit(resin({ cost_per_unit: 45, unit: "liter" }), "Resin")).toBe(45);
    });

    it("converts a per-gram filament price to per kilogram", () => {
        expect(costPerBaseUnit(filament({ cost_per_unit: 0.025, unit: "g" }), "FDM")).toBe(25);
    });

    it("converts a per-millilitre resin price to per litre", () => {
        expect(costPerBaseUnit(resin({ cost_per_unit: 0.045, unit: "ml" }), "Resin")).toBe(45);
    });

    it("uses density when the shop buys resin by the kilogram", () => {
        // Resin bottles are commonly sold by weight; the factor library's density is 1.10 kg/L.
        expect(costPerBaseUnit(resin({ cost_per_unit: 45, unit: "kg" }), "Resin")).toBeCloseTo(49.5, 6);
    });

    it("prefers the material's own density over the library's", () => {
        const heavy = resin({ cost_per_unit: 45, unit: "kg", densityGCm3: 1.2 });
        expect(costPerBaseUnit(heavy, "Resin")).toBeCloseTo(54, 6);
    });

    it("converts a filament price given by volume using density", () => {
        // PLA is 1.24 g/cm3, so 24.80 per litre is 20.00 per kilogram.
        expect(costPerBaseUnit(filament({ cost_per_unit: 24.8, unit: "liter" }), "FDM")).toBeCloseTo(20, 6);
    });

    it("falls back to the engine's old assumption for an unrecognised or missing unit", () => {
        expect(costPerBaseUnit(filament({ cost_per_unit: 25, unit: "spool" }), "FDM")).toBe(25);
        expect(costPerBaseUnit(filament({ cost_per_unit: 25, unit: "" }), "FDM")).toBe(25);
        expect(costPerBaseUnit(undefined, "FDM")).toBe(0);
    });

    it("prices a job the same whether the material is entered per kg or per gram", () => {
        const byKilo = calculateFDMQuote({
            formData: fdmForm({ quantity: "1" }),
            material: filament({ cost_per_unit: 25, unit: "kg" }),
            machine: printer(),
            electricityRate: 0.15,
            laborRate: 18,
        });
        const byGram = calculateFDMQuote({
            formData: fdmForm({ quantity: "1" }),
            material: filament({ cost_per_unit: 0.025, unit: "g" }),
            machine: printer(),
            electricityRate: 0.15,
            laborRate: 18,
        });

        // 22 g of PLA is 0.55 either way — before the fix the per-gram shop was charged 0.00055.
        expect(byKilo.materialCost).toBe(0.55);
        expect(byGram.materialCost).toBe(0.55);
        expect(byGram.totalPrice).toBe(byKilo.totalPrice);
    });
});

describe("form validation", () => {
    it("accepts a well-formed job", () => {
        expect(validateFDMForm(fdmForm())).toBeNull();
        expect(validateResinForm(resinForm())).toBeNull();
    });

    it("rejects a missing project name, material or machine", () => {
        expect(validateFDMForm(fdmForm({ projectName: "  " }))).toMatch(/project name/i);
        expect(validateFDMForm(fdmForm({ materialId: "" }))).toMatch(/material/i);
        expect(validateFDMForm(fdmForm({ machineId: "" }))).toMatch(/machine/i);
    });

    it("rejects negative labour and a markup below -100 %", () => {
        expect(validateFDMForm(fdmForm({ laborHours: "-1" }))).toMatch(/cannot be less than/i);
        expect(validateFDMForm(fdmForm({ markupPercentage: "-150" }))).toMatch(/cannot be less than/i);
        expect(validateFDMForm(fdmForm({ overheadPercentage: "-5" }))).toMatch(/cannot be less than/i);
    });

    it("rejects text typed into a numeric field instead of silently pricing it as zero", () => {
        expect(validateFDMForm(fdmForm({ laborHours: "abc" }))).toMatch(/must be a number/i);
    });

    it("accepts the time formats the price is actually built from", () => {
        // parseFloat("0:45") is 0, which used to reject a perfectly good 45-minute job.
        expect(validateFDMForm(fdmForm({ printTime: "0:45" }))).toBeNull();
        expect(validateFDMForm(fdmForm({ printTime: "1h 30m" }))).toBeNull();
        expect(validateResinForm(resinForm({ printTime: "2:15" }))).toBeNull();
    });

    it("still rejects a print time of zero or nonsense", () => {
        expect(validateFDMForm(fdmForm({ printTime: "0" }))).toMatch(/greater than 0/i);
        expect(validateFDMForm(fdmForm({ printTime: "soon" }))).toMatch(/greater than 0/i);
    });

    it("rejects an absurd print time, weight or quantity", () => {
        expect(validateFDMForm(fdmForm({ printTime: "20000" }))).toMatch(/maximum/i);
        expect(validateFDMForm(fdmForm({ filamentWeight: "0" }))).toMatch(/greater than 0/i);
        expect(validateFDMForm(fdmForm({ quantity: "0" }))).toMatch(/at least 1/i);
        expect(validateResinForm(resinForm({ resinVolume: "-3" }))).toMatch(/greater than 0/i);
    });
});

describe("failure rate", () => {
    const base = {
        material: filament(),
        machine: printer(),
        electricityRate: 0.15,
        laborRate: 18,
    };

    it("leaves the price untouched at 0 %", () => {
        const a = calculateFDMQuote({ formData: fdmForm(), ...base });
        const b = calculateFDMQuote({ formData: fdmForm(), ...base, failureRatePercent: 0 });
        expect(b.totalPrice).toBe(a.totalPrice);
    });

    it("grosses material, machine and power up by 1 / (1 - rate) and leaves labour alone", () => {
        const a = calculateFDMQuote({ formData: fdmForm({ quantity: "1" }), ...base });
        const b = calculateFDMQuote({ formData: fdmForm({ quantity: "1" }), ...base, failureRatePercent: 10 });
        expect(b.materialCost).toBeCloseTo(a.materialCost / 0.9, 2);
        expect(b.machineTimeCost).toBeCloseTo(a.machineTimeCost / 0.9, 2);
        expect(b.electricityCost).toBeCloseTo(a.electricityCost / 0.9, 2);
        expect(b.laborCost).toBe(a.laborCost);
        expect(b.totalPrice).toBeGreaterThan(a.totalPrice);
    });

    it("applies to resin and clamps absurd rates", () => {
        const a = calculateResinQuote({ formData: resinForm(), ...base, material: resin() });
        const b = calculateResinQuote({ formData: resinForm(), ...base, material: resin(), failureRatePercent: 500 });
        // clamped to 50 % -> exactly double on the three grossed lines
        expect(b.machineTimeCost).toBeCloseTo(a.machineTimeCost * 2, 2);
    });
});

describe("stored totals agree with their own lines", () => {
    it("summariseQuote reproduces the stored subtotal and total across quantities and rates", () => {
        for (const qty of [1, 2, 3, 7, 13, 250]) {
            for (const markup of ["0", "17.5", "33", "40"]) {
                const q = calculateFDMQuote({
                    formData: fdmForm({ quantity: String(qty), markupPercentage: markup, filamentWeight: "17.3", printTime: "2.37", laborHours: "0.33", overheadPercentage: "7.5" }),
                    material: filament({ cost_per_unit: 23.17 }),
                    machine: printer({ hourly_cost: 1.37, power_consumption_watts: 137 }),
                    electricityRate: 0.137,
                    laborRate: 13.3,
                    consumables: [{ name: "Glue", value: 0.37 }],
                });
                const s = summariseQuote(q);
                expect(s.subtotal).toBe(q.subtotal);
                expect(s.total).toBe(q.totalPrice);
                const resinQuote = calculateResinQuote({
                    formData: resinForm({ quantity: String(qty), markupPercentage: markup }),
                    material: resin(),
                    machine: printer({ hourly_cost: 1.37, power_consumption_watts: 137 }),
                    electricityRate: 0.137,
                    laborRate: 13.3,
                });
                expect(summariseQuote(resinQuote).total).toBe(resinQuote.totalPrice);
            }
        }
    });
});

describe("costPerBaseUnit units", () => {
    it("prices a per-pound spool per kilogram", () => {
        expect(costPerBaseUnit(filament({ cost_per_unit: 10, unit: "lb" }), "FDM")).toBeCloseTo(22.0462, 3);
    });
    it("flags units it does not convert", () => {
        expect(isRecognisedMaterialUnit("lb")).toBe(true);
        expect(isRecognisedMaterialUnit("spool")).toBe(false);
    });
});

describe("isFlatConsumable", () => {
    it("keeps flat amounts and drops per-ml paints and rates", () => {
        expect(isFlatConsumable({ unit: "" })).toBe(true);
        expect(isFlatConsumable({ unit: "each" })).toBe(true);
        expect(isFlatConsumable({ unit: "/ml" })).toBe(false);
        expect(isFlatConsumable({ unit: "%" })).toBe(false);
        expect(isFlatConsumable({ unit: "/hr" })).toBe(false);
    });
});

describe("pricing adjustments", () => {
    const base = { material: filament(), machine: printer(), electricityRate: 0.15, laborRate: 18 };
    const plain = calculateFDMQuote({ formData: fdmForm({ quantity: "2" }), ...base });

    it("leaves a quote untouched when no adjustment is set", () => {
        expect(plain.minimumTopUp).toBeUndefined();
        expect(plain.discountAmount).toBeUndefined();
        expect(plain.shippingCost).toBeUndefined();
        expect(plain.totalPrice).toBe(51.17);
    });

    it("margin mode prices at cost / (1 - margin), markup mode is unchanged", () => {
        const markup = calculateFDMQuote({ formData: fdmForm({ quantity: "1", markupPercentage: "40" }), ...base });
        const margin = calculateFDMQuote({ formData: fdmForm({ quantity: "1", markupPercentage: "40", pricingMode: "margin" }), ...base });
        expect(margin.subtotal).toBe(markup.subtotal);
        // 40 % margin: price = subtotal / 0.6, so markup = subtotal * 2/3
        expect(margin.markup).toBeCloseTo((margin.subtotal * 2) / 3, 1);
        expect(margin.markup).toBeGreaterThan(markup.markup);
        expect(margin.markup / margin.totalPrice).toBeCloseTo(0.4, 2);
    });

    it("applies a percentage discount to the marked-up price", () => {
        const q = calculateFDMQuote({ formData: fdmForm({ quantity: "2", discountType: "percent", discountValue: "10" }), ...base });
        expect(q.discountAmount).toBe(5.12);
        expect(q.totalPrice).toBe(46.05);
    });

    it("applies a fixed discount, never below zero", () => {
        const q = calculateFDMQuote({ formData: fdmForm({ discountType: "amount", discountValue: "999999" }), ...base });
        expect(q.totalPrice).toBe(0);
    });

    it("adds shipping after the discount", () => {
        const q = calculateFDMQuote({ formData: fdmForm({ quantity: "2", discountType: "percent", discountValue: "10", shippingCost: "4.5" }), ...base });
        expect(q.shippingCost).toBe(4.5);
        expect(q.totalPrice).toBe(50.55);
    });

    it("tops a small job up to the minimum charge, before any discount", () => {
        const q = calculateFDMQuote({ formData: fdmForm({ quantity: "1" }), ...base, minimumCharge: 100 });
        const one = calculateFDMQuote({ formData: fdmForm({ quantity: "1" }), ...base });
        expect(q.minimumTopUp).toBe(+(100 - one.totalPrice).toFixed(2));
        expect(q.totalPrice).toBe(100);
        const above = calculateFDMQuote({ formData: fdmForm({ quantity: "1" }), ...base, minimumCharge: 10 });
        expect(above.minimumTopUp).toBeUndefined();
    });

    it("summariseQuote reproduces the stored total with every adjustment in play", () => {
        for (const qty of [1, 3, 11]) {
            for (const mode of ["markup", "margin"] as const) {
                const q = calculateFDMQuote({
                    formData: fdmForm({ quantity: String(qty), pricingMode: mode, markupPercentage: "35", discountType: "percent", discountValue: "7.5", shippingCost: "3.2" }),
                    ...base,
                    minimumCharge: 60,
                });
                const s = summariseQuote(q);
                expect(s.total).toBe(q.totalPrice);
                expect(s.discount).toBe(q.discountAmount ?? 0);
                expect(s.shipping).toBe(3.2);
            }
        }
    });

    it("validates the new inputs", () => {
        expect(validateFDMForm(fdmForm({ discountValue: "120" }))).toMatch(/Discount/);
        expect(validateFDMForm(fdmForm({ shippingCost: "-1" }))).toMatch(/Shipping/);
        expect(validateFDMForm(fdmForm({ pricingMode: "margin", markupPercentage: "95" }))).toMatch(/Margin/);
        expect(validateFDMForm(fdmForm({ pricingMode: "margin", markupPercentage: "40" }))).toBeNull();
    });
});

describe("measured watts and waste", () => {
    const base = { material: filament(), electricityRate: 0.15, laborRate: 18 };

    it("prices electricity from measured watts when present, rated watts otherwise", () => {
        const rated = calculateFDMQuote({ formData: fdmForm({ quantity: "1" }), ...base, machine: printer() });
        const measured = calculateFDMQuote({ formData: fdmForm({ quantity: "1" }), ...base, machine: printer({ measuredWatts: 60 }) });
        expect(measured.electricityCost).toBeLessThan(rated.electricityCost);
        expect(effectiveWatts(printer())).toBe(120);
        expect(effectiveWatts(printer({ measuredWatts: 60 }))).toBe(60);
        expect(effectiveWatts(printer({ measuredWatts: 0 }))).toBe(120);
    });

    it("adds waste to material only", () => {
        const a = calculateFDMQuote({ formData: fdmForm({ quantity: "1" }), ...base, machine: printer() });
        const b = calculateFDMQuote({ formData: fdmForm({ quantity: "1" }), ...base, machine: printer(), wastePercent: 10 });
        expect(b.materialCost).toBeCloseTo(a.materialCost * 1.1, 2);
        expect(b.machineTimeCost).toBe(a.machineTimeCost);
    });
});

describe("round", () => {
    it("rounds half away from zero on the visible decimal", () => {
        const q = (cost: number) => calculateFDMQuote({
            formData: fdmForm({ quantity: "1", printTime: "0.000001", laborHours: "0", overheadPercentage: "0", markupPercentage: "0", filamentWeight: String((cost / 25) * 1000) }),
            material: filament(), machine: printer({ hourly_cost: 0, power_consumption_watts: 0 }), electricityRate: 0, laborRate: 0,
        }).materialCost;
        expect(q(1.005)).toBe(1.01);
        expect(q(2.675)).toBe(2.68);
    });
});
