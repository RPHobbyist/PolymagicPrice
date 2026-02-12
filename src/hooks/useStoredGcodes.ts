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
import { StoredGcode } from "@/types/quote";
import { toast } from "sonner";
import * as sessionStore from "@/lib/core/sessionStorage";

interface UseStoredGcodesReturn {
    gcodes: StoredGcode[];
    loading: boolean;
    error: string | null;
    saveGcode: (gcode: StoredGcode) => Promise<void>;
    deleteGcode: (id: string) => Promise<void>;
    refetch: () => Promise<void>;
}

export const useStoredGcodes = (): UseStoredGcodesReturn => {
    const [gcodes, setGcodes] = useState<StoredGcode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGcodes = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // In a real app with backend, this would be an API call
            // For now we use the synchronous sessionStore but simulate async for consistency
            const data = sessionStore.getGcodes();
            // Sort by newest first
            setGcodes(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (err) {
            const error = err as Error;
            const errorMessage = error.message || "Failed to load stored G-code files";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGcodes();
    }, [fetchGcodes]);

    const saveGcode = useCallback(async (gcode: StoredGcode) => {
        try {
            const gcodeToSave = {
                ...gcode,
                createdAt: gcode.createdAt || new Date().toISOString()
            };

            const saved = sessionStore.saveGcode(gcodeToSave);

            setGcodes(prev => {
                // Check if updating
                const exists = prev.some(g => g.id === saved.id);
                if (exists) {
                    return prev.map(g => g.id === saved.id ? saved : g);
                }
                return [saved, ...prev];
            });

            toast.success("File saved to library successfully");
        } catch (err) {
            const error = err as Error;
            toast.error(error.message || "Failed to save file");
            throw err;
        }
    }, []);

    const deleteGcode = useCallback(async (id: string) => {
        try {
            sessionStore.deleteGcode(id);
            setGcodes(prev => prev.filter(g => g.id !== id));
            toast.success("File removed from library");
        } catch (err) {
            const error = err as Error;
            toast.error(error.message || "Failed to delete file");
            throw err;
        }
    }, []);

    return {
        gcodes,
        loading,
        error,
        saveGcode,
        deleteGcode,
        refetch: fetchGcodes,
    };
};
