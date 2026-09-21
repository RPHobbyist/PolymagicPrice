/*
 * PolymagicPrice - Quote statistics
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

import { QuoteData, QuoteStats } from "@/types/quote";
import { parseTimeToHours, totalPrintHours } from "@/lib/utils/time";

/**
 * The single source of truth for shop-level quote analytics.
 *
 * Lives outside useSavedQuotes so non-component callers (the AI context builder
 * and report generation) report the same revenue, profit and margin the
 * dashboard shows. Any divergence here means the assistant contradicts the UI.
 */
/**
 * Did this quote actually get printed?
 *
 * Emissions accounting is not revenue accounting. A shop writes many quotes that are never
 * accepted, and summing their footprints would report tonnes the shop never emitted — on a figure
 * a customer may publish. A cancelled job that already ran, on the other hand, *did* emit: the
 * spool was deducted and the printer drew power, so it counts even though its revenue does not.
 */
export const quoteHasRun = (quote: QuoteData): boolean => {
    if (quote.actualPrintTime !== undefined || quote.actualMaterialUsed !== undefined) return true;
    return quote.status === "DONE" || quote.status === "DISPATCHED" || quote.status === "DELIVERED";
};

/**
 * When a footprint belongs in the books: the day the work finished, not the day it was quoted.
 *
 * A job quoted in January and printed in March belongs to March, or every monthly figure and
 * reporting period is wrong.
 */
export const carbonBookingDate = (quote: QuoteData): string | undefined =>
    quote.statusTimeline?.DELIVERED
    ?? quote.statusTimeline?.DISPATCHED
    ?? quote.statusTimeline?.DONE
    ?? quote.createdAt;

export function computeQuoteStats(quotes: QuoteData[], now: Date = new Date()): QuoteStats {
    const weekAgoTS = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgoTS = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgoTS = now.getTime() - 60 * 24 * 60 * 60 * 1000;

    const accum = {
        totalQuotes: 0,
        totalRevenue: 0,
        totalProfit: 0,
        fdmCount: 0,
        resinCount: 0,
        recentQuotes: 0,
        totalPrintTime: 0,
        totalFilamentUsed: 0,
        totalResinUsed: 0,
        failedPrintsCount: 0,
        revenueLast30d: 0,
        revenuePrev30d: 0,
        totalLaborCost: 0,
        totalElectricityCost: 0,
        totalMaterialCost: 0,
        totalOverheadCost: 0,
        statusDistribution: {} as Record<string, number>,
        customerMap: new Map<string, { id?: string; name: string; count: number; revenue: number }>(),
        // Carbon, counted only over work that actually ran (see `quoteHasRun`).
        carbonKg: 0,
        carbonEnergyKg: 0,
        carbonParts: 0,
        carbonDeliveredKg: 0,
        quotedNotPrintedKg: 0,
        carbonQuotes: 0,
    };

    const parseVal = (val: string | number | undefined | null) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val) || 0;
        return 0;
    };

    quotes.forEach(q => {
        const qTime = q.createdAt ? new Date(q.createdAt).getTime() : 0;
        const isCancelled = q.status === 'CANCELLED';

        accum.totalQuotes++;

        // Update Status Distribution
        const status = q.status || 'PENDING';
        accum.statusDistribution[status] = (accum.statusDistribution[status] || 0) + 1;

        // Only count revenue/costs for non-cancelled quotes
        if (!isCancelled) {
            accum.totalRevenue += q.totalPrice || 0;

            // FINANCIAL CLOSED LOOP: Adjust time-dependent costs based on Actual vs Estimated time.
            //
            // `parameters.printTime` is stored PER UNIT while `actualPrintTime` is the whole-job
            // total, so the estimate has to be scaled by quantity before the two are comparable.
            // Comparing a whole-job actual against a per-unit estimate made a quantity-4 job look
            // four times slower than planned, and inflated labour, electricity and machine cost by
            // that same factor on every multi-unit quote.
            const estimatedTotalHours = parseTimeToHours(q.parameters?.printTime) * (q.quantity || 1);
            const actualTotalHours = q.actualPrintTime;

            let laborCost = q.laborCost || 0;
            let electricityCost = q.electricityCost || 0;
            let machineCost = q.machineTimeCost || 0;

            if (actualTotalHours && estimatedTotalHours > 0) {
                const ratio = actualTotalHours / estimatedTotalHours;
                // Only adjust if the difference is significant (>5%) to avoid noise
                if (Math.abs(ratio - 1) > 0.05) {
                    laborCost *= ratio;
                    electricityCost *= ratio;
                    machineCost *= ratio;
                }
            }

            // Consumables and painting are real costs inside the quote's subtotal; omitting them
            // here overstated profit and margin on every quote that used them.
            const consumablesCost = parseVal(q.parameters?.consumablesTotal) * (q.quantity || 1);
            const actualSubtotal = (q.materialCost || 0) + laborCost + electricityCost + machineCost
                + (q.overheadCost || 0) + (q.paintingCost || 0) + consumablesCost;
            accum.totalProfit += ((q.totalPrice || 0) - actualSubtotal);
            accum.totalLaborCost += laborCost;
            accum.totalElectricityCost += electricityCost;
            accum.totalMaterialCost += (q.materialCost || 0);
            accum.totalOverheadCost += (q.overheadCost || 0);

            if (qTime >= thirtyDaysAgoTS) accum.revenueLast30d += (q.totalPrice || 0);
            else if (qTime >= sixtyDaysAgoTS) accum.revenuePrev30d += (q.totalPrice || 0);
        }

        if (qTime >= weekAgoTS) accum.recentQuotes++;

        if (q.printType === "FDM") {
            accum.fdmCount++;
            const estimatedWeight = parseVal(q.parameters?.filamentWeight);
            const actualWeight = q.actualMaterialUsed ?? (estimatedWeight * (q.quantity || 1));
            accum.totalFilamentUsed += (actualWeight / 1000); // grams -> kg
        } else {
            accum.resinCount++;
            const estimatedVolume = parseVal(q.parameters?.resinVolume);
            const actualVolume = q.actualMaterialUsed ?? (estimatedVolume * (q.quantity || 1));
            accum.totalResinUsed += (actualVolume / 1000); // ml -> litres
        }

        // The estimate is per unit and needs scaling; `actualPrintTime` is already the whole-job
        // total and must NOT be multiplied again.
        const printTime = totalPrintHours(q.parameters?.printTime, q.quantity, q.actualPrintTime);
        accum.totalPrintTime += printTime;
        accum.failedPrintsCount += (q.failedUnits || 0);

        // Carbon. Work that ran counts towards the shop's footprint; anything merely quoted is
        // kept apart as a pipeline figure so the two can never be added together by accident.
        const carbon = q.carbon;
        if (carbon && carbon.kg > 0) {
            if (quoteHasRun(q)) {
                accum.carbonKg += carbon.kg;
                accum.carbonEnergyKg += carbon.energyKg || 0;
                accum.carbonDeliveredKg += carbon.deliveredKg || 0;
                accum.carbonParts += q.isBatch ? (q.batchItems?.length || 1) : (q.quantity || 1);
                accum.carbonQuotes++;
            } else if (!isCancelled) {
                accum.quotedNotPrintedKg += carbon.kg;
            }
        }

        // Customer Tracking
        const cKey = q.customerId || q.clientName || 'Guest';
        const existingC = accum.customerMap.get(cKey) || { id: q.customerId, name: q.clientName || 'Guest', count: 0, revenue: 0 };
        accum.customerMap.set(cKey, {
            id: existingC.id,
            name: existingC.name,
            count: existingC.count + 1,
            revenue: existingC.revenue + (q.totalPrice || 0)
        });
    });

    // Derived Metrics
    const customersList = Array.from(accum.customerMap.values());
    const repeatCustomersCount = customersList.filter(c => c.count > 1).length;

    const revenueGrowth = accum.revenuePrev30d > 0
        ? ((accum.revenueLast30d - accum.revenuePrev30d) / accum.revenuePrev30d) * 100
        : (accum.revenueLast30d > 0 ? 100 : 0);

    return {
        totalQuotes: accum.totalQuotes,
        totalRevenue: accum.totalRevenue,
        totalProfit: accum.totalProfit,
        avgQuoteValue: accum.totalQuotes > 0 ? accum.totalRevenue / accum.totalQuotes : 0,
        fdmCount: accum.fdmCount,
        resinCount: accum.resinCount,
        recentQuotes: accum.recentQuotes,
        totalPrintTime: accum.totalPrintTime,
        // Already converted to kg / litres in the loop above. Dividing again here made the
        // dashboard report grams / 1,000,000 under a "kg" label.
        totalFilamentUsed: accum.totalFilamentUsed,
        totalResinUsed: accum.totalResinUsed,
        failedPrintsCount: accum.failedPrintsCount,
        repeatCustomerRate: customersList.length > 0 ? (repeatCustomersCount / customersList.length) * 100 : 0,
        topCustomers: [...customersList].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
        revenueGrowth,
        totalLaborCost: accum.totalLaborCost,
        totalElectricityCost: accum.totalElectricityCost,
        totalMaterialCost: accum.totalMaterialCost,
        totalOverheadCost: accum.totalOverheadCost,
        avgMargin: accum.totalRevenue > 0 ? (accum.totalProfit / accum.totalRevenue) * 100 : 0,
        statusDistribution: accum.statusDistribution,
        // Undefined rather than zero when nothing has been printed yet: the dashboard then shows
        // "—" instead of claiming a shop with no completed work has a footprint of exactly zero.
        totalCarbonKg: accum.carbonQuotes > 0 ? accum.carbonKg : undefined,
        carbonPerPart: accum.carbonParts > 0 ? accum.carbonKg / accum.carbonParts : undefined,
        carbonPerKg: accum.carbonDeliveredKg > 0 ? accum.carbonKg / accum.carbonDeliveredKg : undefined,
        carbonEnergyShare: accum.carbonKg > 0 ? accum.carbonEnergyKg / accum.carbonKg : undefined,
        quotedNotPrintedKg: accum.quotedNotPrintedKg > 0 ? accum.quotedNotPrintedKg : undefined,
    };
}
