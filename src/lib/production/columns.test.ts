import { describe, it, expect } from "vitest";
import { placeJobInColumns, removeJobFromColumns, reindexAllColumns, columnKeyOf } from "./columns";
import { ProductionJob, JobStatus } from "@/types/production";

/**
 * The bug these tests exist for: reordering a card inside its own column used to return every
 * other job in that column twice, because the source and the target column were selected with two
 * separate predicates and both were spread into the result. The board always passes the job's
 * existing status, so an in-column drag was the ordinary case.
 */

const job = (
    id: string,
    order: number,
    status: JobStatus = 'queued',
    machineId: string | null = 'm1'
): ProductionJob => ({
    id,
    quote: { id: `q-${id}`, projectName: id, quantity: 1, parameters: {} } as ProductionJob['quote'],
    status,
    machineId,
    priority: 'normal',
    createdAt: '2026-01-01T00:00:00.000Z',
    order,
});

/** Deep-freezes the state so any in-place write throws instead of passing silently. */
const frozen = (jobs: ProductionJob[]): ProductionJob[] => {
    jobs.forEach(j => Object.freeze(j));
    return Object.freeze(jobs) as ProductionJob[];
};

const ids = (jobs: ProductionJob[]) => jobs.map(j => j.id).sort();

describe("production board columns", () => {
    describe("reordering inside one column", () => {
        it("does not duplicate the column's other jobs", () => {
            const prev = frozen([job("a", 0), job("b", 1), job("c", 2)]);

            // Same status, same machine: a plain drag to the top of its own column.
            const next = placeJobInColumns(prev, { ...prev[2] }, { status: 'queued', machineId: 'm1' }, 0);

            expect(next).toHaveLength(3);
            expect(ids(next)).toEqual(["a", "b", "c"]);
        });

        it("puts the card where it was dropped and renumbers from zero", () => {
            const prev = frozen([job("a", 0), job("b", 1), job("c", 2)]);

            const next = placeJobInColumns(prev, { ...prev[2] }, { status: 'queued', machineId: 'm1' }, 0);

            expect(next.map(j => [j.id, j.order])).toEqual([["c", 0], ["a", 1], ["b", 2]]);
        });

        it("survives a second reorder without growing", () => {
            let state: ProductionJob[] = [job("a", 0), job("b", 1), job("c", 2)];
            for (let i = 0; i < 5; i++) {
                const moving = state.find(j => j.id === "b")!;
                state = placeJobInColumns(state, { ...moving }, { status: 'queued', machineId: 'm1' }, 0);
            }
            expect(ids(state)).toEqual(["a", "b", "c"]);
        });
    });

    describe("moving between columns", () => {
        it("renumbers both the column left and the column joined", () => {
            const prev = frozen([
                job("a", 0, 'queued', 'm1'),
                job("b", 1, 'queued', 'm1'),
                job("x", 0, 'queued', 'm2'),
            ]);

            const moved = { ...prev[0], machineId: 'm2' };
            const next = placeJobInColumns(prev, moved, { status: 'queued', machineId: 'm1' }, 0);

            expect(next).toHaveLength(3);
            const m1 = next.filter(j => j.machineId === 'm1').sort((p, q) => p.order - q.order);
            const m2 = next.filter(j => j.machineId === 'm2').sort((p, q) => p.order - q.order);
            expect(m1.map(j => [j.id, j.order])).toEqual([["b", 0]]);
            expect(m2.map(j => [j.id, j.order])).toEqual([["a", 0], ["x", 1]]);
        });

        it("leaves untouched columns alone", () => {
            const prev = frozen([
                job("a", 0, 'queued', 'm1'),
                job("k", 0, 'printing', 'm3'),
            ]);

            const next = placeJobInColumns(prev, { ...prev[0], machineId: 'm2' }, { status: 'queued', machineId: 'm1' });
            expect(next.find(j => j.id === "k")).toBe(prev[1]);
        });

        it("appends when no index is given", () => {
            const prev = frozen([job("x", 0, 'queued', 'm2'), job("a", 0, 'queued', 'm1')]);
            const next = placeJobInColumns(prev, { ...prev[1], machineId: 'm2' }, { status: 'queued', machineId: 'm1' });
            const m2 = next.filter(j => j.machineId === 'm2').sort((p, q) => p.order - q.order);
            expect(m2.map(j => j.id)).toEqual(["x", "a"]);
        });
    });

    describe("unassigned jobs", () => {
        it("treats a null machine as its own column, not as a match for every other null field", () => {
            expect(columnKeyOf('queued', null)).not.toBe(columnKeyOf('printing', null));

            const prev = frozen([job("u1", 0, 'queued', null), job("u2", 1, 'queued', null)]);
            const next = placeJobInColumns(prev, { ...prev[1] }, { status: 'queued', machineId: null }, 0);

            expect(ids(next)).toEqual(["u1", "u2"]);
            expect(next.map(j => j.id)).toEqual(["u2", "u1"]);
        });
    });

    describe("removal", () => {
        it("closes the gap in the column the job left", () => {
            const prev = frozen([job("a", 0), job("b", 1), job("c", 2), job("x", 0, 'queued', 'm2')]);

            const next = removeJobFromColumns(prev, "b");

            expect(ids(next)).toEqual(["a", "c", "x"]);
            const m1 = next.filter(j => j.machineId === 'm1').sort((p, q) => p.order - q.order);
            expect(m1.map(j => [j.id, j.order])).toEqual([["a", 0], ["c", 1]]);
        });

        it("is a no-op for an id that is not on the board", () => {
            const prev = frozen([job("a", 0)]);
            expect(removeJobFromColumns(prev, "nope")).toEqual([...prev]);
        });

        it("renumbers every column after a bulk removal", () => {
            const remaining = frozen([
                job("a", 3, 'queued', 'm1'),
                job("b", 7, 'queued', 'm1'),
                job("x", 5, 'printing', 'm2'),
            ]);

            const next = reindexAllColumns(remaining);

            expect(next.filter(j => j.machineId === 'm1').map(j => j.order).sort()).toEqual([0, 1]);
            expect(next.filter(j => j.machineId === 'm2').map(j => j.order)).toEqual([0]);
        });
    });
});
