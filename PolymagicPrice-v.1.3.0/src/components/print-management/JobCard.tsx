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

import { memo, useRef } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductionJob } from "@/types/production";
import { useProduction } from "@/hooks/useProduction";
import { useCurrency } from "@/hooks/useCurrency";
import {
    Clock,
    MoreVertical,
    Send,
    Printer
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { calculateTotalTime, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/utils";
import { toast } from "sonner";

interface JobCardProps {
    job: ProductionJob;
    index: number;
    isConnected?: boolean;
    onSendFile?: (file: File | string, job: ProductionJob) => void;
    printStatus?: {
        state: string;
        progress?: number;
        remainingTime: number; // minutes
    };
}

export const JobCard = memo(({ job, index, isConnected, onSendFile, printStatus }: JobCardProps) => {
    const { formatPrice } = useCurrency();
    const { removeJob } = useProduction();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // handleFileChange is no longer needed as the logic is inlined

    return (
        <Draggable draggableId={job.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`group relative bg-card rounded-sm border border-border hover:border-primary/50 transition-all mb-1.5 shadow-sm overflow-hidden ${snapshot.isDragging ? "shadow-xl rotate-1 z-50 ring-2 ring-primary/20 scale-105" : ""
                        }`}
                    style={provided.draggableProps.style}
                >
                    {/* Status Stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${printStatus?.state === 'RUNNING' ? 'bg-amber-500 animate-pulse' :
                        job.priority === 'high' ? 'bg-red-500' :
                            job.priority === 'low' ? 'bg-blue-400' : 'bg-transparent group-hover:bg-primary/50'
                        }`} />

                    {/* Warning Light Effect (border glow) if Printing */}
                    {printStatus?.state === 'RUNNING' && (
                        <div className="absolute inset-0 rounded-sm border-2 border-amber-500/50 animate-pulse pointer-events-none z-10" />
                    )}

                    <div className="p-2 pl-3">
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="font-semibold text-xs leading-tight truncate select-none">{job.quote.projectName}</h4>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 -mt-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => removeJob(job.id)} className="text-destructive text-xs">
                                        Remove Job
                                    </DropdownMenuItem>

                                    {/* Print Plate Button - Always visible */}
                                    {onSendFile && (
                                        <DropdownMenuItem
                                            onClick={() => {
                                                if (printStatus?.state === 'RUNNING') return;
                                                if (job.quote.filePath) {
                                                    onSendFile(job.quote.filePath, job);
                                                } else {
                                                    fileInputRef.current?.click();
                                                }
                                            }}
                                            disabled={printStatus?.state === 'RUNNING'}
                                            className="text-xs"
                                        >
                                            <Printer className="w-3.5 h-3.5 mr-2" />
                                            Print Plate
                                        </DropdownMenuItem>
                                    )}

                                    {/* Send & Print - Only when connected */}
                                    {isConnected && onSendFile && (
                                        <DropdownMenuItem
                                            onClick={() => {
                                                if (printStatus?.state === 'RUNNING') return;
                                                if (job.quote.filePath) {
                                                    onSendFile(job.quote.filePath, job);
                                                } else {
                                                    fileInputRef.current?.click();
                                                }
                                            }}
                                            disabled={printStatus?.state === 'RUNNING'}
                                            className="text-xs"
                                        >
                                            <Send className="w-3.5 h-3.5 mr-2" />
                                            {printStatus?.state === 'RUNNING' ? 'Printing...' : 'Send & Print'}
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".gcode,.3mf"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        // Check file size limit (100MB)
                                        if (file.size > MAX_FILE_SIZE_BYTES) {
                                            toast.error(`File size too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
                                            e.target.value = '';
                                            return;
                                        }

                                        if (onSendFile) {
                                            onSendFile(file, job);
                                        }
                                    }
                                    // Reset input
                                    e.target.value = '';
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mb-2">
                            <Badge variant="outline" className="text-[10px] py-0 h-4 px-1 rounded-[2px] border-border/60 bg-muted/50 text-muted-foreground">
                                {job.quote.printType}
                            </Badge>
                            <span>{job.quote.quantity} units</span>
                            {job.priority !== 'normal' && (
                                <Badge variant="secondary" className={`text-[10px] py-0 h-4 px-1 rounded-[2px] ${job.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                    {job.priority}
                                </Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-border/40">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3 opacity-70" />
                                <span className="font-mono">{calculateTotalTime(job.quote.parameters.printTime, job.quote.quantity)}</span>
                            </div>
                            <div className="flex items-center justify-end font-mono text-xs font-semibold text-foreground/90">
                                {formatPrice(job.quote.totalPrice)}
                            </div>
                        </div>
                    </div>

                    {/* Print Status / Timer */}
                    {printStatus?.state === 'RUNNING' && (
                        <div className="mt-2 pt-2 border-t border-border/40 space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                    </span>
                                    Printing
                                </span>
                                <span className="font-mono">{printStatus.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-500 ease-out"
                                    style={{ width: `${printStatus.progress}%` }}
                                />
                            </div>
                            <div className="flex justify-end text-[10px] text-muted-foreground font-mono">
                                -{printStatus.remainingTime}m remaining
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    );
});

JobCard.displayName = "JobCard";
