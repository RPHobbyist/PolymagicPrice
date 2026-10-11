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

/**
 * "Oct 10, 2026 (yesterday)": the date of the last backup and how many calendar days ago it was.
 *
 * Counted between local midnights, not in elapsed 24-hour blocks. Elapsed time labelled a backup
 * from 23:50 last night "(today)" twenty minutes later, right beside yesterday's date. Rounding,
 * rather than flooring, absorbs the 23- and 25-hour days at a daylight-saving change.
 */
export const describeBackupAge = (iso: string, now: Date = new Date()): string => {
    const then = new Date(iso);
    const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((midnight(now) - midnight(then)) / 86_400_000);
    const date = then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

    // A timestamp from the future (a clock that was ahead) is shown as today, not "-1 days ago".
    if (days <= 0) return `${date} (today)`;
    if (days === 1) return `${date} (yesterday)`;
    return `${date} (${days} days ago)`;
};

const CHANNEL = "polymagic-data";

/**
 * Identifies this page load. A BroadcastChannel delivers to every other channel object of the
 * same name, including the ones in the tab that sent it, so a tab must recognise its own message.
 */
const TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Tells every other open tab that the stored data has just been replaced.
 *
 * After an import, reset or restore, another tab still holds the old data in memory. Most screens
 * re-read storage before they write, but the batch tray saves its in-memory list whole and does not
 * listen for changes from other tabs, so its next change wrote the old tray straight back. Those
 * tabs reload instead.
 */
export const announceDataReplaced = (): void => {
    try {
        const channel = new BroadcastChannel(CHANNEL);
        channel.postMessage({ type: "data-replaced", from: TAB_ID });
        channel.close();
    } catch {
        // No BroadcastChannel: other tabs keep their per-key storage listeners, as before.
    }
};

/** Calls `handler` when another tab replaces the data. Returns the unsubscribe function. */
export const onDataReplacedElsewhere = (handler: () => void): (() => void) => {
    if (typeof BroadcastChannel === "undefined") return () => {};
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; from?: string } | null;
        if (data?.type === "data-replaced" && data.from !== TAB_ID) handler();
    };
    return () => channel.close();
};

/** A message to show once the page has reloaded after an import or a reset. */
export interface ReloadNotice {
    kind: "success" | "warning";
    message: string;
}

const NOTICE_KEY = "polymagic_reload_notice";

/**
 * Keeps a message across the reload that follows an import or a reset.
 *
 * Those used to wait one to six seconds so their toast could be read before the reload cleared it.
 * During that wait the providers still held the old data in memory and save it on every change,
 * so adding a job in those seconds wrote the old board over the one just imported. Reloading at
 * once and showing the message afterwards closes that window.
 *
 * Lives in the tab's sessionStorage, which survives a reload and is gone when the tab closes.
 */
export const stashReloadNotice = (notice: ReloadNotice): void => {
    try {
        sessionStorage.setItem(NOTICE_KEY, JSON.stringify(notice));
    } catch {
        // No session storage: the reload still happens, the message is just not shown.
    }
};

/** Returns the stashed message once, then forgets it. */
export const takeReloadNotice = (): ReloadNotice | null => {
    try {
        const raw = sessionStorage.getItem(NOTICE_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(NOTICE_KEY);

        const parsed = JSON.parse(raw);
        if (parsed && (parsed.kind === "success" || parsed.kind === "warning") && typeof parsed.message === "string") {
            return parsed;
        }
    } catch {
        // A blocked or corrupt entry is not worth an error on page load.
    }
    return null;
};
