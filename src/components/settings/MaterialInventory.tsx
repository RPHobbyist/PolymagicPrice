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

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Package, Plus, Trash2, MapPin, AlertTriangle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { MaterialSpool, Material } from "@/types/quote";
import { getSpools, saveSpool, deleteSpool } from "@/lib/core/sessionStorage";

interface MaterialInventoryProps {
    material: Material;
    onStockChanged?: () => void;
}

export function MaterialInventory({ material, onStockChanged }: MaterialInventoryProps) {
    const [spools, setSpools] = useState<MaterialSpool[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSpool, setEditingSpool] = useState<MaterialSpool | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        color: "#3B82F6",
        spoolCount: "1",
        weightPerSpool: "",
        currentWeight: "",
        location: "",
        purchaseCost: "",
        notes: "",
    });

    const loadSpools = useCallback(() => {
        setSpools(getSpools(material.id));
    }, [material.id]);

    useEffect(() => {
        loadSpools();
    }, [loadSpools]);

    const totalStock = useMemo(() => {
        return spools.reduce((sum, s) => sum + s.currentWeight, 0);
    }, [spools]);

    const unit = material.print_type === "FDM" ? "g" : "ml";
    const maxWeight = material.print_type === "FDM" ? 1000 : 1000; // 1kg or 1L
    const itemName = material.print_type === "FDM" ? "Spool" : "Bottle"; // FDM uses spools, Resin uses bottles

    // Format weight: show kg when >= 1000g, otherwise show g
    const formatWeight = (grams: number) => {
        if (material.print_type !== "FDM") return `${grams.toFixed(0)}ml`;
        if (grams >= 1000) {
            return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)}kg`;
        }
        return `${grams.toFixed(0)}g`;
    };

    // Calculate total weight from spoolCount * weightPerSpool
    const calculatedInitialWeight = useMemo(() => {
        const count = parseInt(formData.spoolCount) || 1;
        const weight = parseFloat(formData.weightPerSpool) || maxWeight;
        return count * weight;
    }, [formData.spoolCount, formData.weightPerSpool, maxWeight]);

    const handleOpenDialog = (spool?: MaterialSpool) => {
        if (spool) {
            setEditingSpool(spool);
            // When editing, calculate back the per-spool weight (assume 1 spool for existing)
            setFormData({
                name: spool.name || "",
                color: spool.color || "#3B82F6",
                spoolCount: "1",
                weightPerSpool: spool.initialWeight.toString(),
                currentWeight: spool.currentWeight.toString(),
                location: spool.location || "",
                purchaseCost: spool.purchaseCost?.toString() || "",
                notes: spool.notes || "",
            });
        } else {
            setEditingSpool(null);
            setFormData({
                name: "",
                color: "#3B82F6",
                spoolCount: "1",
                weightPerSpool: maxWeight.toString(),
                currentWeight: maxWeight.toString(),
                location: "",
                purchaseCost: "",
                notes: "",
            });
        }
        setDialogOpen(true);
    };

    // Auto-update current weight when spool count or weight per spool changes (for new spools)
    const handleSpoolCountOrWeightChange = (field: 'spoolCount' | 'weightPerSpool', value: string) => {
        const newFormData = { ...formData, [field]: value };

        // If adding new spool (not editing), auto-calculate current weight
        if (!editingSpool) {
            const count = parseInt(field === 'spoolCount' ? value : newFormData.spoolCount) || 1;
            const weight = parseFloat(field === 'weightPerSpool' ? value : newFormData.weightPerSpool) || maxWeight;
            newFormData.currentWeight = (count * weight).toString();
        }

        setFormData(newFormData);
    };

    const handleSubmit = () => {
        const count = parseInt(formData.spoolCount) || 1;
        const weightPerSpool = parseFloat(formData.weightPerSpool);
        const initial = count * weightPerSpool;
        const current = parseFloat(formData.currentWeight);

        if (formData.name && formData.name.length > 100) {
            toast.error("Name must be 100 characters or less");
            return;
        }

        if (isNaN(count) || count < 1 || count > 1000) {
            toast.error("Please enter a valid spool count (1-1000)");
            return;
        }

        if (isNaN(weightPerSpool) || weightPerSpool <= 0 || weightPerSpool > 25000) {
            toast.error(`Please enter a valid weight per ${itemName} (0-25000)`);
            return;
        }

        if (isNaN(current) || current < 0 || current > 25000000) { // Support extremely large batches
            toast.error("Please enter a valid current weight");
            return;
        }

        if (current > initial) {
            toast.error("Current weight cannot exceed total initial weight");
            return;
        }

        if (formData.purchaseCost && (parseFloat(formData.purchaseCost) < 0 || parseFloat(formData.purchaseCost) > 10000)) {
            toast.error("Purchase cost must be between 0 and 10000");
            return;
        }

        try {
            saveSpool({
                id: editingSpool?.id,
                materialId: material.id,
                name: formData.name || `${material.name} (${count}x${weightPerSpool}${unit})`,
                color: formData.color,
                initialWeight: initial,
                currentWeight: current,
                location: formData.location || undefined,
                purchaseCost: formData.purchaseCost ? parseFloat(formData.purchaseCost) * count : undefined,
                notes: formData.notes || undefined,
            });

            toast.success(editingSpool ? "Spool updated" : `Added ${count} spool(s) (${initial}${unit} total)`);
            setDialogOpen(false);
            loadSpools();
            onStockChanged?.();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save spool");
        }
    };

    const handleDelete = (spoolId: string) => {
        deleteSpool(spoolId);
        toast.success("Spool removed");
        loadSpools();
        onStockChanged?.();
        setDeleteId(null);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                        Stock: {totalStock.toFixed(0)}{unit}
                    </span>
                    {material.lowStockThreshold && totalStock < material.lowStockThreshold && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                        </Badge>
                    )}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-1" /> Add {itemName}
                </Button>
            </div>

            {spools.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground border-dashed">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No inventory tracked</p>
                </Card>
            ) : (
                <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2">
                        {spools.map((spool) => {
                            const percentage = (spool.currentWeight / spool.initialWeight) * 100;
                            return (
                                <Card key={spool.id} className="p-3 flex items-center gap-3 group">
                                    <div
                                        className="w-6 h-6 rounded-full border-2 border-border shrink-0"
                                        style={{ backgroundColor: spool.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate">{spool.name}</p>
                                            {spool.location && (
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                    <MapPin className="w-3 h-3" /> {spool.location}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress value={percentage} className="h-1.5 flex-1" />
                                            <span className="text-xs text-muted-foreground tabular-nums w-24 text-right">
                                                {formatWeight(spool.currentWeight)}/{formatWeight(spool.initialWeight)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => handleOpenDialog(spool)}
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(spool.id)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{editingSpool ? `Edit ${itemName}` : `Add New ${itemName}(s)`}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-[1fr_60px] gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`spool-name-${material.id}`}>Name</Label>
                                <Input
                                    id={`spool-name-${material.id}`}
                                    name="name"
                                    autoComplete="off"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={`${material.name} ${itemName}`}
                                    maxLength={100}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`spool-color-${material.id}`}>Color</Label>
                                <input
                                    id={`spool-color-${material.id}`}
                                    name="color"
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full h-10 rounded-md border border-input cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`spool-count-${material.id}`}>Number of {itemName}s</Label>
                                <Input
                                    id={`spool-count-${material.id}`}
                                    name="spoolCount"
                                    autoComplete="off"
                                    type="number"
                                    value={formData.spoolCount}
                                    onChange={(e) => handleSpoolCountOrWeightChange('spoolCount', e.target.value)}
                                    placeholder="1"
                                    min="1"
                                    max="1000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`weight-per-spool-${material.id}`}>Volume per {itemName} ({unit})</Label>
                                <Input
                                    id={`weight-per-spool-${material.id}`}
                                    name="weightPerSpool"
                                    autoComplete="off"
                                    type="number"
                                    value={formData.weightPerSpool}
                                    onChange={(e) => handleSpoolCountOrWeightChange('weightPerSpool', e.target.value)}
                                    placeholder="1000"
                                    min="1"
                                    max="25000"
                                />
                            </div>
                        </div>

                        {/* Total Initial Weight Display */}
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <span className="text-sm text-muted-foreground">Total Initial Weight: </span>
                            <span className="text-lg font-bold text-primary">{calculatedInitialWeight.toFixed(0)}{unit}</span>
                            <span className="text-sm text-muted-foreground"> ({formData.spoolCount} × {formData.weightPerSpool || maxWeight}{unit})</span>
                        </div>

                        {/* Current Weight */}
                        <div className="space-y-2">
                            <Label htmlFor={`current-weight-${material.id}`}>Current Total Weight ({unit})</Label>
                            <Input
                                id={`current-weight-${material.id}`}
                                name="currentWeight"
                                autoComplete="off"
                                type="number"
                                value={formData.currentWeight}
                                onChange={(e) => setFormData({ ...formData, currentWeight: e.target.value })}
                                placeholder={calculatedInitialWeight.toString()}
                                min="0"
                                max="25000000"
                            />
                            <p className="text-xs text-muted-foreground">
                                Adjust if some material has already been used
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`spool-location-${material.id}`}>Location (optional)</Label>
                                <Input
                                    id={`spool-location-${material.id}`}
                                    name="location"
                                    autoComplete="off"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Shelf A1"
                                    maxLength={50}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`cost-per-spool-${material.id}`}>Cost per {itemName} (optional)</Label>
                                <Input
                                    id={`cost-per-spool-${material.id}`}
                                    name="purchaseCost"
                                    autoComplete="off"
                                    type="number"
                                    value={formData.purchaseCost}
                                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                                    placeholder="25"
                                    min="0"
                                    max="10000"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingSpool ? "Update" : "Add"} {itemName}{!editingSpool && parseInt(formData.spoolCount) > 1 ? 's' : ''}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Confirm Remove
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this {itemName}? This will adjust your total inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteId && handleDelete(deleteId)}
                        >
                            Remove {itemName}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
