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
 * Grouping for the carbon page.
 *
 * This module never computes a footprint — it only arranges the frozen records that already sit on
 * quotes. Carbon is calculated in exactly two places, `carbonCalculator` per job and
 * `computeQuoteStats` for the shop, and a page that re-derived its own numbers is precisely how a
 * dashboard ends up disagreeing with the invoice.
 */

import { Machine, QuoteData } from "@/types/quote";
import { carbonBookingDate, quoteHasRun } from "@/lib/quoteStats";
import { DEFAULT_IDLE_WATTS } from "./carbonFactors";

export interface CarbonMonth {
    month: string;        // YYYY-MM, the month the work finished
    label: string;        // e.g. "Sep 2026"
    kg: number;
    energyKg: number;
    materialKg: number;
    jobs: number;
}

export interface CarbonFleetRow {
    machineName: string;
    jobs: number;
    hours: number;
    kWh: number;
    kg: number;
    /** kWh per print-hour: the comparable figure. Per-kilogram mostly ranks part geometry. */
    energyRate: number;
    /** Where the wattage came from, so an outlier can be read with the right scepticism. */
    wattsSource: string;
    /** True when every job on this machine used a library wattage — the ones worth metering. */
    unmeasured: boolean;
}

export interface CarbonJobRow {
    id: string;
    projectName: string;
    date?: string;
    kg: number;
    perPart?: number;
    grade: string;
    machineName?: string;
    materialName?: string;
    flagged: boolean;
}

export interface CarbonSources {
    energyKg: number;
    materialKg: number;
    wasteKg: number;
}

export interface CarbonOverview {
    months: CarbonMonth[];
    sources: CarbonSources;
    fleet: CarbonFleetRow[];
    jobs: CarbonJobRow[];
    /** The machine where a plug meter would remove the most uncertainty, if there is one. */
    meterNext?: string;
}

const monthKey = (iso?: string): string | undefined => (iso ? iso.slice(0, 7) : undefined);

const monthLabel = (key: string): string => {
    const [year, month] = key.split("-").map(Number);
    if (!year || !month) return key;
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

const machineNameOf = (quote: QuoteData): string =>
    (quote.parameters?.machineName as string | undefined)?.trim() || "Unassigned";

/**
 * Arranges every footprint that belongs to work which actually ran.
 *
 * Quoted-but-unprinted jobs are excluded here for the same reason they are excluded from the shop
 * total: they emitted nothing.
 */
export const buildCarbonOverview = (quotes: QuoteData[], monthsBack = 12): CarbonOverview => {
    const ran = quotes.filter(q => q.carbon && q.carbon.kg > 0 && quoteHasRun(q));

    const months = new Map<string, CarbonMonth>();
    const fleet = new Map<string, CarbonFleetRow & { measuredJobs: number }>();
    const sources: CarbonSources = { energyKg: 0, materialKg: 0, wasteKg: 0 };
    const jobs: CarbonJobRow[] = [];

    ran.forEach(q => {
        const carbon = q.carbon!;
        const date = carbonBookingDate(q);
        const key = monthKey(date);

        if (key) {
            const entry = months.get(key) ?? { month: key, label: monthLabel(key), kg: 0, energyKg: 0, materialKg: 0, jobs: 0 };
            entry.kg += carbon.kg;
            entry.energyKg += carbon.energyKg;
            entry.materialKg += carbon.materialKg;
            entry.jobs += 1;
            months.set(key, entry);
        }

        sources.energyKg += carbon.energyKg;
        sources.materialKg += carbon.materialKg;
        sources.wasteKg += carbon.wasteKg;

        const name = machineNameOf(q);
        const row = fleet.get(name) ?? {
            machineName: name, jobs: 0, hours: 0, kWh: 0, kg: 0, energyRate: 0,
            wattsSource: carbon.src.watts, unmeasured: true, measuredJobs: 0,
        };
        row.jobs += 1;
        row.kWh += carbon.kWh;
        row.kg += carbon.kg;
        row.hours += carbon.wattsUsed > 0 ? (carbon.kWh * 1000) / carbon.wattsUsed : 0;
        if (carbon.src.watts === "measured") row.measuredJobs += 1;
        fleet.set(name, row);

        jobs.push({
            id: q.id || "",
            projectName: q.projectName,
            date,
            kg: carbon.kg,
            perPart: q.isBatch ? undefined : carbon.kg / Math.max(1, q.quantity || 1),
            grade: carbon.grade,
            machineName: name,
            materialName: q.parameters?.materialName as string | undefined,
            flagged: (carbon.flags?.length ?? 0) > 0,
        });
    });

    const fleetRows = Array.from(fleet.values()).map(row => ({
        machineName: row.machineName,
        jobs: row.jobs,
        hours: row.hours,
        kWh: row.kWh,
        kg: row.kg,
        energyRate: row.hours > 0 ? row.kWh / row.hours : 0,
        wattsSource: row.measuredJobs > 0 ? "measured" : row.wattsSource,
        unmeasured: row.measuredJobs === 0,
    })).sort((a, b) => b.kg - a.kg);

    // Worth metering next: the unmeasured machine carrying the most energy, because that is where
    // a single typed number removes the most uncertainty from the shop's total.
    const meterNext = fleetRows.filter(r => r.unmeasured).sort((a, b) => b.kWh - a.kWh)[0]?.machineName;

    const orderedMonths = Array.from(months.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-monthsBack);

    return {
        months: orderedMonths,
        sources,
        fleet: fleetRows,
        jobs: jobs.sort((a, b) => b.kg - a.kg),
        meterNext,
    };
};

/**
 * The machines that actually sit on standby: those in the production pool.
 *
 * A printer switched off in Print Manager is not idling, and charging it standby power would
 * inflate the shop's overhead. An empty pool means the shop has not curated one, in which case
 * every machine counts — the same convention `computeShopLoad` follows.
 */
export const selectPooledMachines = (machines: Machine[], enabledMachineIds?: string[]): Machine[] =>
    enabledMachineIds?.length ? machines.filter(m => enabledMachineIds.includes(m.id)) : machines;

/**
 * Standby power for machines sitting idle in a window.
 *
 * Shop overhead, never charged to a job: idle happens between jobs, so attributing it to one is
 * arbitrary and would double count against this figure. Runtime is taken from the jobs that
 * finished inside the window — subtracting a machine's lifetime hours from a month would give a
 * negative answer for any printer with history.
 */
export const computeIdleOverheadKg = (
    quotes: QuoteData[],
    machines: Machine[],
    gridGPerKWh: number,
    windowDays = 30,
    now: Date = new Date()
): number => {
    if (machines.length === 0) return 0;

    const windowStart = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
    const windowHours = windowDays * 24;

    const runtimeByMachine = new Map<string, number>();
    quotes.forEach(q => {
        if (!q.carbon || !quoteHasRun(q)) return;
        const date = carbonBookingDate(q);
        if (!date || new Date(date).getTime() < windowStart) return;

        const name = machineNameOf(q);
        const hours = q.carbon.wattsUsed > 0 ? (q.carbon.kWh * 1000) / q.carbon.wattsUsed : 0;
        runtimeByMachine.set(name, (runtimeByMachine.get(name) || 0) + hours);
    });

    const watts = machines.reduce((total, machine) => {
        const idle = machine.idleWatts ?? DEFAULT_IDLE_WATTS;
        const busy = runtimeByMachine.get(machine.name) || 0;
        const idleHours = Math.max(0, windowHours - busy);
        return total + idle * idleHours;
    }, 0);

    return (watts / 1000) * gridGPerKWh / 1000;
};
