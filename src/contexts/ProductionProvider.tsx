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

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { QuoteData } from '@/types/quote';
import { toast } from 'sonner';
import { ProductionJob, JobStatus, ProductionSettings, JobPriority } from '@/types/production';
import { ProductionContext, ProductionContextType } from '@/contexts/ProductionContext';
import { useNotifications } from '@/hooks/useNotifications';
import * as sessionStore from '@/lib/core/sessionStorage';


// Robust helper to parse print time from various formats
const parseTimeToHours = (timeStr: string | number | undefined | null): number => {
    if (typeof timeStr === 'number') return timeStr;
    const str = String(timeStr || '0').trim();
    if (str.includes(':')) {
        const [h, m] = str.split(':').map(Number);
        return (h || 0) + ((m || 0) / 60);
    }
    const val = parseFloat(str);
    return isNaN(val) ? 0 : val;
};

// Helper to calculate total material weight/volume for a job
const calculateJobMaterial = (job: ProductionJob): number => {
    const q = job.quote.quantity || 1;
    const weight = parseFloat(job.quote.parameters.filamentWeight as string || job.quote.parameters.resinVolume as string || "0") || 0;
    return weight * q;
};

export const ProductionProvider = ({ children }: { children: ReactNode }) => {
    const { addNotification } = useNotifications();
    const [jobs, setJobs] = useState<ProductionJob[]>(() => {
        return sessionStore.getProductionJobs();
    });

    // Persist jobs to sessionStorage
    useEffect(() => {
        sessionStore.saveProductionJobs(jobs);
    }, [jobs]);

    const [settings, setSettings] = useState<ProductionSettings>(() => {
        return sessionStore.getProductionSettings();
    });

    // Persist settings
    useEffect(() => {
        sessionStore.saveProductionSettings(settings);
    }, [settings]);

    // Cross-tab Synchronization
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            // Updated to use standardized keys via helper constants if they were exported, 
            // but we can check the known standardized values.
            if (e.key === 'session_production_jobs') {
                try {
                    const nextJobs = sessionStore.getProductionJobs();
                    setJobs(nextJobs);
                } catch (err) {
                    console.error("Failed to sync production jobs", err);
                }
            }
            if (e.key === 'session_production_settings') {
                try {
                    const nextSettings = e.newValue ? JSON.parse(e.newValue) : settings;
                    setSettings(nextSettings);
                } catch (err) {
                    console.error("Failed to sync production settings", err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [settings]);

    const updateSettings = useCallback((updates: Partial<ProductionSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    }, []);

    const addJob = useCallback((quote: QuoteData, machineId: string | null = null) => {
        // [Batch Logic] Unpack into individual queue entries if this is a master batch
        if (quote.isBatch && quote.batchItems && quote.batchItems.length > 0) {
            const batchId = quote.id || `batch-${Date.now()}`;
            const batchName = quote.projectName;
            
            setJobs(prev => {
                const newJobs: ProductionJob[] = quote.batchItems!.map((item, idx) => ({
                    id: `job-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                    quote: { 
                        ...item, 
                        id: item.id || `${batchId}-sub-${idx}`,
                        projectName: `${item.projectName} (${batchName})` 
                    },
                    status: 'queued',
                    machineId: machineId || item.assignedMachineId || (item.parameters?.machineId as string) || null,
                    priority: ((item.priority || quote.priority || 'normal').toLowerCase() as JobPriority),
                    createdAt: new Date().toISOString(),
                    order: prev.length + idx,
                    batchId,
                    batchName,
                }));
                
                return [...prev, ...newJobs];
            });

            addNotification({
                type: 'INFO',
                title: 'Batch Distributed',
                message: `${quote.batchItems.length} jobs from batch "${batchName}" added to queue.`,
                metadata: { quoteId: quote.id }
            });
            toast.success(`${quote.batchItems.length} batch items added to production`);
            return;
        }

        // Standard single quote logic
        const newJob: ProductionJob = {
            id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            quote,
            status: 'queued',
            machineId: machineId || quote.assignedMachineId || (quote.parameters?.machineId as string) || null,
            priority: (quote.priority?.toLowerCase() as JobPriority) || 'normal',
            createdAt: new Date().toISOString(),
            order: jobs.length, // Append to end
        };
        setJobs(prev => [...prev, newJob]);
        addNotification({
            type: 'INFO',
            title: 'New Job Added',
            message: `Order for ${quote.projectName} (${quote.quantity} units) added to production.`,
            metadata: { quoteId: quote.id, jobId: newJob.id }
        });
        toast.success('Job added to production queue');
    }, [jobs.length, addNotification]);

    const updateJob = useCallback((jobId: string, updates: Partial<ProductionJob>) => {
        setJobs(prev => prev.map(job =>
            job.id === jobId ? { ...job, ...updates } : job
        ));
    }, []);

    const moveJob = useCallback((jobId: string, newStatus: JobStatus, newMachineId: string | null, newIndex?: number, actualPrintTime?: number) => {
        setJobs(prev => {
            const jobToMove = prev.find(j => j.id === jobId);
            if (!jobToMove) return prev;

            // 1. Calculate the updated job properties
            const updatedJob: ProductionJob = {
                ...jobToMove,
                status: newStatus,
                machineId: newMachineId,
                actualPrintTime: actualPrintTime || jobToMove.actualPrintTime
            };

            // [ClosedLoop] Step 0: REVERSION - Restore inventory if moving out of printing without completion
            if (jobToMove.status === 'printing' && newStatus === 'queued') {
                if (jobToMove.spoolId && jobToMove.inventoryDeducted) {
                    console.log(`[ClosedLoop] Restoring ${jobToMove.inventoryDeducted} to spool ${jobToMove.spoolId} (Job Reverted)`);
                    sessionStore.restoreToSpool(jobToMove.spoolId, jobToMove.inventoryDeducted);
                    updatedJob.inventoryDeducted = undefined;
                    updatedJob.spoolId = undefined;
                }
            }

            // [ClosedLoop] Step 1: START PRINT - Start-Gate Maintenance & Inventory Deduction
            if (newStatus === 'printing' && jobToMove.status !== 'printing') {
                // CLOSED LOOP: Maintenance Check (Physical Gate)
                const machines = sessionStore.getMachines();
                const machine = machines.find(m => m.id === newMachineId);
                if (machine && sessionStore.isMachineMaintenanceDue(machine)) {
                    addNotification({
                        type: 'ERROR',
                        title: 'Maintenance Block',
                        message: `Cannot start job on ${machine.name}. Maintenance is overdue!`,
                        metadata: { machineId: machine.id, type: 'MAINTENANCE' }
                    });
                    toast.error(`Maintenance required on ${machine.name} before printing.`);
                    return prev; // Block transition
                }

                // [ClosedLoop] Reprint Deduction Logic: 
                // If it's a first attempt (!inventoryDeducted) OR a reprint (has failureReason)
                if (!jobToMove.inventoryDeducted || jobToMove.failureReason) {
                    let deductionAmount = 0;
                    if (!jobToMove.inventoryDeducted) {
                        // First attempt - deduct for full requested quantity
                        deductionAmount = calculateJobMaterial(jobToMove);
                    } else if (jobToMove.failureReason) {
                        // Reprint - only deduct for failed units (fallback to full if failedUnits is not specified)
                        const failedUnits = jobToMove.quote.failedUnits && jobToMove.quote.failedUnits > 0 ? jobToMove.quote.failedUnits : (jobToMove.quote.quantity || 1);
                        const weight = parseFloat(jobToMove.quote.parameters.filamentWeight as string || jobToMove.quote.parameters.resinVolume as string || "0") || 0;
                        deductionAmount = weight * failedUnits;
                    }
                    
                    if (deductionAmount > 0) {
                        const targetSpool = sessionStore.findBestSpoolMatch(
                            jobToMove.quote.parameters.materialName as string,
                            jobToMove.quote.printColour
                        );
                        
                        if (targetSpool) {
                            const success = sessionStore.deductFromSpool(targetSpool.id, deductionAmount);
                            if (success) {
                                // Add to total material used for this job
                                updatedJob.spoolId = targetSpool.id;
                                updatedJob.inventoryDeducted = (jobToMove.inventoryDeducted || 0) + deductionAmount;
                                updatedJob.failureReason = null; // Clear failure reason now that we are re-attempting
                                console.log(`[ClosedLoop] Deducted ${deductionAmount} for reprint/start from spool ${targetSpool.id}. Total now: ${updatedJob.inventoryDeducted}`);
                            }
                        }
                    }
                }
                updatedJob.startedAt = new Date().toISOString();
            }

            // [ClosedLoop] Step 2: COMPLETE JOB - Metadata, Actuals & Final Stock
            const isDestinationFinished = newStatus === 'completed' || newStatus === 'post_processing';
            const wasAlreadyFinished = jobToMove.status === 'completed' || jobToMove.status === 'post_processing';

            if (isDestinationFinished && !wasAlreadyFinished) {
                const machines = sessionStore.getMachines();
                // CLOSED LOOP: Find the machine for runtime tracking (with fallback for "orphan" jobs from Order Manager)
                const machineIdToUse = updatedJob.machineId || updatedJob.quote.assignedMachineId || (updatedJob.quote.parameters?.machineId as string);
                const machine = machines.find(m => m.id === machineIdToUse);
                
                // FALLBACK: Deduct inventory if job moved directly to completed/post-processing
                if (!updatedJob.inventoryDeducted) {
                    const deductionAmount = calculateJobMaterial(jobToMove);
                    if (deductionAmount > 0) {
                        const targetSpool = sessionStore.findBestSpoolMatch(
                            jobToMove.quote.parameters.materialName as string,
                            jobToMove.quote.printColour
                        );
                        if (targetSpool) {
                            sessionStore.deductFromSpool(targetSpool.id, deductionAmount);
                            updatedJob.inventoryDeducted = deductionAmount;
                            updatedJob.spoolId = targetSpool.id;
                        }
                    }
                }

                if (machine) {
                    let runtimeHours = actualPrintTime || jobToMove.actualPrintTime;
                    
                    if (!runtimeHours && jobToMove.startedAt) {
                        const start = new Date(jobToMove.startedAt).getTime();
                        const end = new Date().getTime();
                        runtimeHours = (end - start) / (1000 * 60 * 60);
                    }

                    // [ClosedLoop] Quantity Multiplier Fix: 
                    // If we fall back to estimated time, it MUST be multiplied by the quantity.
                    if (!runtimeHours) {
                        const baseHours = parseTimeToHours(updatedJob.quote.parameters.printTime);
                        const quantity = updatedJob.quote.quantity || 1;
                        runtimeHours = baseHours * quantity;
                        console.log(`[Production] Using fallback runtime: ${baseHours}h x ${quantity} units = ${runtimeHours}h`);
                    }

                    // Sanitize runtimeHours to prevent NaN in storage
                    if (isNaN(runtimeHours) || runtimeHours < 0) {
                        console.error("[Production] Invalid runtime calculated:", runtimeHours);
                        runtimeHours = 0;
                    }
                    
                    updatedJob.actualPrintTime = runtimeHours;
                    updatedJob.completedAt = new Date().toISOString();

                    const powerKw = (machine.power_consumption_watts || 0) / 1000;
                    const electricityRate = updatedJob.quote.parameters.electricityRate as number || 0;
                    const currentJobPowerCost = (runtimeHours || 0) * powerKw * electricityRate;

                    console.log(`[Maintenance] Updating ${machine.name}: +${runtimeHours.toFixed(2)}h`);

                    sessionStore.saveMachine({
                        ...machine,
                        totalRuntimeHours: (machine.totalRuntimeHours || 0) + runtimeHours,
                        totalPowerCost: (machine.totalPowerCost || 0) + currentJobPowerCost
                    });
                }

                // [Financial ClosedLoop] Scrap Material Reconciliation
                const failedUnits = Number(updatedJob.quote.failedUnits || 0);
                let finalMaterialCost = updatedJob.quote.materialCost || 0;

                if (failedUnits > 0 && updatedJob.spoolId) {
                    const weightPerUnit = parseFloat(updatedJob.quote.parameters.filamentWeight as string || updatedJob.quote.parameters.resinVolume as string || "0") || 0;
                    const extraDeduction = weightPerUnit * failedUnits;
                    
                    if (extraDeduction > 0) {
                        sessionStore.deductFromSpool(updatedJob.spoolId, extraDeduction);
                        updatedJob.inventoryDeducted = (updatedJob.inventoryDeducted || 0) + extraDeduction;
                        
                        const originalWeight = parseFloat(updatedJob.quote.parameters.filamentWeight as string || updatedJob.quote.parameters.resinVolume as string || "1");
                        const initialMaterialCost = updatedJob.quote.materialCost || 0;
                        const costPerGram = initialMaterialCost / (originalWeight * (updatedJob.quote.quantity || 1));
                        
                        if (costPerGram > 0) {
                            const scrapCost = extraDeduction * costPerGram;
                            finalMaterialCost += scrapCost;
                            updatedJob.quote.materialCost = finalMaterialCost;
                            console.log(`[Financial ClosedLoop] Reconciled Material Cost: ${finalMaterialCost.toFixed(2)} (Scrap: ${scrapCost.toFixed(2)})`);
                        }
                    }
                }

                // ATOMIC UPDATE: Sync all actuals to storage
                const electricityRate = updatedJob.quote.parameters.electricityRate as number || 0;
                const powerKw = (machine?.power_consumption_watts || 0) / 1000;
                const jobPowerCost = (updatedJob.actualPrintTime || 0) * powerKw * electricityRate;
                
                const originalWeight = parseFloat(updatedJob.quote.parameters.filamentWeight as string || updatedJob.quote.parameters.resinVolume as string || "0");
                const extraDeduction = (updatedJob.inventoryDeducted || 0) - (originalWeight * (updatedJob.quote.quantity || 1));
                const actualMaterialUsed = (originalWeight * (updatedJob.quote.quantity || 1)) + Math.max(0, extraDeduction);

                sessionStore.updateQuote(updatedJob.quote.id, {
                    actualPrintTime: updatedJob.actualPrintTime,
                    totalPowerCost: jobPowerCost,
                    materialCost: finalMaterialCost,
                    actualMaterialUsed: actualMaterialUsed,
                    status: newStatus === 'completed' ? 'DONE' : 'POST_PROCESSING'
                });
                toast.success('Production completed manual success!');
            }

            // [ClosedLoop] Pricing Drift Warning
            if (newStatus === 'printing' && jobToMove.status !== 'printing') {
                const constants = sessionStore.getConstants();
                const currentLabor = constants.find(c => c.name.includes("Labor"))?.value || 0;
                const quoteLabor = parseFloat(jobToMove.quote.parameters.laborRate as string) || 0;
                
                if (quoteLabor > 0 && Math.abs(currentLabor - quoteLabor) / quoteLabor > 0.15) {
                    addNotification({
                        type: 'WARNING',
                        title: 'Pricing Drift Detected',
                        message: `Shop labor rates have changed by >15% since this quote was created. Margin may be affected.`,
                        metadata: { quoteId: jobToMove.quote.id, type: 'INFO' }
                    });
                }
            }

            // 2. Perform the atomic move and re-index
            const filtered = prev.filter(j => j.id !== jobId);
            
            // Re-sort and fix orders for the SOURCE column
            const sourceColumn = filtered.filter(j => 
                j.status === jobToMove.status && j.machineId === jobToMove.machineId
            ).sort((a, b) => a.order - b.order);
            sourceColumn.forEach((j, idx) => { j.order = idx; });

            // Re-sort the TARGET column
            const targetColumn = filtered.filter(j => 
                j.status === newStatus && j.machineId === newMachineId
            ).sort((a, b) => a.order - b.order);

            // Insert at requested index or append
            if (typeof newIndex === 'number' && newIndex >= 0 && newIndex <= targetColumn.length) {
                targetColumn.splice(newIndex, 0, updatedJob);
            } else {
                targetColumn.push(updatedJob);
            }

            // Fix orders for TARGET column
            targetColumn.forEach((j, idx) => { j.order = idx; });

            // Combine all jobs back together
            const otherJobs = filtered.filter(j => 
                !(j.status === jobToMove.status && j.machineId === jobToMove.machineId) &&
                !(j.status === newStatus && j.machineId === newMachineId)
            );
            
            return [...otherJobs, ...sourceColumn, ...targetColumn];
        });
    }, [addNotification]);

    const removeJob = useCallback((jobId: string) => {
        setJobs(prev => {
            const job = prev.find(j => j.id === jobId);
            if (job && job.spoolId && job.inventoryDeducted) {
                console.log(`[ClosedLoop] Restoring ${job.inventoryDeducted} to spool ${job.spoolId} (Job Removed)`);
                sessionStore.restoreToSpool(job.spoolId, job.inventoryDeducted);
            }
            const filtered = prev.filter(j => j.id !== jobId);
            
            // Re-assign orders in the columns where the job might have been
            if (job) {
                const affectedColumn = filtered.filter(j => j.status === job.status && j.machineId === job.machineId)
                    .sort((a, b) => a.order - b.order);
                affectedColumn.forEach((j, idx) => { j.order = idx; });
                
                const otherJobs = filtered.filter(j => !(j.status === job.status && j.machineId === job.machineId));
                return [...otherJobs, ...affectedColumn];
            }
            return filtered;
        });
        toast.info('Job removed from production');
    }, []);

    const removeJobByQuoteId = useCallback((quoteId: string) => {
        setJobs(prev => {
            // Check for both direct quote ID match AND batch ID match
            const jobsToRemove = prev.filter(j => j.quote.id === quoteId || j.batchId === quoteId);
            
            jobsToRemove.forEach(job => {
                if (job.spoolId && job.inventoryDeducted) {
                    console.log(`[ClosedLoop] Restoring ${job.inventoryDeducted} to spool ${job.spoolId} (Quote Deleted)`);
                    sessionStore.restoreToSpool(job.spoolId, job.inventoryDeducted);
                }
            });

            const remainingJobs = prev.filter(j => j.quote.id !== quoteId && j.batchId !== quoteId);
            
            // Group remaining jobs by column and fix order
            const columns = new Map<string, ProductionJob[]>();
            remainingJobs.forEach(j => {
                const key = `${j.status}-${j.machineId}`;
                if (!columns.has(key)) columns.set(key, []);
                columns.get(key)!.push(j);
            });

            const fixedJobs: ProductionJob[] = [];
            columns.forEach(colJobs => {
                colJobs.sort((a, b) => a.order - b.order).forEach((j, idx) => {
                    j.order = idx;
                });
                fixedJobs.push(...colJobs);
            });
            
            return fixedJobs;
        });
    }, []);

    const clearCompleted = useCallback(() => {
        setJobs(prev => prev.filter(j => j.status !== 'completed'));
        toast.success('Cleared completed jobs');
    }, []);

    const getJobsByMachine = useCallback((machineId: string) => {
        return jobs
            .filter(j => j.machineId === machineId)
            .sort((a, b) => a.order - b.order);
    }, [jobs]);

    const getUnassignedJobs = useCallback(() => {
        return jobs
            .filter(j => j.machineId === null)
            .sort((a, b) => a.order - b.order);
    }, [jobs]);

    const failJob = useCallback((jobId: string, reason: 'SPOOL_EMPTY' | 'MECHANICAL' | 'ADHESION' | 'OTHER', scrapGramsResin: number = 0, failedUnitsCount: number = 0) => {
        setJobs(prev => {
            const jobIndex = prev.findIndex(j => j.id === jobId);
            if (jobIndex === -1) return prev;

            const updatedJobs = [...prev];
            const job = { ...updatedJobs[jobIndex] };

            job.status = 'queued'; // Return to queue or stay? Usually return to queue after failure.
            job.failureReason = reason;
            job.totalScrapMaterial = (job.totalScrapMaterial || 0) + scrapGramsResin;
            
            // Apply extra deduction if spool is known
            if (job.spoolId && scrapGramsResin > 0) {
                sessionStore.deductFromSpool(job.spoolId, scrapGramsResin);
                job.inventoryDeducted = (job.inventoryDeducted || 0) + scrapGramsResin;
            }

            // Sync with global quote status and failed units
            const existingFailedUnits = job.quote.failedUnits || 0;
            const newFailedUnits = existingFailedUnits + failedUnitsCount;
            sessionStore.updateQuote(job.quote.id, { status: 'FAILED', failedUnits: newFailedUnits });
            job.quote.failedUnits = newFailedUnits;
            job.quote.status = 'FAILED';

            updatedJobs[jobIndex] = job;

            toast.error('Failure recorded and synced to order manager');
            return updatedJobs;
        });
    }, []);

    const contextValue: ProductionContextType = {
        jobs,
        settings,
        addJob,
        updateJob,
        moveJob,
        removeJob,
        clearCompleted,
        updateSettings,
        getJobsByMachine,
        getUnassignedJobs,
        removeJobByQuoteId,
        failJob,
    };

    return (
        <ProductionContext.Provider value={contextValue}>
            {children}
        </ProductionContext.Provider>
    );
};
