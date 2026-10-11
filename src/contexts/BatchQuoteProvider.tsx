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

import { useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { QuoteData } from '@/types/quote';
import { BatchQuoteContext, BatchQuoteContextType } from '@/contexts/BatchQuoteContext';
import { getQuotes, generateShortQuoteId, getBatchItems, saveBatchItems } from '@/lib/core/sessionStorage';
import { sumCarbonRecords } from '@/lib/carbon/carbonCalculator';

export const BatchQuoteProvider = ({ children }: { children: ReactNode }) => {
    const [batchItems, setBatchItems] = useState<QuoteData[]>(() => getBatchItems());

    // Persist whenever the tray changes.
    //
    // This goes through the store rather than calling localStorage directly: the bare
    // `setItem` that used to be here wrote full quote objects — thumbnails included — from an
    // effect, so a quota refusal reached the root error boundary, and the reload rehydrated the
    // same oversized value and crashed again. `saveBatchItems` reports a refusal instead, which
    // the app's storage-health listener turns into a message the shop can act on.
    useEffect(() => {
        saveBatchItems(batchItems);
    }, [batchItems]);

    const addItem = useCallback((item: QuoteData) => {
        const itemWithId = {
            ...item,
            id: item.id || `batch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        };
        setBatchItems(prev => [...prev, itemWithId]);
    }, []);

    const removeItem = useCallback((index: number) => {
        setBatchItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const updateItem = useCallback((index: number, item: QuoteData) => {
        setBatchItems(prev => {
            const updated = [...prev];
            updated[index] = item;
            return updated;
        });
    }, []);

    const clearBatch = useCallback(() => {
        setBatchItems([]);
    }, []);

    // Calculate batch totals with industrial numerical ceilings.
    // Memoised because it is a dependency of saveBatchAsQuote and of the context value below:
    // recomputing it on every render of a provider that sits above the whole router gave both a
    // new identity each time, which re-ran every consumer.
    const batchTotals = useMemo(() => batchItems.reduce(
        (acc, item) => {
            const qty = item.quantity || 1;
            // Enforce a $100M ceiling on any cumulative batch value to prevent numerical noise/UI-breakage
            const CLAMP = 100000000;
            
            // IMPORTANT: every stored *Cost field is ALREADY multiplied by the item's quantity
            // (see calculateFDMQuote/calculateResinQuote). Multiplying by qty again here made
            // each component qty-times too large while grandTotal — which sums the already
            // multiplied totalPrice — stayed correct, so the batch never reconciled.
            const num = (value: number | undefined) => (Number.isFinite(value) ? (value as number) : 0);

            return {
                totalItems: Math.min(acc.totalItems + 1, 1000000),
                totalQuantity: Math.min(acc.totalQuantity + qty, 10000000),
                totalMaterialCost: Math.min(acc.totalMaterialCost + num(item.materialCost), CLAMP),
                totalMachineTimeCost: Math.min(acc.totalMachineTimeCost + num(item.machineTimeCost), CLAMP),
                totalElectricityCost: Math.min(acc.totalElectricityCost + num(item.electricityCost), CLAMP),
                totalLaborCost: Math.min(acc.totalLaborCost + num(item.laborCost), CLAMP),
                totalOverheadCost: Math.min(acc.totalOverheadCost + num(item.overheadCost), CLAMP),
                totalPaintingCost: Math.min(acc.totalPaintingCost + num(item.paintingCost), CLAMP),
                totalConsumablesCost: Math.min(
                    acc.totalConsumablesCost + num(item.parameters?.consumablesTotal as number | undefined) * qty,
                    CLAMP
                ),
                totalMarkup: Math.min(acc.totalMarkup + num(item.markup), CLAMP),
                totalMinimumTopUp: Math.min(acc.totalMinimumTopUp + num(item.minimumTopUp), CLAMP),
                totalDiscount: Math.min(acc.totalDiscount + num(item.discountAmount), CLAMP),
                totalShipping: Math.min(acc.totalShipping + num(item.shippingCost), CLAMP),
                grandTotal: Math.min(acc.grandTotal + num(item.totalPrice), CLAMP),
            };
        },
        {
            totalItems: 0,
            totalQuantity: 0,
            totalMaterialCost: 0,
            totalMachineTimeCost: 0,
            totalElectricityCost: 0,
            totalLaborCost: 0,
            totalOverheadCost: 0,
            totalPaintingCost: 0,
            totalConsumablesCost: 0,
            totalMarkup: 0,
            totalMinimumTopUp: 0,
            totalDiscount: 0,
            totalShipping: 0,
            grandTotal: 0,
        }
    ), [batchItems]);

    const saveBatchAsQuote = useCallback((projectName?: string): QuoteData => {
        // Sums of two-decimal figures carry float debris (37.650000000000006); the master is
        // stored the way every other quote is, to the cent.
        const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
        const sumOf = (pick: (i: QuoteData) => number | undefined) =>
            batchItems.reduce((acc, i) => acc + (Number.isFinite(pick(i)) ? (pick(i) as number) : 0), 0);
        if (batchItems.length === 0) {
            throw new Error("No items in batch to save");
        }

        // Aggregate everything into a master quote
        const mergedProjectNames = batchItems.map(i => i.projectName).join(' and ');
        const masterWeight = projectName || mergedProjectNames;
        
        // Use the shared generator, which checks the candidate id against existing quotes.
        // The old `<4 hex><quotes.length + 1>` scheme reused numbers after any deletion, and a
        // collision made saveQuote overwrite the older quote instead of adding a new one.
        const masterId = generateShortQuoteId(getQuotes());

        const masterQuote: QuoteData = {
            id: masterId,
            projectName: masterWeight,
            clientName: batchItems[0]?.clientName || "Valued Customer",
            printType: batchItems.every(i => i.printType === batchItems[0].printType) ? batchItems[0].printType : "FDM", // Default to FDM if mixed
            printColour: batchItems.length === 1 ? batchItems[0].printColour : "Multiple",
            materialCost: cents(batchTotals.totalMaterialCost),
            machineTimeCost: cents(batchTotals.totalMachineTimeCost),
            electricityCost: cents(batchTotals.totalElectricityCost),
            laborCost: cents(batchTotals.totalLaborCost),
            overheadCost: cents(batchTotals.totalOverheadCost),
            markup: cents(batchTotals.totalMarkup),
            paintingCost: cents(batchTotals.totalPaintingCost),
            // Painting and consumables were missing here, so the master quote's subtotal
            // did not account for costs that were already inside each item's total.
            subtotal: cents(batchTotals.totalMaterialCost
                + batchTotals.totalMachineTimeCost
                + batchTotals.totalElectricityCost
                + batchTotals.totalLaborCost
                + batchTotals.totalPaintingCost
                + batchTotals.totalConsumablesCost
                + batchTotals.totalOverheadCost),
            ...(batchTotals.totalMinimumTopUp > 0 ? { minimumTopUp: cents(batchTotals.totalMinimumTopUp) } : {}),
            ...(batchTotals.totalDiscount > 0 ? { discountAmount: cents(batchTotals.totalDiscount) } : {}),
            ...(batchTotals.totalShipping > 0 ? { shippingCost: cents(batchTotals.totalShipping) } : {}),
            totalPrice: cents(batchTotals.grandTotal),
            quantity: 1, // The batch itself is 1 order
            unitPrice: cents(batchTotals.grandTotal),
            // The master's footprint is the sum of its items'. Without it every batch was
            // invisible to the carbon dashboard until production finished each child.
            carbon: sumCarbonRecords(batchItems.map(i => i.carbon)),
            failedUnits: sumOf(i => i.failedUnits) || undefined,
            parameters: {
                materialName: "Batch Consists of Multiple Materials",
                machineName: "Multiple Machines",
                // summariseQuote reads consumables from here, and every summary of a batch was
                // therefore short by exactly this figure while the quote's own `subtotal` above
                // included it. The master's quantity is 1, so this is the whole batch's total.
                consumablesTotal: batchTotals.totalConsumablesCost,
            },
            isBatch: true,
            batchItems: [...batchItems],
            createdAt: new Date().toISOString(),
            status: 'PENDING',
            priority: 'Medium',
        };

        return masterQuote;
    }, [batchItems, batchTotals]);

    const contextValue: BatchQuoteContextType = useMemo(() => ({
        batchItems,
        addItem,
        removeItem,
        updateItem,
        clearBatch,
        saveBatchAsQuote,
        batchTotals,
    }), [batchItems, addItem, removeItem, updateItem, clearBatch, saveBatchAsQuote, batchTotals]);

    return (
        <BatchQuoteContext.Provider value={contextValue}>
            {children}
        </BatchQuoteContext.Provider>
    );
};
