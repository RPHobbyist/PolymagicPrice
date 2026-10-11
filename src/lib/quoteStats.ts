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

/**
 * Revenue is money the shop has won: a quote the customer accepted, from approval through
 * delivery. PENDING is an offer nobody has taken up, FAILED produced nothing to invoice, and
 * CANCELLED was withdrawn. Counting them reported a shop that quotes 100 jobs and wins 10 as
 * having 10x its real revenue. Offers are tracked separately as `pipelineValue`.
 */
const REVENUE_STATUSES = ["APPROVED", "PRINTING", "POST_PROCESSING", "DONE", "DISPATCHED", "DELIVERED"];
export const isRevenueQuote = (quote: QuoteData): boolean =>
    REVENUE_STATUSES.includes(quote.status || "PENDING");

/** When the shop won the work: the approval date, falling back to the quote date. */
export const revenueBookingDate = (quote: QuoteData): string | undefined =>
    quote.statusTimeline?.APPROVED ?? quote.createdAt;

/** Customers with no name all share one bucket; "repeat customer" is meaningless for it. */
const isAnonymousCustomer = (quote: QuoteData): boolean => {
    if (quote.customerId) return false;
    const name = (quote.clientName || "").trim().toLowerCase();
    return !name || name === "guest" || name === "valued customer";
};

export function computeQuoteStats(quotes: QuoteData[], now: Date = new Date()): QuoteStats {
    const weekAgoTS = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgoTS = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgoTS = now.getTime() - 60 * 24 * 60 * 60 * 1000;

    const accum = {
        totalQuotes: 0,
        revenueQuotes: 0,
        pipelineValue: 0,
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
        totalMachineCost: 0,
        totalPaintingCost: 0,
        totalConsumablesCost: 0,
        statusDistribution: {} as Record<string, number>,
        customerMap: new Map<string, { id?: string; name: string; count: number; revenue: number }>(),
        // Carbon, counted only over work that actually ran (see `quoteHasRun`).
        carbonKg: 0,
        carbonEnergyKg: 0,
        carbonParts: 0,
        carbonDeliveredKg: 0,
        carbonKgWithDelivered: 0, // emissions of only those quotes that report a delivered mass
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
        // Revenue windows follow the approval date, and a date in the future is not "recent".
        const bookedAt = revenueBookingDate(q);
        const bookedTime = bookedAt ? new Date(bookedAt).getTime() : 0;
        const bookedInPast = bookedTime <= now.getTime();
        const isCancelled = q.status === 'CANCELLED';
        const isRevenue = isRevenueQuote(q);

        if (!isCancelled && q.status !== 'FAILED' && !isRevenue) accum.pipelineValue += Math.max(0, (q.totalPrice || 0) - (q.shippingCost || 0));

        accum.totalQuotes++;

        // Update Status Distribution
        const status = q.status || 'PENDING';
        accum.statusDistribution[status] = (accum.statusDistribution[status] || 0) + 1;

        // Only count revenue/costs for accepted work
        // Shipping is billed to the customer but is a pass-through, not shop revenue or profit.
        const netPrice = Math.max(0, (q.totalPrice || 0) - (q.shippingCost || 0));

        if (isRevenue) {
            accum.revenueQuotes++;
            accum.totalRevenue += netPrice;

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
            let overheadCost = q.overheadCost || 0;
            let rescaled = false;

            if (actualTotalHours && estimatedTotalHours > 0) {
                const ratio = actualTotalHours / estimatedTotalHours;
                // Only adjust if the difference is significant (>5%) to avoid noise
                if (Math.abs(ratio - 1) > 0.05) {
                    laborCost *= ratio;
                    electricityCost *= ratio;
                    machineCost *= ratio;
                    rescaled = true;
                }
            }

            // Consumables and painting are real costs inside the quote's subtotal; omitting them
            // here overstated profit and margin on every quote that used them.
            const consumablesCost = parseVal(q.parameters?.consumablesTotal) * (q.quantity || 1);
            // Overhead is a percentage of the other costs, so when those were rescaled it has to
            // follow them. Leaving it at the quoted figure overstated overhead on a short job.
            const overheadPct = parseVal(q.parameters?.overheadPercentage);
            if (rescaled && overheadPct > 0) {
                overheadCost = ((q.materialCost || 0) + laborCost + electricityCost + machineCost
                    + (q.paintingCost || 0) + consumablesCost) * overheadPct / 100;
            }
            const actualSubtotal = (q.materialCost || 0) + laborCost + electricityCost + machineCost
                + overheadCost + (q.paintingCost || 0) + consumablesCost;
            accum.totalProfit += ((netPrice) - actualSubtotal);
            accum.totalLaborCost += laborCost;
            accum.totalElectricityCost += electricityCost;
            accum.totalMaterialCost += (q.materialCost || 0);
            accum.totalOverheadCost += overheadCost;
            accum.totalMachineCost += machineCost;
            accum.totalPaintingCost += (q.paintingCost || 0);
            accum.totalConsumablesCost += consumablesCost;

            if (bookedInPast) {
                if (bookedTime >= thirtyDaysAgoTS) accum.revenueLast30d += (netPrice);
                else if (bookedTime >= sixtyDaysAgoTS) accum.revenuePrev30d += (netPrice);
            }
        }

        if (qTime >= weekAgoTS && qTime <= now.getTime()) accum.recentQuotes++;

        // Counts and material/time totals describe work the shop took on or ran, not every offer.
        const tookOn = isRevenue || quoteHasRun(q);

        // A batch master carries no print time or material of its own, only its items do.
        const parts = q.isBatch && q.batchItems?.length ? q.batchItems : [q];

        if (q.printType === "FDM") {
            accum.fdmCount++;
        } else {
            accum.resinCount++;
        }

        if (tookOn) {
            parts.forEach(part => {
                const qty = part.quantity || 1;
                if (part.printType === "Resin") {
                    const actualVolume = parts.length === 1 && q.actualMaterialUsed !== undefined
                        ? q.actualMaterialUsed
                        : parseVal(part.parameters?.resinVolume) * qty;
                    accum.totalResinUsed += actualVolume / 1000; // ml -> litres
                } else {
                    const actualWeight = parts.length === 1 && q.actualMaterialUsed !== undefined
                        ? q.actualMaterialUsed
                        : parseVal(part.parameters?.filamentWeight) * qty;
                    accum.totalFilamentUsed += actualWeight / 1000; // grams -> kg
                }
                // The estimate is per unit and needs scaling; `actualPrintTime` is already the
                // whole-job total and must NOT be multiplied again.
                accum.totalPrintTime += totalPrintHours(
                    part.parameters?.printTime,
                    qty,
                    parts.length === 1 ? q.actualPrintTime : part.actualPrintTime
                );
            });
            // A finished batch master holds the summed actuals; prefer them over the estimates.
            if (parts.length > 1 && q.actualPrintTime) {
                accum.totalPrintTime += q.actualPrintTime - parts.reduce((acc, part) => acc + totalPrintHours(part.parameters?.printTime, part.quantity || 1, part.actualPrintTime), 0);
            }
        }
        accum.failedPrintsCount += (q.failedUnits || 0);

        // Carbon. Work that ran counts towards the shop's footprint; anything merely quoted is
        // kept apart as a pipeline figure so the two can never be added together by accident.
        const carbon = q.carbon;
        if (carbon && carbon.kg > 0) {
            if (quoteHasRun(q)) {
                accum.carbonKg += carbon.kg;
                accum.carbonEnergyKg += carbon.energyKg || 0;
                accum.carbonDeliveredKg += carbon.deliveredKg || 0;
                if ((carbon.deliveredKg || 0) > 0) accum.carbonKgWithDelivered += carbon.kg;
                accum.carbonParts += q.isBatch && q.batchItems?.length
                    ? q.batchItems.reduce((n, item) => n + (item.quantity || 1), 0)
                    : (q.quantity || 1);
                accum.carbonQuotes++;
            } else if (!isCancelled) {
                accum.quotedNotPrintedKg += carbon.kg;
            }
        }

        // Customer tracking follows the same rule as revenue: only won work, and never the shared
        // anonymous bucket, which would otherwise be a "repeat customer" by construction.
        if (!isRevenue || isAnonymousCustomer(q)) return;
        const cKey = q.customerId || (q.clientName || '').trim().toLowerCase();
        const existingC = accum.customerMap.get(cKey) || { id: q.customerId, name: q.clientName || 'Guest', count: 0, revenue: 0 };
        accum.customerMap.set(cKey, {
            id: existingC.id,
            name: existingC.name,
            count: existingC.count + 1,
            revenue: existingC.revenue + Math.max(0, (q.totalPrice || 0) - (q.shippingCost || 0))
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
        revenueQuotes: accum.revenueQuotes,
        pipelineValue: accum.pipelineValue,
        avgQuoteValue: accum.revenueQuotes > 0 ? accum.totalRevenue / accum.revenueQuotes : 0,
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
        totalMachineCost: accum.totalMachineCost,
        totalPaintingCost: accum.totalPaintingCost,
        totalConsumablesCost: accum.totalConsumablesCost,
        avgMargin: accum.totalRevenue > 0 ? (accum.totalProfit / accum.totalRevenue) * 100 : 0,
        statusDistribution: accum.statusDistribution,
        // Undefined rather than zero when nothing has been printed yet: the dashboard then shows
        // "—" instead of claiming a shop with no completed work has a footprint of exactly zero.
        totalCarbonKg: accum.carbonQuotes > 0 ? accum.carbonKg : undefined,
        carbonPerPart: accum.carbonParts > 0 ? accum.carbonKg / accum.carbonParts : undefined,
        // Intensity needs a matching numerator and denominator: quotes with no delivered mass
        // cannot contribute emissions to a per-kg figure they add nothing to.
        carbonPerKg: accum.carbonDeliveredKg > 0 ? accum.carbonKgWithDelivered / accum.carbonDeliveredKg : undefined,
        carbonEnergyShare: accum.carbonKg > 0 ? accum.carbonEnergyKg / accum.carbonKg : undefined,
        quotedNotPrintedKg: accum.quotedNotPrintedKg > 0 ? accum.quotedNotPrintedKg : undefined,
    };
}
