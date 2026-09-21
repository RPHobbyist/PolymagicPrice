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
 * The single parser for a print-time field.
 *
 * The same value used to be read three different ways: `parseTimeToHours` in
 * ProductionProvider understood "1:30", while `toNum` in the quote engine and
 * `parseVal` in the stats both used parseFloat, which reads "1:30" as 1. One
 * quote therefore produced 1.5 h during production and 1.0 h on the dashboard,
 * and every cost derived from time inherited the discrepancy.
 *
 * Accepts a number, "1:30", "1h 30m", "90m", or a plain decimal string.
 * Anything unparseable, negative or non-finite returns 0.
 */
export function parseTimeToHours(value: string | number | undefined | null): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    const str = String(value ?? '').trim();
    if (!str) return 0;

    // "1:30" → 1.5
    if (str.includes(':')) {
        const [rawH, rawM] = str.split(':');
        const h = parseFloat(rawH);
        const m = parseFloat(rawM);
        const hours = (Number.isFinite(h) ? h : 0) + (Number.isFinite(m) ? m / 60 : 0);
        return Number.isFinite(hours) && hours > 0 ? hours : 0;
    }

    // "1h 30m", "2h", "90m", "15 min"
    if (/[hm]/i.test(str)) {
        const hMatch = str.match(/(\d+(?:\.\d+)?)\s*h/i);
        const mMatch = str.match(/(\d+(?:\.\d+)?)\s*m/i);
        if (hMatch || mMatch) {
            const hours = (hMatch ? parseFloat(hMatch[1]) : 0) + (mMatch ? parseFloat(mMatch[1]) / 60 : 0);
            return Number.isFinite(hours) && hours > 0 ? hours : 0;
        }
    }

    const val = parseFloat(str);
    return Number.isFinite(val) && val > 0 ? val : 0;
}

/**
 * Total print hours for a whole job.
 *
 * `parameters.printTime` is stored PER UNIT, while `actualPrintTime` is the
 * whole-job total — the wall-clock figure production records when a job
 * completes. Mixing the two conventions is what made the dashboard multiply an
 * actual by the quantity a second time, so every caller goes through here.
 */
export function totalPrintHours(
    perUnitPrintTime: string | number | undefined | null,
    quantity: number | undefined,
    actualPrintTime?: number
): number {
    if (typeof actualPrintTime === 'number' && Number.isFinite(actualPrintTime) && actualPrintTime > 0) {
        return actualPrintTime;
    }
    const qty = Math.max(1, Math.floor(quantity || 1));
    return parseTimeToHours(perUnitPrintTime) * qty;
}
