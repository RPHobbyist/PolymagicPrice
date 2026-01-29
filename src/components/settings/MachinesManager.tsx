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
import { Plus, Pencil, Trash2, HelpCircle } from "lucide-react";
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
  isEditing: boolean;
  currencySymbol: string;
}

const MachinesForm = ({ initialData, onSubmit, onCancel, isEditing, currencySymbol }: MachinesFormProps) => {
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

    onSubmit({
      name: formData.name,
      hourly_cost: parseFloat(formData.hourly_cost),
      power_consumption_watts: formData.power_consumption_watts ? parseInt(formData.power_consumption_watts) : null,
      print_type: formData.print_type,
    });

    if (!isEditing) {
      setFormData({
        name: "",
        hourly_cost: "",
        power_consumption_watts: "",
        print_type: "FDM",
        description: "",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-border rounded-lg bg-secondary/10">
      <h3 className="text-lg font-semibold text-foreground">
        {isEditing ? "Edit Machine" : "Add New Machine"}
      </h3>

      <div className="grid md:grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2 min-h-[24px]">
            <Label htmlFor="name">Machine Name *</Label>
          </div>
          <Input
            id="name"
            name="name"
            autoComplete="off"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Prusa i3 MK3S, Elegoo Mars 3"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 min-h-[24px]">
            <Label htmlFor="print_type">Print Type *</Label>
          </div>
          <Select
            name="print_type"
            value={formData.print_type}
            onValueChange={(value: "FDM" | "Resin") => setFormData({ ...formData, print_type: value })}
          >
            <SelectTrigger id="print_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FDM">FDM</SelectItem>
              <SelectItem value="Resin">Resin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 min-h-[24px]">
            <Label htmlFor="hourly_cost">Hourly Cost ({currencySymbol}) *</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger type="button">
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
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 min-h-[24px]">
            <Label htmlFor="power_consumption_watts">Power Consumption (Watts)</Label>
          </div>
          <Input
            id="power_consumption_watts"
            name="power_consumption_watts"
            autoComplete="off"
            type="number"
            value={formData.power_consumption_watts}
            onChange={(e) => setFormData({ ...formData, power_consumption_watts: e.target.value })}
            placeholder="250"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="bg-gradient-accent">
          <Plus className="w-4 h-4 mr-2" />
          {isEditing ? "Update" : "Add"} Machine
        </Button>
        {isEditing && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
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
                No machines added yet. Add your first machine above.
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
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(machine.id)}
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
        setEditingMachine(null);
      } else {
        sessionStore.saveMachine(machineData);
        toast.success("Machine added successfully");
      }

      fetchMachines();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to save machine");
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
  };

  const handleCancelEdit = () => {
    setEditingMachine(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this machine?")) return;

    try {
      sessionStore.deleteMachine(id);
      toast.success("Machine deleted successfully");
      fetchMachines();
    } catch (error) {
      const err = error as Error;
      console.error(err);
      toast.error("Failed to delete machine");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading machines...</div>;
  }

  return (
    <div className="space-y-6">
      <MachinesForm
        initialData={editingMachine}
        onSubmit={handleFormSubmit}
        onCancel={handleCancelEdit}
        isEditing={!!editingMachine}
        currencySymbol={currency.symbol}
      />
      <MachinesList
        machines={machines}
        onEdit={handleEdit}
        onDelete={handleDelete}
        formatPrice={formatPrice}
      />
    </div>
  );
};

export default MachinesManager;
