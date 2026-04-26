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
 * Calculate capacity for a given order based on available machines
 */
export function calculateCapacity(query: CapacityQuery, machines: Machine[]): CapacityResult {
    const { quantity, printTimePerUnit, machineIds, workHoursPerDay, startDate } = query;

    // Filter to selected machines or use all
    const availableMachines = machineIds && machineIds.length > 0
        ? machines.filter(m => machineIds.includes(m.id))
        : machines;

    const machineCount = availableMachines.length;

    if (machineCount === 0) {
        return {
            totalPrintHours: 0,
            machineCount: 0,
            estimatedDays: 0,
            completionDate: new Date(),
            utilizationPercent: 0,
            breakdown: [],
        };
    }

    const totalPrintHours = quantity * printTimePerUnit;

    // Calculate how many units each machine will handle (round robin distribution)
    const unitsPerMachine = Math.floor(quantity / machineCount);
    const remainder = quantity % machineCount;

    const breakdown = availableMachines.map((machine, index) => {
        const assignedUnits = unitsPerMachine + (index < remainder ? 1 : 0);
        const hours = assignedUnits * printTimePerUnit;
        return {
            machineId: machine.id,
            machineName: machine.name,
            unitsAssigned: assignedUnits,
            hoursOccupied: hours,
        };
    });

    // Find the machine with the most hours (bottleneck)
    const maxHours = Math.max(...breakdown.map(b => b.hoursOccupied));

    // Calculate days based on work hours per day
    const estimatedDays = Math.ceil(maxHours / workHoursPerDay);

    // Calculate completion date
    const start = startDate ? new Date(startDate) : new Date();
    const completionDate = new Date(start);
    completionDate.setDate(completionDate.getDate() + estimatedDays);

    // Calculate utilization (how much of the total available time is used)
    const totalAvailableHours = machineCount * estimatedDays * workHoursPerDay;
    const utilizationPercent = totalAvailableHours > 0
        ? (totalPrintHours / totalAvailableHours) * 100
        : 0;

    return {
        totalPrintHours,
        machineCount,
        estimatedDays,
        completionDate,
        utilizationPercent: Math.min(100, utilizationPercent),
        breakdown,
    };
}

/**
 * Check if an order can be completed by a specific deadline
 */
export function canMeetDeadline(
    query: CapacityQuery,
    machines: Machine[],
    deadline: Date
): { canMeet: boolean; daysNeeded: number; daysAvailable: number } {
    const result = calculateCapacity(query, machines);
    const start = query.startDate ? new Date(query.startDate) : new Date();
    const daysAvailable = Math.ceil((deadline.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return {
        canMeet: result.estimatedDays <= daysAvailable,
        daysNeeded: result.estimatedDays,
        daysAvailable,
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
