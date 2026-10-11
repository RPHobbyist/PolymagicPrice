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

import { useEffect } from "react";
import { toast } from "sonner";
import { onDataReplacedElsewhere, stashReloadNotice, takeReloadNotice } from "@/lib/databaseManager";

/**
 * Keeps every open tab on the same data after an import, reset or restore.
 *
 * Shows the message the last reload carried (whichever page the tab reloaded on), and reloads this
 * tab when another one replaces the data, so it never saves its stale in-memory copy over the new.
 */
export const useReloadNotices = () => {
    useEffect(() => {
        const notice = takeReloadNotice();
        if (notice) {
            if (notice.kind === "warning") {
                toast.warning(notice.message, { duration: 12_000 });
            } else {
                toast.success(notice.message);
            }
        }

        return onDataReplacedElsewhere(() => {
            stashReloadNotice({
                kind: "warning",
                message: "Your data was imported, reset or restored in another tab, so this tab reloaded to match.",
            });
            window.location.reload();
        });
    }, []);
};
