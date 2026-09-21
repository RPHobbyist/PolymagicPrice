/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*
 * The per-job carbon engine.
 *
 * Pure functions only: no storage reads, no React, no formatting decisions beyond the numeric
 * helper at the bottom — the same discipline `quoteCalculations.ts` and `quoteStats.ts` follow, so
 * the dashboard, the assistant, the reports and the invoice can never disagree about a figure.
 *
 * Scope of a job's footprint: energy + material + end of life. Idle draw, HVAC and lighting are
 * shop overhead and are deliberately NOT attributed here — idle happens between jobs, so charging
 * it to one is arbitrary and double counts against any shop total.
 */

import { Machine, Material, MaterialSpool, QuoteCarbon } from "@/types/quote";
import { totalPrintHours } from "@/lib/utils/time";
import {
    CARBON_BOUNDS,
    DEFAULT_EOL_PATH,
    DEFAULT_GRID_G_PER_KWH,
    EolPath,
    RESIN_STATION_WATTS,
    clampToBounds,
    disposalFactor,
    resolveDensity,
    resolveMachineWatts,
    resolveMaterialFactor,
} from "./carbonFactors";

export interface CarbonInput {
    printType: "FDM" | "Resin";
    quantity?: number;
    /** `parameters.printTime`, stored PER UNIT. */
    printTimePerUnit?: string | number;
    /** Whole-job total, once production has recorded it. */
    actualPrintTime?: number;
    /** `parameters.filamentWeight` (grams) or `parameters.resinVolume` (ml), PER UNIT. */
    perUnitMaterial?: string | number;
    /** Whole job, scrap already included, once production has reconciled it. */
    actualMaterialUsed?: number;
    failedUnits?: number;
    /** Only OrcaSlicer and Bambu Studio files populate this; `waste` is the unattributed residual. */
    featureWeights?: { walls?: number; infill?: number; supports?: number; waste?: number };
    /** Resin only, per unit, in minutes. */
    washingTimeMinutes?: string | number;
    curingTimeMinutes?: string | number;
    machine?: Machine;
    material?: Material;
    spool?: MaterialSpool;
    gridGPerKWh?: number;
    /** The shop-wide disposal route. A material's own `eolPath` takes precedence over it. */
    eolPath?: EolPath;
}

export interface CarbonBreakdown extends QuoteCarbon {
    /** Derived views the UI and reports need but the stored record does not keep. */
    perPart: number;
    jobHours: number;
    massKg: number;
    deliveredKg: number;
    wasteMassKg: number;
    /** kWh per print-hour — the fleet comparison metric. Per-kg intensity mostly ranks geometry. */
    energyRateKWhPerHour: number;
    factorLabel: string;
    factorSourceNote: string;
    wattsNote: string;
}

const num = (value: unknown, fallback = 0): number => {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value: number, places = 4): number => {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** places;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

/**
 * Grams for FDM, millilitres for resin — one conversion so the material and the waste terms can
 * never disagree. The waste term used to add millilitres straight onto a kilogram figure.
 */
const toMassKg = (amount: number, printType: "FDM" | "Resin", densityGCm3: number): number => {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return printType === "Resin" ? (amount * densityGCm3) / 1000 : amount / 1000;
};

/**
 * Computes a job's footprint. Returns `undefined` when there is nothing to measure.
 *
 * Never throws: a quote is the product, and a missing factor must not be able to break pricing.
 */
export const calculateJobCarbon = (input: CarbonInput): CarbonBreakdown | undefined => {
    try {
        const printType = input.printType === "Resin" ? "Resin" : "FDM";
        const quantity = Math.max(1, Math.floor(num(input.quantity, 1)));

        const jobHours = totalPrintHours(input.printTimePerUnit, quantity, input.actualPrintTime);
        const perUnitMaterial = Math.max(0, num(input.perUnitMaterial));
        const actualMaterial = Math.max(0, num(input.actualMaterialUsed));

        // Nothing to measure at all — an empty form, not a zero-carbon job.
        if (jobHours <= 0 && perUnitMaterial <= 0 && actualMaterial <= 0) return undefined;

        const factor = resolveMaterialFactor(input.material, input.spool, printType);
        const preset = factor.preset;
        const density = resolveDensity(input.material, preset);
        const watts = resolveMachineWatts(input.machine, preset.thermal);

        // --- Energy -------------------------------------------------------------------
        let kWh = (watts.watts * jobHours) / 1000;
        if (printType === "Resin") {
            // Wash and cure run on their own appliances. The quote engine bills those hours at the
            // printer's wattage, which is the wrong device; carbon uses station figures instead.
            const washHours = (Math.max(0, num(input.washingTimeMinutes)) / 60) * quantity;
            const cureHours = (Math.max(0, num(input.curingTimeMinutes)) / 60) * quantity;
            kWh += (RESIN_STATION_WATTS.wash * washHours + RESIN_STATION_WATTS.cure * cureHours) / 1000;
        }

        const gridGPerKWh = clampToBounds(
            num(input.gridGPerKWh, DEFAULT_GRID_G_PER_KWH),
            CARBON_BOUNDS.gridGPerKWh
        );
        const energyKg = (kWh * gridGPerKWh) / 1000;

        // --- Material -----------------------------------------------------------------
        const massSource: "estimate" | "actual" = actualMaterial > 0 ? "actual" : "estimate";
        const rawMass = actualMaterial > 0 ? actualMaterial : perUnitMaterial * quantity;
        const massKg = toMassKg(rawMass, printType, density);
        const materialKg = massKg * factor.kgPerKg;

        // --- Waste and end of life ------------------------------------------------------
        // Disposal only: producing this mass is already inside materialKg above.
        const failedUnits = Math.max(0, Math.floor(num(input.failedUnits)));
        const features = input.featureWeights;
        const hasFeatureData = !!features && (features.supports !== undefined || features.waste !== undefined);
        // Feature weights describe one print of the sliced file, so they scale with quantity the
        // same way every other per-unit figure does.
        const avoidablePerUnit = hasFeatureData
            ? Math.max(0, num(features?.supports)) + Math.max(0, num(features?.waste))
            : 0;
        const wasteRaw = avoidablePerUnit * quantity + failedUnits * perUnitMaterial;
        const wasteMassKg = toMassKg(wasteRaw, printType, density);
        // Material first: a shop that sends everything to landfill may still recycle one polymer,
        // and the setting attached to that material is the more specific statement.
        const eolPath: EolPath = input.material?.eolPath ?? input.eolPath ?? DEFAULT_EOL_PATH;
        const wasteKg = wasteMassKg * disposalFactor(eolPath, preset.carbonFraction);

        // --- Totals ---------------------------------------------------------------------
        const total = energyKg + materialKg + wasteKg;
        // Delivered mass is what ships: the parts themselves, without failed units, and without
        // supports where the slicer told us how much they weighed.
        const deliveredRaw = Math.max(0, perUnitMaterial * quantity - avoidablePerUnit * quantity);
        const deliveredKg = deliveredRaw > 0
            ? toMassKg(deliveredRaw, printType, density)
            : Math.max(0, massKg - wasteMassKg);

        const timeSource: "estimate" | "actual" =
            typeof input.actualPrintTime === "number" && input.actualPrintTime > 0 ? "actual" : "estimate";

        // The badge shows the weakest input: a job timed to the minute is still an estimate if its
        // energy came from a library average.
        const grade: QuoteCarbon["grade"] =
            timeSource === "actual" && watts.source === "measured"
                ? "MEASURED"
                : timeSource === "actual"
                    ? "ACTUAL"
                    : "ESTIMATE";

        const flags: NonNullable<QuoteCarbon["flags"]> = [];
        if (!input.machine) flags.push("no-machine");
        if (printType === "FDM" && !hasFeatureData) flags.push("no-feature-data");
        if (printType === "Resin" && !input.material?.densityGCm3) flags.push("no-density");

        return {
            kg: round(total),
            energyKg: round(energyKg),
            materialKg: round(materialKg),
            wasteKg: round(wasteKg),
            kWh: round(kWh),
            gridGPerKWh: round(gridGPerKWh, 2),
            efKgPerKg: round(factor.kgPerKg, 3),
            wattsUsed: round(watts.watts, 1),
            src: {
                time: timeSource,
                mass: massSource,
                watts: watts.source,
                ef: factor.source,
            },
            grade,
            ...(flags.length > 0 ? { flags } : {}),
            perPart: round(total / quantity),
            jobHours: round(jobHours, 3),
            massKg: round(massKg, 4),
            deliveredKg: round(deliveredKg, 4),
            wasteMassKg: round(wasteMassKg, 4),
            energyRateKWhPerHour: jobHours > 0 ? round(kWh / jobHours, 3) : 0,
            factorLabel: factor.label,
            factorSourceNote: factor.sourceNote,
            wattsNote: watts.note,
        };
    } catch (error) {
        // A footprint is a nice-to-have; a priced quote is not. Never let this path break one.
        console.error("[Carbon] Failed to compute a footprint:", error);
        return undefined;
    }
};

/** Strips the derived views so only the compact record is written onto a quote. */
export const toStoredCarbon = (breakdown: CarbonBreakdown): QuoteCarbon => ({
    kg: breakdown.kg,
    energyKg: breakdown.energyKg,
    materialKg: breakdown.materialKg,
    wasteKg: breakdown.wasteKg,
    kWh: breakdown.kWh,
    deliveredKg: breakdown.deliveredKg,
    gridGPerKWh: breakdown.gridGPerKWh,
    efKgPerKg: breakdown.efKgPerKg,
    wattsUsed: breakdown.wattsUsed,
    src: breakdown.src,
    grade: breakdown.grade,
    ...(breakdown.flags ? { flags: breakdown.flags } : {}),
});

const GRADE_RANK: Record<QuoteCarbon["grade"], number> = { ESTIMATE: 0, ACTUAL: 1, MEASURED: 2 };

/**
 * Sums several footprints into one, for a batch master whose children each carry their own.
 *
 * The totals are true sums. The per-unit fields — the grid factor, the material factor, the
 * wattage — are carried from the first record and are only indicative once a batch mixes
 * materials or machines, which is what the `aggregate` flag tells every reader. The grade is the
 * weakest of the children: one estimated child makes the whole batch an estimate.
 */
export const sumCarbonRecords = (records: (QuoteCarbon | undefined)[]): QuoteCarbon | undefined => {
    const present = records.filter((r): r is QuoteCarbon => !!r);
    if (present.length === 0) return undefined;
    if (present.length === 1) return present[0];

    const total = (pick: (r: QuoteCarbon) => number) =>
        round(present.reduce((acc, r) => acc + (Number.isFinite(pick(r)) ? pick(r) : 0), 0));

    const weakest = present.reduce((worst, r) =>
        GRADE_RANK[r.grade] < GRADE_RANK[worst.grade] ? r : worst, present[0]);

    const flags = Array.from(new Set(present.flatMap(r => r.flags ?? [])));
    if (!flags.includes("aggregate")) flags.push("aggregate");

    return {
        kg: total(r => r.kg),
        energyKg: total(r => r.energyKg),
        materialKg: total(r => r.materialKg),
        wasteKg: total(r => r.wasteKg),
        kWh: total(r => r.kWh),
        deliveredKg: total(r => r.deliveredKg),
        gridGPerKWh: present[0].gridGPerKWh,
        efKgPerKg: present[0].efKgPerKg,
        wattsUsed: present[0].wattsUsed,
        src: weakest.src,
        grade: weakest.grade,
        flags,
    };
};

/**
 * One display rule for every surface.
 *
 * Small prints are the common case, and "0.05 kgCO₂e" reads as noise where "54 gCO₂e" reads as a
 * measurement, so anything under 100 g is shown in grams.
 */
export const formatCarbon = (kg: number): string => {
    if (!Number.isFinite(kg) || kg <= 0) return "0 gCO₂e";
    if (kg < 0.1) return `${Math.round(kg * 1000)} gCO₂e`;
    if (kg < 10) return `${kg.toFixed(2)} kgCO₂e`;
    if (kg < 1000) return `${kg.toFixed(1)} kgCO₂e`;
    return `${(kg / 1000).toFixed(2)} tCO₂e`;
};
