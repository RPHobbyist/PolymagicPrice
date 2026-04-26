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

import { memo, useMemo } from 'react';
import { QuoteData, QuoteStatus } from '@/types/quote';
import { Checkbox } from '@/components/ui/checkbox';

import { useKanban } from '@/hooks/useKanban';
import { ChevronRight, User, AlertCircle, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { getEmployee } from '@/lib/core/sessionStorage';
import { Badge } from '@/components/ui/badge';

interface OrderListItemProps {
    quote: QuoteData;
}

const STAGES: { id: QuoteStatus; label: string }[] = [
    { id: 'PENDING', label: 'Pending' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'PRINTING', label: 'Printing' },
    { id: 'POST_PROCESSING', label: 'Post-Processing' },
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
        High: { color: "text-red-500 bg-red-500/10 border-red-500/20", icon: ArrowUp },
        Medium: { color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20", icon: ArrowRight },
        Low: { color: "text-blue-500 bg-blue-500/10 border-blue-500/20", icon: ArrowDown },
    };

    const style = config[priority as keyof typeof config] || config.Low;
    const Icon = style.icon;

    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${style.color}`}>
            <Icon className="w-3 h-3" />
            {priority}
        </div>
    );
};

const OrderListItem = memo(({ quote }: OrderListItemProps) => {
    const { moveQuote } = useKanban();
    const currentStageIndex = getStageIndex(quote.status);

    // Get assigned employee name
    const assignedEmployee = useMemo(() => {
        if (quote.assignedEmployeeId) {
            return getEmployee(quote.assignedEmployeeId);
        }
        return null;
    }, [quote.assignedEmployeeId]);

    const handleStageClick = (stageIndex: number) => {
        const newStatus = STAGES[stageIndex].id;
        if (quote.id) {
            moveQuote(quote.id, newStatus);
        }
    };

    return (
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg mb-2 hover:bg-muted/30 transition-colors">
            {/* Order Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{quote.projectName}</h4>
                    <PriorityBadge priority={quote.priority} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{quote.printType}</span>
                    {quote.clientName && (
                        <>
                            <span>·</span>
                            <span className="truncate">{quote.clientName}</span>
                        </>
                    )}
                    {assignedEmployee && (
                        <>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-primary">
                                <User className="w-3 h-3" />
                                {assignedEmployee.name}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Stage Checkboxes */}
            <div className="flex items-center gap-1">
                {STAGES.map((stage, index) => (
                    <div key={stage.id} className="flex items-center">
                        <button
                            onClick={() => handleStageClick(index)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors"
                            title={stage.label}
                        >
                            <Checkbox
                                checked={index <= currentStageIndex}
                                className="h-4 w-4 pointer-events-none"
                            />
                            <span className={`text-xs ${index <= currentStageIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                {stage.label}
                            </span>
                        </button>
                        {index < STAGES.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-muted-foreground/30 mx-0.5" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

OrderListItem.displayName = 'OrderListItem';

export const OrderList = memo(() => {
    const { columns } = useKanban();

    // Combine all quotes from all columns
    const allQuotes = useMemo(() => {
        const quotes = [
            ...columns.PENDING,
            ...columns.APPROVED,
            ...columns.PRINTING,
            ...columns.POST_PROCESSING,
            ...(columns.DISPATCHED || []),
            ...(columns.DELIVERED || []),
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
