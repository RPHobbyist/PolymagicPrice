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

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calculator, Calendar, Clock, CheckCircle2, XCircle, Printer } from "lucide-react";
import { Machine } from "@/types/quote";
import { calculateCapacity, formatDate, formatHours } from "@/lib/capacityCalculator";
import { getMachines } from "@/lib/core/sessionStorage";

interface CapacityPlannerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CapacityPlanner({ open, onOpenChange }: CapacityPlannerProps) {
    const allMachines = useMemo(() => getMachines(), []);

    const [quantity, setQuantity] = useState("10");
    const [printTimePerUnit, setPrintTimePerUnit] = useState("2");
    const [workHoursPerDay, setWorkHoursPerDay] = useState("8");
    const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>(
        allMachines.map(m => m.id)
    );
    const [deadline, setDeadline] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });

    const result = useMemo(() => {
        const q = parseInt(quantity) || 0;
        const t = parseFloat(printTimePerUnit) || 0;
        const h = parseFloat(workHoursPerDay) || 8;

        if (q <= 0 || t <= 0) return null;

        return calculateCapacity(
            {
                quantity: q,
                printTimePerUnit: t,
                workHoursPerDay: h,
                machineIds: selectedMachineIds,
            },
            allMachines
        );
    }, [quantity, printTimePerUnit, workHoursPerDay, selectedMachineIds, allMachines]);

    const canMeetDeadline = useMemo(() => {
        if (!result || !deadline) return null;
        const deadlineDate = new Date(deadline);
        const today = new Date();
        const daysAvailable = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
            canMeet: result.estimatedDays <= daysAvailable,
            daysAvailable,
        };
    }, [result, deadline]);

    const toggleMachine = (machineId: string) => {
        setSelectedMachineIds(prev =>
            prev.includes(machineId)
                ? prev.filter(id => id !== machineId)
                : [...prev, machineId]
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[500px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5" />
                        Capacity Planner
                    </SheetTitle>
                    <SheetDescription>
                        Calculate if you can fulfill an order by a specific deadline
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Input Form */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="planner-quantity">Quantity</Label>
                                <Input
                                    id="planner-quantity"
                                    name="quantity"
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="10"
                                    min="1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="planner-print-time">Print Time / Unit (hrs)</Label>
                                <Input
                                    id="planner-print-time"
                                    name="printTime"
                                    type="number"
                                    value={printTimePerUnit}
                                    onChange={(e) => setPrintTimePerUnit(e.target.value)}
                                    placeholder="2"
                                    step="0.5"
                                    min="0.1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="planner-work-hours">Work Hours / Day</Label>
                                <Input
                                    id="planner-work-hours"
                                    name="workHours"
                                    type="number"
                                    value={workHoursPerDay}
                                    onChange={(e) => setWorkHoursPerDay(e.target.value)}
                                    placeholder="8"
                                    min="1"
                                    max="24"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="planner-deadline">Deadline</Label>
                                <Input
                                    id="planner-deadline"
                                    name="deadline"
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Machine Selection */}
                        <div className="space-y-2">
                            <Label className="flex items-center justify-between">
                                <span>Machines ({selectedMachineIds.length} selected)</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => setSelectedMachineIds(
                                        selectedMachineIds.length === allMachines.length
                                            ? []
                                            : allMachines.map(m => m.id)
                                    )}
                                >
                                    {selectedMachineIds.length === allMachines.length ? "Deselect All" : "Select All"}
                                </Button>
                            </Label>
                            <ScrollArea className="h-[120px] border rounded-md p-2">
                                <div className="space-y-1">
                                    {allMachines.map((machine) => (
                                        <label
                                            key={machine.id}
                                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={selectedMachineIds.includes(machine.id)}
                                                onCheckedChange={() => toggleMachine(machine.id)}
                                            />
                                            <Printer className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm">{machine.name}</span>
                                            <Badge variant="outline" className="ml-auto text-[10px]">
                                                {machine.print_type}
                                            </Badge>
                                        </label>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Results */}
                    {result && (
                        <div className="space-y-4">
                            <div className="border-t pt-4">
                                {/* Deadline Status */}
                                {canMeetDeadline && (
                                    <Card className={`p-4 mb-4 ${canMeetDeadline.canMeet ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                                        <div className="flex items-center gap-3">
                                            {canMeetDeadline.canMeet ? (
                                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                                            ) : (
                                                <XCircle className="w-8 h-8 text-destructive" />
                                            )}
                                            <div>
                                                <p className="font-semibold">
                                                    {canMeetDeadline.canMeet
                                                        ? "✓ Can meet deadline!"
                                                        : "✗ Cannot meet deadline"}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Need {result.estimatedDays} days, have {canMeetDeadline.daysAvailable} days
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <Card className="p-3 text-center">
                                        <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                                        <p className="text-lg font-bold">{formatHours(result.totalPrintHours)}</p>
                                        <p className="text-xs text-muted-foreground">Total Print Time</p>
                                    </Card>
                                    <Card className="p-3 text-center">
                                        <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                                        <p className="text-lg font-bold">{result.estimatedDays}</p>
                                        <p className="text-xs text-muted-foreground">Days Needed</p>
                                    </Card>
                                    <Card className="p-3 text-center">
                                        <Printer className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                                        <p className="text-lg font-bold">{result.machineCount}</p>
                                        <p className="text-xs text-muted-foreground">Machines</p>
                                    </Card>
                                </div>

                                {/* Utilization */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span>Fleet Utilization</span>
                                        <span className="font-medium">{result.utilizationPercent.toFixed(0)}%</span>
                                    </div>
                                    <Progress value={result.utilizationPercent} />
                                </div>

                                {/* Completion Date */}
                                <p className="text-center text-sm text-muted-foreground">
                                    Estimated completion: <strong>{formatDate(result.completionDate)}</strong>
                                </p>

                                {/* Machine Breakdown */}
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm font-medium">Machine Breakdown</p>
                                    {result.breakdown.map((b) => (
                                        <div key={b.machineId} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                                            <span className="truncate">{b.machineName}</span>
                                            <span className="text-muted-foreground tabular-nums">
                                                {b.unitsAssigned} units • {formatHours(b.hoursOccupied)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
