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

import { useState, useCallback, useEffect, ReactNode } from 'react';
import { QuoteData } from '@/types/quote';
import { BatchQuoteContext, BatchQuoteContextType } from '@/contexts/BatchQuoteContext';
import { getQuotes } from '@/lib/core/sessionStorage';

const STORAGE_KEY = 'batch_quote_items';

export const BatchQuoteProvider = ({ children }: { children: ReactNode }) => {
    const [batchItems, setBatchItems] = useState<QuoteData[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Persist to localStorage whenever batchItems changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(batchItems));
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

    // Calculate batch totals with industrial numerical ceilings
    const batchTotals = batchItems.reduce(
        (acc, item) => {
            const qty = item.quantity || 1;
            // Enforce a $100M ceiling on any cumulative batch value to prevent numerical noise/UI-breakage
            const CLAMP = 100000000;
            
            return {
                totalItems: Math.min(acc.totalItems + 1, 1000000),
                totalQuantity: Math.min(acc.totalQuantity + qty, 10000000),
                totalMaterialCost: Math.min(acc.totalMaterialCost + item.materialCost * qty, CLAMP),
                totalMachineTimeCost: Math.min(acc.totalMachineTimeCost + item.machineTimeCost * qty, CLAMP),
                totalElectricityCost: Math.min(acc.totalElectricityCost + item.electricityCost * qty, CLAMP),
                totalLaborCost: Math.min(acc.totalLaborCost + item.laborCost * qty, CLAMP),
                totalOverheadCost: Math.min(acc.totalOverheadCost + item.overheadCost * qty, CLAMP),
                totalMarkup: Math.min(acc.totalMarkup + item.markup * qty, CLAMP),
                grandTotal: Math.min(acc.grandTotal + item.totalPrice, CLAMP),
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
            totalMarkup: 0,
            grandTotal: 0,
        }
    );

    const saveBatchAsQuote = useCallback((projectName?: string): QuoteData => {
        if (batchItems.length === 0) {
            throw new Error("No items in batch to save");
        }

        // Aggregate everything into a master quote
        const mergedProjectNames = batchItems.map(i => i.projectName).join(' and ');
        const masterWeight = projectName || mergedProjectNames;
        
        // Get existing quotes to determine overall count
        const existingQuotes = getQuotes();
        
        // Generate a random segment similar to normal quotes (e.g. 5F6D)
        const randomSegment = crypto.randomUUID().split('-')[1].toUpperCase();
        const masterId = `${randomSegment}${existingQuotes.length + 1}`;

        const masterQuote: QuoteData = {
            id: masterId,
            projectName: masterWeight,
            clientName: batchItems[0]?.clientName || "Valued Customer",
            printType: batchItems.every(i => i.printType === batchItems[0].printType) ? batchItems[0].printType : "FDM", // Default to FDM if mixed
            printColour: batchItems.length === 1 ? batchItems[0].printColour : "Multiple",
            materialCost: batchTotals.totalMaterialCost,
            machineTimeCost: batchTotals.totalMachineTimeCost,
            electricityCost: batchTotals.totalElectricityCost,
            laborCost: batchTotals.totalLaborCost,
            overheadCost: batchTotals.totalOverheadCost,
            markup: batchTotals.totalMarkup,
            subtotal: batchTotals.totalMaterialCost + batchTotals.totalMachineTimeCost + batchTotals.totalElectricityCost + batchTotals.totalLaborCost + batchTotals.totalOverheadCost,
            totalPrice: batchTotals.grandTotal,
            quantity: 1, // The batch itself is 1 order
            unitPrice: batchTotals.grandTotal,
            parameters: {
                materialName: "Batch Consists of Multiple Materials",
                machineName: "Multiple Machines",
            },
            isBatch: true,
            batchItems: [...batchItems],
            createdAt: new Date().toISOString(),
            status: 'PENDING',
            priority: 'Medium',
        };

        return masterQuote;
    }, [batchItems, batchTotals]);

    const contextValue: BatchQuoteContextType = {
        batchItems,
        addItem,
        removeItem,
        updateItem,
        clearBatch,
        saveBatchAsQuote,
        batchTotals,
    };

    return (
        <BatchQuoteContext.Provider value={contextValue}>
            {children}
        </BatchQuoteContext.Provider>
    );
};
