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

import { readAppData, replaceAppData } from "./sessionStorage";

/**
 * Safety copies: the shop's whole data set, saved automatically before anything replaces it.
 *
 * Import and reset overwrite everything, and the only way back used to be a backup file the shop
 * had remembered to download. A copy is now taken just before each import, reset and restore, so
 * any of them can be undone from Database Manager.
 *
 * Copies live in IndexedDB, not `localStorage`: the copy of a nearly full store would not fit
 * beside it inside the same 5 MB, while IndexedDB has the browser's much larger quota. They stay
 * on this device only, and the last three are kept.
 */
export type SnapshotReason = "import" | "reset" | "restore";

export interface SnapshotSummary {
    id: string;
    takenAt: string;
    reason: SnapshotReason;
    /** Characters of key plus value, the unit the browser's storage limit counts. */
    chars: number;
}

/** Where copies are kept. IndexedDB in the app; an in-memory stand-in in tests. */
export interface SnapshotStore {
    put(summary: SnapshotSummary, entries: Record<string, string>): Promise<void>;
    /** Newest first. */
    list(): Promise<SnapshotSummary[]>;
    get(id: string): Promise<Record<string, string> | undefined>;
    remove(id: string): Promise<void>;
}

const KEEP = 3;
const DB_NAME = "polymagic-safety-copies";
const META = "meta";
const DATA = "data";

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not available"));
        return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
        req.result.createObjectStore(META, { keyPath: "id" });
        req.result.createObjectStore(DATA);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another tab"));
});

const settle = (tx: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
});

const result = <T>(req: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

const withDb = async <T>(work: (db: IDBDatabase) => Promise<T>): Promise<T> => {
    const db = await openDb();
    try {
        return await work(db);
    } finally {
        db.close();
    }
};

/**
 * Newest first. Two copies can share a millisecond — a restore takes its own copy straight after
 * reading the one it restores — so ties fall back to the id, which carries a rising sequence.
 */
const newestFirst = (a: SnapshotSummary, b: SnapshotSummary): number =>
    b.takenAt.localeCompare(a.takenAt) || b.id.localeCompare(a.id);

let sequence = 0;

const indexedDbStore: SnapshotStore = {
    put: (summary, entries) => withDb(async db => {
        const tx = db.transaction([META, DATA], "readwrite");
        tx.objectStore(META).put(summary);
        tx.objectStore(DATA).put(entries, summary.id);
        await settle(tx);
    }),
    list: () => withDb(async db => {
        const all = await result(db.transaction(META).objectStore(META).getAll()) as SnapshotSummary[];
        return all.sort(newestFirst);
    }),
    get: id => withDb(db => result(db.transaction(DATA).objectStore(DATA).get(id)) as Promise<Record<string, string> | undefined>),
    remove: id => withDb(async db => {
        const tx = db.transaction([META, DATA], "readwrite");
        tx.objectStore(META).delete(id);
        tx.objectStore(DATA).delete(id);
        await settle(tx);
    }),
};

let store: SnapshotStore = indexedDbStore;

/** Swaps in another store. Tests only. */
export const setSnapshotStoreForTests = (replacement: SnapshotStore): void => {
    store = replacement;
};

/** Whether this browser can keep safety copies at all. */
export const snapshotsSupported = (): boolean => typeof indexedDB !== "undefined" || store !== indexedDbStore;

/**
 * Copies the shop's current data, then drops all but the newest three copies.
 * Returns false when the copy could not be saved; callers carry on and say so.
 */
export const takeSnapshot = async (reason: SnapshotReason): Promise<boolean> => {
    try {
        const entries = readAppData();
        const chars = Object.entries(entries).reduce((sum, [k, v]) => sum + k.length + v.length, 0);
        const summary: SnapshotSummary = {
            id: `${Date.now().toString(36)}-${(sequence++).toString(36).padStart(4, "0")}-${Math.random().toString(36).slice(2, 8)}`,
            takenAt: new Date().toISOString(),
            reason,
            chars,
        };

        await store.put(summary, entries);
        const all = (await store.list()).sort(newestFirst);
        for (const old of all.slice(KEEP)) {
            await store.remove(old.id);
        }
        return true;
    } catch (err: unknown) {
        console.warn("[Safety copies] Could not save a safety copy.", err);
        return false;
    }
};

/** Newest first; empty when there are none or they cannot be read. */
export const listSnapshots = async (): Promise<SnapshotSummary[]> => {
    try {
        return (await store.list()).sort(newestFirst);
    } catch (err: unknown) {
        console.warn("[Safety copies] Could not list safety copies.", err);
        return [];
    }
};

/**
 * Puts the shop's data back as one copy recorded it.
 *
 * Takes a copy of the current data first, so the restore can itself be undone. The copy being
 * restored is read before that, because keeping only three may drop it as the oldest.
 */
export const restoreSnapshot = async (id: string): Promise<{ success: boolean; message: string }> => {
    let entries: Record<string, string> | undefined;
    try {
        entries = await store.get(id);
    } catch (err: unknown) {
        console.warn("[Safety copies] Could not read a safety copy.", err);
    }
    if (!entries || typeof entries !== "object") {
        return { success: false, message: "That safety copy could not be read, so nothing was changed." };
    }

    await takeSnapshot("restore");
    return replaceAppData(entries);
};
