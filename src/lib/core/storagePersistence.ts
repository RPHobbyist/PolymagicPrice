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
 * Whether the browser may clear this site's data on its own.
 *
 * Everything a site stores, `localStorage` included, is "best-effort" by default: the browser may
 * evict it when the disk is under pressure, and Safari also after a period without use. Asking for
 * persistent mode is the only lever a site has, and it is a request, not a guarantee — WebKit says
 * a persistent origin "might be excluded" from eviction, and grants the request mostly to sites
 * opened as a Home Screen web app. Chromium decides silently from how much the site is used;
 * Firefox asks the user, which is why the request is tied to a button rather than made on start.
 *
 * Sources: MDN "Storage quotas and eviction criteria"; WebKit "Updates to Storage Policy".
 */
export type PersistenceState = "persisted" | "best-effort" | "unsupported";

export const getPersistenceState = async (): Promise<PersistenceState> => {
    try {
        if (typeof navigator === "undefined" || !navigator.storage?.persisted) return "unsupported";
        return (await navigator.storage.persisted()) ? "persisted" : "best-effort";
    } catch {
        return "unsupported";
    }
};

export const requestPersistence = async (): Promise<PersistenceState> => {
    try {
        if (typeof navigator === "undefined" || !navigator.storage?.persist) return "unsupported";
        return (await navigator.storage.persist()) ? "persisted" : "best-effort";
    } catch {
        return "unsupported";
    }
};
