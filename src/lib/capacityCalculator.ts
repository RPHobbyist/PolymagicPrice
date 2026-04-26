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

    if (includeWeekends) {
        result.setDate(result.getDate() + safeDays);
        return result;
    }

    let added = 0;
    // Hard limit on iterations to prevent infinite loops in any edge case
    let iterations = 0;
    const maxIterations = safeDays * 5; 

    while (added < Math.ceil(safeDays) && iterations < maxIterations) {
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
    const availableMachines = machineIds && machineIds.length > 0
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
    recoveryPlan?: {
        machinesNeeded: number;
        hoursPerDayNeeded: number;
    }
} {
    const result = calculateCapacity(query, machines);
    
    if (result.machineCount === 0) {
        return {
            canMeet: false,
            daysNeeded: 0,
            daysAvailable: 0
        };
    }

    const start = query.startDate ? new Date(query.startDate) : new Date();
    
    // Calculate calendar days available
    const daysAvailable = Math.ceil((deadline.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const canMeet = result.completionDate.getTime() <= deadline.getTime();

    let recoveryPlan;
    if (!canMeet && daysAvailable > 0) {
        // 1. Calculate machines needed at CURRENT work hours
        // Safety: Ensure effectiveHoursPerDay is at least 0.1 to prevent division by zero
        const effectiveHoursPerDay = Math.max(0.1, query.workHoursPerDay * (query.efficiency || 1.0));
        const totalLaborHours = query.quantity * (query.printTimePerUnit + (query.turnoverTimePerUnit || 0));
        
        // Needed: TotalHours / (DaysAvailable * EffectiveHoursPerDay)
        // Adjust daysAvailable based on weekend logic for recovery purposes (simplified)
        const adjustedDaysAvailable = query.includeWeekends ? daysAvailable : Math.max(1, daysAvailable * (5/7));
        const machinesNeeded = Math.ceil(totalLaborHours / (adjustedDaysAvailable * effectiveHoursPerDay));
        
        // 2. Adjust hours needed if we keep machine count
        const hoursNeeded = totalLaborHours / (result.machineCount * daysAvailable * (query.efficiency || 1.0));

        recoveryPlan = {
            machinesNeeded: Math.max(result.machineCount + 1, machinesNeeded),
            hoursPerDayNeeded: Math.min(24, Math.ceil(hoursNeeded))
        };
    }

    return {
        canMeet,
        daysNeeded: result.estimatedDays,
        daysAvailable,
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
