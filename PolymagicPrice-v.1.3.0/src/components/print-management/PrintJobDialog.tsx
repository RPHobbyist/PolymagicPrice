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

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Timer, Weight } from "lucide-react";
import { toast } from "sonner";
import { PrinterConnection, PrintOptions } from "@/types/printer";
import { QuoteData, Machine } from "@/types/quote";

// Define a minimal Job interface if not available elsewhere
export interface PrintJobData {
    id: string;
    customerName?: string;
    quote: QuoteData;
    file?: File | string;
    status?: string;
}

interface PrintJobDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    job: PrintJobData | null;
    machines: { id: string; name: string; }[];
    connections: Record<string, PrinterConnection>;
    onSend: (machineId: string, fileOrPath: File | string, options: PrintOptions) => Promise<void>;
}

export function PrintJobDialog({
    open,
    onOpenChange,
    job,
    machines,
    connections,
    onSend,
}: PrintJobDialogProps) {
    const [selectedMachineId, setSelectedMachineId] = useState<string>("");
    const [isSending, setIsSending] = useState(false);

    // Print Options State
    const [options] = useState<PrintOptions>({
        timelapse: true,
        bedLeveling: true,
        flowCalibration: true,
        useAms: true,
    });

    // Filter only connected machines
    const connectedMachines = machines.filter(
        (m) =>
            connections[m.id]?.status === "connected"
        // connections uses machine.id as key in parent (PrintManagement.tsx)
    );

    const handleSend = async () => {
        if (!selectedMachineId) {
            toast.error("Please select a printer");
            return;
        }

        if (!job) return;

        setIsSending(true);
        try {
            const fileToPrint = job.file || job.quote?.filePath;

            if (!fileToPrint) {
                toast.error("No file found for this job");
                return;
            }

            await onSend(selectedMachineId, fileToPrint, options);
            onOpenChange(false);
        } catch (error) {
            const e = error as Error;
            console.error(e);
            toast.error("Failed to send print job");
        } finally {
            setIsSending(false);
        }
    };

    if (!job) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-green-500 rounded-sm" /> {/* Icon placeholder */}
                        Send to Printer storage
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                    {/* Thumbnail / Image Area */}
                    <div className="flex justify-center">
                        {/* Thumbnail if available, or placeholder */}
                        <div className="w-48 h-48 bg-muted flex items-center justify-center rounded-lg text-muted-foreground">
                            No Preview
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-center gap-12 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4" />
                            <span>{job.quote?.parameters?.printTime || "0h 0m"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Weight className="w-4 h-4" />
                            <span>{job.quote?.parameters?.filamentWeight || "0"} g</span>
                        </div>
                    </div>

                    <div className="text-center font-medium">
                        {job.customerName || job.id} { /* Or Job Name */}
                    </div>

                    {/* Printer Selection */}
                    <div className="flex items-center gap-2">
                        <span className="font-medium whitespace-nowrap w-16">Printer</span>
                        <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select Printer" />
                            </SelectTrigger>
                            <SelectContent>
                                {connectedMachines.length === 0 ? (
                                    <SelectItem value="none" disabled>No printers connected</SelectItem>
                                ) : (
                                    connectedMachines.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" className="shrink-0" onClick={() => { /* Refresh logic? */ }}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between">
                    <div /> {/* Spacer */}
                    <Button
                        onClick={handleSend}
                        disabled={!selectedMachineId || isSending}
                        className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]"
                    >
                        {isSending ? "Sending..." : "Send"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
