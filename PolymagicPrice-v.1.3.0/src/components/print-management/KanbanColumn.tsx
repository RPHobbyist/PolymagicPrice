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
import { Badge } from "@/components/ui/badge";
import { ProductionJob } from "@/types/production";
import { Printer, Package } from "lucide-react";
import { JobCard } from "./JobCard";

import { Button } from "@/components/ui/button";
import { Link2, Link2Off, Send } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface KanbanColumnProps {
    title: string;
    id: string;
    jobs: ProductionJob[];
    isMachine?: boolean;
    onConnect?: () => void;
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
    onConnect,
    connectionStatus = 'disconnected',
    onSendFile,
    printerState
}: KanbanColumnProps) => {
    return (
        <div className="flex flex-col h-full bg-muted/40 rounded-md border border-border/60 min-w-[260px] w-[260px] overflow-hidden">
            {/* Header */}
            <div className={`px-3 py-2 border-b border-border/60 flex justify-between items-center bg-card/50 backdrop-blur-sm ${isMachine ? '' : 'bg-muted/60'}`}>
                <div className="flex items-center gap-2 min-w-0">
                    {isMachine && jobs.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)] flex-shrink-0" />}
                    {isMachine && jobs.length === 0 && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />}

                    <h3 className="font-semibold text-xs uppercase tracking-wide text-foreground/80 truncate" title={title}>
                        {title}
                    </h3>
                </div>

                <div className="flex items-center gap-1.5">
                    {isMachine && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-5 w-5 ${connectionStatus === 'connected' ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={onConnect}
                                >
                                    {connectionStatus === 'connected' ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {connectionStatus === 'connected' ? 'Printer Connected' : 'Connect Printer'}
                            </TooltipContent>
                        </Tooltip>
                    )}
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono min-w-[20px] justify-center bg-muted text-muted-foreground border border-border/50">
                        {jobs.length}
                    </Badge>
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
                                // Pass printing status only if this is the active job (index 0) and printer is running
                                printStatus={index === 0 && printerState?.printState === 'RUNNING' ? {
                                    state: 'RUNNING',
                                    progress: printerState.progress,
                                    remainingTime: printerState.remainingTime
                                } : undefined}
                            />
                        ))}
                        {provided.placeholder}

                        {jobs.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-muted-foreground/30 text-xs">
                                {isMachine ? <Printer className="w-8 h-8 mb-2 opacity-20" /> : <Package className="w-8 h-8 mb-2 opacity-20" />}
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
