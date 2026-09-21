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

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { STORAGE_FAILED_EVENT, StorageFailure } from "@/lib/core/sessionStorage";

/**
 * Tells the shop when a write was refused.
 *
 * The persistence layer announces every refusal on the window; without a listener the paths that
 * cannot throw — the production board saves from an effect — would fail in complete silence, and
 * a shop would keep dragging cards that stop surviving a reload.
 *
 * One message per minute at most. A full quota fails on every keystroke-driven save, and burying
 * the screen in identical toasts helps nobody.
 */
export const useStorageHealth = () => {
    const lastShownAt = useRef(0);

    useEffect(() => {
        const handleFailure = (event: Event) => {
            const failure = (event as CustomEvent<StorageFailure>).detail;
            if (!failure) return;

            const now = Date.now();
            if (now - lastShownAt.current < 60_000) return;
            lastShownAt.current = now;

            toast.error(failure.full ? "Storage is full" : "Could not save", {
                description: failure.message,
                duration: 12_000,
            });
        };

        window.addEventListener(STORAGE_FAILED_EVENT, handleFailure);
        return () => window.removeEventListener(STORAGE_FAILED_EVENT, handleFailure);
    }, []);
};
