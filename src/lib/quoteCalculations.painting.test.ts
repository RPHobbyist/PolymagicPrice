/*
 * Painting, which the shop bills for and which until now had no tests at all.
 *
 * Three defects lived in that gap: the resin engine read a paint's value without `toNum`, so a
 * non-numeric value produced NaN that `round()` then flattened to zero across the whole quote; a
 * coat count of 0 was clamped up to 1 and billed; and the four copies of this arithmetic had
 * already drifted apart from one another.
 */
import { describe, it, expect } from "vitest";
import {
    calculateFDMQuote,
    calculateResinQuote,
    computePaintCost,
    parsePaintUsageRate,
    summariseQuote,
} from "./quoteCalculations";
import { CostConstant, FDMFormData, Machine, Material, ResinFormData } from "@/types/quote";

const filament = (): Material => ({
    id: "mat-pla", name: "PLA", cost_per_unit: 25, unit: "kg", print_type: "FDM",
});

const resin = (): Material => ({
    id: "mat-resin", name: "Standard Resin", cost_per_unit: 45, unit: "liter", print_type: "Resin",
});

const printer = (): Machine => ({
    id: "mac-1", name: "Test Printer", hourly_cost: 2, power_consumption_watts: 120, print_type: "FDM",
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
    quantity: "1",
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

/** A paint sold by the millilitre, at 0.40 per ml and 0.05 ml per cm² per coat. */
const mlPaint = (overrides: Partial<CostConstant> = {}): CostConstant => ({
    id: "paint-primer",
    name: "Grey Primer",
    value: 0.4,
    unit: "/ml",
    description: "Usage Rate: 0.05ml/cm2",
    ...overrides,
} as CostConstant);

/** A paint charged as a flat fee per job. */
const flatPaint = (overrides: Partial<CostConstant> = {}): CostConstant => ({
    id: "paint-flat",
    name: "Spray Can",
    value: 3,
    unit: "/job",
    description: "",
    ...overrides,
} as CostConstant);

describe("computePaintCost", () => {
    it("charges a per-millilitre paint over area and coats", () => {
        // 0.40/ml x 100 cm2 x 2 coats x 0.05 ml/cm2 = 4.00
        expect(computePaintCost(mlPaint(), 100, 2)).toBeCloseTo(4, 10);
    });

    it("charges a flat paint once, whatever the area", () => {
        expect(computePaintCost(flatPaint(), 100, 3)).toBe(3);
        expect(computePaintCost(flatPaint(), 0, 0)).toBe(3);
    });

    it("costs nothing when no paint is selected", () => {
        expect(computePaintCost(undefined, 100, 2)).toBe(0);
    });

    it("does not bill a coat the shop set to zero", () => {
        // The old Math.max(1, layers) charged one coat for a deliberate 0.
        expect(computePaintCost(mlPaint(), 100, 0)).toBe(0);
    });

    it("never returns NaN for a paint whose stored value is not a number", () => {
        const broken = mlPaint({ value: "abc" as unknown as number });
        expect(computePaintCost(broken, 100, 2)).toBe(0);
        expect(Number.isFinite(computePaintCost(broken, 100, 2))).toBe(true);
    });

    it("falls back to the default usage rate when the description omits one", () => {
        expect(parsePaintUsageRate(undefined)).toBe(0.02);
        expect(parsePaintUsageRate("no rate here")).toBe(0.02);
        expect(parsePaintUsageRate("Usage Rate: 0.05ml/cm2")).toBe(0.05);
        // 0.40 x 100 x 1 x 0.02 = 0.80
        expect(computePaintCost(mlPaint({ description: "" }), 100, 1)).toBeCloseTo(0.8, 10);
    });

    it("treats a negative area as no area rather than a credit", () => {
        expect(computePaintCost(mlPaint(), -100, 2)).toBe(0);
    });
});

describe("painting inside a whole quote", () => {
    it("adds paint, then overhead and markup on top, then scales by quantity (FDM)", () => {
        const withoutPaint = calculateFDMQuote({
            formData: fdmForm({ quantity: "2" }),
            material: filament(), machine: printer(), electricityRate: 0.15, laborRate: 18, consumables: [],
        });

        const withPaint = calculateFDMQuote({
            formData: fdmForm({ quantity: "2", paintingLayers: "2", surfaceAreaCm2: "100", paintingTime: "0" }),
            material: filament(), machine: printer(), electricityRate: 0.15, laborRate: 18, consumables: [],
            paintConsumable: mlPaint(),
        });

        // 4.00 of paint per unit, x2 units.
        expect(withPaint.paintingCost).toBeCloseTo(8, 6);
        // 4.00 + 10% overhead + 40% markup = 6.16 per unit, x2 = 12.32
        expect(withPaint.totalPrice - withoutPaint.totalPrice).toBeCloseTo(12.32, 2);
    });

    it("prices the resin engine's primary paint identically to the FDM engine", () => {
        const quote = calculateResinQuote({
            formData: resinForm({ paintingLayers: "2", surfaceAreaCm2: "100", paintingTime: "0" }),
            material: resin(), machine: printer(), electricityRate: 0.15, laborRate: 18, consumables: [],
            paintConsumable: mlPaint(),
        });

        expect(quote.paintingCost).toBeCloseTo(4, 6);
    });

    it("never turns a broken paint value into a free quote", () => {
        // The exact regression: resin's primary paint skipped toNum, NaN spread through every
        // total, and round() flattened each one to 0 — a quote invoiced at nothing.
        const quote = calculateResinQuote({
            formData: resinForm({ paintingLayers: "2", surfaceAreaCm2: "100" }),
            material: resin(), machine: printer(), electricityRate: 0.15, laborRate: 18, consumables: [],
            paintConsumable: mlPaint({ value: undefined as unknown as number }),
        });

        expect(quote.totalPrice).toBeGreaterThan(0);
        expect(quote.subtotal).toBeGreaterThan(0);
        expect(quote.markup).toBeGreaterThan(0);
    });

    it("charges both paint slots", () => {
        const quote = calculateFDMQuote({
            formData: fdmForm({ paintingLayers: "1", paintingLayers2: "1", surfaceAreaCm2: "100", paintingTime: "0" }),
            material: filament(), machine: printer(), electricityRate: 0.15, laborRate: 18, consumables: [],
            paintConsumable: mlPaint(),
            paintConsumable2: flatPaint(),
        });

        // 0.40 x 100 x 1 x 0.05 = 2.00, plus the flat 3.00
        expect(quote.paintingCost).toBeCloseTo(5, 6);
    });

    it("charges nothing for painting when no paint is passed, whatever the stale fields say", () => {
        // What the calculator now guarantees by not handing the engine a paint while the
        // painting switch is off: leftover layer counts and a surface area cost nothing.
        const quote = calculateFDMQuote({
            formData: fdmForm({ paintingLayers2: "3", surfaceAreaCm2: "400", paintingTime: "0" }),
            material: filament(), machine: printer(), electricityRate: 0.15, laborRate: 18, consumables: [],
        });

        expect(quote.paintingCost).toBe(0);
    });

    it("keeps the painted quote's own summary reconciled with its stored total", () => {
        const quote = calculateFDMQuote({
            formData: fdmForm({ quantity: "3", paintingLayers: "2", surfaceAreaCm2: "100", paintingTime: "0.5" }),
            material: filament(), machine: printer(), electricityRate: 0.15, laborRate: 18,
            consumables: [{ name: "Glue stick", value: 0.5 }],
            paintConsumable: mlPaint(),
        });

        const totals = summariseQuote(quote);
        expect(totals.total).toBeCloseTo(quote.totalPrice, 2);
        expect(totals.subtotal).toBeCloseTo(quote.subtotal, 2);
        expect(totals.painting).toBeCloseTo(quote.paintingCost ?? 0, 2);
    });
});
