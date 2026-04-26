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

import SavedQuotesTable from "@/components/quotes/SavedQuotesTable";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CurrencySelector } from "@/components/shared/CurrencySelector";
import { useCallback } from "react";
import { useSavedQuotes } from "@/hooks/useSavedQuotes";
import { QuoteData } from "@/types/quote";

const SavedQuotes = () => {
    const navigate = useNavigate();
    const {
        quotes,
        deleteQuote,
        updateNotes,
        duplicateQuote,
    } = useSavedQuotes();

    const handleDeleteQuote = useCallback(async (id: string) => {
        await deleteQuote(id);
    }, [deleteQuote]);

    const handleUpdateNotes = useCallback(async (id: string, notes: string) => {
        await updateNotes(id, notes);
    }, [updateNotes]);

    const handleDuplicateQuote = useCallback(async (quote: QuoteData) => {
        if (quote) {
            await duplicateQuote(quote);
        }
    }, [duplicateQuote]);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/")}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
                            Saved Quotes
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <CurrencySelector />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                <SavedQuotesTable
                    quotes={quotes}
                    onDeleteQuote={handleDeleteQuote}
                    onUpdateNotes={handleUpdateNotes}
                    onDuplicateQuote={handleDuplicateQuote}
                />
            </main>
        </div>
    );
};

export default SavedQuotes;
