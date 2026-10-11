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
 * Which release the "What's New" dialog announces, and where it remembers having announced it.
 *
 * These live apart from the dialog itself so the layout can decide whether the announcement is due
 * — a two-line localStorage read — without importing the dialog. The dialog is lazily loaded, and
 * a returning shop on the current version should never download it at all.
 */
export const CURRENT_VERSION = "2.0.2"; // Revenue definition, failure rate and pricing adjustments
export const WHATS_NEW_STORAGE_KEY = "last_seen_version";

/** True when this browser has not yet been shown the current release's notes. */
export const isWhatsNewDue = (): boolean => {
    try {
        return localStorage.getItem(WHATS_NEW_STORAGE_KEY) !== CURRENT_VERSION;
    } catch {
        // Site data blocked: better to stay quiet than to announce the same release every load.
        return false;
    }
};
