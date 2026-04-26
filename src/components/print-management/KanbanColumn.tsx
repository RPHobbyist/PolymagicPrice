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
import { Droppable } from "@hello-pangea/dnd";
import { ProductionJob } from "@/types/production";
import { Printer, Package, Clock } from "lucide-react";
import { JobCard } from "./JobCard";
import { useProduction } from "@/hooks/useProduction";
import { formatHours } from "@/lib/capacityCalculator";

import { Link2 } from "lucide-react";

interface KanbanColumnProps {
    title: string;
    id: string;
    jobs: ProductionJob[];
    isMachine?: boolean;
    connectionStatus?: string;
    onSendFile?: (file: File | string, job: ProductionJob) => void;
    printerState?: {
        printState?: string;
        progress?: number;
        remainingTime?: number;
    };
}

export const KanbanColumn = memo(({
    title,
    id,
    jobs,
    isMachine = false,
    connectionStatus = 'disconnected',
    onSendFile,
    printerState
}: KanbanColumnProps) => {
    const { settings } = useProduction();

    // Calculate total time for this machine/column
    const columnLoad = jobs.reduce((acc, job) => {
        const q = parseInt(String(job.quote.quantity || job.quote.parameters?.quantity || "1"), 10) || 1;
        const printTimeStr = String(job.quote.parameters?.printTime || "0");
        const printTime = parseFloat(printTimeStr) || 0;
        
        // Efficiency adjustment
        const effectiveTime = printTime / ((settings.efficiency || 100) / 100);
        const turnover = ((settings.turnoverMinutes || 0) / 60);

        return acc + (effectiveTime * q) + (turnover * q);
    }, 0);

    const isOverloaded = columnLoad > (settings.workHoursPerDay || 8);
    return (
        <div className="flex flex-col h-full bg-muted/40 rounded-md border border-border/60 min-w-[260px] w-[260px] overflow-hidden">
            {/* Header */}
            <div className={`px-3 py-2 border-b border-border/60 flex justify-between items-center bg-card/50 backdrop-blur-sm ${isMachine ? '' : 'bg-muted/60'}`}>
                <div className="flex items-center gap-2 min-w-0">
                    {isMachine && jobs.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)] flex-shrink-0" aria-label="Active printer" />}
                    {isMachine && jobs.length === 0 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" aria-label="Idle printer" />}

                    <h2 className="font-normal text-xs uppercase tracking-wide text-foreground/80 truncate" title={title}>
                        {title}
                    </h2>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Time Load Badge - Industrial Simple */}
                    {isMachine && jobs.length > 0 && (
                        <div className={`flex items-center gap-1 group/eta px-2 py-0.5 rounded border transition-colors ${
                            isOverloaded 
                                ? "bg-rose-50 border-rose-200 text-rose-700 shadow-[0_1px_2px_rgba(244,63,94,0.05)]" 
                                : "bg-white border-slate-200 text-slate-600"
                        }`} title="Total Time to Completion">
                            <Clock className={`w-3 h-3 ${isOverloaded ? "text-rose-500 animate-pulse-soft" : "text-slate-500"}`} aria-hidden="true" />
                            <span className="text-[10px] font-normal tabular-nums">
                                {formatHours(columnLoad)} TTC
                            </span>
                        </div>
                    )}

                    {isMachine && connectionStatus === 'connected' && (
                        <div className="flex items-center justify-center h-5 w-5 text-green-600" title="Printer Connected">
                            <Link2 className="w-3.5 h-3.5" />
                        </div>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {jobs.length}
                    </span>
                </div>
            </div>

            <Droppable droppableId={id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 overflow-y-auto scrollbar-thin transition-colors ${snapshot.isDraggingOver ? "bg-primary/5 ring-inset ring-2 ring-primary/10" : ""
                            }`}
                    >
                        {jobs.map((job, index) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                index={index}
                                isConnected={connectionStatus === 'connected'}
                                onSendFile={onSendFile}
                                // CLOSED LOOP: Only show progress on the job that is actually marked as 'printing'
                                printStatus={job.status === 'printing' && printerState?.printState === 'RUNNING' ? {
                                    state: 'RUNNING',
                                    progress: printerState.progress,
                                    remainingTime: printerState.remainingTime
                                } : undefined}
                            />
                        ))}
                        {provided.placeholder}

                        {jobs.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-slate-400 text-xs">
                                {isMachine ? <Printer className="w-8 h-8 mb-2 opacity-20" aria-hidden="true" /> : <Package className="w-8 h-8 mb-2 opacity-20" aria-hidden="true" />}
                                <p>Empty Slot</p>
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    );
});

KanbanColumn.displayName = "KanbanColumn";
