/*
 * PolymagicPrice - Shop load / capacity summary
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

import { Machine, QuoteData } from "@/types/quote";
import { ProductionSettings } from "@/types/production";
import { calculateCapacity } from "@/lib/capacityCalculator";

export interface ShopLoad {
    queuedOrders: number;
    queuedUnits: number;
    queuedPrintHours: number;
    machineCount: number;
    utilizationPercent: number;
    estimatedDays: number;
    completionDate: Date | null;
    bottleneck: { machineName: string; hoursOccupied: number } | null;
}

const OPEN_STATUSES = (status?: string) =>
    status !== 'DONE' && status !== 'CANCELLED' && status !== 'DELIVERED';

const parseHours = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
};

/**
 * Turns the open order book into a real capacity picture using the same engine
 * as the Capacity Planner page, so the assistant and the page agree.
 *
 * `ProductionSettings.efficiency` is a *failure/downtime chance* (the Capacity
 * Planner slider is labelled "Print Failure Chance", 0-50), so effective hours
 * are `(100 - failureChance)%` of the working day. The stored default of 85
 * predates that slider, so it is clamped to the slider's range first — without
 * the clamp a fresh install would report 15% effective capacity.
 */
export function computeShopLoad(
    quotes: QuoteData[],
    machines: Machine[],
    settings: ProductionSettings
): ShopLoad {
    const openQuotes = quotes.filter(q => OPEN_STATUSES(q.status));

    let queuedUnits = 0;
    let queuedPrintHours = 0;

    openQuotes.forEach(q => {
        const quantity = q.quantity || 1;
        const perUnitHours = q.actualPrintTime || parseHours(q.parameters?.printTime);
        queuedUnits += quantity;
        queuedPrintHours += perUnitHours * quantity;
    });

    const enabledIds = settings.enabledMachineIds?.length ? settings.enabledMachineIds : undefined;
    const machineCount = enabledIds
        ? machines.filter(m => enabledIds.includes(m.id)).length
        : machines.length;

    const empty: ShopLoad = {
        queuedOrders: openQuotes.length,
        queuedUnits,
        queuedPrintHours,
        machineCount,
        utilizationPercent: 0,
        estimatedDays: 0,
        completionDate: null,
        bottleneck: null,
    };

    if (queuedUnits <= 0 || queuedPrintHours <= 0 || machineCount === 0) return empty;

    const failureChance = Math.min(50, Math.max(0, settings.efficiency || 0));
    const efficiency = Math.min(1.0, Math.max(0.1, (100 - failureChance) / 100));

    const result = calculateCapacity(
        {
            quantity: queuedUnits,
            // Weighted average across the queue; individual jobs vary, but this is the
            // same shape the Capacity Planner asks the user for.
            printTimePerUnit: queuedPrintHours / queuedUnits,
            turnoverTimePerUnit: Math.max(0, (settings.turnoverMinutes || 0) / 60),
            efficiency,
            workHoursPerDay: Math.max(0.1, settings.workHoursPerDay || 8),
            machineIds: enabledIds,
        },
        machines
    );

    const bottleneck = result.breakdown.length
        ? result.breakdown.reduce((worst, b) => (b.hoursOccupied > worst.hoursOccupied ? b : worst))
        : null;

    return {
        queuedOrders: openQuotes.length,
        queuedUnits,
        queuedPrintHours,
        machineCount: result.machineCount,
        utilizationPercent: result.utilizationPercent,
        estimatedDays: result.estimatedDays,
        completionDate: result.completionDate,
        bottleneck: bottleneck
            ? { machineName: bottleneck.machineName, hoursOccupied: bottleneck.hoursOccupied }
            : null,
    };
}
