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

import { useState, useEffect, useCallback } from "react";
import { AISettings } from "@/types/quote";
import { getAISettings, AI_SETTINGS_EVENT } from "@/lib/core/sessionStorage";

/**
 * AI settings as reactive state.
 *
 * Reading getAISettings() during render meant saving in Settings had no effect
 * anywhere else until that component happened to re-render. This listens for
 * the save event and for cross-tab storage writes instead.
 */
export function useAISettings(): AISettings {
    const [settings, setSettings] = useState<AISettings>(getAISettings);

    const sync = useCallback(() => setSettings(getAISettings()), []);

    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === "session_ai_settings") sync();
        };

        window.addEventListener(AI_SETTINGS_EVENT, sync);
        window.addEventListener("storage", handleStorage);
        return () => {
            window.removeEventListener(AI_SETTINGS_EVENT, sync);
            window.removeEventListener("storage", handleStorage);
        };
    }, [sync]);

    return settings;
}
