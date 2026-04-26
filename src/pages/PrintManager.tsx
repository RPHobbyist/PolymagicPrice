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
import { useProduction } from "@/hooks/useProduction";
import { useCalculatorData } from "@/hooks/useCalculatorData";
import { toast } from "sonner";
import { KanbanColumn } from "@/components/print-management/KanbanColumn";
import { PrintJobDialog, PrintJobData } from "@/components/print-management/PrintJobDialog";
import { PrinterConnection, PrintOptions } from "@/types/printer";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Machine } from "@/types/quote";
import * as sessionStore from "@/lib/core/sessionStorage";

const isMachineVisible = (_machine: Machine) => {
    // [ClosedLoop] Relaxed visibility: Show all machines by default.
    // We only hide them if they are explicitly disabled in settings (handled via settings.enabledMachineIds later)
    return true;
};

const PrintManager = () => {
    useDocumentSEO({
        title: "Print Manager — 3D Machine Control & Job Tracking",
        description: "Manage your 3D printing production with a visual Kanban board. Assign print jobs to FDM and Resin machines, track real-time progress with Bambu Lab integration, and monitor your machines in one dashboard. Free and open-source.",
        canonical: "/print-manager",
        ogTitle: "3D Print Job Manager & Machine Dashboard | PolymagicPrice",
        ogDescription: "Visual Kanban board for 3D machine management. Assign jobs, track progress, and integrate with Bambu Lab printers."
    });

    const { machines: fdmMachines } = useCalculatorData({ printType: 'FDM' });
    const { machines: resinMachines } = useCalculatorData({ printType: 'Resin' });

    const machines = useMemo(() => {
        return [...fdmMachines, ...resinMachines].filter(isMachineVisible);
    }, [fdmMachines, resinMachines]);

    const { jobs, moveJob, getJobsByMachine, settings, updateSettings } = useProduction();

    // Sync enabled IDs when machines load if empty (bootstrap)
    useEffect(() => {
        if (settings.enabledMachineIds.length === 0 && machines.length > 0) {
            updateSettings({ enabledMachineIds: machines.map(m => m.id) });
        }
    }, [machines, settings.enabledMachineIds.length, updateSettings]);



    // Printer Connection State
    const [connections, setConnections] = useState<Record<string, PrinterConnection>>({});

    // Typed state for print job
    const [printJob, setPrintJob] = useState<{ job: PrintJobData; machineId: string } | null>(null);

    useEffect(() => {
        if (!window.electronAPI?.printer) return;

        const cleanupStatus = window.electronAPI.printer.onStatus((data: { ip: string; status: string }) => {
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
            state: string; 
            progress: number;
            remainingTime: number;
            nozzleTemp?: number;
            bedTemp?: number;
        }) => {
            setConnections(prev => {
                const machineId = Object.keys(prev).find(key => prev[key].ip === data.ip);
                if (machineId) {
                    const prevState = prev[machineId].printState;
                    
                    // Norming finish states across drivers to trigger closed-loop completion
                    const finishStates = ['FINISH', 'Operational', 'complete', 'READY', 'IDLE', 'FINISHED', 'completed', 'idle', 'standby'];
                    const isFinished = finishStates.includes(data.state);

                    if (prevState === 'RUNNING' && isFinished) {
                        const machineJobs = getJobsByMachine(machineId);
                        const activeJob = machineJobs.find(j => j.status === 'printing') || machineJobs[0];
                        
                        if (activeJob) {
                            console.log(`[ClosedLoop] Auto-completing job ${activeJob.id} on machine ${machineId}`);
                            moveJob(activeJob.id, 'completed', machineId);
                            
                            toast.success(`Print Finished & Job Logged!`, {
                                description: `${activeJob.quote.projectName} on ${machines.find(m => m.id === machineId)?.name || 'Printer'}`,
                                duration: 10000,
                            });
                        } else {
                            toast.success(`Print Finished on ${machines.find(m => m.id === machineId)?.name || 'Printer'}!`);
                        }
                    }

                    return {
                        ...prev,
                        [machineId]: {
                            ...prev[machineId],
                            printState: data.state,
                            progress: data.progress,
                            remainingTime: data.remainingTime,
                            nozzleTemp: data.nozzleTemp,
                            bedTemp: data.bedTemp
                        }
                    };
                }
                return prev;
            });
        });

        const cleanupCert = window.electronAPI.printer.onCertReceived((data: { serial: string; fingerprint: string }) => {
            const machine = machines.find(m => m.serialNumber === data.serial);
            if (machine && !machine.certFingerprint) {
                console.log(`[Security] Storing new fingerprint for ${machine.name}: ${data.fingerprint}`);
                sessionStore.saveMachine({
                    ...machine,
                    certFingerprint: data.fingerprint
                });
                toast.success(`Security Verified`, {
                    description: `Trusted connection established with ${machine.name}.`
                });
            }
        });

        return () => {
            cleanupStatus();
            cleanupCert();
            if (cleanupUpdate) cleanupUpdate();
        };
    }, [machines, getJobsByMachine, moveJob]);

    // Auto-Connect Sweep: Triggered when machines are loaded
    useEffect(() => {
        if (!window.electronAPI?.printer || machines.length === 0) return;

        machines.forEach(machine => {
            const hasRequiredFields = 
                (machine.driverType === 'BAMBU' && machine.ipAddress && machine.accessCode && machine.serialNumber) ||
                (machine.driverType !== 'BAMBU' && machine.driverType !== 'OFFLINE' && machine.ipAddress);

            if (hasRequiredFields) {
                // If not already connected in state, attempt connection
                if (!connections[machine.id]) {
                    window.electronAPI.printer.connect({
                        ip: machine.ipAddress,
                        accessCode: machine.accessCode,
                        serial: machine.serialNumber,
                        apiKey: machine.apiKey,
                        driverType: machine.driverType,
                        expectedFingerprint: machine.certFingerprint
                    }).then(() => {
                        setConnections(prev => ({
                            ...prev,
                            [machine.id]: { 
                                status: 'connected', 
                                ip: machine.ipAddress!, 
                                serial: machine.serialNumber! 
                            }
                        }));
                    }).catch((err: Error) => {
                        console.error(`[Printer] Connection failed for ${machine.name}:`, err.message);
                        if (err.message.includes("SECURITY ALERT")) {
                            toast.error("Security Authentication Failed", {
                                description: err.message,
                                duration: 15000
                            });
                        }
                    });
                }
            }
        });
        
        window.electronAPI.printer.getConnectedPrinters();
    }, [machines, connections]);

    const handleSendFileInit = (machineId: string, job: PrintJobData) => {
        setPrintJob({ job, machineId });
    };

    const handleSendFileConfirm = async (machineId: string, jobId: string, fileOrPath: File | string, options: PrintOptions) => {
        const conn = connections[machineId];
        if (!conn || conn.status !== 'connected' || !conn.ip) {
            toast.error("Printer not connected");
            return;
        }

        try {
            let filePath: string;
            let fileName: string;
            if (typeof fileOrPath === 'string') {
                filePath = fileOrPath;
                fileName = fileOrPath.split(/[\\/]/).pop() || 'unknown';
            } else {
                filePath = (fileOrPath as File & { path?: string }).path || '';
                fileName = fileOrPath.name;
                if (!filePath) {
                    toast.error("Cannot determine file path.");
                    return;
                }
            }
            toast.info(`Sending ${fileName}...`);
            await window.electronAPI.printer.sendFile({ ip: conn.ip, filePath });
            
            toast.info(`Starting print...`);
            await window.electronAPI.printer.startPrint({ ip: conn.ip, fileName, options });
            
            // CLOSED LOOP: Mark job as printing status
            console.log(`[ClosedLoop] Starting tracking for job ${jobId}`);
            moveJob(jobId, 'printing', machineId, 0); // Move to top of machine column as printing
            
            toast.success("Print started successfully!");
        } catch (error) {
            console.error("Print Start Error:", error);
            toast.error("Failed to send file");
        }
    };

    const unassignedJobs = useMemo(() => {
        // [ClosedLoop] Visibility Fix: Include jobs that are assigned to machines 
        // but whose machine columns are currently disabled in settings.
        const activeUnassigned = jobs.filter(j => 
            (j.machineId === null || !settings.enabledMachineIds.includes(j.machineId)) && 
            j.status === 'queued'
        );

        // Also handle jobs assigned to machines that no longer exist in the system
        const orphanedJobs = jobs.filter(j => 
            j.machineId !== null && 
            !machines.some(m => m.id === j.machineId) && 
            j.status !== 'completed'
        );

        return [...activeUnassigned, ...orphanedJobs].sort((a, b) => a.order - b.order);
    }, [jobs, machines, settings.enabledMachineIds]);

    const machineColumns = useMemo(() => {
        return machines
            .map(machine => ({
                id: `machine-${machine.id}`,
                title: machine.name,
                // Only show active jobs (not completed) on the machine column
                jobs: getJobsByMachine(machine.id).filter(j => j.status !== 'completed'),
                rawId: machine.id
            }))
            .filter(col => settings.enabledMachineIds.includes(col.rawId));
    }, [machines, getJobsByMachine, settings.enabledMachineIds]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const allJobs = [...unassignedJobs, ...machineColumns.flatMap(c => c.jobs)];
        const movedJob = allJobs.find(j => j.id === draggableId);
        if (!movedJob) return;

        let targetMachineId: string | null = null;
        if (destination.droppableId.startsWith('machine-')) {
            targetMachineId = destination.droppableId.replace('machine-', '');
        }

        const targetMachine = machines.find(m => m.id === targetMachineId);
        if (targetMachineId) {
            const jobMachineName = movedJob.quote.parameters.machine || movedJob.quote.parameters.machineName;
            if (jobMachineName && targetMachine && targetMachine.name !== jobMachineName) {
                toast.error(`Cannot move job for "${jobMachineName}" to "${targetMachine.name}"`);
                return;
            }
        }

        if (movedJob) {
            moveJob(draggableId, movedJob.status, targetMachineId, destination.index);
        }
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col font-sans text-slate-900 animate-fade-in overflow-hidden">
            <PageHeader 
                title="Print Manager" 
                subtitle="Manage your Print Queue"
                actions={null}
            />

            <div className="container mx-auto max-w-[1600px] flex-1 flex flex-col space-y-6 pt-6 px-6">

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
                                    connectionStatus={connections[col.rawId]?.status || 'disconnected'}
                                    onSendFile={(file, job) => handleSendFileInit(col.rawId, job)}
                                    printerState={connections[col.rawId]}
                                />
                            ))}
                        </div>
                    </div>
                </DragDropContext>
            </div>


            <PrintJobDialog
                open={!!printJob}
                onOpenChange={(open) => !open && setPrintJob(null)}
                job={printJob?.job || null}
                machines={machines}
                connections={connections}
                onSend={handleSendFileConfirm}
            />
        </div>
    );
};

export default PrintManager;
