/*
 * What happens when the browser refuses a write.
 *
 * Quotes and production jobs both carry base64 thumbnails inside the same ~5 MB origin quota, so
 * a full store is an ordinary event for a busy shop. It used to be a fatal one: the production
 * board persists from a React effect, and a throw there reached the root error boundary, replaced
 * the whole app with the crash screen, and did it again on the next load.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    saveQuote,
    saveProductionJobs,
    saveProductionSettings,
    isStorageAvailable,
    StorageWriteError,
    STORAGE_FAILED_EVENT,
    StorageFailure,
} from "./sessionStorage";
import { QuoteData } from "@/types/quote";
import { ProductionJob } from "@/types/production";

const quotaError = () => {
    const err = new Error("Setting the value exceeded the quota.");
    err.name = "QuotaExceededError";
    return err;
};

const aQuote = (): QuoteData => ({
    id: "q-1",
    projectName: "Bracket",
    printType: "FDM",
    quantity: 1,
    totalPrice: 10,
    createdAt: new Date().toISOString(),
} as QuoteData);

const aJob = (): ProductionJob => ({
    id: "job-1",
    quote: aQuote(),
    status: "queued",
    machineId: null,
    priority: "normal",
    createdAt: new Date().toISOString(),
    order: 0,
} as ProductionJob);

describe("a refused write", () => {
    let setItem: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        localStorage.clear();
        // The node test environment supplies its own storage object (see src/test/setup.ts),
        // so the spy goes on the instance rather than on a DOM Storage prototype.
        setItem = vi.spyOn(globalThis.localStorage, "setItem").mockImplementation(() => {
            throw quotaError();
        });
    });

    afterEach(() => {
        setItem.mockRestore();
    });

    it("never throws out of the production board, which saves from an effect", () => {
        expect(() => saveProductionJobs([aJob()])).not.toThrow();
        expect(saveProductionJobs([aJob()])).toBe(false);

        expect(() => saveProductionSettings({ efficiency: 85, turnoverMinutes: 15, workHoursPerDay: 8, enabledMachineIds: [] })).not.toThrow();
    });

    it("throws a message a shop owner can act on where a caller is there to show it", () => {
        let caught: unknown;
        try {
            saveQuote(aQuote());
        } catch (err) {
            caught = err;
        }

        expect(caught).toBeInstanceOf(StorageWriteError);
        const failure = (caught as StorageWriteError).failure;
        expect(failure.full).toBe(true);
        expect(failure.message).toMatch(/storage is full/i);
        // Points somewhere useful rather than quoting the browser at the user.
        expect(failure.message).toMatch(/backup/i);
    });

    it("announces the failure on the window, so silent paths are still reported", () => {
        const seen: StorageFailure[] = [];
        const listener = (event: Event) => seen.push((event as CustomEvent<StorageFailure>).detail);
        window.addEventListener(STORAGE_FAILED_EVENT, listener);

        saveProductionJobs([aJob()]);

        window.removeEventListener(STORAGE_FAILED_EVENT, listener);
        expect(seen).toHaveLength(1);
        expect(seen[0].full).toBe(true);
        expect(seen[0].key).toBeTruthy();
    });

    it("distinguishes a blocked store from a full one", () => {
        setItem.mockImplementation(() => {
            throw new Error("The operation is insecure.");
        });

        let caught: StorageWriteError | undefined;
        try {
            saveQuote(aQuote());
        } catch (err) {
            caught = err as StorageWriteError;
        }

        expect(caught?.failure.full).toBe(false);
        expect(caught?.failure.message).toMatch(/browsing privately|site data blocked/i);
    });

    it("reports storage as unavailable", () => {
        expect(isStorageAvailable()).toBe(false);
    });
});

describe("a working store", () => {
    beforeEach(() => localStorage.clear());

    it("reports itself available and leaves no probe behind", () => {
        expect(isStorageAvailable()).toBe(true);
        expect(localStorage.getItem("__polymagic_probe__")).toBeNull();
    });

    it("saves a production board and says so", () => {
        expect(saveProductionJobs([aJob()])).toBe(true);
    });
});
