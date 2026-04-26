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

// Helper function to deduct inventory when a quote is saved
const deductInventoryFromQuote = (quote: QuoteData) => {
  // Only process if we have material and filament weight
  if (!quote.parameters?.materialName || !quote.parameters?.filamentWeight) {
    return;
  }

  const filamentWeight = parseFloat(quote.parameters.filamentWeight as string) || 0;
  if (filamentWeight <= 0) return;

  // Calculate total deduction (weight × quantity)
  const totalDeduction = filamentWeight * (quote.quantity || 1);

  // Priority 1: Use the explicitly selected spool ID if available
  const selectedSpoolId = quote.parameters?.selectedSpoolId as string | undefined;
  if (selectedSpoolId) {
    const success = sessionStore.deductFromSpool(selectedSpoolId, totalDeduction);
    if (success) {
      // Inventory deducted successfully
      return;
    }
  }

  // Priority 2: Fallback to color matching
  const materials = sessionStore.getMaterials();
  const material = materials.find(m => m.name === quote.parameters?.materialName);
  if (!material) return;

  const spools = sessionStore.getSpools(material.id);
  if (spools.length === 0) return;

  // Try to find a spool with matching color (case-insensitive)
  const quoteColor = quote.printColour?.toLowerCase().trim() || '';
  let targetSpool = spools.find(s =>
    s.color?.toLowerCase().includes(quoteColor) ||
    s.name?.toLowerCase().includes(quoteColor)
  );

  // If no color match, use the spool with most remaining weight
  if (!targetSpool) {
    targetSpool = spools.reduce((max, s) => s.currentWeight > max.currentWeight ? s : max, spools[0]);
  }

  const success = sessionStore.deductFromSpool(targetSpool.id, totalDeduction);
  if (success) {
    // Inventory deducted successfully
  }
};

// Helper function to restore inventory when a quote is deleted
const restoreInventoryFromQuote = (quote: QuoteData) => {
  // Only process if we have material and filament weight
  if (!quote.parameters?.materialName || (!quote.parameters?.filamentWeight && !quote.parameters?.resinVolume)) {
    return;
  }

  const weightVal = parseFloat(quote.parameters.filamentWeight as string || quote.parameters.resinVolume as string) || 0;
  if (weightVal <= 0) return;

  const totalRestoration = weightVal * (quote.quantity || 1);
  const selectedSpoolId = quote.parameters?.selectedSpoolId as string | undefined;

  if (selectedSpoolId) {
    const success = sessionStore.restoreToSpool(selectedSpoolId, totalRestoration);
    if (success) {
      // Inventory restored successfully
    }
  }
  // Note: We don't auto-restore for fallback matches as it might restore to the wrong spool
};

interface UseSavedQuotesReturn {
  quotes: QuoteData[];
  loading: boolean;
  error: string | null;
  stats: QuoteStats;
  saveQuote: (quote: QuoteData) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  duplicateQuote: (quote: QuoteData) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useSavedQuotes = (): UseSavedQuotesReturn => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [fetchQuotes]);

  const stats = useMemo((): QuoteStats => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalRevenue = quotes.reduce((sum, q) => sum + q.totalPrice, 0);
    const recentQuotes = quotes.filter(q =>
      q.createdAt && new Date(q.createdAt) >= weekAgo
    ).length;

    return {
      totalQuotes: quotes.length,
      totalRevenue,
      avgQuoteValue: quotes.length > 0 ? totalRevenue / quotes.length : 0,
      fdmCount: quotes.filter(q => q.printType === "FDM").length,
      resinCount: quotes.filter(q => q.printType === "Resin").length,
      recentQuotes,
    };
  }, [quotes]);

  const saveQuote = useCallback(async (quote: QuoteData) => {
    try {
      const newQuote = sessionStore.saveQuote(quote);
      setQuotes(prev => [newQuote, ...prev]);

      // Auto-deduct from inventory
      deductInventoryFromQuote(quote);

      toast.success("Quote saved successfully");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to save quote");
      throw err;
    }
  }, []);

  const deleteQuote = useCallback(async (id: string) => {
    try {
      // Find quote to restore inventory
      const quoteToDelete = quotes.find(q => q.id === id);
      if (quoteToDelete) {
        restoreInventoryFromQuote(quoteToDelete);
      }

      sessionStore.deleteQuote(id);
      setQuotes(prev => prev.filter(q => q.id !== id));
      toast.success("Quote deleted successfully");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to delete quote");
      throw err;
    }
  }, [quotes]);

  const updateNotes = useCallback(async (id: string, notes: string) => {
    try {
      sessionStore.updateQuoteNotes(id, notes);
      setQuotes(prev =>
        prev.map(q => q.id === id ? { ...q, notes } : q)
      );
      toast.success("Notes updated successfully!");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to update notes");
      throw err;
    }
  }, []);

  const duplicateQuote = useCallback(async (quote: QuoteData) => {
    const duplicatedQuote: QuoteData = {
      ...quote,
      id: undefined,
      projectName: `${quote.projectName} (Copy)`,
      createdAt: undefined,
      notes: "",
    };
    await saveQuote(duplicatedQuote);
  }, [saveQuote]);

  return {
    quotes,
    loading,
    error,
    stats,
    saveQuote,
    deleteQuote,
    updateNotes,
    duplicateQuote,
    refetch: fetchQuotes,
  };
};
