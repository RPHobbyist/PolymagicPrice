/*
 * The storage panel in Database Manager: how full the browser store is, what fills it, when the
 * last backup was taken and whether the browser has agreed to keep the data.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    getStorageUsage,
    recordBackupTaken,
    getLastBackupAt,
    resetSessionData,
    initializeDefaults,
    STORAGE_FAILED_EVENT,
} from "./sessionStorage";
import { getPersistenceState, requestPersistence } from "./storagePersistence";

describe("storage usage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("counts key plus value characters for every key, as the browser's limit does", () => {
        localStorage.setItem("session_quotes", "x".repeat(1000));
        localStorage.setItem("preferred-currency", "USD");

        const usage = getStorageUsage();

        expect(usage.usedChars).toBe("session_quotes".length + 1000 + "preferred-currency".length + 3);
    });

    it("names the big collections and puts the rest under settings, largest first", () => {
        localStorage.setItem("session_quotes", "q".repeat(5000));
        localStorage.setItem("session_production_jobs", "j".repeat(2000));
        localStorage.setItem("preferred-currency", "USD");

        const labels = getStorageUsage().collections.map(c => c.label);

        expect(labels).toEqual(["Quotes", "Production jobs", "Settings and other"]);
    });

    it("measures the web version against the 5,242,880 characters a Chromium browser allows", () => {
        expect(getStorageUsage().limitChars).toBe(5_242_880);
    });
});

describe("the last backup date", () => {
    beforeEach(() => {
        localStorage.clear();
        initializeDefaults();
    });

    it("is empty until a backup is taken", () => {
        expect(getLastBackupAt()).toBeNull();
    });

    it("is remembered once a backup is downloaded", () => {
        recordBackupTaken();
        expect(Date.parse(getLastBackupAt() ?? "")).not.toBeNaN();
    });

    it("is forgotten by a reset, which deletes the data that backup was of", () => {
        recordBackupTaken();
        resetSessionData();
        expect(getLastBackupAt()).toBeNull();
    });

    it("does not report a storage failure when a full store refuses the date", () => {
        const failures: Event[] = [];
        const listener = (e: Event) => failures.push(e);
        window.addEventListener(STORAGE_FAILED_EVENT, listener);
        const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
            const err = new Error("full");
            err.name = "QuotaExceededError";
            throw err;
        });

        try {
            const at = recordBackupTaken();
            expect(Date.parse(at)).not.toBeNaN();
            expect(failures).toHaveLength(0);
        } finally {
            setItem.mockRestore();
            window.removeEventListener(STORAGE_FAILED_EVENT, listener);
        }
    });
});

describe("asking the browser to keep the data", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("reports unsupported where there is no Storage API", async () => {
        vi.stubGlobal("navigator", {});
        expect(await getPersistenceState()).toBe("unsupported");
        expect(await requestPersistence()).toBe("unsupported");
    });

    it("reports what the browser answers", async () => {
        vi.stubGlobal("navigator", {
            storage: { persisted: async () => false, persist: async () => true },
        });
        expect(await getPersistenceState()).toBe("best-effort");
        expect(await requestPersistence()).toBe("persisted");
    });

    it("treats a refusal that throws as unsupported rather than failing the page", async () => {
        vi.stubGlobal("navigator", {
            storage: { persisted: async () => { throw new Error("blocked"); } },
        });
        expect(await getPersistenceState()).toBe("unsupported");
    });
});
