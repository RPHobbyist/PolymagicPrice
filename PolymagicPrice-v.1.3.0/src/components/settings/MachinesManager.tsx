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

import { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, HelpCircle, AlertTriangle, Search } from "lucide-react";
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
import { Machine } from "@/types/quote";
import * as sessionStore from "@/lib/core/sessionStorage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Machines Form Component ---
interface MachinesFormProps {
  initialData?: Machine | null;
  onSubmit: (data: Omit<Machine, "id">) => void;
  onCancel: () => void;
  currencySymbol: string;
}

const MachinesForm = ({ initialData, onSubmit, onCancel, currencySymbol }: MachinesFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    hourly_cost: "",
    power_consumption_watts: "",
    print_type: "FDM" as "FDM" | "Resin",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        hourly_cost: initialData.hourly_cost.toString(),
        power_consumption_watts: initialData.power_consumption_watts?.toString() || "",
        print_type: initialData.print_type,
        description: "",
      });
    } else {
      setFormData({
        name: "",
        hourly_cost: "",
        power_consumption_watts: "",
        print_type: "FDM",
        description: "",
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.hourly_cost) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.name.length > 100) {
      toast.error("Machine name is too long (max 100 chars)");
      return;
    }

    const hourlyCost = parseFloat(formData.hourly_cost);
    if (isNaN(hourlyCost) || hourlyCost < 0 || hourlyCost > 10000) {
      toast.error("Hourly cost must be between 0 and 10000");
      return;
    }

    const power = formData.power_consumption_watts ? parseInt(formData.power_consumption_watts) : null;
    if (power !== null && (isNaN(power) || power < 0 || power > 10000)) {
      toast.error("Power consumption must be between 0 and 10000W");
      return;
    }

    onSubmit({
      name: formData.name,
      hourly_cost: hourlyCost,
      power_consumption_watts: power,
      print_type: formData.print_type,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Machine Name *</Label>
            <Input
              id="name"
              name="name"
              autoComplete="off"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Prusa i3 MK3S"
              required
              maxLength={100}
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
            <div className="flex items-center gap-2">
              <Label htmlFor="hourly_cost">Hourly Cost ({currencySymbol}) *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger type="button" aria-label="Help">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px] p-4 text-sm bg-popover border-border" side="right">
                    <div className="space-y-2">
                      <p className="font-semibold">How to calculate?</p>
                      <p>Formula: Total Machine Cost / Total Lifespan Hours</p>
                      <div className="bg-muted p-2 rounded text-xs">
                        <p className="font-semibold mb-1">Example:</p>
                        <p>• Printer Cost: {currencySymbol}45,000</p>
                        <p>• Life: 2 Years @ 6hr/day (4,380 hrs)</p>
                        <p className="mt-1 font-mono">Rate = 45000 / 4380 = {currencySymbol}10.27/hr</p>
                        <p className="mt-1 text-muted-foreground text-[10px]">(Add +20% for maintenance)</p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="hourly_cost"
              name="hourly_cost"
              autoComplete="off"
              type="number"
              step="0.01"
              value={formData.hourly_cost}
              onChange={(e) => setFormData({ ...formData, hourly_cost: e.target.value })}
              placeholder="5.00"
              required
              min="0"
              max="10000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="power_consumption_watts">Power Consumption (Watts)</Label>
            <Input
              id="power_consumption_watts"
              name="power_consumption_watts"
              autoComplete="off"
              type="number"
              value={formData.power_consumption_watts}
              onChange={(e) => setFormData({ ...formData, power_consumption_watts: e.target.value })}
              placeholder="250"
              min="0"
              max="10000"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-gradient-accent">
          {initialData ? "Update" : "Add"} Machine
        </Button>
      </DialogFooter>
    </form>
  );
};

// --- Machines List Component ---
interface MachinesListProps {
  machines: Machine[];
  onEdit: (machine: Machine) => void;
  onDelete: (id: string) => void;
  formatPrice: (price: number) => string;
}

const MachinesList = memo(({ machines, onEdit, onDelete, formatPrice }: MachinesListProps) => {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Hourly Cost</TableHead>
            <TableHead>Power (W)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {machines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No machines added yet. Add your first machine.
              </TableCell>
            </TableRow>
          ) : (
            machines.map((machine) => (
              <TableRow key={machine.id}>
                <TableCell className="font-medium">{machine.name}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${machine.print_type === "FDM" ? "bg-primary/10 text-primary" : "bg-purple-500/10 text-purple-600"}`}>
                    {machine.print_type}
                  </span>
                </TableCell>
                <TableCell>{formatPrice(machine.hourly_cost)}</TableCell>
                <TableCell>{machine.power_consumption_watts ? `${machine.power_consumption_watts}W` : "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(machine)}
                      aria-label="Edit machine"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(machine.id)}
                      aria-label="Delete machine"
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
  );
});

MachinesList.displayName = "MachinesList";


// --- Main Container ---
const MachinesManager = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { currency, formatPrice } = useCurrency();

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const data = sessionStore.getMachines();
      // Sort by print_type then by name
      data.sort((a, b) => {
        if (a.print_type !== b.print_type) {
          return a.print_type.localeCompare(b.print_type);
        }
        return a.name.localeCompare(b.name);
      });
      setMachines(data);
    } catch (error) {
      const err = error as Error;
      console.error(err);
      toast.error("Failed to load machines");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data: Omit<Machine, "id">) => {
    try {
      const machineData: Omit<Machine, "id"> & { id?: string } = {
        ...data,
      };

      if (editingMachine) {
        machineData.id = editingMachine.id;
        sessionStore.saveMachine(machineData);
        toast.success("Machine updated successfully");
      } else {
        sessionStore.saveMachine(machineData);
        toast.success("Machine added successfully");
      }

      setIsDialogOpen(false);
      setEditingMachine(null);
      fetchMachines();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to save machine");
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingMachine(null);
    setIsDialogOpen(true);
  };

  const handleCancelEdit = () => {
    setIsDialogOpen(false);
    setTimeout(() => setEditingMachine(null), 300); // Clear after animation
  };

  const handleDelete = async (id: string) => {
    try {
      sessionStore.deleteMachine(id);
      toast.success("Machine deleted successfully");
      fetchMachines();
      setDeleteId(null);
    } catch (error) {
      const err = error as Error;
      console.error(err);
      toast.error("Failed to delete machine");
    }
  };

  const filteredMachines = machines.filter(machine =>
    machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.print_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading machines...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Machines</h2>
          <p className="text-sm text-muted-foreground">Manage your 3D printers.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-machines"
              name="search"
              autoComplete="off"
              type="search"
              placeholder="Search machines..."
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddNew} className="bg-gradient-accent">
            <Plus className="w-4 h-4 mr-2" />
            Add Machine
          </Button>
        </div>
      </div>

      <MachinesList
        machines={filteredMachines}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteId(id)}
        formatPrice={formatPrice}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCancelEdit();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingMachine ? "Edit Machine" : "Add New Machine"}</DialogTitle>
          </DialogHeader>
          <MachinesForm
            initialData={editingMachine}
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
              Are you sure you want to delete this machine? This action cannot be undone and will remove it from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete Machine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MachinesManager;
