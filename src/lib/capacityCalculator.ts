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

import { CapacityQuery, CapacityResult, Machine } from "@/types/quote";

/** Slider range of the Capacity Planner's "Print Failure Chance". */
export const MAX_FAILURE_CHANCE = 50;
export const DEFAULT_FAILURE_CHANCE = 10;

/**
 * `ProductionSettings.efficiency` holds a failure/downtime chance (0-50). Installs created before
 * the slider stored 85 as an efficiency, which no longer fits the range; read it as the default
 * instead of 85% failures.
 */
export function normalizeFailureChance(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_FAILURE_CHANCE;
    if (value > MAX_FAILURE_CHANCE) return DEFAULT_FAILURE_CHANCE;
    return Math.max(0, value);
}

/** Fraction (0.5-1) of a working day that produces good parts. */
export function failureChanceToEfficiency(value: unknown): number {
    return (100 - normalizeFailureChance(value)) / 100;
}

/**
 * Adds days to a date, optionally skipping weekends
 */
function addDays(date: Date, days: number, includeWeekends: boolean = true): Date {
    const result = new Date(date);
    
    // Safety check: Don't loop if days is Infinity, NaN, or non-positive
    if (!Number.isFinite(days) || days <= 0) {
        return result;
    }

    // Limit extreme values to prevent hanging (e.g., 10 years max)
    const safeDays = Math.min(days, 3650);

    /*
     * Round up, in both branches.
     *
     * `estimatedDays` is almost always fractional — 10 units of 3.5 h on an 8 h day is 4.375 — and
     * `setDate` truncates, so the weekends-on branch used to promise day 4 for work that needs part
     * of day 5, while the weekends-off branch below already used Math.ceil. The same job therefore
     * moved a day earlier merely because "Weekend Ops" was switched on, and a job under one day
     * long reported the start date itself as its completion date.
     */
    const wholeDays = Math.ceil(safeDays);

    if (includeWeekends) {
        result.setDate(result.getDate() + wholeDays);
        return result;
    }

    let added = 0;
    // Hard limit on iterations to prevent infinite loops in any edge case
    let iterations = 0;
    const maxIterations = wholeDays * 5;

    while (added < wholeDays && iterations < maxIterations) {
        iterations++;
        result.setDate(result.getDate() + 1);
        const day = result.getDay();
        if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
            added++;
        }
    }
    return result;
}

/**
 * Calculate capacity for a given order based on available machines
 */
export function calculateCapacity(query: CapacityQuery, machines: Machine[]): CapacityResult {
    const { 
        quantity, 
        printTimePerUnit, 
        turnoverTimePerUnit = 0,
        efficiency = 1.0,
        machineIds, 
        workHoursPerDay, 
        startDate,
        includeWeekends = true
    } = query;

    // Filter to selected machines or use all
    // `undefined` means "no preference: every machine". An explicit empty list means the caller
    // filtered everything out (wrong type, too small), and must not quietly fall back to the
    // machines it just excluded.
    const availableMachines = machineIds
        ? machines.filter(m => machineIds.includes(m.id))
        : machines;

    const machineCount = availableMachines.length;

    if (machineCount === 0) {
        return {
            totalPrintHours: 0,
            totalLaborHours: 0,
            machineCount: 0,
            estimatedDays: 0,
            completionDate: new Date(),
            utilizationPercent: 0,
            breakdown: [],
        };
    }

    // Industrial Logic: Total hours includes prep/turnover
    const totalPrintHours = quantity * printTimePerUnit;
    const totalLaborHours = quantity * (printTimePerUnit + turnoverTimePerUnit);

    // Efficiency: Reduce the available hours per day
    // Safety: Ensure effectiveHoursPerDay is at least 0.1 to prevent division by zero (Infinity)
    const effectiveHoursPerDay = Math.max(0.1, workHoursPerDay * efficiency);

    // Calculate how many units each machine will handle (round robin distribution)
    const unitsPerMachine = Math.floor(quantity / machineCount);
    const remainder = quantity % machineCount;

    const breakdown = availableMachines.map((machine, index) => {
        const assignedUnits = unitsPerMachine + (index < remainder ? 1 : 0);
        // Each unit takes Print + Turnover
        const hours = assignedUnits * (printTimePerUnit + turnoverTimePerUnit);
        return {
            machineId: machine.id,
            machineName: machine.name,
            unitsAssigned: assignedUnits,
            hoursOccupied: hours,
        };
    });

    // Find the machine with the most hours (bottleneck)
    const maxHours = Math.max(...breakdown.map(b => b.hoursOccupied));

    // Calculate days based on effective work hours per day
    const estimatedDays = maxHours / effectiveHoursPerDay;

    // Calculate completion date (Weekend Aware)
    const start = startDate ? new Date(startDate) : new Date();
    const completionDate = addDays(start, estimatedDays, includeWeekends);

    // Calculate utilization (how much of the total available time is used)
    const totalAvailableHours = machineCount * estimatedDays * effectiveHoursPerDay;
    const utilizationPercent = totalAvailableHours > 0
        ? (totalLaborHours / totalAvailableHours) * 100
        : 0;

    return {
        totalPrintHours,
        totalLaborHours,
        machineCount,
        estimatedDays,
        completionDate,
        utilizationPercent: Math.min(100, utilizationPercent),
        breakdown,
    };
}

/**
 * A deadline typed as a date ("2026-03-14") means the end of that day in the shop's own time.
 * `new Date("2026-03-14")` is UTC midnight, which is already the previous evening west of UTC and
 * the start of the day east of it, so a job finishing on the deadline day read as late.
 */
export function parseLocalDeadline(value: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!m) return new Date(value);
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
}

/** The shop-local calendar date as YYYY-MM-DD (toISOString would give the UTC date). */
export function toLocalDateString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Days on which work happens between `start` (exclusive) and `end` (inclusive). */
export function countWorkingDays(start: Date, end: Date, includeWeekends: boolean): number {
    let count = 0;
    const day = new Date(start);
    day.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    for (let i = 0; i < 3650 && day < last; i++) {
        day.setDate(day.getDate() + 1);
        const dow = day.getDay();
        if (includeWeekends || (dow !== 0 && dow !== 6)) count++;
    }
    return count;
}

/**
 * Check if an order can be completed by a specific deadline and offer recovery
 */
export function analyzeDeadline(
    query: CapacityQuery,
    machines: Machine[],
    deadline: Date
): { 
    canMeet: boolean; 
    daysNeeded: number; 
    daysAvailable: number;
    /** Calendar days the finish is past the deadline (0 when it is met). */
    daysLate: number;
    recoveryPlan?: {
        machinesNeeded: number;
        hoursPerDayNeeded: number;
        /** True when even 24 h a day on the current machines cannot make it. */
        hoursPerDayShortfall: boolean;
    }
} {
    const result = calculateCapacity(query, machines);
    
    if (result.machineCount === 0) {
        return {
            canMeet: false,
            daysNeeded: 0,
            daysAvailable: 0,
            daysLate: 0
        };
    }

    const start = query.startDate ? new Date(query.startDate) : new Date();
    
    // Calculate calendar days available
    const daysAvailable = Math.ceil((deadline.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const canMeet = result.completionDate.getTime() <= deadline.getTime();

    const daysLate = canMeet
        ? 0
        : Math.max(1, Math.ceil((result.completionDate.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)));

    let recoveryPlan;
    if (!canMeet && daysAvailable > 0) {
        const efficiency = query.efficiency || 1.0;
        const includeWeekends = query.includeWeekends ?? true; // same default as calculateCapacity
        const effectiveHoursPerDay = Math.max(0.1, query.workHoursPerDay * efficiency);
        const totalLaborHours = query.quantity * (query.printTimePerUnit + (query.turnoverTimePerUnit || 0));

        // Both figures divide by days on which work happens, not calendar days.
        const workingDays = Math.max(1, countWorkingDays(start, deadline, includeWeekends));
        const machinesNeeded = Math.ceil(totalLaborHours / (workingDays * effectiveHoursPerDay));
        const hoursNeeded = totalLaborHours / (result.machineCount * workingDays * efficiency);

        recoveryPlan = {
            machinesNeeded: Math.max(result.machineCount + 1, machinesNeeded),
            hoursPerDayNeeded: Math.min(24, Math.ceil(hoursNeeded)),
            hoursPerDayShortfall: hoursNeeded > 24
        };
    }

    return {
        canMeet,
        daysNeeded: result.estimatedDays,
        daysAvailable,
        daysLate,
        recoveryPlan
    };
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Format hours into a human readable string
 */
export function formatHours(hours: number): string {
    if (hours < 1) {
        return `${Math.round(hours * 60)} min`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
