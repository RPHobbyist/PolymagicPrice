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
import { BatchQuoteContext } from '@/contexts/BatchQuoteContext';

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

    // Calculate batch totals
    const batchTotals = batchItems.reduce(
        (acc, item) => ({
            totalItems: acc.totalItems + 1,
            totalQuantity: acc.totalQuantity + (item.quantity || 1),
            totalMaterialCost: acc.totalMaterialCost + item.materialCost * (item.quantity || 1),
            totalMachineTimeCost: acc.totalMachineTimeCost + item.machineTimeCost * (item.quantity || 1),
            totalElectricityCost: acc.totalElectricityCost + item.electricityCost * (item.quantity || 1),
            totalLaborCost: acc.totalLaborCost + item.laborCost * (item.quantity || 1),
            totalOverheadCost: acc.totalOverheadCost + item.overheadCost * (item.quantity || 1),
            totalMarkup: acc.totalMarkup + item.markup * (item.quantity || 1),
            grandTotal: acc.grandTotal + item.totalPrice,
        }),
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

    return (
        <BatchQuoteContext.Provider
            value={{
                batchItems,
                addItem,
                removeItem,
                updateItem,
                clearBatch,
                batchTotals,
            }}
        >
            {children}
        </BatchQuoteContext.Provider>
    );
};
