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

import { QuoteData } from "./quote";

export type JobStatus = 'queued' | 'printing' | 'post_processing' | 'completed';
export type JobPriority = 'low' | 'normal' | 'high';

export interface ProductionSettings {
    efficiency: number;      // 0-100
    turnoverMinutes: number; // minutes per unit
    workHoursPerDay: number; // hours (e.g., 8, 24)
    enabledMachineIds: string[]; // Machines active in the machine pool
}

export interface ProductionJob {
    id: string;
    quote: QuoteData;
    status: JobStatus;
    machineId: string | null; // null means unassigned/global queue
    priority: JobPriority;
    createdAt: string;
    actualPrintTime?: number;
    startedAt?: string; // When the job actually started printing
    completedAt?: string; // When the job finished
    spoolId?: string; // Tracks the specific inventory spool used
    inventoryDeducted?: number; // Total grams/ml deducted from inventory
    // Failure Analysis
    failureReason?: 'SPOOL_EMPTY' | 'MECHANICAL' | 'ADHESION' | 'OTHER' | null;
    totalScrapMaterial?: number; // Extra material lost during failure
    // For sorting within the same status/machine
    order: number;
    batchId?: string; // Links back to a master batch quote
    batchName?: string; // Display name of the parent batch
}
