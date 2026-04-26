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

import React, { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Package, AlertTriangle, Search } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { Material } from "@/types/quote";
import * as sessionStore from "@/lib/core/sessionStorage";
import { MaterialInventory } from "./MaterialInventory";

// --- Materials Form Component ---
interface MaterialsFormProps {
  initialData?: Material | null;
  onSubmit: (data: Omit<Material, "id">) => void;
  onCancel: () => void;
  currencySymbol: string;
}

const MaterialsForm = ({ initialData, onSubmit, onCancel, currencySymbol }: MaterialsFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    cost_per_unit: "",
    unit: "kg",
    print_type: "FDM" as "FDM" | "Resin",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        cost_per_unit: initialData.cost_per_unit.toString(),
        unit: initialData.unit,
        print_type: initialData.print_type,
        description: "",
      });
    } else {
      setFormData({
        name: "",
        cost_per_unit: "",
        unit: "kg",
        print_type: "FDM",
        description: "",
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.cost_per_unit) {
      toast.error("Please fill in all required fields");
      return;
    }

    onSubmit({
      name: formData.name,
      cost_per_unit: parseFloat(formData.cost_per_unit),
      unit: formData.unit,
      print_type: formData.print_type,
    }); // ID will be handled by parent or store
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Material Name *</Label>
            <Input
              id="name"
              name="name"
              autoComplete="off"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., PLA, ABS, Standard Resin"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="print_type">Print Type *</Label>
            <Select
              name="print_type"
              value={formData.print_type}
              onValueChange={(value: "FDM" | "Resin") => setFormData({ ...formData, print_type: value })}
            >
              <SelectTrigger id="print_type" aria-label="Print Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FDM">FDM</SelectItem>
                <SelectItem value="Resin">Resin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cost_per_unit">Cost per Unit ({currencySymbol}) *</Label>
            <Input
              id="cost_per_unit"
              name="cost_per_unit"
              autoComplete="off"
              type="number"
              step="0.01"
              value={formData.cost_per_unit}
              onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
              placeholder="25.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit *</Label>
            <Select
              name="unit"
              value={formData.unit}
              onValueChange={(value) => setFormData({ ...formData, unit: value })}
            >
              <SelectTrigger id="unit" aria-label="Unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">Kilogram (kg)</SelectItem>
                <SelectItem value="liter">Liter (L)</SelectItem>
                <SelectItem value="g">Gram (g)</SelectItem>
                <SelectItem value="ml">Milliliter (ml)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-gradient-accent">
          {initialData ? "Update" : "Add"} Material
        </Button>
      </DialogFooter>
    </form>
  );
};

// --- Materials List Component ---
interface MaterialsListProps {
  materials: Material[];
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
  formatPrice: (price: number) => string;
}

const MaterialsList = memo(({ materials, onEdit, onDelete, formatPrice }: MaterialsListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Cost per Unit</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No materials added yet. Add your first material above.
              </TableCell>
            </TableRow>
          ) : (
            materials.map((material) => {
              const stock = sessionStore.getMaterialStock(material.id);
              const isLow = material.lowStockThreshold ? stock < material.lowStockThreshold : stock < 200;
              const isExpanded = expandedId === material.id;

              // Format weight: show kg when >= 1000g for FDM, L when >= 1000ml for Resin
              const formatStock = (value: number) => {
                if (material.print_type === "FDM") {
                  return value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}kg` : `${value.toFixed(0)}g`;
                } else {
                  return value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}L` : `${value.toFixed(0)}ml`;
                }
              };

              return (
                <React.Fragment key={material.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(material.id)}>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={isExpanded ? "Collapse row" : "Expand row"}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${material.print_type === "FDM" ? "bg-primary/10 text-primary" : "bg-purple-500/10 text-purple-600"}`}>
                        {material.print_type}
                      </span>
                    </TableCell>
                    <TableCell>{formatPrice(material.cost_per_unit)}/{material.unit}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className={isLow ? "text-destructive font-medium" : ""}>
                          {formatStock(stock)}
                        </span>
                        {isLow && <span className="text-xs text-destructive">Low</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(material)}
                          aria-label="Edit material"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(material.id)}
                          aria-label="Delete material"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-4">
                        <MaterialInventory material={material} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
});

MaterialsList.displayName = "MaterialsList";


// --- Main Container ---
const MaterialsManager = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { currency, formatPrice } = useCurrency();

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const data = sessionStore.getMaterials();
      // Sort by print_type then by name
      data.sort((a, b) => {
        if (a.print_type !== b.print_type) {
          return a.print_type.localeCompare(b.print_type);
        }
        return a.name.localeCompare(b.name);
      });
      setMaterials(data);
    } catch (error) {
      const err = error as Error;
      console.error(err);
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data: Omit<Material, "id">) => {
    try {
      const materialData: Omit<Material, "id"> & { id?: string } = {
        ...data,
      };

      if (editingMaterial) {
        materialData.id = editingMaterial.id;
        sessionStore.saveMaterial(materialData);
        toast.success("Material updated successfully");
      } else {
        sessionStore.saveMaterial(materialData);
        toast.success("Material added successfully");
      }

      setEditingMaterial(null);
      setIsDialogOpen(false);
      fetchMaterials();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to save material");
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingMaterial(null);
    setIsDialogOpen(true);
  }

  const handleCancelEdit = () => {
    setIsDialogOpen(false);
    setTimeout(() => setEditingMaterial(null), 300);
  };

  const handleDelete = async (id: string) => {
    try {
      sessionStore.deleteMaterial(id);
      toast.success("Material deleted successfully");
      fetchMaterials();
      setDeleteId(null);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to delete material");
    }
  };

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.print_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading materials...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Materials</h2>
          <p className="text-sm text-muted-foreground">Manage your printing materials.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-materials"
              name="search"
              autoComplete="off"
              type="search"
              placeholder="Search materials..."
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddNew} className="bg-gradient-accent">
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
        </div>
      </div>

      <MaterialsList
        materials={filteredMaterials}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteId(id)}
        formatPrice={formatPrice}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCancelEdit();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Edit Material" : "Add New Material"}</DialogTitle>
          </DialogHeader>
          <MaterialsForm
            initialData={editingMaterial}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelEdit}
            currencySymbol={currency.symbol}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Delete
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this material? This action cannot be undone and will remove it from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete Material
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MaterialsManager;
