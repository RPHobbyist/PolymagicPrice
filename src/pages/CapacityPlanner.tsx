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

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { calculateCapacity, analyzeDeadline, formatDate, formatHours } from "@/lib/capacityCalculator";
import { getMachines, getMaterials, getMaterialStock } from "@/lib/core/sessionStorage";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { useProduction } from "@/hooks/useProduction";
import { PageHeader } from "@/components/layout/PageHeader";
import { Machine } from "@/types/quote";
import { Card } from "@/components/ui/card";
import { 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Search
} from "lucide-react";
import {
    TooltipProvider,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { sanitize } from "@/lib/sanitization";

// Helper to parse "256 x 256 x 256 mm" into [256, 256, 256]
const parseBoxVolume = (vol?: string) => {
    if (!vol || vol === "Not specified") return { x: 0, y: 0, z: 0 }; // Safety: Default to zero volume to trigger "Too Small" warning if unknown
    const parts = vol.toLowerCase().replace(/mm/g, '').split('x').map(p => parseFloat(p.trim()));
    if (parts.length >= 3) return { x: parts[0], y: parts[1], z: parts[2] };
    if (parts.length === 2) return { x: parts[0], y: parts[1], z: 9999 }; // 2D bed (high Z)
    return { x: 0, y: 0, z: 0 };
};

// --- Machine Recommendations Data ---
interface Recommendation {
    id: string;
    label: string;
    description: string;
    reviewInsight: string;
    matchCriteria: (machine: Machine) => boolean;
}

const RECOMMENDATIONS: Recommendation[] = [
    {
        id: "energy",
        label: "Energy Efficient",
        description: "Printers with low power footprints and optimized thermal management.",
        reviewInsight: "Prusa and A1 series lead in watt-per-hour efficiency benchmarks.",
        matchCriteria: (m) => ["Ender 3", "Prusa i3 MK3S+", "Prusa MK4", "Bambu Lab A1 Mini"].some(name => m.name.includes(name))
    },
    {
        id: "speed",
        label: "High Speed",
        description: "Optimized for maximum throughput using CoreXY or CoreXZ motion.",
        reviewInsight: "Bambu X1/P1 and Creality K1 series routinely hit 500mm/s reliably.",
        matchCriteria: (m) => ["X1 Carbon", "P1S", "K1", "V3", "A1", "Voron", "QIDI"].some(name => m.name.includes(name))
    },
    {
        id: "quality",
        label: "High Quality",
        description: "Printers renowned for dimensional accuracy and surface finish.",
        reviewInsight: "Prusa CORE and Bambu X1C provide industry-leading 0.05mm tolerances.",
        matchCriteria: (m) => ["MK4", "CORE One", "X1 Carbon"].some(name => m.name.includes(name)) || m.print_type === "Resin"
    },
    {
        id: "prototype",
        label: "Prototyping",
        description: "Ideal for rapid testing with multi-material support.",
        reviewInsight: "Bambu AMS and Prusa XL multi-tool systems allow complex geometries with ease.",
        matchCriteria: (m) => ["X1 Carbon", "P1S", "XL"].some(name => m.name.includes(name))
    },
    {
        id: "engineering",
        label: "Engineering Parts",
        description: "Equipped for high-temp materials like ABS, ASA, and Polycarbonate.",
        reviewInsight: "QIDI Plus 4 and X1C feature chambers required for structural warp-prevention.",
        matchCriteria: (m) => ["X1 Carbon", "X-Max", "K1 Max", "CORE One", "K2 Plus"].some(name => m.name.includes(name))
    },
    {
        id: "flexible",
        label: "Flexible (TPU)",
        description: "Direct-drive systems that handle soft filaments without jamming.",
        reviewInsight: "Direct-drive extruders in the MK4 and Bambu series are best for shore 85A-95A TPUs.",
        matchCriteria: (m) => ["MK4", "X1 Carbon", "P1S", "A1", "K1", "Sidewinder"].some(name => m.name.includes(name))
    }
];

export default function CapacityPlannerPage() {
    useDocumentSEO({
        title: "Capacity Planner — 3D Print Farm Production Forecasting",
        description: "Plan 3D printing production schedules and forecast delivery timelines. Calculate lead times, check order feasibility, and optimize printer utilization with production analysis. Free capacity planning for FDM and Resin print farms.",
        canonical: "/capacity-planner",
        ogTitle: "3D Print Farm Capacity Planner & Lead Time Calculator | PolymagicPrice",
        ogDescription: "Forecast production timelines and optimize printer utilization for your 3D printing business.",
    });

    const [allMachines, setAllMachines] = useState(() => getMachines());
    const { jobs, settings, updateSettings } = useProduction();
    const [machineFilter, setMachineFilter] = useState("");

    // Cross-tab Synchronization for Machine Configuration
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'session_machines') {
                setAllMachines(getMachines());
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);
    
    // Configuration State
    const [quantity, setQuantity] = useState("10");
    const [printTimePerUnit, setPrintTimePerUnit] = useState("2");
    const [includeWeekends, setIncludeWeekends] = useState(false);
    const [deadline, setDeadline] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });

    // Part Dimensions
    const [objX, setObjX] = useState("");
    const [objY, setObjY] = useState("");
    const [objZ, setObjZ] = useState("");

    // NEW: Print Type & Material Inventory
    const [printType, setPrintType] = useState<"FDM" | "Resin">("FDM");
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
    const [usagePerUnit, setUsagePerUnit] = useState("50");

    // Filter available materials based on print type
    const availableMaterials = useMemo(() => getMaterials(printType), [printType]);

    // Auto-select first material when switching print type
    useEffect(() => {
        if (availableMaterials.length > 0) {
            // Check if current ID is still valid for the new tech
            const isValid = availableMaterials.some(m => m.id === selectedMaterialId);
            if (!isValid) {
                setSelectedMaterialId(availableMaterials[0].id);
            }
        }
    }, [availableMaterials, selectedMaterialId]);

    // Production Settings (from Global Context)
    const turnoverMinutes = settings.turnoverMinutes;
    const efficiencyValue = settings.efficiency;
    const workHoursPerDay = settings.workHoursPerDay;

    const setEfficiency = (val: number[]) => updateSettings({ efficiency: val[0] });

    // NEW: Filtered Machine Selection
    const filteredMachineIds = useMemo(() => {
        const ox = parseFloat(objX) || 0;
        const oy = parseFloat(objY) || 0;
        const oz = parseFloat(objZ) || 0;

        return settings.enabledMachineIds.filter(id => {
            const machine = allMachines.find(m => m.id === id);
            if (!machine || machine.print_type !== printType) return false;
            
            if (ox === 0 && oy === 0 && oz === 0) return true;
            const dims = parseBoxVolume(machine.buildVolume);
            if (!dims) return true;
            return ox <= dims.x && oy <= dims.y && oz <= dims.z;
        });
    }, [settings.enabledMachineIds, allMachines, printType, objX, objY, objZ]);

    // Core Calculation Logic
    const result = useMemo(() => {
        const q = Math.max(0, parseInt(quantity) || 0);
        const t = Math.max(0, parseFloat(printTimePerUnit) || 0);
        const tt = Math.max(0, (turnoverMinutes || 0) / 60); 
        const h = Math.max(0.1, workHoursPerDay || 8); 
        const eff = Math.min(1.0, Math.max(0.1, (100 - (efficiencyValue || 0)) / 100));

        if (q <= 0 || t <= 0) return null;

        return calculateCapacity(
            {
                quantity: q,
                printTimePerUnit: t,
                turnoverTimePerUnit: tt,
                efficiency: eff,
                workHoursPerDay: h,
                machineIds: filteredMachineIds,
                includeWeekends: includeWeekends
            },
            allMachines
        );
    }, [quantity, printTimePerUnit, turnoverMinutes, efficiencyValue, workHoursPerDay, filteredMachineIds, allMachines, includeWeekends]);

    // CLOSED LOOP: Material Shortage Logic (now considers reserved stock from queued jobs)
    const inventoryStats = useMemo(() => {
        const q = parseInt(quantity) || 0;
        const usage = parseFloat(usagePerUnit) || 0;
        const totalNeededForThisJob = q * usage;
        
        // Calculate amount already "reserved" by other active/queued jobs
        const reservedStock = jobs.reduce((sum, job) => {
            const jobMaterialId = job.quote.parameters.materialId;

            if (job.status !== 'completed' && jobMaterialId === selectedMaterialId) {
                const jobQty = job.quote.quantity || 1;
                const jobWeight = parseFloat(job.quote.parameters.filamentWeight as string || job.quote.parameters.resinVolume as string || "0") || 0;
                return sum + (jobQty * jobWeight);
            }
            return sum;
        }, 0);

        const stock = getMaterialStock(selectedMaterialId);
        const effectiveStock = Math.max(0, stock - reservedStock);
        const material = availableMaterials.find(m => m.id === selectedMaterialId);

        return {
            totalNeeded: totalNeededForThisJob,
            stock: effectiveStock,
            totalPhysicalStock: stock,
            reservedStock,
            isShort: totalNeededForThisJob > effectiveStock,
            materialName: material?.name || "Material"
        };
    }, [quantity, usagePerUnit, selectedMaterialId, availableMaterials, jobs]);

    // Deadline & Recovery Analysis
    const analysis = useMemo(() => {
        if (!result || !deadline) return null;
        
        const q = Math.max(0, parseInt(quantity) || 0);
        const t = Math.max(0, parseFloat(printTimePerUnit) || 0);
        const tt = Math.max(0, (turnoverMinutes || 0) / 60);
        const h = Math.max(0.1, workHoursPerDay || 8);
        const eff = Math.min(1.0, Math.max(0.1, (100 - (efficiencyValue || 0)) / 100));

        return analyzeDeadline(
            {
                quantity: q,
                printTimePerUnit: t,
                turnoverTimePerUnit: tt,
                efficiency: eff,
                workHoursPerDay: h,
                machineIds: filteredMachineIds,
                includeWeekends: includeWeekends
            },
            allMachines,
            new Date(deadline)
        );
    }, [result, deadline, quantity, printTimePerUnit, turnoverMinutes, efficiencyValue, workHoursPerDay, filteredMachineIds, allMachines, includeWeekends]);



    const toggleAllMachines = () => {
        const filteredIds = filteredMachines.map(m => m.id);
        const currentlyEnabledInFilter = filteredIds.filter(id => settings.enabledMachineIds.includes(id));
        const allInFilterEnabled = currentlyEnabledInFilter.length === filteredIds.length;
        
        let nextIds: string[];
        if (allInFilterEnabled) {
            // Disable only the machines in the current filter
            nextIds = settings.enabledMachineIds.filter(id => !filteredIds.includes(id));
        } else {
            // Enable all machines in current filter, preserving others
            nextIds = Array.from(new Set([...settings.enabledMachineIds, ...filteredIds]));
        }
        
        updateSettings({ enabledMachineIds: nextIds });
    };

    const toggleMachine = (id: string) => {
        const isEnabled = settings.enabledMachineIds.includes(id);
        const nextIds = isEnabled 
            ? settings.enabledMachineIds.filter(mid => mid !== id)
            : [...settings.enabledMachineIds, id];
        updateSettings({ enabledMachineIds: nextIds });
    };

    const applyRecommendation = (rec: Recommendation) => {
        const matchingIds = allMachines
            .filter(m => rec.matchCriteria(m))
            .map(m => m.id);
        
        updateSettings({ enabledMachineIds: matchingIds });
    };

    const filteredMachines = useMemo(() => {
        return allMachines.filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(machineFilter.toLowerCase()) ||
                                 m.print_type.toLowerCase().includes(machineFilter.toLowerCase());
            // Case-insensitive comparison for robustness
            const matchesType = m.print_type.toLowerCase() === printType.toLowerCase();
            return matchesSearch && matchesType;
        });
    }, [allMachines, machineFilter, printType]);

    return (
        <TooltipProvider>
            <div className="h-full bg-background flex flex-col overflow-hidden">
                <PageHeader 
                    title="Capacity Planner" 
                    subtitle="Industrial Production Forecasting & Resource Scheduling"
                />
                
                <main className="flex-1 overflow-hidden">
                    <div className="h-full flex flex-col lg:flex-row divide-x divide-border max-w-[1800px] mx-auto">
                        
                        {/* Compact Sidebar */}
                        <aside className="w-full lg:w-[320px] bg-white overflow-y-auto p-5 shrink-0 space-y-6">
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider mb-0">Object Geometry</h2>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="objX" className="text-sm font-medium text-slate-700">X (mm)</Label>
                                        <Input id="objX" type="number" min="0" value={objX} onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val) && val >= 0) setObjX(e.target.value);
                                            else if (e.target.value === "") setObjX("");
                                        }} placeholder="0" maxLength={6} className="h-9 px-3 font-medium tabular-nums text-foreground" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="objY" className="text-sm font-medium text-slate-700">Y (mm)</Label>
                                        <Input id="objY" type="number" min="0" value={objY} onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val) && val >= 0) setObjY(e.target.value);
                                            else if (e.target.value === "") setObjY("");
                                        }} placeholder="0" maxLength={6} className="h-9 px-3 font-medium tabular-nums text-foreground" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="objZ" className="text-sm font-medium text-slate-700">Z (mm)</Label>
                                        <Input id="objZ" type="number" min="0" value={objZ} onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val) && val >= 0) setObjZ(e.target.value);
                                            else if (e.target.value === "") setObjZ("");
                                        }} placeholder="0" maxLength={6} className="h-9 px-3 font-medium tabular-nums text-foreground" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 font-medium italic">Automated machine compatibility filtering enabled.</p>
                            </div>

                            {/* 1.5 Print Type Selection */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Print Technology</h2>
                                </div>
                                <div className="flex bg-secondary p-1 rounded-none h-11">
                                    <Button 
                                        variant="ghost"
                                        onClick={() => setPrintType("FDM")}
                                        className={cn(
                                            "flex-1 text-sm font-medium transition-all rounded-none h-full",
                                            printType === "FDM" 
                                                ? "bg-white text-primary shadow-sm hover:bg-white hover:text-primary" 
                                                : "text-slate-600 hover:text-foreground hover:bg-secondary/50"
                                        )}
                                    >
                                        FDM
                                    </Button>
                                    <Button 
                                        variant="ghost"
                                        onClick={() => setPrintType("Resin")}
                                        className={cn(
                                            "flex-1 text-sm font-medium transition-all rounded-none h-full",
                                            printType === "Resin" 
                                                ? "bg-white text-primary shadow-sm hover:bg-white hover:text-primary" 
                                                : "text-slate-600 hover:text-foreground hover:bg-secondary/50"
                                        )}
                                    >
                                        Resin
                                    </Button>
                                </div>
                            </div>

                            {/* 2. Job Parameters */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider mb-0 pt-2">Production Parameters</h2>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="q" className="text-sm font-medium text-slate-700">Batch Quantity</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="q" 
                                                    type="number" 
                                                    min="0"
                                                    value={quantity} 
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (!isNaN(val) && val >= 0) setQuantity(val.toString());
                                                        else if (e.target.value === "") setQuantity("");
                                                    }} 
                                                    maxLength={6}
                                                    className="h-9 tabular-nums pr-12 font-medium text-foreground" 
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 font-medium italic">qty</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="t" className="text-sm font-medium text-slate-700">Unit Cycle Time</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="t" 
                                                    type="number" 
                                                    min="0"
                                                    value={printTimePerUnit} 
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val) && val >= 0) setPrintTimePerUnit(e.target.value);
                                                        else if (e.target.value === "") setPrintTimePerUnit("");
                                                    }} 
                                                    maxLength={6}
                                                    className="h-9 tabular-nums pr-12 font-medium text-foreground" 
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 font-medium italic">hrs</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="d" className="text-sm font-medium text-slate-700">Delivery Date</Label>
                                        <Input 
                                            id="d" 
                                            type="date" 
                                            value={deadline} 
                                            onChange={(e) => setDeadline(e.target.value)} 
                                            onClick={(e) => e.currentTarget.showPicker?.()}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="h-9 font-medium text-foreground cursor-pointer" 
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="weekends" className="text-sm font-medium text-slate-700">Weekend Ops</Label>
                                            <p className="text-xs text-slate-600 font-medium">Include Sat/Sun</p>
                                        </div>
                                        <Switch id="weekends" checked={includeWeekends} onCheckedChange={setIncludeWeekends} className="scale-90" />
                                    </div>
                                    
                                    <div className="pt-2 space-y-4 border-t border-border mt-2">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-slate-700">Inventory Specification</Label>
                                            <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                                                <SelectTrigger className="h-10 bg-background border-border" aria-label="Select Material">
                                                    <SelectValue placeholder="Select Material" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableMaterials.map(m => (
                                                        <SelectItem key={m.id} value={m.id}>
                                                            <div className="flex items-center justify-between w-full pr-6">
                                                                <span className="font-medium truncate">{m.name}</span>
                                                                <span className="text-sm text-slate-600 group-focus:text-white font-medium whitespace-nowrap ml-4">
                                                                    ({getMaterialStock(m.id).toFixed(0)}{printType === "FDM" ? 'gm' : 'ml'} stock)
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="usage" className="text-sm font-medium text-slate-700">Unit Material Usage ({printType === "FDM" ? 'g' : 'ml'})</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="usage"
                                                    type="number" 
                                                    min="0"
                                                    value={usagePerUnit} 
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val) && val >= 0) setUsagePerUnit(e.target.value);
                                                        else if (e.target.value === "") setUsagePerUnit("");
                                                    }} 
                                                    maxLength={6}
                                                    className="h-9 tabular-nums pr-12 font-medium text-foreground" 
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 font-medium italic">{printType === "FDM" ? 'grams' : 'ml'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Shop Settings */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Shop Efficiency</h2>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-sm font-medium text-slate-700">Print Failure Chance</Label>
                                            <span className={cn(
                                                "text-sm font-medium",
                                                efficiencyValue > 20 ? "text-rose-500" : "text-primary"
                                            )}>{efficiencyValue}%</span>
                                        </div>
                                        <Slider 
                                            value={[efficiencyValue]} 
                                            onValueChange={setEfficiency} 
                                            max={50} 
                                            min={0} 
                                            step={1} 
                                            className={cn("py-1", efficiencyValue > 20 && "accent-rose-500")} 
                                            aria-label="Print Failure Chance"
                                        />
                                        <p className="text-xs text-slate-600 font-medium italic">Low failure chance = Faster estimated completion.</p>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-background">
                            
                            {/* Summary Verdict (Compact) */}
                            {!result ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-600 gap-3 border-2 border-dashed border-border rounded-none bg-background">
                                    <Clock className="w-8 h-8 opacity-20" aria-hidden="true" />
                                    <p className="text-xs font-medium uppercase tracking-widest">Awaiting Parameters</p>
                                </div>
                            ) : (
                                <Card className={cn(
                                    "px-10 py-8 flex flex-col md:flex-row items-center justify-between border-border shadow-sm transition-colors rounded-none",
                                    (analysis?.canMeet && !inventoryStats.isShort) ? "bg-card" : "bg-destructive/10"
                                )}>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-4">
                                            {inventoryStats.isShort ? (
                                                <div className="h-12 w-12 flex items-center justify-center shrink-0">
                                                    <AlertCircle className="w-8 h-8 text-rose-600" />
                                                </div>
                                            ) : analysis?.canMeet ? (
                                                <div className="h-12 w-12 flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                                </div>
                                            ) : (
                                                <div className="h-12 w-12 flex items-center justify-center shrink-0">
                                                    <AlertCircle className="w-8 h-8 text-rose-600" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-2xl font-medium tracking-tight text-foreground leading-tight">
                                                    {inventoryStats.isShort 
                                                        ? "Shortage Detected" 
                                                        : filteredMachineIds.length === 0
                                                    ? "Machine Check Required"
                                                            : analysis?.canMeet ? "Production Feasible" : "Schedule at Risk"}
                                                </h3>
                                                <p className={cn(
                                                    "text-sm mt-1 font-medium",
                                                    (inventoryStats.isShort || filteredMachineIds.length === 0) ? "text-rose-600" : "text-slate-600"
                                                )}>
                                                    {inventoryStats.isShort 
                                                        ? `Only ${inventoryStats.stock.toFixed(0)}${printType === "FDM" ? 'g' : 'ml'} of ${sanitize(inventoryStats.materialName)} available.`
                                                        : filteredMachineIds.length === 0
                                                            ? `No ${printType} printers are currently active in your enabled machines.`
                                                            : analysis?.canMeet 
                                                                ? `Completion estimated for ${formatDate(result.completionDate)}` 
                                                                : `Missing target by ${(analysis?.daysNeeded - analysis?.daysAvailable).toFixed(1)} days`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-12">
                                        <div className="text-center">
                                            <p className="text-xs font-medium text-slate-600 tracking-wider">Finish Date</p>
                                            <p className="text-xl font-medium text-foreground">{formatDate(result.completionDate)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-medium text-slate-600 tracking-wider">Printer Load</p>
                                            <p className={cn(
                                                "text-xl font-medium",
                                                result.utilizationPercent > 90 ? "text-rose-600" : "text-foreground"
                                            )}>{result.utilizationPercent.toFixed(0)}%</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-medium text-slate-600 tracking-wider">Needed Days</p>
                                            <p className="text-xl font-medium text-foreground">{result.estimatedDays.toFixed(1)}</p>
                                        </div>
                                    </div>
                                </Card>
                            )}

                             {/* Machine Selection (Compact Grid) */}
                             <section className="space-y-6">
                                 <div className="flex flex-col gap-4">
                                     <div className="flex items-center justify-between">
                                         <div className="flex items-center gap-6 flex-1">
                                             <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Machine Selection ({settings.enabledMachineIds.length}/{allMachines.length})</h2>
                                             <div className="relative max-w-sm h-10 flex-1 ml-4">
                                                 <Input 
                                                     placeholder="Filter machines..." 
                                                     value={machineFilter}
                                                     onChange={(e) => setMachineFilter(e.target.value)}
                                                     className="h-full pl-10 text-sm bg-white/50"
                                                     aria-label="Filter machines"
                                                 />
                                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                                             </div>
                                         </div>
                                         <div className="flex gap-2">
                                             <Button variant="ghost" size="sm" onClick={toggleAllMachines} className="h-9 text-sm font-semibold text-slate-600 hover:text-primary">
                                                 Select All
                                             </Button>
                                         </div>
                                     </div>

                                     {/* Smart Suggester - Simple Box */}
                                     <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-none mt-1">
                                         <div className="flex items-center gap-2">
                                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Optimized Suggestions:</span>
                                             <span className="text-[10px] text-slate-400 italic font-medium">(Click to auto-select machines)</span>
                                         </div>
                                         <div className="flex flex-wrap gap-2">
                                             {RECOMMENDATIONS.map((rec) => (
                                                 <Tooltip key={rec.id}>
                                                     <TooltipTrigger asChild>
                                                         <Button
                                                             variant="outline"
                                                             size="sm"
                                                             onClick={() => applyRecommendation(rec)}
                                                             className={cn(
                                                                 "h-8 px-4 text-xs font-bold rounded-none border-slate-300 bg-white transition-all shadow-sm",
                                                                 "hover:bg-primary hover:border-primary hover:text-primary-foreground hover:shadow-md active:scale-95"
                                                             )}
                                                         >
                                                             {rec.label}
                                                         </Button>
                                                     </TooltipTrigger>
                                                     <TooltipContent className="max-w-[300px] p-4 space-y-3 shadow-xl border-primary/20">
                                                         <div className="space-y-1">
                                                             <p className="font-extrabold text-sm text-primary uppercase tracking-tight">{rec.label}</p>
                                                             <p className="text-xs font-medium text-slate-600 leading-snug">{rec.description}</p>
                                                         </div>
                                                         <div className="pt-3 border-t border-slate-100">
                                                             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Industry Review Insight:</p>
                                                             <p className="text-xs leading-relaxed italic text-slate-700">"{rec.reviewInsight}"</p>
                                                         </div>
                                                     </TooltipContent>
                                                 </Tooltip>
                                             ))}
                                         </div>
                                     </div>
                                 </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                                    {filteredMachines.map((machine) => {
                                        const isEnabled = settings.enabledMachineIds.includes(machine.id);
                                        const dims = parseBoxVolume(machine.buildVolume);
                                        const ox = parseFloat(objX) || 0;
                                        const oy = parseFloat(objY) || 0;
                                        const oz = parseFloat(objZ) || 0;
                                        
                                        const tooSmall = dims && (ox > dims.x || oy > dims.y || oz > dims.z);

                                        return (
                                            <Tooltip key={machine.id}>
                                                <TooltipTrigger asChild>
                                                    <div 
                                                        onClick={() => !tooSmall && toggleMachine(machine.id)}
                                                        className={cn(
                                                            "px-4 py-3 cursor-pointer transition-all border rounded-none flex items-center justify-between gap-3 group",
                                                            isEnabled && !tooSmall
                                                                ? 'bg-primary border-primary text-primary-foreground shadow-md' 
                                                                : 'bg-card border-border text-slate-600 hover:border-primary/30',
                                                            tooSmall && "opacity-40 grayscale cursor-not-allowed bg-muted/30"
                                                        )}
                                                    >
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="text-sm font-medium leading-tight mb-0.5">{sanitize(machine.name)}</span>
                                                            {tooSmall && <span className="text-xs font-semibold text-rose-500">Too Small</span>}
                                                        </div>
                                                        {tooSmall && <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-xs font-bold p-3">
                                                    <div className="space-y-1.5">
                                                        <p className="uppercase opacity-70 border-b border-white/20 pb-1 mb-1">{machine.print_type}</p>
                                                        <p>Build Vol: {machine.buildVolume || "Unknown"}</p>
                                                        {tooSmall && <p className="text-rose-400 font-extrabold border-t border-rose-500/30 pt-1 mt-1">ERROR: Part is larger than printer!</p>}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Resource Details (Dense List) */}
                            {result && (
                                <section className="space-y-5">
                                    <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider mt-8 mb-4">Throughput Analysis</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                                        {result.breakdown.map((b) => (
                                            <div key={b.machineId} className="bg-card p-5 rounded-none border border-border shadow-sm space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-medium text-foreground truncate">{sanitize(b.machineName)}</p>
                                                    <span className="text-sm font-medium text-primary">{b.unitsAssigned} units</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-600 font-medium">
                                                    <span className="font-medium">{formatHours(b.hoursOccupied)}</span>
                                                    <span className="font-medium">{((b.hoursOccupied / (result.totalLaborHours / result.machineCount)) * 100).toFixed(0)}%</span>
                                                </div>
                                                <Progress 
                                                    value={(b.hoursOccupied / (result.totalLaborHours / result.machineCount)) * 100}
                                                    className={cn(
                                                        "h-2 rounded-none bg-muted/30",
                                                        !analysis?.canMeet && "[&>div]:bg-destructive"
                                                    )}
                                                    aria-label={`Utilization for ${b.machineName}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}
