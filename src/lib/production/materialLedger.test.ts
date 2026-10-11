import { describe, it, expect } from "vitest";
import { pendingFailedUnits, reprintUnits, restorableOnRemoval } from "./materialLedger";
import { ProductionJob } from "@/types/production";

const job = (over: Partial<ProductionJob> & { failedUnits?: number; quantity?: number } = {}): ProductionJob => {
    const { failedUnits, quantity, ...rest } = over;
    return {
        id: "j", status: "queued", machineId: null, priority: "medium", createdAt: "", order: 0,
        quote: { id: "q", quantity: quantity ?? 5, failedUnits, parameters: { filamentWeight: "10" } },
        ...rest,
    } as unknown as ProductionJob;
};

describe("scrap ledger", () => {
    it("deducts a failure once across reprint and completion", () => {
        let j = job({ failedUnits: 2 });
        expect(reprintUnits(j)).toBe(2);
        j = { ...j, failedUnitsDeducted: 2 };
        // completion reconciliation finds nothing left to take
        expect(pendingFailedUnits(j)).toBe(0);
    });

    it("a second failure only deducts the new units, not the cumulative count", () => {
        const j = job({ failedUnits: 3, failedUnitsDeducted: 2 });
        expect(reprintUnits(j)).toBe(1);
    });

    it("falls back to the whole quantity when no failure count was recorded", () => {
        expect(reprintUnits(job({ quantity: 4 }))).toBe(4);
    });
});

describe("restorableOnRemoval", () => {
    it("gives back only the current attempt of a print in progress", () => {
        expect(restorableOnRemoval(job({ status: "printing", inventoryDeducted: 70, attemptDeducted: 20 }))).toBe(20);
        expect(restorableOnRemoval(job({ status: "printing", inventoryDeducted: 50 }))).toBe(50);
    });
    it("gives back nothing for finished, failed or queued jobs", () => {
        for (const status of ["completed", "post_processing", "queued"] as const) {
            expect(restorableOnRemoval(job({ status, inventoryDeducted: 50 }))).toBe(0);
        }
    });
});
