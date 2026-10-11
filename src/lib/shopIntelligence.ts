/*
 * PolymagicPrice - Shop intelligence rules
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

import { CostConstant, Machine, Material, MaterialSpool, QuoteData } from "@/types/quote";
import { ProductionJob } from "@/types/production";
import { isMachineMaintenanceDue } from "@/lib/core/sessionStorage";
import { buildCarbonOverview } from "@/lib/carbon/carbonStats";

/**
 * Detection rules for shop problems, extracted from IntelligenceProvider so the
 * same findings can drive BOTH the notification bell and the AI assistant's
 * answers. Detection lives here; notification creation, de-duplication and
 * scheduling stay in the provider.
 */

export type FindingKind =
    | 'DELAY'
    | 'MAINTENANCE'
    | 'RESERVATION_SHORTAGE'
    | 'RESERVATION_WARNING'
    | 'SPOOL_LOW'
    | 'PRICE_DRIFT'
    | 'QUALITY_AUDIT_MACHINE'
    | 'QUALITY_AUDIT_MATERIAL'
    | 'PROCUREMENT'
    | 'CARBON_METER_SUGGESTION'
    | 'CARBON_DIGEST';

export type FindingSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface Finding {
    kind: FindingKind;
    severity: FindingSeverity;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
}

export interface ShopSnapshot {
    quotes: QuoteData[];
    machines: Machine[];
    materials: Material[];
    spools: MaterialSpool[];
    jobs: ProductionJob[];
    constants: CostConstant[];
    lowStock: Material[];
    now?: Date;
}

/** Total material a job consumes across its quantity. */
const calculateJobMaterial = (job: ProductionJob): number => {
    const q = job.quote.quantity || 1;
    const weight = parseFloat(job.quote.parameters.filamentWeight as string || job.quote.parameters.resinVolume as string || "0") || 0;
    return weight * q;
};

export function analyzeShop(snapshot: ShopSnapshot): Finding[] {
    const { quotes, machines, materials, spools, jobs, constants, lowStock } = snapshot;
    const now = snapshot.now ?? new Date();
    const findings: Finding[] = [];

    // 1. Order Delay Analysis
    quotes.forEach(quote => {
        if (quote.dueDate && quote.status !== 'DELIVERED' && quote.status !== 'DONE' && quote.status !== 'CANCELLED') {
            const dueDate = new Date(quote.dueDate);
            if (dueDate < now) {
                const statusMsg = quote.status === 'DISPATCHED' ? 'at dispatch sector' : `in ${quote.status?.toLowerCase()} stage`;
                findings.push({
                    kind: 'DELAY',
                    severity: 'WARNING',
                    title: 'Order Delay Alert',
                    message: `Order #${quote.id?.slice(-4) || 'N/A'} (${quote.projectName}) is delaying ${statusMsg}.`,
                    metadata: { quoteId: quote.id, type: 'DELAY' }
                });
            }
        }
    });

    // 2. Machine Maintenance Analysis
    machines.forEach(machine => {
        if (isMachineMaintenanceDue(machine)) {
            findings.push({
                kind: 'MAINTENANCE',
                severity: 'ERROR',
                title: 'Machine Maintenance Required',
                message: `Machine "${machine.name}" has reached its service interval (${Math.floor(machine.totalRuntimeHours || 0)} hrs). Maintenance advised.`,
                metadata: { machineId: machine.id, type: 'MAINTENANCE' }
            });
        }
    });

    // 3. Spool Underrun & Multi-Job Reservation Analysis (Standardized Closed-Loop)
    const requirementsByMaterial = new Map<string, number>();
    jobs.forEach(job => {
        if (job.status !== 'completed') {
            const materialName = job.quote.parameters.materialName as string;
            const weight = calculateJobMaterial(job);
            requirementsByMaterial.set(materialName, (requirementsByMaterial.get(materialName) || 0) + weight);
        }
    });

    requirementsByMaterial.forEach((totalNeeded, materialName) => {
        const material = materials.find(m => m.name === materialName);
        if (!material) return;

        const totalAvailable = spools
            .filter(s => s.materialId === material.id)
            .reduce((sum, s) => sum + s.currentWeight, 0);

        if (totalNeeded > totalAvailable) {
            findings.push({
                kind: 'RESERVATION_SHORTAGE',
                severity: 'ERROR',
                title: 'Production Material Shortage',
                message: `Total queue needs ${Math.ceil(totalNeeded)}${material.unit} of ${materialName}, but only ${Math.ceil(totalAvailable)}${material.unit} is available in spools.`,
                metadata: { materialName, type: 'RESERVATION_SHORTAGE' }
            });
        } else if (totalNeeded > (totalAvailable * 0.8)) {
            findings.push({
                kind: 'RESERVATION_WARNING',
                severity: 'WARNING',
                title: 'Inventory Heavily Reserved',
                message: `${Math.ceil((totalNeeded / totalAvailable) * 100)}% of ${materialName} stock is reserved for the current queue.`,
                metadata: { materialName, type: 'RESERVATION_WARNING' }
            });
        }
    });

    // 4. Specific Job Run-out Check (Printing Now)
    jobs.forEach(job => {
        if (job.status === 'printing' && job.spoolId) {
            const spool = spools.find(s => s.id === job.spoolId);
            const requiredWeight = calculateJobMaterial(job);

            if (spool && spool.currentWeight < (requiredWeight * 0.1)) {
                findings.push({
                    kind: 'SPOOL_LOW',
                    severity: 'WARNING',
                    title: 'Spool Run-out Likely',
                    message: `Active Job ${job.quote.projectName} has <10% margin on its assigned spool.`,
                    metadata: { jobId: job.id, spoolId: spool.id, type: 'SPOOL_LOW' }
                });
            }
        }
    });

    // 5. Systemic Pricing Drift Analysis (Proactive)
    const currentLabor = (constants.find(c => c.id === "labor") ?? constants.find(c => c.name.includes("Labor")))?.value || 0;

    quotes.forEach(quote => {
        if (quote.status === 'PENDING' || quote.status === 'APPROVED' || quote.status === 'PRINTING') {
            const quoteLabor = parseFloat(quote.parameters.laborRate as string) || 0;

            if (quoteLabor > 0 && Math.abs(currentLabor - quoteLabor) / quoteLabor > 0.15) {
                findings.push({
                    kind: 'PRICE_DRIFT',
                    severity: 'WARNING',
                    title: 'Pricing Drift Detected',
                    message: `Order "${quote.projectName}" margin may be affected by changes in shop labor rates.`,
                    metadata: { quoteId: quote.id, type: 'PRICE_DRIFT' }
                });
            }
        }
    });

    // 6. Quality Audit: Failure Pattern Analysis (Systemic Closed-Loop)
    const failuresByMachine = new Map<string, number>();
    const failuresByMaterial = new Map<string, number>();
    let highFailureMachine: string | null = null;
    let highFailureMaterial: string | null = null;

    jobs.forEach(job => {
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
        findings.push({
            kind: 'QUALITY_AUDIT_MACHINE',
            severity: 'ERROR',
            title: 'Machine Quality Alert',
            message: `Machine "${highFailureMachine}" has reported multiple failures recently. Investigation recommended.`,
            metadata: { machineName: highFailureMachine, type: 'QUALITY_AUDIT_MACHINE' }
        });
    }

    if (highFailureMaterial) {
        findings.push({
            kind: 'QUALITY_AUDIT_MATERIAL',
            severity: 'WARNING',
            title: 'Material Consistency Alert',
            message: `Material "${highFailureMaterial}" is involved in high failure rates. Check for moisture or clogs.`,
            metadata: { materialName: highFailureMaterial, type: 'QUALITY_AUDIT_MATERIAL' }
        });
    }

    // 7. Carbon. Deliberately restrained: two INFO findings, never WARNING, because this bell is
    // where a shop looks for things that block production. Advice that can wait belongs on the
    // carbon page, not here.
    const carbonOverview = buildCarbonOverview(quotes);

    // 7a. The single highest-value action: meter the machine carrying the most unmeasured energy.
    // Keyed by machine, so it is asked once per printer rather than repeatedly.
    if (carbonOverview.meterNext && carbonOverview.jobs.length >= 5) {
        findings.push({
            kind: 'CARBON_METER_SUGGESTION',
            severity: 'INFO',
            title: 'Improve your carbon accuracy',
            message: `${carbonOverview.meterNext} uses the most energy of any machine still on a library wattage. One reading from a plug-in meter makes every future job on it a measured figure.`,
            metadata: { machineName: carbonOverview.meterNext, type: 'CARBON_METER_SUGGESTION' }
        });
    }

    // 7b. A monthly digest of the month just gone. The period key is what lets next month's digest
    // through de-duplication that would otherwise treat it as the same finding.
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const lastMonthKey = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}`;
    const lastMonthEntry = carbonOverview.months.find(m => m.month === lastMonthKey);

    if (lastMonthEntry && lastMonthEntry.kg > 0) {
        const energyShare = Math.round((lastMonthEntry.energyKg / lastMonthEntry.kg) * 100);
        findings.push({
            kind: 'CARBON_DIGEST',
            severity: 'INFO',
            title: `Carbon summary for ${lastMonthEntry.label}`,
            message: `${lastMonthEntry.kg.toFixed(1)} kgCO₂e across ${lastMonthEntry.jobs} completed job${lastMonthEntry.jobs === 1 ? '' : 's'} — ${energyShare}% electricity, ${100 - energyShare}% material and waste. Estimates only.`,
            metadata: { type: 'CARBON_DIGEST', period: lastMonthKey }
        });
    }

    // 8. Procurement Analysis
    lowStock.forEach(mat => {
        findings.push({
            kind: 'PROCUREMENT',
            severity: 'WARNING',
            title: 'Procurement Reminder',
            message: `Material stock for ${mat.name} is critically low. Consider immediate purchasing.`,
            metadata: { materialId: mat.id, type: 'PROCUREMENT' }
        });
    });

    return findings;
}

const SEVERITY_ORDER: Record<FindingSeverity, number> = { ERROR: 0, WARNING: 1, INFO: 2 };

/** Most urgent first — used when the AI context has room for only a few findings. */
export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
    return [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
