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

import { useCallback, ReactNode, useMemo } from 'react';
import { JobStatus } from '@/types/production';
import { QuoteData, QuoteStatus } from '@/types/quote';
import * as sessionStore from '@/lib/core/sessionStorage';
import { toast } from 'sonner';
import { OrderManagerContext, OrderManagerContextType } from '@/contexts/OrderManagerContext';
import { useProduction } from '@/hooks/useProduction';

interface OrderManagerProviderProps {
    children: ReactNode;
    quotes: QuoteData[];
    onQuoteUpdate: () => void;
}

export const OrderManagerProvider = ({ children, quotes, onQuoteUpdate }: OrderManagerProviderProps) => {
    const { jobs, addJob, moveJob: moveProductionJob } = useProduction();

    // Derived state: Columns
    const columns = useMemo(() => {
        const cols: Record<string, QuoteData[]> = {
            PENDING: [],
            APPROVED: [],
            PRINTING: [],
            POST_PROCESSING: [],
            DONE: [],
            DISPATCHED: [],
            DELIVERED: [],
            CANCELLED: [],
        };

        quotes.forEach(quote => {
            const status = quote.status || 'PENDING';
            if (cols[status]) {
                cols[status].push(quote);
            } else {
                // Fallback for unknown status
                cols['PENDING'].push(quote);
            }
        });

        return cols;
    }, [quotes]);

    const moveQuote = useCallback((quoteId: string, newStatus: QuoteStatus) => {
        // 1. Prepare updates
        const quote = quotes.find(q => q.id === quoteId);
        const existingJob = jobs.find(j => j.quote.id === quoteId);
        const isReprint = (newStatus === 'APPROVED' || newStatus === 'PRINTING') && (quote?.status === 'FAILED' || (quote?.failedUnits || 0) > 0);

        // 2. Perform Storage Updates
        sessionStore.updateQuoteStatus(quoteId, newStatus);
        
        if (isReprint) {
            // Specialized logic for reprints: notify and reset job if it exists
            if (existingJob) {
                moveProductionJob(existingJob.id, 'queued', existingJob.machineId);
            }
            
            toast.success("Reprint Initiated", { 
                description: `${quote?.projectName} has been returned to the production queue.`,
                duration: 4000
            });
        }

        // 3. Sync with Production Manager for specific states
        if (newStatus === 'PRINTING') {
            if (!existingJob) {
                if (quote) addJob(quote);
            } else {
                // If it's a reprint or moving to printing, clear failure reason in job
                const targetStatus = existingJob.machineId ? 'printing' : 'queued';
                moveProductionJob(existingJob.id, targetStatus, existingJob.machineId);
            }
            
            if (!isReprint) {
                toast.info(`Started production for ${quote?.projectName || 'Item'}`);
            }
        } else if (newStatus === 'DONE' || newStatus === 'POST_PROCESSING') {
            if (existingJob) {
                const targetStatus = newStatus === 'DONE' ? 'completed' : 'post_processing';
                moveProductionJob(existingJob.id, targetStatus as JobStatus, existingJob.machineId);
            }
        } else if (newStatus === 'FAILED') {
            toast.error("Order Failed", { description: "Marked as failed. Ready for reprint or cancellation." });
        }

        // 4. Final step: REFETCH UI
        onQuoteUpdate();
    }, [onQuoteUpdate, quotes, jobs, addJob, moveProductionJob]);

    const contextValue: OrderManagerContextType = {
        columns,
        moveQuote,
        refreshBoard: onQuoteUpdate
    };

    return (
        <OrderManagerContext.Provider value={contextValue}>
            {children}
        </OrderManagerContext.Provider>
    );
};
