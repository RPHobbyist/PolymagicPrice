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
import { ollamaClient } from "../services/ai/OllamaClient";
import { getAISettings } from "@/lib/core/sessionStorage";
import { toast } from "sonner";
import { isAIAllowed } from "@/lib/utils";

type AIStatus = "connected" | "disconnected" | "disabled" | "checking";

export function useAIStatus() {
    const isAllowed = isAIAllowed;
    const [status, setStatus] = useState<AIStatus>("checking");
    const settings = getAISettings();

    const checkStatus = useCallback(async () => {
        if (!isAllowed || !settings.enabled) {
            setStatus("disabled");
            return;
        }

        try {
            const isConnected = await ollamaClient.testConnection();
            setStatus(isConnected ? "connected" : "disconnected");
        } catch (err) {
            const error = err as Error;
            // Only toast if it was previously connected to avoid spamming while offline
            if (status === "connected") {
                toast.error(error.message || "AI Connection Lost");
            }
            setStatus("disconnected");
        }
    }, [settings.enabled, status]);

    useEffect(() => {
        if (!isAllowed) return;
        
        checkStatus();

        // Poll every 30 seconds
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, [checkStatus, isAllowed]);

    return {
        status,
        checkStatus,
        isEnabled: isAllowed && settings.enabled,
        // Metadata for UI security badges
        isLocalOnly: true,
        securityLevel: "high" as const
    };
}
