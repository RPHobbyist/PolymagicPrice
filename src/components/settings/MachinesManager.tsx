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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, HelpCircle, AlertTriangle, Search, Link2, Link2Off, Wrench, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
    buildVolume: "",
    ipAddress: "",
    serialNumber: "",
    accessCode: "",
    apiKey: "", // Added apiKey
    driverType: "OFFLINE" as 'OFFLINE' | 'BAMBU' | 'OCTOPRINT' | 'MOONRAKER' | 'PRUSALINK' | 'ULTIMAKER' | 'RAISE3D' | 'FORMLABS', // Added driverType
    maintenanceIntervalHours: "",
    isOffline: true, // Default to true now
  });

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Reset connection status if connection details change
  useEffect(() => {
    setConnectionStatus('idle');
  }, [formData.ipAddress, formData.apiKey, formData.accessCode, formData.serialNumber, formData.driverType]);

  const handleTestConnection = async () => {
    if (formData.driverType === 'OFFLINE') return;
    
    setConnectionStatus('testing');
    try {
        const config = {
            ip: formData.ipAddress,
            accessCode: formData.accessCode,
            serial: formData.serialNumber,
            apiKey: formData.apiKey,
            driverType: formData.driverType,
            expectedFingerprint: initialData?.certFingerprint
        };

        if (window.electronAPI?.printer) {
            await window.electronAPI.printer.connect(config);
            setConnectionStatus('success');
            toast.success("Connection successful!");
        } else {
            throw new Error("Printer API not available");
        }
    } catch (error) {
        console.error("Connection test failed:", error);
        setConnectionStatus('error');
        const err = error as Error;
        toast.error("Connection failed", {
            description: err.message || "Please check your settings and try again."
        });
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        hourly_cost: initialData.hourly_cost.toString(),
        power_consumption_watts: initialData.power_consumption_watts?.toString() || "",
        print_type: initialData.print_type,
        buildVolume: initialData.buildVolume || "",
        ipAddress: initialData.ipAddress || "",
        serialNumber: initialData.serialNumber || "",
        accessCode: initialData.accessCode || "",
        apiKey: initialData.apiKey || "",
        driverType: initialData.driverType || "OFFLINE",
        maintenanceIntervalHours: initialData.maintenanceIntervalHours?.toString() || "0",
        isOffline: !!initialData.isOffline || initialData.driverType === 'OFFLINE',
      });
    } else {
      setFormData({
        name: "",
        hourly_cost: "",
        power_consumption_watts: "",
        print_type: "FDM",
        buildVolume: "",
        ipAddress: "",
        serialNumber: "",
        accessCode: "",
        apiKey: "",
        driverType: "OFFLINE",
        maintenanceIntervalHours: "0",
        isOffline: true,
      });
    }
  }, [initialData]);

  // Smart Lookup Logic
  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    
    // Only suggest if we're adding a new machine
    if (!initialData && name.length > 3) {
        const specs = sessionStore.getSpecsByMachineName(name);
        if (specs) {
            setFormData(prev => ({
                ...prev,
                buildVolume: prev.buildVolume || specs.buildVolume || "",
                power_consumption_watts: prev.power_consumption_watts || specs.power_consumption_watts?.toString() || "",
                print_type: specs.print_type || prev.print_type
            }));
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.hourly_cost) {
      toast.error("Please fill in all required fields");
      return;
    }

    const hourlyCost = parseFloat(formData.hourly_cost);
    const power = formData.power_consumption_watts ? parseInt(formData.power_consumption_watts) : null;

    onSubmit({
      name: formData.name,
      hourly_cost: hourlyCost,
      power_consumption_watts: power,
      print_type: formData.print_type,
      buildVolume: formData.buildVolume,
      ipAddress: formData.ipAddress,
      serialNumber: formData.serialNumber,
      accessCode: formData.accessCode,
      apiKey: formData.apiKey,
      driverType: formData.driverType,
      maintenanceIntervalHours: parseInt(formData.maintenanceIntervalHours) || 0,
      isOffline: formData.driverType === 'OFFLINE',
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
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Bambu Lab X1C"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="print_type">Print Type *</Label>
            <Select
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="buildVolume">Build Volume (X x Y x Z) mm</Label>
            <Input
              id="buildVolume"
              value={formData.buildVolume}
              onChange={(e) => setFormData({ ...formData, buildVolume: e.target.value })}
              placeholder="256 x 256 x 256 mm"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="power_consumption_watts">Power Consumption (Watts)</Label>
            <Input
              id="power_consumption_watts"
              type="number"
              min="0"
              value={formData.power_consumption_watts}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== "" && parseFloat(val) < 0) return;
                setFormData({ ...formData, power_consumption_watts: val });
              }}
              placeholder="350"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 h-6">
              <Label htmlFor="maintenanceIntervalHours">Maintenance Interval (Hrs)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger type="button" aria-label="Maintenance interval help">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Set to 0 to disable maintenance alerts.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="maintenanceIntervalHours"
              type="number"
              min="0"
              value={formData.maintenanceIntervalHours}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== "" && parseFloat(val) < 0) return;
                setFormData({ ...formData, maintenanceIntervalHours: val });
              }}
              placeholder="500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 h-6">
              <Label htmlFor="hourly_cost">Hourly Cost ({currencySymbol}) *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger type="button" aria-label="Hourly cost help">
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px] p-4 text-sm bg-popover border-border" side="right">
                    <div className="space-y-2">
                      <p className="font-semibold">How to calculate?</p>
                      <p>Formula: Total Machine Cost / Total Lifespan Hours</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="hourly_cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.hourly_cost}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== "" && parseFloat(val) < 0) return;
                setFormData({ ...formData, hourly_cost: val });
              }}
              placeholder="5.00"
              required
            />
          </div>
        </div>

        {/* Communication Mode Section */}
        <div className="pt-4 border-t border-border space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-slate-900">Connection Mode</h3>
              <p className="text-xs text-slate-600">Select how your printer connects to the tool.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select
                value={formData.driverType}
                onValueChange={(value: 'OFFLINE' | 'BAMBU' | 'OCTOPRINT' | 'MOONRAKER' | 'PRUSALINK' | 'ULTIMAKER' | 'RAISE3D' | 'FORMLABS') => setFormData({ ...formData, driverType: value, isOffline: value === 'OFFLINE' })}
              >
                <SelectTrigger id="driverType">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFLINE">Offline Mode</SelectItem>
                  <SelectItem value="BAMBU">Bambu Lab (MQTT/FTP)</SelectItem>
                  <SelectItem value="OCTOPRINT">OctoPrint (REST)</SelectItem>
                  <SelectItem value="MOONRAKER">Moonraker / Klipper (REST)</SelectItem>
                  <SelectItem value="PRUSALINK">PrusaLink (REST)</SelectItem>
                  <SelectItem value="ULTIMAKER">Ultimaker (REST)</SelectItem>
                  <SelectItem value="RAISE3D">Raise3D (REST)</SelectItem>
                  <SelectItem value="FORMLABS">Formlabs (Status Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.driverType !== 'OFFLINE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address / URL</Label>
                <Input
                  id="ipAddress"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  placeholder="192.168.1.100"
                  maxLength={100}
                />
              </div>
              
              {formData.driverType === 'BAMBU' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Machine Serial Number</Label>
                    <Input
                      id="serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder="Machine Serial Number"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Pass Code</Label>
                    <Input
                      id="accessCode"
                      type="password"
                      value={formData.accessCode}
                      onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                      placeholder="••••••••"
                      maxLength={100}
                    />
                  </div>
                </>
              )}

              {['OCTOPRINT', 'MOONRAKER', 'PRUSALINK', 'ULTIMAKER', 'RAISE3D'].includes(formData.driverType) && (
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="apiKey">API Key / Token</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Enter API Key / Token"
                    maxLength={200}
                  />
                </div>
              )}

              <div className="flex items-end sm:col-span-1">
                <Button 
                  type="button" 
                  onClick={handleTestConnection}
                  disabled={!window.electronAPI || connectionStatus === 'testing' || !formData.ipAddress}
                  className={cn(
                    "w-full transition-all duration-300 h-10",
                    connectionStatus === 'success' && "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700",
                    connectionStatus === 'error' && "bg-destructive hover:bg-destructive/90",
                    connectionStatus === 'idle' && "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  )}
                  variant={connectionStatus === 'idle' ? 'outline' : 'default'}
                >
                  {connectionStatus === 'testing' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : connectionStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  ) : connectionStatus === 'error' ? (
                    <XCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  {!window.electronAPI ? "Desktop Only" : 
                   connectionStatus === 'testing' ? "Connecting..." : 
                   connectionStatus === 'success' ? "Connected" : 
                   connectionStatus === 'error' ? "Failed" : "Connect"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm border-0">
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
  onMaintain: (id: string) => void;
  formatPrice: (price: number) => string;
}

const MachinesList = memo(({ machines, onEdit, onDelete, onMaintain, formatPrice }: MachinesListProps) => {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold text-foreground">Name</TableHead>
            <TableHead className="font-semibold text-foreground">Type</TableHead>
            <TableHead className="font-semibold text-foreground">Build Volume</TableHead>
            <TableHead className="font-semibold text-foreground">Hourly Cost</TableHead>
            <TableHead className="font-semibold text-foreground">Power (W)</TableHead>
            <TableHead className="font-semibold text-foreground">Connection</TableHead>
            <TableHead className="font-semibold text-foreground">Health / Maintenance</TableHead>
            <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {machines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-slate-600 py-8">
                No machines added yet. Add your first machine.
              </TableCell>
            </TableRow>
          ) : (
            machines.map((machine) => (
              <TableRow key={machine.id}>
                <TableCell className="font-medium">{machine.name}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${machine.print_type === "FDM" ? "bg-primary/10 text-primary" : "bg-purple-500/10 text-purple-600"}`}>
                    {machine.print_type}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-600">{machine.buildVolume || "-"}</TableCell>
                <TableCell>{formatPrice(machine.hourly_cost)}</TableCell>
                <TableCell>{machine.power_consumption_watts ? `${machine.power_consumption_watts}W` : "-"}</TableCell>
                <TableCell>
                  {machine.isOffline ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200/50 w-fit">
                      <Link2Off className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Offline Mode</span>
                    </div>
                  ) : machine.ipAddress && machine.serialNumber && machine.accessCode ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-200/50 w-fit">
                      <Link2 className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Linked</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 w-fit">
                      <Link2Off className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Offline Mode</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {machine.maintenanceIntervalHours && machine.maintenanceIntervalHours > 0 ? (
                    <div className="space-y-1.5 min-w-[120px]">
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span className={sessionStore.isMachineMaintenanceDue(machine) ? "text-destructive" : "text-slate-600"}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  {Math.floor((machine.totalRuntimeHours || 0) - (machine.lastMaintenanceHours || 0))} / {machine.maintenanceIntervalHours}h
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-[10px]">Total Lifetime: {Math.floor(machine.totalRuntimeHours || 0)}h</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </span>
                        <span>{Math.round(Math.min(100, ((machine.totalRuntimeHours || 0) - (machine.lastMaintenanceHours || 0)) / machine.maintenanceIntervalHours * 100))}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            sessionStore.isMachineMaintenanceDue(machine) ? "bg-destructive animate-pulse" : "bg-primary"
                          )}
                          style={{ width: `${Math.min(100, ((machine.totalRuntimeHours || 0) - (machine.lastMaintenanceHours || 0)) / machine.maintenanceIntervalHours * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">No Interval Set</span>
                  )}
                </TableCell>
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
                      className={cn(
                        "hover:bg-primary/10 hover:text-primary transition-colors",
                        sessionStore.isMachineMaintenanceDue(machine) && "border-destructive/50 text-destructive bg-destructive/5 animate-pulse-soft"
                      )}
                      onClick={() => onMaintain(machine.id)}
                      title="Mark Maintenance as Complete"
                    >
                      <Wrench className="w-4 h-4" />
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

    // CLOSED LOOP: Listen for machine updates from other components (Production, Notifications)
    const handleMachinesUpdate = () => {
      console.log("[MachinesManager] Syncing machines from storage...");
      fetchMachines();
    };

    window.addEventListener('session_machines_updated', handleMachinesUpdate);
    return () => window.removeEventListener('session_machines_updated', handleMachinesUpdate);
  }, []);

  const fetchMachines = async () => {
    try {
      const data = sessionStore.getMachines();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setMachines(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load machines");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data: Omit<Machine, "id">) => {
    try {
      const machineData = {
        ...data,
        id: editingMachine?.id,
      };

      sessionStore.saveMachine(machineData);
      toast.success(editingMachine ? "Machine updated" : "Machine added");
      
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
    setTimeout(() => setEditingMachine(null), 300);
  };

  const handleDelete = async (id: string) => {
    try {
      const result = sessionStore.deleteMachine(id);
      if (result.success) {
        toast.success("Machine deleted successfully");
        fetchMachines();
        setDeleteId(null);
      } else {
        toast.error(result.message || "Failed to delete machine");
      }
    } catch (err: unknown) {
      console.error("Machine delete error:", err);
      toast.error("An unexpected error occurred during deletion");
    }
  };

  const handleMaintain = (id: string) => {
    sessionStore.performMachineMaintenance(id);
    toast.success("Maintenance log updated successfully");
    fetchMachines();
  };

  const filteredMachines = machines.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.print_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="text-center py-8">Loading machines...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">Machines</h2>
          <p className="text-sm text-slate-600">Manage your 3D printers.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search machines..."
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search machines by name or type"
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
        onMaintain={handleMaintain}
        formatPrice={formatPrice}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCancelEdit()}>
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
              Are you sure you want to delete this machine? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && handleDelete(deleteId)}>
              Delete Machine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MachinesManager;
