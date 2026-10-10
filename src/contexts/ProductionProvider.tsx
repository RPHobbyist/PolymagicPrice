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

import { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { QuoteData } from '@/types/quote';
import { toast } from 'sonner';
import { ProductionJob, JobStatus, ProductionSettings, JobPriority } from '@/types/production';
import { ProductionContext, ProductionContextType } from '@/contexts/ProductionContext';
import { useNotifications } from '@/hooks/useNotifications';
import * as sessionStore from '@/lib/core/sessionStorage';
// One parser for the whole app: the quote engine and the dashboard now read "1:30"
// as 1.5 h exactly as production always did.
import { parseTimeToHours } from '@/lib/utils/time';
import { sumCarbonRecords } from '@/lib/carbon/carbonCalculator';
// The board's column arithmetic, kept pure and tested: see lib/production/columns.ts.
import { placeJobInColumns, removeJobFromColumns, reindexAllColumns } from '@/lib/production/columns';


/**
 * The electricity rate this quote was priced with, falling back to the shop's current rate.
 *
 * `parameters.electricityRate` is written at calculation time. Quotes created before that
 * snapshot existed carry nothing, and reading the missing field used to resolve to 0 — which
 * is why every completed job recorded a power cost of exactly zero and `Machine.totalPowerCost`
 * never accumulated for any user.
 */
const resolveElectricityRate = (quote: QuoteData): number => {
    const snapshot = Number(quote.parameters?.electricityRate);
    if (Number.isFinite(snapshot) && snapshot > 0) return snapshot;
    const current = Number(sessionStore.getConstants().find(c => c.id === 'electricity')?.value);
    return Number.isFinite(current) && current > 0 ? current : 0;
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

    /**
     * The board as it stands right now, for the handlers below.
     *
     * Those handlers deduct filament, accumulate machine runtime and write quote revisions. All of
     * that used to happen inside a `setJobs(prev => ...)` updater, which React is free to call more
     * than once for a single update — under StrictMode, or when an interleaved update forces a
     * rebase — and each extra call would have taken the filament again. Reading the current board
     * from a ref lets the work happen once, in the event handler, where side effects belong.
     *
     * The ref is written alongside every commit as well as on render, so two actions dispatched in
     * the same tick still see each other's result.
     */
    const jobsRef = useRef(jobs);
    jobsRef.current = jobs;

    const commitJobs = useCallback((next: ProductionJob[]) => {
        jobsRef.current = next;
        setJobs(next);
    }, []);

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
                    // commitJobs, so the ref the handlers read from follows the other tab too.
                    commitJobs(sessionStore.getProductionJobs());
                } catch (err) {
                    console.error("Failed to sync production jobs", err);
                }
            }
            if (e.key === 'session_production_settings') {
                try {
                    // Read through the store, exactly as the jobs branch above does. The raw
                    // `e.newValue` is what `saveProductionSettings` wrote — `wrapSecret(...)`,
                    // i.e. a "v1:enc:<base64>" string — so `JSON.parse` on it threw every single
                    // time and the catch below swallowed it. Cross-tab settings never synced.
                    setSettings(sessionStore.getProductionSettings());
                } catch (err) {
                    console.error("Failed to sync production settings", err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [commitJobs]);

    const updateSettings = useCallback((updates: Partial<ProductionSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    }, []);

    const addJob = useCallback((quote: QuoteData, machineId: string | null = null) => {
        // [Batch Logic] Unpack into individual queue entries if this is a master batch
        if (quote.isBatch && quote.batchItems && quote.batchItems.length > 0) {
            const batchId = quote.id || `batch-${Date.now()}`;
            const batchName = quote.projectName;
            const prev = jobsRef.current;

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

            commitJobs([...prev, ...newJobs]);

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
            // Read from the ref rather than from a captured `jobs.length`, which made this
            // callback a new function after every board change and invalidated every consumer.
            order: jobsRef.current.length, // Append to end
        };
        commitJobs([...jobsRef.current, newJob]);
        addNotification({
            type: 'INFO',
            title: 'New Job Added',
            message: `Order for ${quote.projectName} (${quote.quantity} units) added to production.`,
            metadata: { quoteId: quote.id, jobId: newJob.id }
        });
        toast.success('Job added to production queue');
    }, [addNotification, commitJobs]);

    // Every mutation goes through commitJobs so the ref and the state can never disagree, even
    // when two actions are dispatched in the same tick.
    const updateJob = useCallback((jobId: string, updates: Partial<ProductionJob>) => {
        commitJobs(jobsRef.current.map(job =>
            job.id === jobId ? { ...job, ...updates } : job
        ));
    }, [commitJobs]);

    const moveJob = useCallback((jobId: string, newStatus: JobStatus, newMachineId: string | null, newIndex?: number, actualPrintTime?: number) => {
        // Runs in the event handler, not inside a state updater: everything below writes to
        // storage — spools, machine runtime, quote revisions — and must happen exactly once.
        const prev = jobsRef.current;
        const jobToMove = prev.find(j => j.id === jobId);
        if (!jobToMove) return;

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

        // [ClosedLoop] Step 0b: UNDO ACTUALS - a finished job dragged back onto the board did
        // not happen. Only the spool was ever restored; `actualPrintTime`, `actualMaterialUsed`
        // and the power cost stayed on the quote, so the dashboard, the reports and the
        // assistant all kept counting a run that no longer exists.
        const wasFinished = jobToMove.status === 'completed' || jobToMove.status === 'post_processing';
        const backOnBoard = newStatus === 'queued' || newStatus === 'printing';
        if (wasFinished && backOnBoard) {
            updatedJob.actualPrintTime = undefined;
            updatedJob.completedAt = undefined;
            updatedJob.actualMaterialUsed = undefined;
            updatedJob.actualPowerCost = undefined;
            updatedJob.actualCarbon = undefined;

            if (updatedJob.batchId) {
                // Rebuild the master's aggregate from the children that are still finished.
                const parent = sessionStore.getQuotes().find(q => q.id === updatedJob.batchId);
                if (parent) {
                    const finished = prev.filter(j =>
                        j.batchId === updatedJob.batchId && j.id !== updatedJob.id &&
                        (j.status === 'completed' || j.status === 'post_processing'));
                    const sum = (pick: (j: ProductionJob) => number) => finished.reduce((acc, j) => acc + pick(j), 0);

                    const parentUpdate: Partial<QuoteData> = {
                        actualPrintTime: sum(j => j.actualPrintTime || 0) || undefined,
                        actualMaterialUsed: sum(j => j.actualMaterialUsed || 0) || undefined,
                        totalPowerCost: sum(j => j.actualPowerCost || 0) || undefined,
                        carbon: sumCarbonRecords(finished.map(j => j.actualCarbon)),
                    };
                    if (finished.length === 0) parentUpdate.status = 'APPROVED';
                    sessionStore.updateQuote(parent.id, parentUpdate);
                }
            } else {
                // Clearing the actuals is enough for the footprint too: `updateQuote` sees
                // carbon-relevant fields change with no figure supplied, and recomputes the
                // quote back to an estimate.
                sessionStore.updateQuote(updatedJob.quote.id, {
                    actualPrintTime: undefined,
                    actualMaterialUsed: undefined,
                    totalPowerCost: undefined,
                    status: newStatus === 'printing' ? 'PRINTING' : 'APPROVED',
                });
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
                return; // Block transition
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
                        // Record what was ACTUALLY taken, not what was requested: stock is
                        // clamped at zero, so a partial deduction must not be reverted in
                        // full later (that would invent material out of nothing).
                        const deducted = sessionStore.deductFromSpool(targetSpool.id, deductionAmount);
                        if (deducted > 0) {
                            // Add to total material used for this job
                            updatedJob.spoolId = targetSpool.id;
                            updatedJob.inventoryDeducted = (jobToMove.inventoryDeducted || 0) + deducted;
                            updatedJob.failureReason = null; // Clear failure reason now that we are re-attempting
                            console.log(`[ClosedLoop] Deducted ${deducted} of ${deductionAmount} requested for reprint/start from spool ${targetSpool.id}. Total now: ${updatedJob.inventoryDeducted}`);
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
                        // Track the actual deduction so a later revert restores exactly this much.
                        const deducted = sessionStore.deductFromSpool(targetSpool.id, deductionAmount);
                        updatedJob.inventoryDeducted = deducted;
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
                const electricityRate = resolveElectricityRate(updatedJob.quote);
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
                    const scrapDeducted = sessionStore.deductFromSpool(updatedJob.spoolId, extraDeduction);
                    updatedJob.inventoryDeducted = (updatedJob.inventoryDeducted || 0) + scrapDeducted;
                    
                    const originalWeight = parseFloat(updatedJob.quote.parameters.filamentWeight as string || updatedJob.quote.parameters.resinVolume as string || "1");
                    const initialMaterialCost = updatedJob.quote.materialCost || 0;
                    const costPerGram = initialMaterialCost / (originalWeight * (updatedJob.quote.quantity || 1));
                    
                    if (costPerGram > 0) {
                        const scrapCost = extraDeduction * costPerGram;
                        finalMaterialCost += scrapCost;
                        // Copy rather than assign into `updatedJob.quote`: the spread that
                        // built `updatedJob` is shallow, so that object is still the one the
                        // previous state holds, and writing through it rewrote history — a
                        // memoised card never saw the change, and a re-run compounded it.
                        updatedJob.quote = { ...updatedJob.quote, materialCost: finalMaterialCost };
                        console.log(`[Financial ClosedLoop] Reconciled Material Cost: ${finalMaterialCost.toFixed(2)} (Scrap: ${scrapCost.toFixed(2)})`);
                    }
                }
            }

            // ATOMIC UPDATE: Sync all actuals to storage
            const electricityRate = resolveElectricityRate(updatedJob.quote);
            const powerKw = (machine?.power_consumption_watts || 0) / 1000;
            const jobPowerCost = (updatedJob.actualPrintTime || 0) * powerKw * electricityRate;
            
            const originalWeight = parseFloat(updatedJob.quote.parameters.filamentWeight as string || updatedJob.quote.parameters.resinVolume as string || "0");
            const extraDeduction = (updatedJob.inventoryDeducted || 0) - (originalWeight * (updatedJob.quote.quantity || 1));
            const actualMaterialUsed = (originalWeight * (updatedJob.quote.quantity || 1)) + Math.max(0, extraDeduction);

            // Keep each job's own contribution so a batch aggregate can be rebuilt after a revert.
            updatedJob.actualMaterialUsed = actualMaterialUsed;
            updatedJob.actualPowerCost = jobPowerCost;

            // The footprint of what actually happened: real runtime, real material including
            // scrap, and the machine that ran the job rather than the one it was priced
            // against. Computed through the same function the quote editor uses, so an
            // estimate and an actual can never be produced by two different code paths.
            const actualCarbon = sessionStore.recomputeQuoteCarbon({
                ...updatedJob.quote,
                actualPrintTime: updatedJob.actualPrintTime,
                actualMaterialUsed,
                assignedMachineId: machineIdToUse || updatedJob.quote.assignedMachineId,
            });
            updatedJob.actualCarbon = actualCarbon;

            if (updatedJob.batchId) {
                // Batch children carry a synthetic quote id (`<batchId>-sub-N`) that matches no
                // stored quote, so this write used to do nothing at all: every actual from a
                // batch was discarded. The figures belong to the master quote, summed over the
                // children as each one finishes.
                const parent = sessionStore.getQuotes().find(q => q.id === updatedJob.batchId);
                if (parent) {
                    const siblings = prev.filter(j => j.batchId === updatedJob.batchId && j.id !== updatedJob.id);
                    const finished = siblings.filter(j => j.status === 'completed' || j.status === 'post_processing');
                    const sum = (pick: (j: ProductionJob) => number) => finished.reduce((acc, j) => acc + pick(j), 0);

                    const parentUpdate: Partial<QuoteData> = {
                        actualPrintTime: sum(j => j.actualPrintTime || 0) + (updatedJob.actualPrintTime || 0),
                        actualMaterialUsed: sum(j => j.actualMaterialUsed || 0) + actualMaterialUsed,
                        totalPowerCost: sum(j => j.actualPowerCost || 0) + jobPowerCost,
                        // The master's footprint is the sum of its children's, not a recompute
                        // from the master's own aggregate figures — those describe a batch, not
                        // a print, and would put every item on one machine and one material.
                        carbon: sumCarbonRecords([...finished.map(j => j.actualCarbon), actualCarbon]),
                    };
                    // The batch is only done once every child is.
                    if (finished.length === siblings.length) {
                        parentUpdate.status = newStatus === 'completed' ? 'DONE' : 'POST_PROCESSING';
                    }
                    sessionStore.updateQuote(parent.id, parentUpdate);
                }
            } else {
                sessionStore.updateQuote(updatedJob.quote.id, {
                    actualPrintTime: updatedJob.actualPrintTime,
                    totalPowerCost: jobPowerCost,
                    materialCost: finalMaterialCost,
                    actualMaterialUsed: actualMaterialUsed,
                    carbon: actualCarbon,
                    status: newStatus === 'completed' ? 'DONE' : 'POST_PROCESSING'
                });
            }
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

        // 2. Perform the atomic move and re-index.
        //
        // The column arithmetic lives in lib/production/columns.ts so it can be tested: the
        // version that used to sit here selected the source and the target column with two
        // separate predicates and spread both into the result, so reordering a card inside
        // its own column — the board's most ordinary gesture — emitted every other job in
        // that column twice and persisted the duplicates.
        commitJobs(placeJobInColumns(
            prev,
            updatedJob,
            { status: jobToMove.status, machineId: jobToMove.machineId },
            newIndex
        ));
    }, [addNotification, commitJobs]);

    const removeJob = useCallback((jobId: string) => {
        const prev = jobsRef.current;
        const job = prev.find(j => j.id === jobId);

        // Returning filament to its spool is a storage write, so it happens here rather than
        // inside an updater React may run more than once — a second run would have invented
        // material that was never taken.
        if (job && job.spoolId && job.inventoryDeducted) {
            console.log(`[ClosedLoop] Restoring ${job.inventoryDeducted} to spool ${job.spoolId} (Job Removed)`);
            sessionStore.restoreToSpool(job.spoolId, job.inventoryDeducted);
        }

        // Re-assign orders in the column the job was removed from
        commitJobs(removeJobFromColumns(prev, jobId));
        toast.info('Job removed from production');
    }, [commitJobs]);

    const removeJobByQuoteId = useCallback((quoteId: string) => {
        const prev = jobsRef.current;

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
        commitJobs(reindexAllColumns(remainingJobs));
    }, [commitJobs]);

    const clearCompleted = useCallback(() => {
        commitJobs(jobsRef.current.filter(j => j.status !== 'completed'));
        toast.success('Cleared completed jobs');
    }, [commitJobs]);

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
        const prev = jobsRef.current;
        const jobIndex = prev.findIndex(j => j.id === jobId);
        if (jobIndex === -1) return;

        const updatedJobs = [...prev];
        const job = { ...updatedJobs[jobIndex] };

        job.status = 'queued'; // Return to queue or stay? Usually return to queue after failure.
        job.failureReason = reason;
        job.totalScrapMaterial = (job.totalScrapMaterial || 0) + scrapGramsResin;

        // Scrap comes off the spool once, in the handler, not inside a state updater.
        if (job.spoolId && scrapGramsResin > 0) {
            const scrapDeducted = sessionStore.deductFromSpool(job.spoolId, scrapGramsResin);
            job.inventoryDeducted = (job.inventoryDeducted || 0) + scrapDeducted;
        }

        // Sync with global quote status and failed units
        const existingFailedUnits = job.quote.failedUnits || 0;
        const newFailedUnits = existingFailedUnits + failedUnitsCount;
        sessionStore.updateQuote(job.quote.id, { status: 'FAILED', failedUnits: newFailedUnits });
        // A copy: `{ ...updatedJobs[jobIndex] }` is shallow, so `job.quote` is still the object the
        // previous state holds and writing into it rewrote the board's history in place.
        job.quote = { ...job.quote, failedUnits: newFailedUnits, status: 'FAILED' };

        updatedJobs[jobIndex] = job;

        toast.error('Failure recorded and synced to order manager');
        commitJobs(updatedJobs);
    }, [commitJobs]);

    // Memoised: this provider wraps the entire router, so a fresh object here re-rendered every
    // consumer of useProduction on every render, whether or not the board had changed.
    const contextValue: ProductionContextType = useMemo(() => ({
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
    }), [jobs, settings, addJob, updateJob, moveJob, removeJob, clearCompleted, updateSettings, getJobsByMachine, getUnassignedJobs, removeJobByQuoteId, failJob]);

    return (
        <ProductionContext.Provider value={contextValue}>
            {children}
        </ProductionContext.Provider>
    );
};
