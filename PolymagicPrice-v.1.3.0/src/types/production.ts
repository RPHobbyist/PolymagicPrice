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

export interface ProductionJob {
    id: string;
    quote: QuoteData;
    status: JobStatus;
    machineId: string | null; // null means unassigned/global queue
    priority: JobPriority;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    notes?: string;
    // For sorting within the same status/machine
    order: number;
}
