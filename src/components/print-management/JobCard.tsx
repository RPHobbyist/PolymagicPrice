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

import { memo, useRef, useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ProductionJob } from "@/types/production";
import { useProduction } from "@/hooks/useProduction";
import { useCurrency } from "@/hooks/useCurrency";
import {
    Clock,
    MoreVertical,
    Send,
    Printer,
    CheckCircle2,
    XCircle
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { calculateTotalTime, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/utils";
import { toast } from "sonner";
import { getConstants } from "@/lib/core/sessionStorage";
import { AlertTriangle } from "lucide-react";

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
    const { removeJob, moveJob, failJob } = useProduction();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isFailDialogOpen, setIsFailDialogOpen] = useState(false);
    const [failUnits, setFailUnits] = useState<number>(job.quote.quantity);
    const [failScrapGrams, setFailScrapGrams] = useState<number>(0);

    // [ClosedLoop] Pricing Drift Detection
    const constants = getConstants();
    const currentLabor = constants.find(c => c.name.includes("Labor"))?.value || 0;
    const quoteLabor = parseFloat(job.quote.parameters.laborRate as string) || 0;
    const hasDrift = quoteLabor > 0 && Math.abs(currentLabor - quoteLabor) / quoteLabor > 0.15;

    return (
        <>
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
                    {/* [Removed] Status Stripe (requested by user) */}

                    {/* Warning Light Effect (border glow) if Printing */}
                    {printStatus?.state === 'RUNNING' && (
                        <div className="absolute inset-0 rounded-sm border-2 border-amber-500/50 animate-pulse pointer-events-none z-10" />
                    )}

                    <div className="p-2 pl-3">
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <div className="flex flex-col gap-0.5">
                                <h3 className="font-semibold text-xs leading-tight truncate select-none">{job.quote.projectName}</h3>
                                {hasDrift && (
                                    <div className="flex items-center gap-1 text-[9px] text-amber-600 font-bold animate-pulse">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        <span>Pricing Drift Detected</span>
                                    </div>
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 -mt-1 text-slate-600 hover:text-foreground transition-opacity" aria-label="Job options">
                                        <MoreVertical className="w-4 h-4" />
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

                                    {/* Manual Controls */}
                                    <DropdownMenuItem 
                                        onClick={() => moveJob(job.id, 'completed', job.machineId)}
                                        className="text-xs text-green-600 dark:text-green-400"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                        Print Done
                                    </DropdownMenuItem>

                                    <DropdownMenuItem 
                                        onClick={() => setIsFailDialogOpen(true)}
                                        className="text-xs text-amber-600 dark:text-amber-400"
                                    >
                                        <XCircle className="w-3.5 h-3.5 mr-2" />
                                        Report Failure
                                    </DropdownMenuItem>

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
                            <Input
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

                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {job.quote.printType}
                            </span>
                            <span>{job.quote.quantity} units</span>
                            {job.priority !== 'normal' && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full font-bold",
                                    job.priority === 'high' ? "bg-red-100/80 text-red-700" : "bg-primary/10 text-primary"
                                )}>
                                    {job.priority}
                                </span>
                            )}
                            {job.failureReason && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold flex items-center gap-1">
                                    <XCircle className="w-2.5 h-2.5" />
                                    {job.failureReason}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-border/40">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
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
                             <div className="flex justify-end text-[10px] text-slate-600 font-mono">
                                -{printStatus.remainingTime}m remaining
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Draggable>
        
        {/* Failure Dialog */}
        <Dialog open={isFailDialogOpen} onOpenChange={setIsFailDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="w-5 h-5" />
                        Report Print Failure
                    </DialogTitle>
                    <DialogDescription>
                        Specify how many units failed and the amount of scrap material generated. This helps track accurate costs and order completion.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="failed-units" className="text-right">
                            Failed Units
                        </Label>
                        <Input
                            id="failed-units"
                            type="number"
                            min={1}
                            max={job.quote.quantity}
                            value={failUnits}
                            onChange={(e) => setFailUnits(parseInt(e.target.value) || 1)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="scrap-amount" className="text-right">
                            Scrap (g/ml)
                        </Label>
                        <Input
                            id="scrap-amount"
                            type="number"
                            min={0}
                            value={failScrapGrams}
                            onChange={(e) => setFailScrapGrams(parseFloat(e.target.value) || 0)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFailDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => {
                        failJob(job.id, 'OTHER', failScrapGrams, failUnits);
                        setIsFailDialogOpen(false);
                    }}>
                        Report Failure
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
});

JobCard.displayName = "JobCard";
