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

import { memo } from "react";
import { Loader2 } from "lucide-react";
import { OrderList } from "@/components/kanban/OrderList";
import { OrderManagerProvider } from "@/contexts/OrderManagerProvider";
import { useSavedQuotes } from "@/hooks/useSavedQuotes";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { PageHeader } from "@/components/layout/PageHeader";

const OrderManager = memo(() => {
    useDocumentSEO({
        title: "Order Manager — 3D Print Order Tracking & Customer CRM",
        description: "Track 3D printing orders from quote to delivery with a visual Kanban board. Manage customer relationships, log requirements, and streamline your 3D printing business. Free and open-source.",
        canonical: "/order-manager",
        ogTitle: "3D Print Order Tracker & Customer CRM | PolymagicPrice",
        ogDescription: "Visual order lifecycle management for 3D printing shops. Track quotes, manage customers, and streamline workflows.",
    });

    const {
        quotes,
        loading,
        refetch,
    } = useSavedQuotes();

    return (
        <div className="min-h-full bg-slate-50 font-sans text-slate-900 animate-fade-in flex flex-col">
            <PageHeader 
                title="Order Manager" 
                subtitle="Customer Portfolio & Lifecycle Tracking"
            />

            <div className="container mx-auto max-w-[1600px] px-6 py-8 space-y-8 flex-1">

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-600" aria-hidden="true" />
                        <span className="sr-only">Loading orders...</span>
                    </div>
                ) : (
                    <OrderManagerProvider quotes={quotes} onQuoteUpdate={refetch}>
                        <OrderList />
                    </OrderManagerProvider>
                )}
            </div>
        </div>
    );
});

export default OrderManager;
