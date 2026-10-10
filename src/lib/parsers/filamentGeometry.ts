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

/**
 * Turning a length of filament into a weight.
 *
 * This lives apart from `gcodeParser.ts` on purpose, in the same spirit as `lib/excel/safeCell.ts`:
 * the parser statically imports JSZip and DOMPurify, so a component that wants nothing but this
 * arithmetic would pull ~120 KB of parsing machinery into its chunk. The calculator needs exactly
 * this function to refine a derived weight once the shop picks a material.
 */

/** Last resort when neither the file nor the chosen material says otherwise: 1.75 mm PLA. */
export const DEFAULT_FILAMENT_DIAMETER_MM = 1.75;
export const DEFAULT_FILAMENT_DENSITY_G_CM3 = 1.24;

/** A parsed figure is only usable if it is finite and physically plausible. */
export const plausible = (value: number | null | false | undefined, min: number, max: number): number | undefined =>
    typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : undefined;

/**
 * Grams of filament in a given length of it.
 *
 * A round cross-section of `diameterMm`, so mm³ = length × π(d/2)², and 1000 mm³ = 1 cm³. For
 * 1.75 mm PLA this returns 0.00298 g/mm — the constant that used to be hardcoded in the parser.
 * The point of the function is that this is no longer the answer for every material and every
 * spool size: 2.85 mm filament weighs 2.65 times as much per millimetre, and ABS is ~16 % lighter
 * than PLA for the same volume.
 */
export const filamentWeightFromLength = (
    lengthMm: number,
    diameterMm: number = DEFAULT_FILAMENT_DIAMETER_MM,
    densityGCm3: number = DEFAULT_FILAMENT_DENSITY_G_CM3
): number => {
    if (!Number.isFinite(lengthMm) || lengthMm <= 0) return 0;

    const d = plausible(diameterMm, 1, 4) ?? DEFAULT_FILAMENT_DIAMETER_MM;
    const density = plausible(densityGCm3, 0.5, 3) ?? DEFAULT_FILAMENT_DENSITY_G_CM3;

    const volumeCm3 = (lengthMm * Math.PI * (d / 2) ** 2) / 1000;
    return volumeCm3 * density;
};
