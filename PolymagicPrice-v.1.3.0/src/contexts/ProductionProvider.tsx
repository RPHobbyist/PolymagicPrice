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
import { ProductionJob, JobStatus } from '@/types/production';
import { ProductionContext } from '@/contexts/ProductionContext';

const STORAGE_KEY = 'production_manager_jobs';

export const ProductionProvider = ({ children }: { children: ReactNode }) => {
    const [jobs, setJobs] = useState<ProductionJob[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    }, [jobs]);

    const addJob = useCallback((quote: QuoteData, machineId: string | null = null) => {
        const newJob: ProductionJob = {
            id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            quote,
            status: 'queued',
            machineId,
            priority: 'normal',
            createdAt: new Date().toISOString(),
            order: jobs.length, // Append to end
        };
        setJobs(prev => [...prev, newJob]);
        toast.success('Job added to production queue');
    }, [jobs.length]);

    const updateJob = useCallback((jobId: string, updates: Partial<ProductionJob>) => {
        setJobs(prev => prev.map(job =>
            job.id === jobId ? { ...job, ...updates } : job
        ));
    }, []);

    const moveJob = useCallback((jobId: string, newStatus: JobStatus, newMachineId: string | null, newIndex?: number) => {
        setJobs(prev => {
            const jobToMove = prev.find(j => j.id === jobId);
            if (!jobToMove) return prev;

            // 1. Remove job from current list
            const filtered = prev.filter(j => j.id !== jobId);

            // 2. Update job properties
            const updatedJob = {
                ...jobToMove,
                status: newStatus,
                machineId: newMachineId,
            };

            // 3. Insert into new position
            // Filter jobs that are in the *target* list (same status & machine)
            const targetList = filtered.filter(j =>
                j.status === newStatus && j.machineId === newMachineId
            ).sort((a, b) => a.order - b.order);

            if (typeof newIndex === 'number' && newIndex >= 0 && newIndex <= targetList.length) {
                // Re-calculate orders for the whole list
                // This is a simplified "splice" simulation for React state
                const newJobsList = [...filtered];

                // We need to re-sort everything in the specific machine/status bucket
                // But since 'filtered' contains ALL jobs, we can't just splice.
                // Strategy: Get all jobs NOT in target bucket + Reconstructed Target Bucket

                const nonTargetJobs = filtered.filter(j =>
                    !(j.status === newStatus && j.machineId === newMachineId)
                );

                targetList.splice(newIndex, 0, updatedJob);

                // Re-assign order based on new array position
                targetList.forEach((j, idx) => { j.order = idx; });

                return [...nonTargetJobs, ...targetList];
            } else {
                // Append to end if no index provided
                updatedJob.order = targetList.length;
                return [...filtered, updatedJob];
            }
        });
    }, []);

    const removeJob = useCallback((jobId: string) => {
        setJobs(prev => prev.filter(j => j.id !== jobId));
        toast.info('Job removed from production');
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

    return (
        <ProductionContext.Provider
            value={{
                jobs,
                addJob,
                updateJob,
                moveJob,
                removeJob,
                clearCompleted,
                getJobsByMachine,
                getUnassignedJobs,
            }}
        >
            {children}
        </ProductionContext.Provider>
    );
};
