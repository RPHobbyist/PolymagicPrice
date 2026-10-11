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
            FAILED: [],
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

        const SHIPPED = ['DISPATCHED', 'DELIVERED'];
        const NOT_PRINTED = ['PENDING', 'APPROVED', 'PRINTING', 'FAILED', undefined];
        const skipsPrinting = SHIPPED.includes(newStatus) && NOT_PRINTED.includes(quote?.status);

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
        } else if (newStatus === 'DONE' || newStatus === 'POST_PROCESSING' || skipsPrinting) {
            // Jumping straight to Dispatched/Delivered still means the job was printed: finish it
            // so stock, runtime and actuals are booked, then restore the status that was asked for.
            const targetStatus = (newStatus === 'POST_PROCESSING' ? 'post_processing' : 'completed') as JobStatus;
            if (existingJob) {
                moveProductionJob(existingJob.id, targetStatus, existingJob.machineId);
            } else if (quote && !quote.isBatch) {
                // Finishing an order that never went through the board still has to take its
                // material off the spool and book the machine hours; otherwise the status says
                // done while stock, runtime and actuals say nothing happened.
                const newJobId = addJob(quote);
                if (newJobId) moveProductionJob(newJobId, targetStatus, null);
            }
        } else if (newStatus === 'FAILED') {
            toast.error("Order Failed", { description: "Marked as failed. Ready for reprint or cancellation." });
        }

        // Completing a skipped-ahead job rewrites the quote as DONE; put back what was requested.
        if (skipsPrinting) sessionStore.updateQuoteStatus(quoteId, newStatus);

        // 4. Final step: REFETCH UI
        onQuoteUpdate();
    }, [onQuoteUpdate, quotes, jobs, addJob, moveProductionJob]);

    // Memoised like every other provider: a fresh object here re-rendered the whole order board
    // on any render of this provider, whether or not the columns had changed.
    const contextValue: OrderManagerContextType = useMemo(() => ({
        columns,
        moveQuote,
        refreshBoard: onQuoteUpdate
    }), [columns, moveQuote, onQuoteUpdate]);

    return (
        <OrderManagerContext.Provider value={contextValue}>
            {children}
        </OrderManagerContext.Provider>
    );
};
