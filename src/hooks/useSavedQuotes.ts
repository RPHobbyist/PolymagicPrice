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

import { useState, useEffect, useCallback, useMemo } from "react";
import { QuoteData, QuoteStats } from "@/types/quote";
import { toast } from "sonner";
import * as sessionStore from "@/lib/core/sessionStorage";
import { useProduction } from "./useProduction";


// Inventory restoration is now managed exclusively by the ProductionProvider 
// to ensure perfect synchronization with the physical production lifecycle.

interface UseSavedQuotesReturn {
  quotes: QuoteData[];
  loading: boolean;
  error: string | null;
  stats: QuoteStats;
  saveQuote: (quote: QuoteData) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  updateQuote: (id: string, updates: Partial<QuoteData>) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useSavedQuotes = (): UseSavedQuotesReturn => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { removeJobByQuoteId } = useProduction();

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = sessionStore.getQuotes();
      setQuotes(data);
    } catch (err) {
      const error = err as Error;
      const errorMessage = error.message || "Failed to load saved quotes";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "session_quotes") {
        fetchQuotes();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("session_quotes_updated", fetchQuotes);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("session_quotes_updated", fetchQuotes);
    };
  }, [fetchQuotes]);

  const stats = useMemo((): QuoteStats => {
    const now = new Date();
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
      customerMap: new Map<string, { id?: string; name: string; count: number; revenue: number }>()
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
        
        // FINANCIAL CLOSED LOOP: Adjust time-dependent costs based on Actual vs Estimated time
        const estimatedTime = parseVal(q.parameters?.printTime);
        const actualTime = q.actualPrintTime;
        
        let laborCost = q.laborCost || 0;
        let electricityCost = q.electricityCost || 0;
        let machineCost = q.machineTimeCost || 0;

        if (actualTime && estimatedTime > 0) {
            const ratio = actualTime / estimatedTime;
            // Only adjust if the difference is significant (>5%) to avoid noise
            if (Math.abs(ratio - 1) > 0.05) {
                laborCost *= ratio;
                electricityCost *= ratio;
                machineCost *= ratio;
            }
        }

        const actualSubtotal = (q.materialCost || 0) + laborCost + electricityCost + machineCost + (q.overheadCost || 0);
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
        accum.totalFilamentUsed += (actualWeight / 1000); // Standardize to kg for dashboard
      } else {
        accum.resinCount++;
        const estimatedVolume = parseVal(q.parameters?.resinVolume);
        const actualVolume = q.actualMaterialUsed ?? (estimatedVolume * (q.quantity || 1));
        accum.totalResinUsed += (actualVolume / 1000); // Standardize to L for dashboard
      }

      const printTime = q.actualPrintTime || parseVal(q.parameters?.printTime);
      accum.totalPrintTime += printTime;
      accum.failedPrintsCount += (q.failedUnits || 0);

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
      totalFilamentUsed: accum.totalFilamentUsed / 1000,
      totalResinUsed: accum.totalResinUsed / 1000,
      failedPrintsCount: accum.failedPrintsCount,
      repeatCustomerRate: customersList.length > 0 ? (repeatCustomersCount / customersList.length) * 100 : 0,
      topCustomers: [...customersList].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      revenueGrowth,
      totalLaborCost: accum.totalLaborCost,
      totalElectricityCost: accum.totalElectricityCost,
      totalMaterialCost: accum.totalMaterialCost,
      totalOverheadCost: accum.totalOverheadCost,
      avgMargin: accum.totalRevenue > 0 ? (accum.totalProfit / accum.totalRevenue) * 100 : 0,
      statusDistribution: accum.statusDistribution
    };
  }, [quotes]);

  const saveQuote = useCallback(async (quote: QuoteData) => {
    try {
      const newQuote = sessionStore.saveQuote(quote);
      
      setQuotes(prev => {
        const existingIndex = prev.findIndex(q => q.id === newQuote.id);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = newQuote;
          return updated;
        }
        return [newQuote, ...prev];
      });

      toast.success("Quote saved successfully");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to save quote");
      throw err;
    }
  }, []);

  const deleteQuote = useCallback(async (id: string) => {
    try {
      sessionStore.deleteQuote(id);
      removeJobByQuoteId(id);
      setQuotes(prev => prev.filter(q => q.id !== id));
      toast.success("Quote deleted successfully");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to delete quote");
      throw err;
    }
  }, [removeJobByQuoteId]);

  const updateQuote = useCallback(async (id: string, updates: Partial<QuoteData>) => {
    try {
      sessionStore.updateQuote(id, updates);
      await fetchQuotes();
      toast.success("Quote updated successfully!");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to update quote");
      throw err;
    }
  }, [fetchQuotes]);

  return {
    quotes,
    loading,
    error,
    stats,
    saveQuote,
    deleteQuote,
    updateQuote,
    refetch: fetchQuotes,
  };
};
