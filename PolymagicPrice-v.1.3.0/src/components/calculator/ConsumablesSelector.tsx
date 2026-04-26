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

import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Package } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface ConsumableItem {
    id: string;
    name: string;
    value: number;
    unit: string;
}

interface ConsumablesSelectorProps {
    items: ConsumableItem[];
    selectedIds: string[];
    onChange: (selectedIds: string[]) => void;
    id?: string;
}

export const ConsumablesSelector = memo(({ items, selectedIds, onChange, id }: ConsumablesSelectorProps) => {
    const [open, setOpen] = useState(false);
    const { formatPrice } = useCurrency();

    const handleToggle = useCallback((id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(i => i !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    }, [selectedIds, onChange]);

    const selectedItems = items.filter(item => selectedIds.includes(item.id));
    const totalValue = selectedItems.reduce((sum, item) => sum + item.value, 0);

    const getDisplayText = () => {
        if (selectedIds.length === 0) return "Select consumables (optional)";
        if (selectedIds.length === 1) {
            const item = selectedItems[0];
            return `${item.name}: ${formatPrice(item.value)}`;
        }
        return `${selectedIds.length} items selected (${formatPrice(totalValue)})`;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal h-10 bg-background hover:bg-secondary/50"
                >
                    <span className="truncate text-left flex-1 flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <Package className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                        {getDisplayText()}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">Consumables</p>
                    <p className="text-xs text-muted-foreground">Select items to add to the quote</p>
                </div>
                <div className="max-h-60 overflow-y-auto p-2">
                    {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No consumables available. Add some in Settings.
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                                    onClick={() => handleToggle(item.id)}
                                >
                                    <Checkbox
                                        id={`${id}-${item.id}`}
                                        checked={selectedIds.includes(item.id)}
                                        onCheckedChange={() => handleToggle(item.id)}
                                    />
                                    <Label
                                        htmlFor={`${id}-${item.id}`}
                                        className="flex-1 cursor-pointer flex justify-between items-center"
                                    >
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {formatPrice(item.value)} {item.unit !== "₹" && `/${item.unit}`}
                                        </span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {selectedIds.length > 0 && (
                    <div className="p-3 border-t border-border bg-muted/30">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Consumables:</span>
                            <span className="font-semibold text-foreground">{formatPrice(totalValue)}</span>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
});

ConsumablesSelector.displayName = "ConsumablesSelector";

export default ConsumablesSelector;
