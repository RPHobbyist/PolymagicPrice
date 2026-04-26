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

import { memo, useMemo, useState } from 'react';
import { QuoteData, QuoteStatus } from '@/types/quote';
import { OrderEmailModal } from '@/components/kanban/OrderEmailModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { useOrderManager } from '@/hooks/useOrderManager';
import { ChevronRight, ArrowUp, ArrowRight, ArrowDown, RotateCcw } from 'lucide-react';
import { getEmployee, getConstants } from '@/lib/core/sessionStorage';
import { getOrderId } from '@/lib/utils/order-utils';
import { cn } from "@/lib/utils";
import { sanitize } from "@/lib/sanitization";


interface OrderListItemProps {
    quote: QuoteData;
}

const STAGES: { id: QuoteStatus; label: string }[] = [
    { id: 'PENDING', label: 'Quoted' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'PRINTING', label: 'Printing' },
    { id: 'POST_PROCESSING', label: 'Post-Processing' },
    { id: 'DONE', label: 'Finished' },
    { id: 'DISPATCHED', label: 'Dispatched' },
    { id: 'DELIVERED', label: 'Delivered' },
];

const getStageIndex = (status?: QuoteStatus) => {
    const idx = STAGES.findIndex(s => s.id === status);
    return idx >= 0 ? idx : 0;
};

const PriorityBadge = ({ priority }: { priority?: string }) => {
    if (!priority) return null;

    const config = {
        High: { styles: "text-red-500 bg-red-500/10 border-red-500/20", icon: ArrowUp },
        Medium: { styles: "text-amber-700 bg-amber-500/10 border-amber-500/20", icon: ArrowRight },
        Low: { styles: "text-blue-500 bg-blue-500/10 border-blue-500/20", icon: ArrowDown },
    };

    const configItem = config[priority as keyof typeof config] || config.Low;

    return (
        <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
            configItem.styles
        )}>
            {priority}
        </div>
    );
};

const OrderListItem = memo(({ quote }: OrderListItemProps) => {
    const { moveQuote } = useOrderManager();
    const [draftOpen, setDraftOpen] = useState(false);
    
    const currentStageIndex = getStageIndex(quote.status);

    // Get assigned employee name
    const assignedEmployee = useMemo(() => {
        if (quote.assignedEmployeeId) {
            return getEmployee(quote.assignedEmployeeId);
        }
        return null;
    }, [quote.assignedEmployeeId]);

    const hasPricingDrift = useMemo(() => {
        const constants = getConstants();
        const currentLabor = constants.find(c => c.name.includes("Labor"))?.value || 0;
        const quoteLabor = parseFloat(quote.parameters.laborRate as string) || 0;
        return (quoteLabor > 0 && Math.abs(currentLabor - quoteLabor) / quoteLabor > 0.15);
    }, [quote.parameters.laborRate]);

    const handleStageClick = (stageIndex: number) => {
        // Once Post-Processing (index 3) or later, don't allow going back
        if (currentStageIndex >= 3 && stageIndex < currentStageIndex) {
            toast.error("Print is already done. Process cannot be moved back.");
            return;
        }

        // Set the status to the specifically clicked stage
        const targetIndex = stageIndex;
        const newStatus = STAGES[targetIndex].id;
        if (quote.id) {
            moveQuote(quote.id, newStatus);
        }
    };

    return (
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg mb-2 hover:bg-muted/30 transition-colors">
            {/* Order Info */}
            <div className="flex-1 min-w-[200px]">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-2">
                    <span className="text-foreground text-[10px] uppercase font-bold tracking-widest pl-0.5">
                        Order ID : <span className="text-foreground/80 ml-1 font-medium">{getOrderId(quote.id)}</span>
                    </span>
                    <span className="text-foreground text-[10px] uppercase font-bold tracking-widest pl-0.5">
                        Project : <span className="text-foreground/80 ml-1 font-medium">{sanitize(quote.projectName)}</span>
                    </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 border-t border-slate-100">
                    <span className={cn(
                        "px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase transition-colors",
                        quote.printType === "FDM" ? "bg-primary/10 text-primary border border-primary/20" : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                    )}>
                        {quote.printType}
                    </span>
                    <PriorityBadge priority={quote.priority} />

                    {quote.clientName && (
                        <span className="text-foreground text-[10px] uppercase font-bold tracking-widest pl-0.5">
                            Client : <span className="text-foreground/80 ml-1 font-medium">{sanitize(quote.clientName)}</span>
                        </span>
                    )}

                    {assignedEmployee && (
                        <span className="text-foreground text-[10px] uppercase font-bold tracking-widest pl-0.5 flex items-center gap-1">
                            Operator : <span className="text-foreground/80 ml-1 font-medium underline underline-offset-4 decoration-primary/20">
                                {sanitize(assignedEmployee.name)}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            {/* AI Draft & Warnings */}
            <div className="flex items-center gap-3 mx-2">
                {(quote.status === 'FAILED' || (quote.failedUnits || 0) > 0) && quote.status !== 'PRINTING' && currentStageIndex < 4 && (
                    <Button
                        variant="outline"
                        onClick={() => moveQuote(quote.id!, 'PRINTING')}
                        className="h-8 px-2 py-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors text-xs font-bold border-amber-200 hover:border-amber-300 whitespace-nowrap animate-pulse-soft"
                        title="Return to production queue"
                    >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Reprint
                    </Button>
                )}
                {hasPricingDrift && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-md animate-pulse-soft" title="Labor rates have drifted >15% since this quote was created.">
                        <ArrowUp className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Price Drift</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    onClick={() => setDraftOpen(true)}
                    className="h-8 px-2 py-1.5 text-primary hover:text-primary hover:bg-primary/10 transition-colors text-xs font-medium border border-transparent hover:border-primary/20 whitespace-nowrap"
                    title="Generate professional status email"
                >
                    DRAFT EMAIL
                </Button>
            </div>

            {/* Stage Checkboxes */}
            <div className="flex items-center gap-1">
                {STAGES.map((stage, index) => {
                    const isPrintDone = (stage.id === 'PRINTING' && currentStageIndex > index) || (stage.id === 'PRINTING' && quote.status === 'POST_PROCESSING');
                    const displayLabel = isPrintDone ? "PRINT DONE" : stage.label.toUpperCase();

                    return (
                        <div key={stage.id} className="flex items-center">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => handleStageClick(index)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleStageClick(index);
                                    }
                                }}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                                    currentStageIndex >= 3 && index < currentStageIndex 
                                        ? "opacity-50 cursor-not-allowed" 
                                        : "hover:bg-muted cursor-pointer"
                                )}
                                title={displayLabel}
                                aria-label={`Set stage to ${displayLabel}`}
                                aria-pressed={index <= currentStageIndex}
                            >
                                <Checkbox
                                    checked={index <= currentStageIndex}
                                    className="h-4 w-4 pointer-events-none"
                                    aria-hidden="true"
                                />
                                <span className={cn(
                                    "text-xs whitespace-nowrap",
                                    index <= currentStageIndex ? 'text-foreground font-medium' : 'text-muted-foreground',
                                    quote.status === 'FAILED' && stage.id === 'FAILED' && "text-red-600 font-bold"
                                )}>
                                    {displayLabel}
                                </span>
                            </div>
                            {index < STAGES.length - 1 && (
                                <ChevronRight className="w-3 h-3 text-muted-foreground/30 mx-0.5" />
                            )}
                        </div>
                    );
                })}
            </div>

            <OrderEmailModal 
                open={draftOpen} 
                onOpenChange={setDraftOpen} 
                quoteData={quote} 
            />
        </div>
    );
});

OrderListItem.displayName = 'OrderListItem';

export const OrderList = memo(() => {
    const { columns } = useOrderManager();

    // Combine all quotes from all columns
    const allQuotes = useMemo(() => {
        const quotes = [
            ...columns.PENDING,
            ...columns.APPROVED,
            ...columns.PRINTING,
            ...columns.POST_PROCESSING,
            ...columns.DONE,
            ...(columns.DISPATCHED || []),
            ...(columns.DELIVERED || []),
            ...(columns.FAILED || []),
        ];

        // Sort by Priority: High > Medium > Low > Undefined
        // BUT: Delivered items always go to the bottom
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };

        return quotes.sort((a, b) => {
            // Rule 1: Delivered items go to the bottom
            const isDeliveredA = a.status === 'DELIVERED';
            const isDeliveredB = b.status === 'DELIVERED';

            if (isDeliveredA && !isDeliveredB) return 1;
            if (!isDeliveredA && isDeliveredB) return -1;

            // Rule 2: Sort by High Priority first
            const priorityA = a.priority ? priorityOrder[a.priority as keyof typeof priorityOrder] || 0 : 0;
            const priorityB = b.priority ? priorityOrder[b.priority as keyof typeof priorityOrder] || 0 : 0;
            return priorityB - priorityA;
        });
    }, [columns]);

    if (allQuotes.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>No orders yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {allQuotes.map((quote) => (
                <OrderListItem key={quote.id} quote={quote} />
            ))}
        </div>
    );
});

OrderList.displayName = 'OrderList';
