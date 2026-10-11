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
 * The carbon factor library.
 *
 * Every figure here is a published default a shop can override, and every one carries the source
 * and year it came from, because a footprint nobody can trace is worth nothing to the customer
 * asking for it. Resolution always ends in a usable number — a missing machine or an unknown
 * material degrades to a class default rather than silently producing zero.
 *
 * Defaults are resolved at calculation time rather than written into machine or material records:
 * `syncLatestDefaultMachines` only ever ADDS machines, so anything written into existing records
 * could never reach users who already have the default fleet.
 */

import { Machine, Material, MaterialSpool } from "@/types/quote";

/** Ranges that a typed value must fall inside, mirroring how the AI's COMMAND_LIMITS bound constants. */
export const CARBON_BOUNDS = {
    gridGPerKWh: { min: 0, max: 1200 },
    efKgPerKg: { min: 0, max: 50 },
    watts: { min: 1, max: 5000 },
} as const;

export const clampToBounds = (value: number, bounds: { min: number; max: number }): number =>
    Math.min(bounds.max, Math.max(bounds.min, value));

const isUsable = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0;

// ---------------------------------------------------------------------------
// Grid intensity
// ---------------------------------------------------------------------------

export interface GridPreset {
    id: string;
    label: string;
    gPerKWh: number;
    /** Lifecycle factors include upstream fuel supply; generation factors count combustion only. */
    boundary: "lifecycle" | "generation";
    source: string;
    year: number;
}

/**
 * Regional presets. The world average is the shipped default: guessing a country from the
 * currency is unreliable (the euro alone spans factors from ~40 to ~600), so the app asks once.
 */
export const GRID_PRESETS: GridPreset[] = [
    // 473 is the 2024 world figure from Ember's 2025 review; the 2026 review (April 2026) gives 458 for
    // 2025. Left as shipped so no existing default moves silently. Ember's gCO2e series counts
    // lifecycle emissions, so the boundary is lifecycle, not generation.
    { id: "world", label: "World average", gPerKWh: 473, boundary: "lifecycle", source: "Ember Global Electricity Review 2025 (2024 data)", year: 2024 },
    { id: "in", label: "India", gPerKWh: 710, boundary: "generation", source: "CEA CO2 Baseline Database v21.0 (FY 2024-25)", year: 2025 },
    { id: "cn", label: "China", gPerKWh: 526, boundary: "lifecycle", source: "Ember", year: 2025 },
    { id: "au", label: "Australia", gPerKWh: 525, boundary: "lifecycle", source: "Ember", year: 2025 },
    { id: "jp", label: "Japan", gPerKWh: 477, boundary: "lifecycle", source: "Ember", year: 2025 },
    { id: "us", label: "United States", gPerKWh: 350, boundary: "generation", source: "EPA eGRID", year: 2023 },
    { id: "de", label: "Germany", gPerKWh: 330, boundary: "lifecycle", source: "Ember", year: 2025 },
    { id: "ca", label: "Canada", gPerKWh: 191, boundary: "lifecycle", source: "Ember", year: 2025 },
    // 0.131 is the 2026 DESNZ/DEFRA set (0.131 kg/kWh, down from 0.177 in the 2025 set), so it was
    // mislabelled 2025. Generation only: transmission and distribution losses are a separate factor.
    { id: "uk", label: "United Kingdom", gPerKWh: 131, boundary: "generation", source: "DESNZ/DEFRA GHG conversion factors 2026 (excl. T&D)", year: 2026 },
    { id: "br", label: "Brazil", gPerKWh: 110, boundary: "lifecycle", source: "Ember", year: 2025 },
    { id: "fr", label: "France", gPerKWh: 41, boundary: "lifecycle", source: "Ember", year: 2025 },
];

export const DEFAULT_GRID_G_PER_KWH = 473;

/** The seeded constant that holds the shop's grid factor. The unit must not begin with "/" — the
 *  constants table prefixes a currency symbol to any unit that does. */
export const GRID_CONSTANT_ID = "grid_intensity";
export const GRID_CONSTANT_UNIT = "gCO2e/kWh";

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export type MaterialClass = "pla" | "petg" | "abs" | "asa" | "tpu" | "nylon" | "pc" | "resin" | "other";

/** Whether a material needs a hot chamber, which roughly doubles a printer's average draw. */
export type ThermalClass = "standard" | "engineering" | "resin";

export interface MaterialPreset {
    id: string;
    label: string;
    kgPerKg: number;
    /** Mass fraction of carbon, used by the incineration route: C × 44/12. */
    carbonFraction: number;
    densityGCm3: number;
    materialClass: MaterialClass;
    thermal: ThermalClass;
    source: string;
    year: number;
}

/**
 * Cradle-to-gate factors for **filament and resin as bought**, not polymer granulate.
 *
 * A print shop buys a finished spool, and the only manufacturer LCA published for one (Prusa,
 * SimaPro, ISO 14040/44 practitioner) covers farming or mining through transport, production
 * power, water and packaging. Granulate eco-profiles understate that by roughly half, which is
 * why they are not the default here.
 */
export const MATERIAL_PRESETS: MaterialPreset[] = [
    { id: "pla-virgin", label: "PLA (virgin)", kgPerKg: 5.76, carbonFraction: 0.50, densityGCm3: 1.24, materialClass: "pla", thermal: "standard", source: "Prusa Research LCA (Prusament PLA)", year: 2023 },
    { id: "pla-recycled", label: "PLA (recycled)", kgPerKg: 2.47, carbonFraction: 0.50, densityGCm3: 1.24, materialClass: "pla", thermal: "standard", source: "Prusa Research LCA (Prusament PLA Recycled)", year: 2023 },
    { id: "petg-virgin", label: "PETG (virgin)", kgPerKg: 5.85, carbonFraction: 0.625, densityGCm3: 1.27, materialClass: "petg", thermal: "standard", source: "Prusa Research LCA (Prusament PETG)", year: 2023 },
    { id: "petg-recycled", label: "PETG (recycled)", kgPerKg: 2.55, carbonFraction: 0.625, densityGCm3: 1.27, materialClass: "petg", thermal: "standard", source: "Prusa Research LCA (Prusament PETG Recycled)", year: 2023 },
    { id: "abs", label: "ABS", kgPerKg: 3.60, carbonFraction: 0.845, densityGCm3: 1.04, materialClass: "abs", thermal: "engineering", source: "Plastics Europe eco-profile range 3.1-4.1, midpoint", year: 2024 },
    { id: "asa", label: "ASA", kgPerKg: 3.96, carbonFraction: 0.83, densityGCm3: 1.07, materialClass: "asa", thermal: "engineering", source: "Proxy: ABS +10%, no dedicated profile found", year: 2024 },
    { id: "tpu", label: "TPU", kgPerKg: 5.50, carbonFraction: 0.64, densityGCm3: 1.21, materialClass: "tpu", thermal: "standard", source: "Polyurethane range 4.5-6.5, midpoint", year: 2024 },
    { id: "nylon", label: "Nylon / PA12", kgPerKg: 8.00, carbonFraction: 0.73, densityGCm3: 1.01, materialClass: "nylon", thermal: "engineering", source: "Polyamide eco-profiles 7-9, midpoint", year: 2024 },
    { id: "pc", label: "Polycarbonate", kgPerKg: 6.50, carbonFraction: 0.756, densityGCm3: 1.20, materialClass: "pc", thermal: "engineering", source: "Plastics Europe range 5.5-7.6, midpoint", year: 2024 },
    { id: "resin", label: "Photopolymer resin", kgPerKg: 5.00, carbonFraction: 0.65, densityGCm3: 1.10, materialClass: "resin", thermal: "resin", source: "Proxy from epoxy/acrylate thermosets: no public SLA figure exists, so ask your supplier for an EPD", year: 2024 },
];

const MATERIAL_NAME_PATTERNS: { pattern: RegExp; presetId: string }[] = [
    { pattern: /\b(r-?pla|recycled\s*pla)\b/i, presetId: "pla-recycled" },
    { pattern: /\b(r-?petg|recycled\s*petg)\b/i, presetId: "petg-recycled" },
    { pattern: /\bpla\b/i, presetId: "pla-virgin" },
    { pattern: /\b(petg|pet-g)\b/i, presetId: "petg-virgin" },
    { pattern: /\basa\b/i, presetId: "asa" },
    { pattern: /\babs\b/i, presetId: "abs" },
    { pattern: /\btpu|tpe|flex/i, presetId: "tpu" },
    { pattern: /\b(pa\s?6|pa\s?12|nylon|polyamide)\b/i, presetId: "nylon" },
    { pattern: /\b(pc|polycarbonate)\b/i, presetId: "pc" },
    { pattern: /resin/i, presetId: "resin" },
];

export const getMaterialPreset = (presetId: string | undefined): MaterialPreset | undefined =>
    MATERIAL_PRESETS.find(p => p.id === presetId);

/**
 * Best-guess preset for a material, by name, in the same spirit as `getSpecsByMachineName`.
 * Carbon-fibre variants are matched on their base polymer; the filler is a small part of the mass.
 */
export const matchMaterialPreset = (name: string | undefined, printType?: "FDM" | "Resin"): MaterialPreset => {
    // The process decides first: "ABS-like resin" or "PLA-like resin" is a photopolymer, and the
    // thermoplastic its name borrows would give the wrong factor, density and thermal class.
    if (printType === "Resin") return getMaterialPreset("resin")!;

    const haystack = (name || "").trim();
    if (haystack) {
        for (const { pattern, presetId } of MATERIAL_NAME_PATTERNS) {
            if (pattern.test(haystack)) {
                const preset = getMaterialPreset(presetId);
                if (preset) return preset;
            }
        }
    }
    // Unknown name: fall back on the process, never on nothing.
    return getMaterialPreset("pla-virgin")!;
};

export interface ResolvedMaterialFactor {
    kgPerKg: number;
    /** Where the number came from, weakest last. */
    source: "spool" | "material" | "preset" | "library";
    label: string;
    sourceNote: string;
    preset: MaterialPreset;
}

/**
 * Spool beats material beats library.
 *
 * The spool is the strongest anchor because it is the product actually bought — recycled PLA is
 * 2.47 against virgin PLA's 5.76, a difference no generic factor can express.
 */
export const resolveMaterialFactor = (
    material: Material | undefined,
    spool?: MaterialSpool,
    printType?: "FDM" | "Resin"
): ResolvedMaterialFactor => {
    const preset = matchMaterialPreset(material?.name, printType ?? material?.print_type);

    if (isUsable(spool?.co2PerKg)) {
        return {
            kgPerKg: clampToBounds(spool!.co2PerKg!, CARBON_BOUNDS.efKgPerKg),
            source: "spool",
            label: spool?.name || material?.name || preset.label,
            sourceNote: spool?.co2Source || "Entered for this spool",
            preset,
        };
    }

    if (isUsable(material?.co2PerKg)) {
        return {
            kgPerKg: clampToBounds(material!.co2PerKg!, CARBON_BOUNDS.efKgPerKg),
            source: "material",
            label: material?.name || preset.label,
            sourceNote: material?.co2Source || "Entered for this material",
            preset,
        };
    }

    return {
        kgPerKg: preset.kgPerKg,
        source: "library",
        label: preset.label,
        sourceNote: `${preset.source} (${preset.year})`,
        preset,
    };
};

export const resolveDensity = (material: Material | undefined, preset: MaterialPreset): number =>
    isUsable(material?.densityGCm3) ? material!.densityGCm3! : preset.densityGCm3;

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

export type EolPath = "landfill" | "incineration" | "recycling";
export const DEFAULT_EOL_PATH: EolPath = "landfill";

/**
 * kgCO2e per kg of discarded material.
 *
 * Incineration is arithmetic rather than a citation: burning a polymer releases its carbon as CO2,
 * so the factor is the carbon fraction times 44/12 (PLA 1.83, PETG 2.29, ABS ~3.10). Recycling is
 * cut off at zero — an avoided-burden credit needs a declared allocation method before it can be
 * claimed, and claiming one unearned is exactly the kind of number a customer's auditor removes.
 */
export const disposalFactor = (path: EolPath, carbonFraction: number): number => {
    switch (path) {
        case "incineration":
            return Math.max(0, carbonFraction) * (44 / 12);
        case "recycling":
            return 0;
        case "landfill":
        default:
            return 0.01; // handling only
    }
};

// ---------------------------------------------------------------------------
// Machine energy
// ---------------------------------------------------------------------------

/**
 * Average draw while printing, in watts, by machine class.
 *
 * The stored `power_consumption_watts` is a nameplate or PSU rating: an Ender 3 is listed at 350 W
 * but measures 75-125 W in use, while a Prusa MK3S listed at 120 W is already close to its average.
 * A single load factor across that field would err two to three times in both directions, so the
 * library resolves a measured-style average instead and keeps the nameplate for pricing.
 */
export const CLASS_WATTS: Record<"openFrame" | "enclosed" | "resin", Record<ThermalClass, number>> = {
    openFrame: { standard: 100, engineering: 160, resin: 100 },
    enclosed: { standard: 180, engineering: 290, resin: 180 },
    resin: { standard: 50, engineering: 50, resin: 50 },
};

export const DEFAULT_IDLE_WATTS = 11; // board, display and fans; more with an AMS attached

/** Wash and cure stations are separate appliances, not the printer they are billed against today. */
export const RESIN_STATION_WATTS = { wash: 30, cure: 40 } as const;

interface MachineWattSeed {
    pattern: RegExp;
    watts: Partial<Record<ThermalClass, number>>;
    /** measured: published bench figures exist for this model. class: inherited from its family. */
    provenance: "measured-reference" | "class";
}

/**
 * Seeds for the common fleet. Only models with published measurements are marked as such; the rest
 * inherit their class, which the shop can override with one number from a plug meter.
 */
const MACHINE_WATT_SEEDS: MachineWattSeed[] = [
    { pattern: /x1\s*-?\s*c|x1\s*carbon/i, watts: { standard: 120, engineering: 290 }, provenance: "measured-reference" },
    { pattern: /\bp1s\b|\bp1p\b|\bp2s\b/i, watts: { standard: 100, engineering: 230 }, provenance: "measured-reference" },
    { pattern: /a1\s*mini/i, watts: { standard: 80 }, provenance: "measured-reference" },
    { pattern: /\ba1\b/i, watts: { standard: 95 }, provenance: "measured-reference" },
    { pattern: /mk4|mk3|core\s*one/i, watts: { standard: 100, engineering: 170 }, provenance: "measured-reference" },
    { pattern: /ender\s*3/i, watts: { standard: 100, engineering: 160 }, provenance: "measured-reference" },
    { pattern: /\bk1\b|k1\s*max|\bk2\b/i, watts: { standard: 130, engineering: 240 }, provenance: "class" },
    { pattern: /prusa\s*xl/i, watts: { standard: 150, engineering: 260 }, provenance: "class" },
    { pattern: /h2d|h2s|x-?max|qidi|kobra\s*\d*\s*max/i, watts: { standard: 160, engineering: 290 }, provenance: "class" },
];

/** Printers whose name implies an enclosure, and therefore a much higher draw on hot materials. */
const ENCLOSED_HINTS = /x1|p1s|p1p|p2s|h2|k1|k2|qidi|x-?max|core\s*one|voron|ultimaker|raise3d/i;

export interface ResolvedWatts {
    watts: number;
    source: "measured" | "library" | "nameplate";
    note: string;
}

/**
 * Never returns zero.
 *
 * A machine saved without a wattage is legitimate — `power_consumption_watts` is nullable — and the
 * old multiplication would have quietly produced a zero-carbon job for it.
 */
export const resolveMachineWatts = (
    machine: Machine | undefined,
    thermal: ThermalClass
): ResolvedWatts => {
    if (isUsable(machine?.measuredWatts)) {
        return {
            watts: clampToBounds(machine!.measuredWatts!, CARBON_BOUNDS.watts),
            source: "measured",
            note: "Measured on this machine",
        };
    }

    const name = machine?.name || "";
    const isResin = machine?.print_type === "Resin" || thermal === "resin";

    if (!isResin) {
        for (const seed of MACHINE_WATT_SEEDS) {
            if (seed.pattern.test(name)) {
                const watts = seed.watts[thermal] ?? seed.watts.standard;
                if (isUsable(watts)) {
                    return {
                        watts: clampToBounds(watts, CARBON_BOUNDS.watts),
                        source: "library",
                        note: seed.provenance === "measured-reference"
                            ? "Published measurement for this model"
                            : "Typical for this machine class",
                    };
                }
            }
        }
    }

    const nameplate = Number(machine?.power_consumption_watts);

    // Resin is the one case where the stored wattage is worth trusting as-is: LCD machines are
    // rated 45-120 W and draw close to that while printing, unlike an FDM nameplate that quotes
    // the power supply. Derating it here would understate a resin job by roughly two thirds.
    if (isResin && isUsable(nameplate)) {
        return {
            watts: clampToBounds(nameplate, CARBON_BOUNDS.watts),
            source: "nameplate",
            note: "This machine's rated wattage (resin ratings track actual draw closely)",
        };
    }

    const family = isResin ? "resin" : ENCLOSED_HINTS.test(name) ? "enclosed" : "openFrame";
    const classWatts = CLASS_WATTS[family][thermal];
    if (isUsable(classWatts)) {
        return {
            watts: clampToBounds(classWatts, CARBON_BOUNDS.watts),
            source: "library",
            note: `Typical for ${family === "openFrame" ? "an open-frame" : family === "enclosed" ? "an enclosed"
                : "a resin"} printer`,
        };
    }

    // Safety net only: the class table above always yields a number, so this runs when a caller
    // passes an unknown thermal class. A nameplate is a peak rating, hence the derate.
    const derated = isUsable(nameplate) ? nameplate * 0.35 : CLASS_WATTS.openFrame.standard;
    return {
        watts: clampToBounds(derated, CARBON_BOUNDS.watts),
        source: "nameplate",
        note: "Estimated from the machine's rated wattage",
    };
};

/** Thermal class decides how hard the bed and chamber work, which dominates a printer's draw. */
export const thermalClassOf = (preset: MaterialPreset): ThermalClass => preset.thermal;
