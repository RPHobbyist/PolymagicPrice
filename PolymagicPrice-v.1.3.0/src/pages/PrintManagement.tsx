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

import { useMemo, useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { useProduction } from "@/hooks/useProduction";
import { useCalculatorData } from "@/hooks/useCalculatorData";
import {
    Filter,
    ArrowLeft,
    Calculator
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanColumn } from "@/components/print-management/KanbanColumn";
import { PrinterConnectDialog } from "@/components/print-management/PrinterConnectDialog";
import { PrintJobDialog, PrintJobData } from "@/components/print-management/PrintJobDialog";
import { PrinterConnection, PrintOptions } from "@/types/printer";
import { CapacityPlanner } from "@/components/print-management/CapacityPlanner";

const PrintManagement = () => {
    const navigate = useNavigate();
    const { machines: fdmMachines } = useCalculatorData({ printType: 'FDM' });
    const { machines: resinMachines } = useCalculatorData({ printType: 'Resin' });

    const machines = useMemo(() => {
        return [...fdmMachines, ...resinMachines];
    }, [fdmMachines, resinMachines]);

    // Local Storage for visible machines
    const [visibleMachineIds, setVisibleMachineIds] = useState<string[]>(() => {
        const stored = localStorage.getItem('print_mgmt_visible_machines');
        if (stored) return JSON.parse(stored);
        // Default: Show all if none stored, or maybe none? Let's default to all.
        return [];
    });

    // Update visible IDs when machines load if empty (bootstrap)
    useEffect(() => {
        if (visibleMachineIds.length === 0 && machines.length > 0 && !localStorage.getItem('print_mgmt_visible_machines')) {
            setVisibleMachineIds(machines.map(m => m.id));
        }
    }, [machines, visibleMachineIds.length]);

    const toggleMachineVisibility = (machineId: string) => {
        setVisibleMachineIds(prev => {
            const next = prev.includes(machineId)
                ? prev.filter(id => id !== machineId)
                : [...prev, machineId];
            localStorage.setItem('print_mgmt_visible_machines', JSON.stringify(next));
            return next;
        });
    };

    // Printer Connection State
    const [connections, setConnections] = useState<Record<string, PrinterConnection>>({});
    const [connectDialogMachineId, setConnectDialogMachineId] = useState<string | null>(null);

    // Typed state for print job
    const [printJob, setPrintJob] = useState<{ job: PrintJobData; machineId: string } | null>(null);

    // Capacity Planner state
    const [capacityPlannerOpen, setCapacityPlannerOpen] = useState(false);

    useEffect(() => {
        if (!window.electronAPI?.printer) return;

        const cleanupStatus = window.electronAPI.printer.onStatus((data: { ip: string; status: string }) => {
            // We need to map IP back to machine ID or store it. 
            // Simplification: We update based on the IP stored in connections.
            setConnections(prev => {
                const machineId = Object.keys(prev).find(key => prev[key].ip === data.ip);
                if (machineId) {
                    return { ...prev, [machineId]: { ...prev[machineId], status: data.status } };
                }
                return prev;
            });
        });

        const cleanupUpdate = window.electronAPI.printer.onStatusUpdate((data: {
            ip: string;
            state: string; // RUNNING, IDLE, FINISH
            progress: number;
            remainingTime: number
        }) => {
            setConnections(prev => {
                const machineId = Object.keys(prev).find(key => prev[key].ip === data.ip);
                if (machineId) {
                    const prevState = prev[machineId].printState;

                    // Notification on Finish
                    if (prevState === 'RUNNING' && data.state === 'FINISH') {
                        toast.success(`Print Finished on ${machines.find(m => m.id === machineId)?.name || 'Printer'}!`, {
                            duration: 10000,
                            action: {
                                label: 'Dismiss',
                                onClick: () => { }
                            }
                        });
                        // Could also play sound here
                    }

                    return {
                        ...prev,
                        [machineId]: {
                            ...prev[machineId],
                            printState: data.state,
                            progress: data.progress,
                            remainingTime: data.remainingTime
                        }
                    };
                }
                return prev;
            });
        });

        return () => {
            cleanupStatus();
            if (cleanupUpdate) cleanupUpdate();
        };
    }, [machines]);

    // Initial Connection State Sync
    useEffect(() => {
        if (!window.electronAPI?.printer) return;

        window.electronAPI.printer.getConnectedPrinters().then(printers => {
            setConnections(prev => {
                const next = { ...prev };
                // Logic to restore connections would go here
                return next;
            });
        });
    }, []);

    const handleConnect = async (details: { ip?: string; accessCode: string; serial: string; cloudMode?: boolean }) => {
        if (!connectDialogMachineId) return;
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.printer.connect(details);

                // Use appropriate connection key: cloud mode uses serial, LAN uses IP
                const connectionKey = details.cloudMode ? `cloud:${details.serial}` : details.ip!;
                setConnections(prev => ({
                    ...prev,
                    [connectDialogMachineId]: { status: 'connected', ip: connectionKey, serial: details.serial }
                }));

                // Persistence: Save mapping
                const storedMappings = JSON.parse(localStorage.getItem('printer_mappings') || '{}');
                storedMappings[connectDialogMachineId] = connectionKey;
                localStorage.setItem('printer_mappings', JSON.stringify(storedMappings));

                toast.success(details.cloudMode ? "Connected via Cloud" : "Connected via LAN");
            } else {
                toast.error("Printer connection only available in Desktop App");
            }
        } catch (error) {
            const err = error as Error;
            toast.error(`Failed to connect: ${err.message || 'Unknown error'}`);
        }
        setConnectDialogMachineId(null);
    };

    const handleSendFileInit = (machineId: string, job: PrintJobData) => {
        setPrintJob({ job, machineId });
    };

    const handleSendFileConfirm = async (machineId: string, fileOrPath: File | string, options: PrintOptions) => {
        const conn = connections[machineId];
        // conn.status checked against string, ensuring type safety
        if (!conn || conn.status !== 'connected' || !conn.ip) {
            toast.error("Printer not connected");
            return;
        }

        try {
            let filePath: string;
            let fileName: string;

            if (typeof fileOrPath === 'string') {
                // It's a file path string
                filePath = fileOrPath;
                fileName = fileOrPath.split(/[\\/]/).pop() || 'unknown';
            } else {
                // It's a File object - get path from Electron
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filePath = (fileOrPath as any).path;
                fileName = fileOrPath.name;
                if (!filePath) {
                    toast.error("Cannot determine file path. Are you using the web version?");
                    return;
                }
            }

            toast.info(`Sending ${fileName}...`);
            await window.electronAPI.printer.sendFile({ ip: conn.ip, filePath });

            toast.info(`Starting print...`);
            await window.electronAPI.printer.startPrint({ ip: conn.ip, fileName, options });

            toast.success("Print started successfully!");
        } catch (error) {
            toast.error("Failed to send file");
        }
    };


    const { jobs, moveJob, getUnassignedJobs, getJobsByMachine } = useProduction();

    // Create combined list of all columns
    // 1. Unassigned (Global Queue)
    // 2. Each Machine

    const unassignedJobs = getUnassignedJobs();

    // Group jobs by machine and filter for visibility
    const machineColumns = useMemo(() => {
        return machines
            .map(machine => ({
                id: `machine-${machine.id}`,
                title: machine.name,
                jobs: getJobsByMachine(machine.id),
                rawId: machine.id
            }))
            // Filter: Only show User Selected machines
            .filter(col => visibleMachineIds.includes(col.rawId));
    }, [machines, getJobsByMachine, visibleMachineIds]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        // --- STRICT ASSIGNMENT LOGIC ---
        // 1. Identify the job (we need to find it by ID from our lists)
        const allJobs = [...unassignedJobs, ...machineColumns.flatMap(c => c.jobs)];
        const movedJob = allJobs.find(j => j.id === draggableId);

        if (!movedJob) return;

        // 2. Identify Target ID
        let targetMachineId: string | null = null;
        if (destination.droppableId.startsWith('machine-')) {
            targetMachineId = destination.droppableId.replace('machine-', '');
        }

        // 3. Validation: Can only move to OWN machine or Unassigned
        // If moving TO a machine, it must match the job's assigned machine (if it has one) 
        // OR checks compatibility if we had type data (but strict ID match is safer)

        // Actually, since we auto-assign ID on creation now, the job might already have a machineId.
        // If it was "Unassigned" (machineId=null), can we drag it anywhere?
        // User requirement: "it must be allow only to drag in que in bambu A1 Printer card"
        // This implies even if unassigned, it should likely match the 'quote parameter'.

        // Let's check matching logic:
        // Find the machine corresponding to the target ID
        const targetMachine = machines.find(m => m.id === targetMachineId);

        // Check if job matches target machine name (from quote parameters)
        // Note: quote.parameters.machine is the name
        if (targetMachineId) {
            const jobMachineName = movedJob.quote.parameters.machine || movedJob.quote.parameters.machineName;

            // If job has a specific machine name, and we are dragging to a machine...
            if (jobMachineName && targetMachine && targetMachine.name !== jobMachineName) {
                toast.error(`Cannot move job for "${jobMachineName}" to "${targetMachine.name}"`);
                return;
            }
        }

        // 4. Perform Move
        if (movedJob) {
            moveJob(draggableId, movedJob.status, targetMachineId, destination.index);
        }
    };

    return (
        <div className="w-full h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
            {/* Header / Toolbar */}
            <div className="mb-4 flex justify-between items-center px-1">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="text-xl font-bold tracking-tight">Production Manager</h2>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">
                        {jobs.length} Active Jobs
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-2 bg-card hover:bg-accent/50">
                                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs">Filter Machines</span>
                                {visibleMachineIds.length < machines.length && (
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                        {visibleMachineIds.length}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuLabel>Visible Machines</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {machines.map(machine => (
                                <DropdownMenuCheckboxItem
                                    key={machine.id}
                                    checked={visibleMachineIds.includes(machine.id)}
                                    onCheckedChange={() => toggleMachineVisibility(machine.id)}
                                >
                                    <span className="truncate">{machine.name}</span>
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2 bg-card hover:bg-accent/50"
                        onClick={() => setCapacityPlannerOpen(true)}
                    >
                        <Calculator className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs">Capacity</span>
                    </Button>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin">
                    <div className="flex h-full gap-3 min-w-max px-1">
                        {/* 1. Unassigned / Queue */}
                        <KanbanColumn
                            id="unassigned"
                            title="Queue"
                            jobs={unassignedJobs}
                        />

                        {/* 2. Machine Columns */}
                        {machineColumns.map(col => (
                            <KanbanColumn
                                key={col.id}
                                id={col.id}
                                title={col.title}
                                jobs={col.jobs}
                                isMachine={true}
                                onConnect={() => setConnectDialogMachineId(col.rawId)}
                                connectionStatus={connections[col.rawId]?.status || 'disconnected'}
                                // Cast to any or specialized Job type if needed by KanbanColumn, but here we pass localized wrapper
                                // Or update KanbanColumn signature to accept PrintJobData-like structure?
                                // Actually, KanbanColumn expects onSendFile(file, job: ProductionJob)
                                // We are passing a compatible function.
                                onSendFile={(file, job) => handleSendFileInit(col.rawId, job)}
                                printerState={connections[col.rawId]}
                            />
                        ))}
                    </div>
                </div>
            </DragDropContext>

            <PrinterConnectDialog
                open={!!connectDialogMachineId}
                onOpenChange={(open) => !open && setConnectDialogMachineId(null)}
                machineName={machines.find(m => m.id === connectDialogMachineId)?.name || 'Printer'}
                onConnect={handleConnect}
            />

            <PrintJobDialog
                open={!!printJob}
                onOpenChange={(open) => !open && setPrintJob(null)}
                job={printJob?.job || null}
                machines={machines}
                connections={connections}
                onSend={handleSendFileConfirm}
            />

            <CapacityPlanner
                open={capacityPlannerOpen}
                onOpenChange={setCapacityPlannerOpen}
            />
        </div>
    );
};

export default PrintManagement;
