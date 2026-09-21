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
import { useState, useEffect, useCallback, useRef } from "react";
import { ollamaClient } from "../services/ai/OllamaClient";
import { toast } from "sonner";
import { isAIAllowed } from "@/lib/utils";
import { useAISettings } from "./useAISettings";

type AIStatus = "connected" | "disconnected" | "disabled" | "checking";

/** Normal cadence, and the slower one used once the server stops answering. */
const POLL_MS = 60_000;
const BACKOFF_POLL_MS = 300_000;
/** Consecutive failures before we call it disconnected out loud. */
const FAILURE_TOLERANCE = 2;

export function useAIStatus() {
    const isAllowed = isAIAllowed;
    const settings = useAISettings();
    const [status, setStatus] = useState<AIStatus>("checking");

    // Kept in refs so a flapping connection doesn't spam toasts and doesn't
    // rebuild the polling effect on every check.
    const failureCountRef = useRef(0);
    const announcedRef = useRef<AIStatus>("checking");

    const checkStatus = useCallback(async () => {
        if (!isAllowed || !settings.enabled) {
            failureCountRef.current = 0;
            announcedRef.current = "disabled";
            setStatus("disabled");
            return;
        }

        const isConnected = await ollamaClient.testConnection();

        if (isConnected) {
            failureCountRef.current = 0;
            setStatus("connected");
            if (announcedRef.current === "disconnected") {
                toast.success("AI Assistant online");
            }
            announcedRef.current = "connected";
            return;
        }

        failureCountRef.current += 1;
        if (failureCountRef.current >= FAILURE_TOLERANCE) {
            setStatus("disconnected");
            if (announcedRef.current === "connected") {
                toast.error("AI connection lost — check that Ollama is running");
            }
            announcedRef.current = "disconnected";
        }
    }, [settings.enabled, isAllowed]);

    useEffect(() => {
        if (!isAllowed) {
            setStatus("disabled");
            return;
        }

        // `cancelled` (not just clearTimeout) matters here: if `checkStatus`
        // changes identity — e.g. settings.enabled flips — while a poll's
        // `await checkStatus()` is already in flight, clearTimeout can't
        // interrupt that running callback. Without this flag it would still
        // call schedule() on its own stale closure once the await resolves,
        // leaving a second polling loop running forever alongside the new one.
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;

        const schedule = () => {
            const delay = failureCountRef.current >= FAILURE_TOLERANCE ? BACKOFF_POLL_MS : POLL_MS;
            timer = setTimeout(async () => {
                if (cancelled) return;
                // Polling a hidden tab wakes the model server for nothing.
                if (typeof document === "undefined" || document.visibilityState === "visible") {
                    await checkStatus();
                }
                if (!cancelled) schedule();
            }, delay);
        };

        checkStatus();
        schedule();

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
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
