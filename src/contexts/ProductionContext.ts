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

import { createContext } from "react";
import { QuoteData } from "@/types/quote";
import { ProductionJob, JobStatus, ProductionSettings } from "@/types/production";

export interface ProductionContextType {
    jobs: ProductionJob[];
    settings: ProductionSettings;
    addJob: (quote: QuoteData, machineId?: string | null) => void;
    updateJob: (jobId: string, updates: Partial<ProductionJob>) => void;
    moveJob: (jobId: string, newStatus: JobStatus, newMachineId: string | null, newIndex?: number, actualPrintTime?: number) => void;
    removeJob: (jobId: string) => void;
    removeJobByQuoteId: (quoteId: string) => void;
    clearCompleted: () => void;
    updateSettings: (settings: Partial<ProductionSettings>) => void;
    getJobsByMachine: (machineId: string) => ProductionJob[];
    getUnassignedJobs: () => ProductionJob[];
    failJob: (jobId: string, reason: 'SPOOL_EMPTY' | 'MECHANICAL' | 'ADHESION' | 'OTHER', scrapGramsResin?: number, failedUnitsCount?: number) => void;
}

export const ProductionContext = createContext<ProductionContextType | undefined>(undefined);
