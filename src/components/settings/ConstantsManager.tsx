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

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertTriangle, Search } from "lucide-react";
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
import { CostConstant } from "@/types/quote";
import { processVisibilityFromDescription, addVisibilityTag } from "@/lib/utils";
import * as sessionStore from "@/lib/core/sessionStorage";
import { useCurrency } from "@/hooks/useCurrency";

// --- Constants Management ---
const ConstantsManager = () => {
  const [constants, setConstants] = useState<CostConstant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { currency } = useCurrency();
  const [formData, setFormData] = useState({
    name: "",
    value: "",
    unit: "",
    is_visible: true,
    description: "",
  });

  useEffect(() => {
    fetchConstants();
  }, []);

  const fetchConstants = async () => {
    try {
      const rawData = sessionStore.getConstants();

      const processedData = rawData.map((item: CostConstant) => {
        return {
          ...item,
          ...processVisibilityFromDescription(item.description, item.is_visible)
        };
      });

      setConstants(processedData);
    } catch (error) {
      const err = error as Error;
      console.error(err);
      toast.error("Failed to load constants");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      value: "",
      unit: "",
      is_visible: true,
      description: "",
    });
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.value || !formData.unit) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const finalDescription = addVisibilityTag(formData.description || "", formData.is_visible);

      const constantData: Omit<CostConstant, "id"> & { id?: string } = {
        name: formData.name,
        value: parseFloat(formData.value),
        unit: formData.unit,
        description: finalDescription || undefined,
        is_visible: formData.is_visible,
      };

      if (editingId) {
        constantData.id = editingId;
      }

      sessionStore.saveConstant(constantData);

      toast.success(editingId ? "Constant updated successfully" : "Constant added successfully");
      resetForm();
      fetchConstants();

    } catch (error) {
      const err = error as Error;
      console.error("Save error:", err);
      toast.error("An unexpected error occurred: " + err.message);
    }
  };

  const handleEdit = (constant: CostConstant) => {
    setEditingId(constant.id);
    setFormData({
      name: constant.name,
      value: constant.value.toString(),
      unit: constant.unit,
      is_visible: constant.is_visible !== false,
      description: constant.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      name: "",
      value: "",
      unit: "",
      is_visible: true,
      description: "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      sessionStore.deleteConstant(id);
      toast.success("Constant deleted successfully");
      fetchConstants();
      setDeleteId(null);
    } catch (error) {
      const err = error as Error;
      console.error(err);
      toast.error("Failed to delete constant");
    }
  };

  const filteredConstants = constants.filter(constant =>
    constant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading constants...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Consumables</h2>
          <p className="text-sm text-muted-foreground">Manage your printing constants.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-constants"
              name="search"
              autoComplete="off"
              type="search"
              placeholder="Search consumables..."
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddNew} className="bg-gradient-accent">
            <Plus className="w-4 h-4 mr-2" />
            Add Constant
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-20 text-center">Visible</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConstants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {searchQuery ? "No results found." : "No constants added yet. Add your first constant above."}
                </TableCell>
              </TableRow>
            ) : (
              filteredConstants.map((constant) => (
                <TableRow key={constant.id}>
                  <TableCell className="font-medium">{constant.name}</TableCell>
                  <TableCell>{constant.value}</TableCell>
                  <TableCell>{constant.unit.replace(/\$/g, currency?.symbol || "$")}</TableCell>
                  <TableCell className="text-center">
                    {constant.is_visible !== false ? (
                      <Eye className="w-4 h-4 mx-auto text-muted-foreground" />
                    ) : (
                      <EyeOff className="w-4 h-4 mx-auto text-muted-foreground/50" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {constant.description ? constant.description.replace(/cm2/g, "cm²") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(constant)}
                        aria-label="Edit constant"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteId(constant.id)}
                        aria-label="Delete constant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Constant" : "Add New Constant"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Constant Name *</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="off"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Electricity Rate, Labor Rate"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  name="value"
                  autoComplete="off"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0.15"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  name="unit"
                  autoComplete="off"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., $/kWh, $/hr, %"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  autoComplete="off"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center space-x-2 md:col-span-2">
                <Switch
                  id="is_visible"
                  name="is_visible"
                  checked={formData.is_visible}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
                />
                <Label htmlFor="is_visible">Visible in Calculator selection</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-accent">
                {editingId ? "Update" : "Add"} Constant
              </Button>
            </DialogFooter>
          </form>
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
              Are you sure you want to delete this constant? This action cannot be undone and will remove it from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete Constant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConstantsManager;
