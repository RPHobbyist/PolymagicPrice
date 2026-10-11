/*
 * Database Manager's small helpers: the age of the last backup, and the message that has to
 * survive the reload after an import or a reset.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import {
    describeBackupAge,
    stashReloadNotice,
    takeReloadNotice,
    announceDataReplaced,
    onDataReplacedElsewhere,
} from "./databaseManager";

/** A local date and time, as the shop's clock shows it. */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

describe("the age of the last backup", () => {
    it("calls a backup from 23:50 last night yesterday, not today", () => {
        const label = describeBackupAge(at(2026, 10, 10, 23, 50).toISOString(), at(2026, 10, 11, 0, 10));
        expect(label).toMatch(/\(yesterday\)$/);
    });

    it("calls a backup from this morning today", () => {
        expect(describeBackupAge(at(2026, 10, 11, 8).toISOString(), at(2026, 10, 11, 18))).toMatch(/\(today\)$/);
    });

    it("counts calendar days, so 47 hours across two midnights is two days", () => {
        expect(describeBackupAge(at(2026, 10, 9, 23).toISOString(), at(2026, 10, 11, 22))).toMatch(/\(2 days ago\)$/);
    });

    it("shows a timestamp from a clock that ran ahead as today", () => {
        expect(describeBackupAge(at(2026, 10, 12).toISOString(), at(2026, 10, 11))).toMatch(/\(today\)$/);
    });
});

describe("telling other tabs the data was replaced", () => {
    const settle = () => new Promise(resolve => setTimeout(resolve, 50));

    it("reaches a listener in another tab", async () => {
        const handler = vi.fn();
        const stop = onDataReplacedElsewhere(handler);

        // What another tab's announcement looks like on the wire.
        const otherTab = new BroadcastChannel("polymagic-data");
        otherTab.postMessage({ type: "data-replaced", from: "another-tab" });
        await settle();

        otherTab.close();
        stop();
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it("does not make the tab that sent it reload itself", async () => {
        const handler = vi.fn();
        const stop = onDataReplacedElsewhere(handler);

        announceDataReplaced();
        await settle();

        stop();
        expect(handler).not.toHaveBeenCalled();
    });
});

describe("the message carried across a reload", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const memorySession = () => {
        const store = new Map<string, string>();
        return {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => { store.set(k, v); },
            removeItem: (k: string) => { store.delete(k); },
        };
    };

    it("is shown once, then forgotten", () => {
        vi.stubGlobal("sessionStorage", memorySession());

        stashReloadNotice({ kind: "warning", message: "Settings imported. Skipped 2 quotes." });

        expect(takeReloadNotice()).toEqual({ kind: "warning", message: "Settings imported. Skipped 2 quotes." });
        expect(takeReloadNotice()).toBeNull();
    });

    it("ignores a corrupt entry", () => {
        const session = memorySession();
        session.setItem("polymagic_reload_notice", "{not json");
        vi.stubGlobal("sessionStorage", session);

        expect(takeReloadNotice()).toBeNull();
    });

    it("does nothing, without throwing, where session storage is blocked", () => {
        vi.stubGlobal("sessionStorage", {
            getItem: () => { throw new Error("blocked"); },
            setItem: () => { throw new Error("blocked"); },
            removeItem: () => { throw new Error("blocked"); },
        });

        expect(() => stashReloadNotice({ kind: "success", message: "x" })).not.toThrow();
        expect(takeReloadNotice()).toBeNull();
    });
});
