/*
 * Spool stock: the totals, and the single-pass aggregation behind them.
 *
 * `getLowStockMaterials` used to call `getMaterialStock` per material, and each of those re-read,
 * re-parsed and re-decrypted the whole spool store. `deductFromSpool` cost four such passes, and
 * the production board can call it three times for one card drag. These tests pin the numbers so
 * the faster shape cannot quietly change them.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    saveSpool,
    deleteSpool,
    deductFromSpool,
    restoreToSpool,
    getMaterialStock,
    getLowStockMaterials,
    findBestSpoolMatch,
    getMaterials,
    saveMaterial,
} from "./sessionStorage";

/**
 * Creates a material and returns its id.
 *
 * Note for anyone extending these tests: `saveMaterial` only updates a record whose id already
 * exists — passing an id it has never seen stores nothing at all — so a new material has to be
 * created without one and its generated id read back.
 */
const aMaterial = (name: string, lowStockThreshold?: number): string =>
    saveMaterial({ name, cost_per_unit: 25, unit: "kg", print_type: "FDM", lowStockThreshold } as never).id;

describe("spool stock", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("totals every spool of a material", () => {
        const m1 = aMaterial("PLA");
        const m2 = aMaterial("PETG");
        saveSpool({ materialId: m1, initialWeight: 1000, currentWeight: 750 } as never);
        saveSpool({ materialId: m1, initialWeight: 1000, currentWeight: 250 } as never);
        saveSpool({ materialId: m2, initialWeight: 1000, currentWeight: 900 } as never);

        expect(getMaterialStock(m1)).toBe(1000);
        expect(getMaterialStock(m2)).toBe(900);
        expect(getMaterialStock("unknown")).toBe(0);
    });

    it("caches the total on the material record after a deduction", () => {
        const m1 = aMaterial("PLA");
        const spool = saveSpool({ materialId: m1, initialWeight: 1000, currentWeight: 1000 } as never);

        deductFromSpool(spool.id, 250);

        expect(getMaterialStock(m1)).toBe(750);
        expect(getMaterials().find(m => m.id === m1)?.totalInStock).toBe(750);
    });

    it("returns only what was actually taken, and restores exactly that", () => {
        const m1 = aMaterial("PLA");
        const spool = saveSpool({ materialId: m1, initialWeight: 1000, currentWeight: 100 } as never);

        // Asking for more than the spool holds takes it to zero, not below.
        expect(deductFromSpool(spool.id, 250)).toBe(100);
        expect(getMaterialStock(m1)).toBe(0);

        expect(restoreToSpool(spool.id, 100)).toBe(100);
        expect(getMaterialStock(m1)).toBe(100);
    });

    it("drops a deleted spool from the material's cached total", () => {
        const m1 = aMaterial("PLA");
        saveSpool({ materialId: m1, initialWeight: 1000, currentWeight: 400 } as never);
        const drop = saveSpool({ materialId: m1, initialWeight: 1000, currentWeight: 600 } as never);
        expect(getMaterials().find(m => m.id === m1)?.totalInStock).toBe(1000);

        deleteSpool(drop.id);

        expect(getMaterialStock(m1)).toBe(400);
        expect(getMaterials().find(m => m.id === m1)?.totalInStock).toBe(400);
    });

    describe("low stock", () => {
        it("flags a material under its own threshold and leaves the others alone", () => {
            const m1 = aMaterial("PLA", 500);
            const m2 = aMaterial("PETG", 100);
            saveSpool({ materialId: m1, initialWeight: 1000, currentWeight: 300 } as never);
            saveSpool({ materialId: m2, initialWeight: 1000, currentWeight: 300 } as never);

            const low = getLowStockMaterials().map(m => m.id);

            expect(low).toContain(m1);
            expect(low).not.toContain(m2);
        });

        it("flags a material with no spools at all", () => {
            const m1 = aMaterial("PLA", 200);
            expect(getLowStockMaterials().map(m => m.id)).toContain(m1);
        });

        it("reads the spool store once, not once per material", () => {
            for (let i = 0; i < 12; i++) {
                const id = aMaterial(`Filament ${i}`, 200);
                saveSpool({ materialId: id, initialWeight: 1000, currentWeight: 50 } as never);
            }

            const getItem = vi.spyOn(globalThis.localStorage, "getItem");
            getLowStockMaterials();
            const spoolReads = getItem.mock.calls.filter(([key]) => key === "session_spools").length;
            getItem.mockRestore();

            // One read for the whole call. The old shape did one per material.
            expect(spoolReads).toBe(1);
        });
    });
});

describe("restoring to a spool", () => {
    beforeEach(() => localStorage.clear());

    it("cannot refill a spool beyond its starting weight", () => {
        const m = aMaterial("PLA");
        const s = saveSpool({ materialId: m, initialWeight: 1000, currentWeight: 900 } as never);
        expect(restoreToSpool(s.id, 500)).toBe(100);
        expect(getMaterialStock(m)).toBe(1000);
    });
});

describe("choosing a spool", () => {
    beforeEach(() => localStorage.clear());

    it("skips an empty spool when no colour is given", () => {
        const m = aMaterial("PLA");
        saveSpool({ materialId: m, initialWeight: 1000, currentWeight: 0, colour: "Black" } as never);
        const full = saveSpool({ materialId: m, initialWeight: 1000, currentWeight: 800, colour: "Red" } as never);
        expect(findBestSpoolMatch("PLA", "")?.id).toBe(full.id);
    });

    it("prefers the right colour, then a spool that can cover the job", () => {
        const m = aMaterial("PLA");
        const smallRed = saveSpool({ materialId: m, initialWeight: 1000, currentWeight: 50, colour: "Red" } as never);
        const bigRed = saveSpool({ materialId: m, initialWeight: 1000, currentWeight: 600, colour: "Red" } as never);
        saveSpool({ materialId: m, initialWeight: 1000, currentWeight: 900, colour: "Blue" } as never);
        expect(findBestSpoolMatch("PLA", "red", { amount: 200 })?.id).toBe(bigRed.id);
        expect(findBestSpoolMatch("PLA", "red", { amount: 10 })?.id).toBe(bigRed.id);
        expect(smallRed.id).not.toBe(bigRed.id);
    });

    it("finds the material by id when it has been renamed", () => {
        const m = aMaterial("PLA Renamed");
        const s = saveSpool({ materialId: m, initialWeight: 1000, currentWeight: 500 } as never);
        expect(findBestSpoolMatch("PLA (old name)", "", { materialId: m })?.id).toBe(s.id);
    });
});
