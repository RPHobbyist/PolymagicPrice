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
import React, { createContext, useEffect, useCallback, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { getQuotes, getMachines, getLowStockMaterials, getProductionJobs, getSpools } from '@/lib/core/sessionStorage';
import * as sessionStore from '@/lib/core/sessionStorage';
import { ProductionJob } from '@/types/production';
import { useLocation } from 'react-router-dom';


interface IntelligenceContextType {
    analyzeSystem: () => void;
}

// Helper to calculate total material weight/volume for a job
const calculateJobMaterial = (job: ProductionJob): number => {
    const q = job.quote.quantity || 1;
    const weight = parseFloat(job.quote.parameters.filamentWeight as string || job.quote.parameters.resinVolume as string || "0") || 0;
    return weight * q;
};

const IntelligenceContext = createContext<IntelligenceContextType | undefined>(undefined);

export const IntelligenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addNotification, notifications } = useNotifications();
    const location = useLocation();

    // Use a ref for notifications to avoid dependency cycle:
    // analyzeSystem → adds notification → notifications change → analyzeSystem recreates → useEffect re-runs
    const notificationsRef = useRef(notifications);
    notificationsRef.current = notifications;

    const analyzeSystem = useCallback(() => {
        // Optimization: Never run analysis or show notifications on landing page
        if (location.pathname === '/') return;

        const now = new Date();
        const quotes = getQuotes();
        const machines = getMachines();
        const lowStock = getLowStockMaterials();
        const currentNotifications = notificationsRef.current;

        // 1. Order Delay Analysis
        quotes.forEach(quote => {
            if (quote.dueDate && quote.status !== 'DELIVERED' && quote.status !== 'DONE' && quote.status !== 'CANCELLED') {
                const dueDate = new Date(quote.dueDate);
                if (dueDate < now) {
                    const existing = currentNotifications.find(n => 
                        n.metadata?.quoteId === quote.id &&
                        n.metadata?.type === 'DELAY'
                    );

                    if (!existing) {
                        const statusMsg = quote.status === 'DISPATCHED' ? 'at dispatch sector' : `in ${quote.status?.toLowerCase()} stage`;
                        addNotification({
                            type: 'WARNING',
                            title: 'Order Delay Alert',
                            message: `Order #${quote.id?.slice(-4) || 'N/A'} (${quote.projectName}) is delaying ${statusMsg}.`,
                            metadata: { quoteId: quote.id, type: 'DELAY' }
                        });
                    }
                }
            }
        });

        // 2. Machine Maintenance Analysis
        machines.forEach(machine => {
            if (sessionStore.isMachineMaintenanceDue(machine)) {
                const existing = currentNotifications.find(n => 
                    n.metadata?.machineId === machine.id &&
                    n.metadata?.type === 'MAINTENANCE'
                );

                if (!existing) {
                    addNotification({
                        type: 'ERROR',
                        title: 'Machine Maintenance Required',
                        message: `Machine "${machine.name}" has reached its service interval (${Math.floor(machine.totalRuntimeHours || 0)} hrs). Maintenance advised.`,
                        metadata: { machineId: machine.id, type: 'MAINTENANCE' }
                    });
                }
            }
        });

        // 3. Spool Underrun & Multi-Job Reservation Analysis (Standardized Closed-Loop)
        const productionJobs = getProductionJobs();
        const spools = getSpools();
        const materials = sessionStore.getMaterials();

        // Calculate cumulative reservation per material
        const requirementsByMaterial = new Map<string, number>();
        productionJobs.forEach(job => {
            if (job.status !== 'completed') {
                const materialName = job.quote.parameters.materialName as string;
                const weight = calculateJobMaterial(job);
                requirementsByMaterial.set(materialName, (requirementsByMaterial.get(materialName) || 0) + weight);
            }
        });

        requirementsByMaterial.forEach((totalNeeded, materialName) => {
            // Find total stock of this material across all spools
            const material = materials.find(m => m.name === materialName);
            if (!material) return;

            const totalAvailable = spools
                .filter(s => s.materialId === material.id)
                .reduce((sum, s) => sum + s.currentWeight, 0);

            if (totalNeeded > totalAvailable) {
                const existing = currentNotifications.find(n => 
                    n.metadata?.materialName === materialName &&
                    n.metadata?.type === 'RESERVATION_SHORTAGE'
                );

                if (!existing) {
                    addNotification({
                        type: 'ERROR',
                        title: 'Production Material Shortage',
                        message: `Total queue needs ${Math.ceil(totalNeeded)}g of ${materialName}, but only ${Math.ceil(totalAvailable)}g is available in spools.`,
                        metadata: { materialName, type: 'RESERVATION_SHORTAGE' }
                    });
                }
            } else if (totalNeeded > (totalAvailable * 0.8)) {
                // Warning if >80% of stock is reserved
                const existing = currentNotifications.find(n => 
                    n.metadata?.materialName === materialName &&
                    n.metadata?.type === 'RESERVATION_WARNING'
                );

                if (!existing) {
                    addNotification({
                        type: 'WARNING',
                        title: 'Inventory Heavily Reserved',
                        message: `${Math.ceil((totalNeeded / totalAvailable) * 100)}% of ${materialName} stock is reserved for the current queue.`,
                        metadata: { materialName, type: 'RESERVATION_WARNING' }
                    });
                }
            }
        });

        // Specific Job Run-out Check (Printing Now)
        productionJobs.forEach(job => {
            if (job.status === 'printing' && job.spoolId) {
                const spool = spools.find(s => s.id === job.spoolId);
                const requiredWeight = calculateJobMaterial(job);
                
                if (spool && spool.currentWeight < (requiredWeight * 0.1)) {
                    const existing = currentNotifications.find(n => 
                        n.metadata?.jobId === job.id &&
                        n.metadata?.type === 'SPOOL_LOW'
                    );

                    if (!existing) {
                        addNotification({
                            type: 'WARNING',
                            title: 'Spool Run-out Likely',
                            message: `Active Job ${job.quote.projectName} has <10% margin on its assigned spool.`,
                            metadata: { jobId: job.id, spoolId: spool.id, type: 'SPOOL_LOW' }
                        });
                    }
                }
            }
        });

        // 5. Systemic Pricing Drift Analysis (Proactive)
        const constants = sessionStore.getConstants();
        const currentLabor = constants.find(c => c.name.includes("Labor"))?.value || 0;
        
        quotes.forEach(quote => {
            if (quote.status === 'PENDING' || quote.status === 'APPROVED' || quote.status === 'PRINTING') {
                const quoteLabor = parseFloat(quote.parameters.laborRate as string) || 0;
                
                if (quoteLabor > 0 && Math.abs(currentLabor - quoteLabor) / quoteLabor > 0.15) {
                    const existing = currentNotifications.find(n => 
                        n.metadata?.quoteId === quote.id &&
                        n.metadata?.type === 'PRICE_DRIFT'
                    );

                    if (!existing) {
                        addNotification({
                            type: 'WARNING',
                            title: 'Pricing Drift Detected',
                            message: `Order "${quote.projectName}" margin may be affected by changes in shop labor rates.`,
                            metadata: { quoteId: quote.id, type: 'PRICE_DRIFT' }
                        });
                    }
                }
            }
        });

        // 6. Quality Audit: Failure Pattern Analysis (Systemic Closed-Loop)
        const failuresByMachine = new Map<string, number>();
        const failuresByMaterial = new Map<string, number>();
        let highFailureMachine: string | null = null;
        let highFailureMaterial: string | null = null;

        productionJobs.forEach(job => {
            if (job.failureReason) {
                const mName = job.quote.parameters.machineName as string;
                const matName = job.quote.parameters.materialName as string;
                
                failuresByMachine.set(mName, (failuresByMachine.get(mName) || 0) + 1);
                failuresByMaterial.set(matName, (failuresByMaterial.get(matName) || 0) + 1);
            }
        });

        failuresByMachine.forEach((count, name) => {
            if (count >= 3) highFailureMachine = name;
        });

        failuresByMaterial.forEach((count, name) => {
            if (count >= 5) highFailureMaterial = name;
        });

        if (highFailureMachine) {
            const existing = currentNotifications.find(n => 
                n.metadata?.machineName === highFailureMachine &&
                n.metadata?.type === 'QUALITY_AUDIT_MACHINE'
            );

            if (!existing) {
                addNotification({
                    type: 'ERROR',
                    title: 'Machine Quality Alert',
                    message: `Machine "${highFailureMachine}" has reported multiple failures recently. Investigation recommended.`,
                    metadata: { machineName: highFailureMachine, type: 'QUALITY_AUDIT_MACHINE' }
                });
            }
        }

        if (highFailureMaterial) {
            const existing = currentNotifications.find(n => 
                n.metadata?.materialName === highFailureMaterial &&
                n.metadata?.type === 'QUALITY_AUDIT_MATERIAL'
            );

            if (!existing) {
                addNotification({
                    type: 'WARNING',
                    title: 'Material Consistency Alert',
                    message: `Material "${highFailureMaterial}" is involved in high failure rates. Check for moisture or clogs.`,
                    metadata: { materialName: highFailureMaterial, type: 'QUALITY_AUDIT_MATERIAL' }
                });
            }
        }

        // 7. Procurement Analysis
        lowStock.forEach(mat => {
            const existing = currentNotifications.some(n => 
                n.metadata?.materialId === mat.id &&
                n.metadata?.type === 'PROCUREMENT'
            );

            if (!existing) {
                addNotification({
                    type: 'WARNING',
                    title: 'Procurement Reminder',
                    message: `Material stock for ${mat.name} is critically low. Consider immediate purchasing.`,
                    metadata: { materialId: mat.id, type: 'PROCUREMENT' }
                });
            }
        });
    }, [addNotification, location.pathname]);

    useEffect(() => {
        // Initial analysis after a short delay to ensure other providers are ready
        const timeout = setTimeout(analyzeSystem, 2000);
        
        // Re-analyze when the user moves from landing to a tool page
        if (location.pathname !== '/') {
            analyzeSystem();
        }

        // Cross-tab Synchronization: Re-analyze immediately on relevant data changes
        const handleStorageChange = (e: StorageEvent) => {
            const relevantKeys = [
                'session_production_jobs',
                'session_spools',
                'session_quotes',
                'session_constants',
                'session_machines'
            ];
            if (relevantKeys.includes(e.key || '')) {
                analyzeSystem();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Periodic analysis every 15 minutes as a fallback
        const interval = setInterval(analyzeSystem, 15 * 60 * 1000);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [analyzeSystem, location.pathname]);

    return (
        <IntelligenceContext.Provider value={{ analyzeSystem }}>
            {children}
        </IntelligenceContext.Provider>
    );
};


