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
import { QuotesDashboard } from "@/components/dashboard/QuotesDashboard";
import { ShopAnalysisDashboard } from "@/components/dashboard/ShopAnalysisDashboard";
import { CustomerInsightsDashboard } from "@/components/dashboard/CustomerInsightsDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCallback } from "react";
import { useSavedQuotes } from "@/hooks/useSavedQuotes";
import { QuoteData } from "@/types/quote";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";

const BillingAnalysis = () => {
    useDocumentSEO({
        title: "Billing & Analysis — 3D Printing Revenue & Quote Analytics",
        description: "Analyze your 3D printing business finances with revenue dashboards, customer insights, and quote history tracking. Monitor profit margins, identify top clients, and track revenue growth.",
        canonical: "/billing-analysis",
        ogTitle: "3D Printing Business Analytics & Revenue Dashboard | PolymagicPrice",
        ogDescription: "Track revenue, analyze profit margins, and manage quote history for your 3D printing business."
    });


    const {
        quotes,
        deleteQuote,
        updateQuote,
        stats,
    } = useSavedQuotes();

    const handleDeleteQuote = useCallback(async (id: string) => {
        await deleteQuote(id);
    }, [deleteQuote]);

    const handleUpdateQuote = useCallback(async (id: string, updates: Partial<QuoteData>) => {
        await updateQuote(id, updates);
    }, [updateQuote]);

    return (
        <div className="min-h-full bg-slate-50 font-sans text-slate-900 animate-fade-in flex flex-col">
            <PageHeader 
                title="Billing & Analysis" 
                subtitle="Quote History & Financial Repository"
            />

            {/* Content */}
            <main className="container mx-auto px-6 py-8 max-w-[1600px] space-y-8">
                {/* Finance Analysis Summary */}
                <section className="animate-fade-in stagger-1">
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Financial Performance</h2>
                    </div>
                    <QuotesDashboard stats={stats} />
                </section>

                {/* Shop Analysis Section */}
                <section className="animate-fade-in stagger-2">
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Shop Analysis</h2>
                    </div>
                    <ShopAnalysisDashboard stats={stats} />
                </section>

                {/* Customer & Growth Insights */}
                <section className="animate-fade-in stagger-3">
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Customer & Growth Insights</h2>
                    </div>
                    <CustomerInsightsDashboard stats={stats} />
                </section>

                <section className="animate-fade-in stagger-4">
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Quote History</h2>
                    </div>
                    <SavedQuotesTable
                        quotes={quotes}
                        onDeleteQuote={handleDeleteQuote}
                        onUpdateQuote={handleUpdateQuote}
                    />
                </section>
            </main>
        </div>
    );
};

export default BillingAnalysis;
