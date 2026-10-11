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
import { computeQuoteStats } from "@/lib/quoteStats";
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

  // The heavy lifting lives in computeQuoteStats so the AI assistant and the
  // report generator report exactly the same numbers as this dashboard.
  const stats = useMemo((): QuoteStats => computeQuoteStats(quotes), [quotes]);

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
      // A cancelled order has no more production: drop its job so it stops reserving material
      // and capacity, and give back anything a print in progress had taken off the spool.
      if (updates.status === 'CANCELLED') removeJobByQuoteId(id);
      await fetchQuotes();
      toast.success("Quote updated successfully!");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to update quote");
      throw err;
    }
  }, [fetchQuotes, removeJobByQuoteId]);

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
