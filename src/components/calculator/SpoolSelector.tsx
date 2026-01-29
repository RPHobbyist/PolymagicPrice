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

import { useMemo, useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Package, XCircle } from "lucide-react";
import { getSpools, getMaterialStock } from "@/lib/core/sessionStorage";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SpoolSelectorProps {
    materialId: string;
    value: string;
    onChange: (spoolId: string, color: string) => void;
    placeholder?: string;
    requiredWeight?: number; // g needed for the job (totalWeight)
    itemType?: "spool" | "bottle"; // Defaults to "spool"
    id?: string;
    name?: string;
}

export function SpoolSelector({
    materialId,
    value,
    onChange,
    placeholder,
    requiredWeight = 0,
    itemType = "spool",
    id,
    name
}: SpoolSelectorProps) {
    const [showError, setShowError] = useState(false);

    // Dynamic terminology
    const itemName = itemType === "bottle" ? "Bottle" : "Spool";
    const itemUnit = itemType === "bottle" ? "ml" : "g";
    const defaultPlaceholder = `Select ${itemType === "bottle" ? "bottle" : "spool"}/color`;

    const spools = useMemo(() => {
        if (!materialId) return [];
        return getSpools(materialId);
    }, [materialId]);

    const totalStock = useMemo(() => {
        if (!materialId) return 0;
        return getMaterialStock(materialId);
    }, [materialId]);

    const selectedSpool = useMemo(() => {
        return spools.find(s => s.id === value);
    }, [spools, value]);

    // Check if selected spool has enough stock
    const selectedSpoolStock = selectedSpool?.currentWeight || 0;
    const isInsufficientStock = requiredWeight > 0 && value && selectedSpoolStock < requiredWeight;
    const isTotalStockLow = requiredWeight > 0 && totalStock < requiredWeight;

    // Show error with animation when insufficient
    useEffect(() => {
        if (isInsufficientStock || isTotalStockLow) {
            setShowError(true);
        } else {
            setShowError(false);
        }
    }, [isInsufficientStock, isTotalStockLow, requiredWeight]);

    if (!materialId) {
        return (
            <Select disabled>
                <SelectTrigger id={id} className="bg-muted/50">
                    <SelectValue placeholder="Select material first" />
                </SelectTrigger>
            </Select>
        );
    }

    if (spools.length === 0) {
        return (
            <Select disabled>
                <SelectTrigger id={id} className="bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/30 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-sm overflow-hidden">
                        <Package className="w-4 h-4 shrink-0" />
                        <span className="truncate">No {itemType}s. Add in Settings.</span>
                    </div>
                </SelectTrigger>
            </Select>
        );
    }

    return (
        <div className="space-y-2">
            <Select name={name} value={value} onValueChange={(id) => {
                const spool = spools.find(s => s.id === id);
                onChange(id, spool?.color || spool?.name || '');
            }}>
                <SelectTrigger id={id} className={isInsufficientStock ? "border-destructive ring-1 ring-destructive" : ""}>
                    <SelectValue placeholder={placeholder || defaultPlaceholder}>
                        {selectedSpool && (
                            <div className="flex items-center gap-2">
                                {selectedSpool.color && (
                                    <div
                                        className="w-4 h-4 rounded-full border border-border shrink-0"
                                        style={{ backgroundColor: selectedSpool.color }}
                                    />
                                )}
                                <span>{selectedSpool.name || 'Unnamed'}</span>
                                <span className="text-muted-foreground">
                                    ({selectedSpool.currentWeight.toFixed(0)}{itemUnit} left)
                                </span>
                            </div>
                        )}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {spools.map((spool) => {
                        const isLow = spool.currentWeight < 200;
                        const canFulfill = requiredWeight <= 0 || spool.currentWeight >= requiredWeight;
                        const shortage = requiredWeight - spool.currentWeight;

                        return (
                            <SelectItem
                                key={spool.id}
                                value={spool.id}
                                className={!canFulfill ? "text-destructive" : ""}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    {spool.color && (
                                        <div
                                            className="w-4 h-4 rounded-full border border-border shrink-0"
                                            style={{ backgroundColor: spool.color }}
                                        />
                                    )}
                                    <span className={`truncate ${!canFulfill ? "line-through opacity-60" : ""}`}>
                                        {spool.name || 'Unnamed'}
                                    </span>
                                    <span className={`text-xs ml-auto ${!canFulfill ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                        {spool.currentWeight.toFixed(0)}{itemUnit}
                                    </span>
                                    {isLow && canFulfill && (
                                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                    )}
                                    {!canFulfill && (
                                        <span className="text-[10px] text-destructive font-medium">
                                            Need {shortage.toFixed(0)}{itemUnit} more
                                        </span>
                                    )}
                                </div>
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>

            {/* Insufficient Stock Error - shows in real-time */}
            {showError && isInsufficientStock && selectedSpool && (
                <Alert variant="destructive" className="py-2">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                        <strong>Insufficient stock!</strong> Need <strong>{requiredWeight.toFixed(0)}{itemUnit}</strong> but
                        <strong> {selectedSpool.name}</strong> only has <strong>{selectedSpoolStock.toFixed(0)}{itemUnit}</strong> left.
                        <span className="block text-xs mt-1">
                            Shortage: {(requiredWeight - selectedSpoolStock).toFixed(0)}{itemUnit}
                        </span>
                    </AlertDescription>
                </Alert>
            )}

            {/* Total stock warning when no spool is selected */}
            {!value && isTotalStockLow && (
                <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                        <strong>Low total stock!</strong> Need <strong>{requiredWeight.toFixed(0)}{itemUnit}</strong> but
                        only <strong>{totalStock.toFixed(0)}{itemUnit}</strong> available across all {itemType}s.
                    </AlertDescription>
                </Alert>
            )}

            {/* Stock info when everything is OK */}
            {value && !isInsufficientStock && requiredWeight > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Using {requiredWeight.toFixed(0)}{itemUnit} • {(selectedSpoolStock - requiredWeight).toFixed(0)}{itemUnit} will remain
                </p>
            )}
        </div>
    );
}
