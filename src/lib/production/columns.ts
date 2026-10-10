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

import { ProductionJob, JobStatus } from "@/types/production";

/**
 * Where the production board's cards actually live, and how they are renumbered.
 *
 * This arithmetic used to sit inline inside `setJobs` updaters in ProductionProvider, tangled up
 * with inventory writes and toasts, which is why a plain duplication bug survived: there was no
 * way to call it from a test. It is pure and lives here so it can be.
 */

/**
 * A column is a status and a machine together — the Print Manager draws one column per machine and
 * preserves the job's status, while the Order Manager moves a job between statuses on the same
 * machine. Addressing a column by one key makes "same column" a single comparison instead of two
 * predicates that can silently coincide.
 */
export const columnKeyOf = (status: JobStatus, machineId: string | null): string =>
    `${status}::${machineId ?? 'unassigned'}`;

export const byOrder = (a: ProductionJob, b: ProductionJob) => a.order - b.order;

/**
 * Renumbers a column 0..n-1, returning copies.
 *
 * The previous `forEach(j => { j.order = idx })` wrote through to objects still held by the
 * previous React state, so a memoised card never saw the change and a re-run of the updater
 * compounded the renumbering.
 */
export const reindex = (column: ProductionJob[]): ProductionJob[] =>
    column.map((j, idx) => (j.order === idx ? j : { ...j, order: idx }));

/**
 * Places `updatedJob` into its destination column and renumbers whatever the move disturbed.
 *
 * The bug this replaces: the source and the target column were selected with two separate
 * predicates and then BOTH spread into the result. Reordering a card inside its own column makes
 * those predicates identical, so every other job in that column was emitted twice — duplicate
 * React keys, duplicate drag ids, and the persistence effect wrote the duplicates to storage,
 * where each copy could later be completed separately and deduct the same filament again.
 *
 * `prev` is never mutated; every renumbered job comes back as a copy.
 */
export const placeJobInColumns = (
    prev: ProductionJob[],
    updatedJob: ProductionJob,
    from: { status: JobStatus; machineId: string | null },
    newIndex?: number
): ProductionJob[] => {
    const filtered = prev.filter(j => j.id !== updatedJob.id);
    const sourceKey = columnKeyOf(from.status, from.machineId);
    const targetKey = columnKeyOf(updatedJob.status, updatedJob.machineId);

    const targetColumn = filtered
        .filter(j => columnKeyOf(j.status, j.machineId) === targetKey)
        .sort(byOrder);

    if (typeof newIndex === 'number' && newIndex >= 0 && newIndex <= targetColumn.length) {
        targetColumn.splice(newIndex, 0, updatedJob);
    } else {
        targetColumn.push(updatedJob);
    }

    // Only a genuinely different source column needs a pass of its own.
    const sourceColumn = sourceKey === targetKey
        ? []
        : filtered.filter(j => columnKeyOf(j.status, j.machineId) === sourceKey).sort(byOrder);

    const otherJobs = filtered.filter(j => {
        const key = columnKeyOf(j.status, j.machineId);
        return key !== sourceKey && key !== targetKey;
    });

    return [...otherJobs, ...reindex(sourceColumn), ...reindex(targetColumn)];
};

/** Removes a job and renumbers the column it came from. */
export const removeJobFromColumns = (prev: ProductionJob[], jobId: string): ProductionJob[] => {
    const job = prev.find(j => j.id === jobId);
    const filtered = prev.filter(j => j.id !== jobId);
    if (!job) return filtered;

    const affectedKey = columnKeyOf(job.status, job.machineId);
    const affectedColumn = filtered
        .filter(j => columnKeyOf(j.status, j.machineId) === affectedKey)
        .sort(byOrder);
    const otherJobs = filtered.filter(j => columnKeyOf(j.status, j.machineId) !== affectedKey);

    return [...otherJobs, ...reindex(affectedColumn)];
};

/** Renumbers every column from scratch — used after a bulk removal. */
export const reindexAllColumns = (jobs: ProductionJob[]): ProductionJob[] => {
    const columns = new Map<string, ProductionJob[]>();
    jobs.forEach(j => {
        const key = columnKeyOf(j.status, j.machineId);
        if (!columns.has(key)) columns.set(key, []);
        columns.get(key)!.push(j);
    });

    const result: ProductionJob[] = [];
    columns.forEach(colJobs => {
        result.push(...reindex([...colJobs].sort(byOrder)));
    });
    return result;
};
