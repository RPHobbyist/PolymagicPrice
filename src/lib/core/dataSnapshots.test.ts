/*
 * Safety copies: taken before every import, reset and restore, so each can be undone.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    takeSnapshot,
    listSnapshots,
    restoreSnapshot,
    setSnapshotStoreForTests,
    SnapshotStore,
    SnapshotSummary,
} from "./dataSnapshots";
import {
    initializeDefaults,
    saveCustomer,
    getCustomers,
    resetSessionData,
    readAppData,
    replaceAppData,
} from "./sessionStorage";

/** IndexedDB's job, done in memory. */
const memoryStore = (): SnapshotStore & { failing: boolean } => {
    const meta = new Map<string, SnapshotSummary>();
    const data = new Map<string, Record<string, string>>();
    const store = {
        failing: false,
        put: async (summary: SnapshotSummary, entries: Record<string, string>) => {
            if (store.failing) throw new Error("quota");
            meta.set(summary.id, summary);
            data.set(summary.id, structuredClone(entries));
        },
        list: async () => [...meta.values()].sort((a, b) => b.takenAt.localeCompare(a.takenAt)),
        get: async (id: string) => data.get(id),
        remove: async (id: string) => { meta.delete(id); data.delete(id); },
    };
    return store;
};

describe("safety copies", () => {
    let store: ReturnType<typeof memoryStore>;

    beforeEach(() => {
        vi.useRealTimers();
        localStorage.clear();
        initializeDefaults();
        store = memoryStore();
        setSnapshotStoreForTests(store);
    });

    it("undo a reset: the customers come back exactly", async () => {
        saveCustomer({ name: "Tom's Prints & Co.", email: "tom@example.com" });
        const before = readAppData();

        expect(await takeSnapshot("reset")).toBe(true);
        resetSessionData();
        expect(getCustomers()).toHaveLength(0);

        const [copy] = await listSnapshots();
        const result = await restoreSnapshot(copy.id);

        expect(result.success).toBe(true);
        expect(getCustomers()[0].name).toBe("Tom's Prints & Co.");
        expect(readAppData()).toEqual(before);
    });

    it("keeps only the newest three", async () => {
        vi.useFakeTimers();
        for (let i = 0; i < 5; i++) {
            vi.setSystemTime(new Date(2026, 9, 11, 10, i));
            await takeSnapshot("import");
        }
        vi.useRealTimers();

        const list = await listSnapshots();
        expect(list).toHaveLength(3);
        expect(list.map(s => new Date(s.takenAt).getMinutes())).toEqual([4, 3, 2]);
    });

    it("saves the current data before restoring, so a restore can be undone too", async () => {
        await takeSnapshot("import");
        const [copy] = await listSnapshots();
        saveCustomer({ name: "Added after the copy" });

        await restoreSnapshot(copy.id);

        const list = await listSnapshots();
        expect(list[0].reason).toBe("restore");
        const undoCopy = await store.get(list[0].id);
        expect(undoCopy?.session_customers).toContain("v1:enc:");
    });

    it("changes nothing when the copy cannot be found", async () => {
        const before = readAppData();
        const result = await restoreSnapshot("missing");
        expect(result.success).toBe(false);
        expect(readAppData()).toEqual(before);
    });

    it("reports false, without throwing, when the copy cannot be saved", async () => {
        store.failing = true;
        expect(await takeSnapshot("reset")).toBe(false);
    });
});

describe("replacing the stored data with a copy", () => {
    beforeEach(() => {
        localStorage.clear();
        initializeDefaults();
    });

    it("drops keys the copy did not have, and writes nothing that is not app data", () => {
        localStorage.setItem("preferred-currency", "EUR");
        const result = replaceAppData({ session_quotes: "[]", "someone-elses-key": "x" });

        expect(result.success).toBe(true);
        expect(localStorage.getItem("preferred-currency")).toBeNull();
        expect(localStorage.getItem("session_materials")).toBeNull();
        expect(localStorage.getItem("someone-elses-key")).toBeNull();
        expect(localStorage.getItem("session_quotes")).toBe("[]");
    });

    it("puts the data back when the browser refuses part-way", () => {
        const before = readAppData();
        const real = localStorage.setItem.bind(localStorage);
        let calls = 0;
        const setItem = vi.spyOn(localStorage, "setItem").mockImplementation((key: string, value: string) => {
            calls++;
            // Refuse the third write of the restore; let the rollback through.
            if (calls === 3) {
                const err = new Error("full");
                err.name = "QuotaExceededError";
                throw err;
            }
            real(key, value);
        });

        try {
            const result = replaceAppData({ session_quotes: "[]", session_customers: "[]", session_spools: "[]", session_gcodes: "[]" });
            expect(result.success).toBe(false);
            expect(readAppData()).toEqual(before);
        } finally {
            setItem.mockRestore();
        }
    });
});
