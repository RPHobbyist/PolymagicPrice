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

import { useState, useCallback, useMemo, memo, useEffect, useRef, lazy, Suspense } from "react";
import { Calculator, Save } from "lucide-react";
import { toast } from "sonner";
import { QuoteData, ResinFormData, StoredGcode, Employee, QuoteStatus } from "@/types/quote";
import { useCalculatorData } from "@/hooks/useCalculatorData";
import { calculateResinQuote, validateResinForm } from "@/lib/quoteCalculations";
import { QuoteCalculator } from "./QuoteCalculator";
import { FormFieldRow, TextField, SelectField } from "./FormField";
import { ConsumablesSelector } from "./ConsumablesSelector";
import { SpoolSelector } from "./SpoolSelector";
/*
 * Fetched on demand: `ResinFileUpload` statically imports the resin parser, which statically
 * imports JSZip (~98 KB minified). This table is part of the cost calculator page, so that landed
 * in the first load for every visitor, including the FDM users who never open a resin file.
 */
const ResinFileUpload = lazy(() => import("./ResinFileUpload"));
import type { ResinFileData } from "@/lib/parsers/resinFileParser";
import { useCurrency } from "@/hooks/useCurrency";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { SurfaceAreaUpload } from "./SurfaceAreaUpload";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStoredGcodes } from "@/hooks/useStoredGcodes";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import * as sessionStore from "@/lib/core/sessionStorage";
import { pick } from "@/lib/utils";
// The one parser for a print-time field: "1:30" is 1.5 h here exactly as it is in the pricing engine.
import { parseTimeToHours } from "@/lib/utils/time";

interface ResinCalculatorProps {
  onCalculate: (data: QuoteData) => void;
  preFillData?: Partial<ResinFormData> & { 
    name?: string; 
    status?: QuoteStatus; 
    priority?: string; 
    dueDate?: string; 
    customerId?: string; 
    clientName?: string; 
    assignedEmployeeId?: string; 
    notes?: string;
    failedUnits?: number | string;
    thumbnail?: string;
    editQuoteId?: string;
    id?: string;
    machineName?: string;
    materialName?: string;
  };
}

const initialFormData: ResinFormData = {
  id: "",
  projectName: "",
  printColour: "-",
  materialId: "",
  machineId: "",
  printTime: "",
  resinVolume: "",
  washingTime: "",
  curingTime: "",
  isopropylCost: "",
  laborHours: "",
  overheadPercentage: "",
  markupPercentage: "20",
  quantity: "1",
  selectedConsumableIds: [],
  paintingTime: "",
  paintingLayers: "",
  selectedPaintId: "",
  selectedPaintId2: "",
  paintingLayers2: "",
  surfaceAreaCm2: "",
  notes: "",
  failedUnits: "",
  priority: "Medium",
  dueDate: "",
  assignedEmployeeId: "",
  filePath: "",
};

const ResinCalculatorTable = memo(({ onCalculate, preFillData }: ResinCalculatorProps) => {
  const { materials, machines, constants, loading, getConstantValue, findConstantValue } = useCalculatorData({ printType: "Resin" });
  const [formData, setFormData] = useState<ResinFormData>(initialFormData);
  
  // Stable ID for the current calculation session
  // Resets only when the entire component remounts (facilitated by the key in Index.tsx)
  const calculationId = useMemo(() => crypto.randomUUID(), []);

  const [selectedSpoolId, setSelectedSpoolId] = useState<string>("");
  const { currency, formatPrice } = useCurrency();
  const { gcodes, saveGcode } = useStoredGcodes();
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Load employees on mount and on storage change
  useEffect(() => {
    const fetchEmployees = () => setEmployees(sessionStore.getEmployees());
    fetchEmployees();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "session_employees") {
        fetchEmployees();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Filter for Resin files only
  const filteredGcodes = useMemo(() => {
    return gcodes.filter(g => (g.resinVolume || 0) > 0);
  }, [gcodes]);

  const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
  const lastLoadedIdRef = useRef<string | null>(null);

  const [isPaintingEnabled, setIsPaintingEnabled] = useState(false);

  // Sync isPaintingEnabled with initial data if needed.
  // A chosen paint counts as painting even with no coat count typed yet, otherwise reopening such
  // a quote would show the section closed while the paint was still being charged.
  useEffect(() => {
    const hasPainting =
      (formData.paintingLayers && parseInt(formData.paintingLayers) > 0) ||
      !!formData.selectedPaintId ||
      !!formData.selectedPaintId2;
    if (hasPainting && !isPaintingEnabled) {
      setIsPaintingEnabled(true);
    }
  }, [formData.paintingLayers, formData.selectedPaintId, formData.selectedPaintId2, isPaintingEnabled]);

  const updateField = useCallback(<K extends keyof ResinFormData>(field: K, value: ResinFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleResinFileData = useCallback((data: ResinFileData) => {
    let matchedMachineId = '';

    if (data.printerModel) {
      const printerModelLower = data.printerModel.toLowerCase();
      const matchedMachine = machines.find(m =>
        m.name.toLowerCase().includes(printerModelLower) ||
        printerModelLower.includes(m.name.toLowerCase())
      );
      if (matchedMachine) {
        matchedMachineId = matchedMachine.id;
        toast.info(`Auto-selected machine: ${matchedMachine.name}`);
      }
    }

    setFormData(prev => ({
      ...prev,
      projectName: data.fileName ? (data.fileName.lastIndexOf('.') > 0 ? data.fileName.substring(0, data.fileName.lastIndexOf('.')) : data.fileName) : prev.projectName,
      printTime: data.printTimeHours > 0 ? data.printTimeHours.toString() : prev.printTime,
      resinVolume: data.resinVolumeMl > 0 ? data.resinVolumeMl.toString() : prev.resinVolume,
      machineId: matchedMachineId || prev.machineId,
      printColour: prev.printColour,
    }));

    // The resin parsers do render a preview (RGB565 -> canvas), so use it when present
    // instead of unconditionally discarding it.
    setThumbnail(data.thumbnail);
  }, [machines]);

  // Handle pre-fill data from library navigation or revision
  useEffect(() => {
    if (preFillData) {
      const targetId = preFillData.editQuoteId || preFillData.id || null;
      // GUARD: If we already loaded this specific record, don't reset the form
      if (targetId && lastLoadedIdRef.current === targetId) {
        return;
      }

      // Update the ref to prevent re-populating on every keystroke
      lastLoadedIdRef.current = targetId;

      // If it's a revision, it has all these fields. If not, they fall back to defaults.
      setFormData(prev => ({
        ...prev,
        id: targetId || prev.id,
        projectName: preFillData.projectName || preFillData.name || prev.projectName,
        // `pick` preserves a deliberate 0; `||` silently swapped it for the default and
        // re-priced the quote on every revision.
        printTime: pick(preFillData.printTime, prev.printTime, ""),
        resinVolume: pick(preFillData.resinVolume, prev.resinVolume, ""),
        materialId: preFillData.materialId || prev.materialId,
        machineId: preFillData.machineId || prev.machineId,
        washingTime: pick(preFillData.washingTime, prev.washingTime, ""),
        curingTime: pick(preFillData.curingTime, prev.curingTime, ""),
        // Previously omitted entirely, so the IPA charge silently dropped to 0 on revision.
        isopropylCost: pick(preFillData.isopropylCost, prev.isopropylCost, ""),
        laborHours: pick(preFillData.laborHours, prev.laborHours, ""),
        overheadPercentage: pick(preFillData.overheadPercentage, prev.overheadPercentage, ""),
        markupPercentage: pick(preFillData.markupPercentage, prev.markupPercentage, "20"),
        quantity: pick(preFillData.quantity, prev.quantity, "1"),
        priority: preFillData.priority || prev.priority,
        dueDate: preFillData.dueDate || prev.dueDate,
        customerId: preFillData.customerId || prev.customerId,
        clientName: preFillData.clientName || prev.clientName,
        assignedEmployeeId: preFillData.assignedEmployeeId || prev.assignedEmployeeId,
        selectedConsumableIds: preFillData.selectedConsumableIds || prev.selectedConsumableIds || [],
        notes: preFillData.notes || prev.notes,
        status: preFillData.status || prev.status,
        failedUnits: preFillData.failedUnits !== undefined ? String(preFillData.failedUnits) : prev.failedUnits,
        // Painting mapping
        printColour: preFillData.printColour || prev.printColour,
        paintingTime: pick(preFillData.paintingTime, prev.paintingTime, ""),
        paintingLayers: pick(preFillData.paintingLayers, prev.paintingLayers, ""),
        paintingLayers2: pick(preFillData.paintingLayers2, prev.paintingLayers2, ""),
        selectedPaintId: preFillData.selectedPaintId || prev.selectedPaintId,
        selectedPaintId2: preFillData.selectedPaintId2 || prev.selectedPaintId2,
        surfaceAreaCm2: pick(preFillData.surfaceAreaCm2, prev.surfaceAreaCm2, "")
      }));

      setThumbnail(preFillData.thumbnail);
    }
  }, [preFillData, handleResinFileData]);

  const handleConsumablesChange = useCallback((selectedIds: string[]) => {
    updateField("selectedConsumableIds", selectedIds);
    if (selectedIds.length > 0) {
      const totalValue = constants
        .filter(c => selectedIds.includes(c.id))
        .reduce((sum, c) => sum + c.value, 0);
      toast.info(`Selected ${selectedIds.length} consumables (Total: ${formatPrice(totalValue)})`);
    }
  }, [constants, updateField, formatPrice]);

  const handleSavedGcodeSelect = useCallback((fileId: string) => {
    const file = gcodes.find(f => f.id === fileId);
    if (!file) return;

    // Find matching machine if possible
    let matchedMachineId = '';
    if (file.machineName) {
      const machineNameLower = file.machineName.toLowerCase();
      const matchedMachine = machines.find(m =>
        m.name.toLowerCase().includes(machineNameLower) ||
        machineNameLower.includes(m.name.toLowerCase())
      );
      if (matchedMachine) {
        matchedMachineId = matchedMachine.id;
      }
    }

    setFormData(prev => ({
      ...prev,
      projectName: file.name,
      printTime: file.printTime.toString(),
      resinVolume: (file.resinVolume || 0).toString(),
      machineId: matchedMachineId || prev.machineId,
    }));

    toast.success(`Loaded "${file.name}"`);
  }, [gcodes, machines]);

  const handleSaveToLibrary = async () => {
    try {
      // Find material and machine names for metadata
      const machine = machines.find(m => m.id === formData.machineId);
      const material = materials.find(m => m.id === formData.materialId);

      const newGcode: StoredGcode = {
        id: crypto.randomUUID(),
        name: formData.projectName || "Unnamed Resin Project",
        filePath: formData.filePath || "Uploaded File",
        // parseFloat read "1:30" as 1, so a job saved to the library came back an hour short and
        // re-priced 33% low. The pricing engine has always used parseTimeToHours; this now matches.
        printTime: parseTimeToHours(formData.printTime),
        filamentWeight: 0, // Not used for resin
        resinVolume: parseFloat(formData.resinVolume) || 0,
        machineName: machine?.name || "Standard Resin Printer",
        materialName: material?.name || "Standard Resin",
        printType: "Resin",
        thumbnail: thumbnail,
        createdAt: new Date().toISOString(),
      };

      // `useStoredGcodes.saveGcode` reports both outcomes itself, so neither a success nor an
      // error toast belongs here — adding them showed the shop two of each.
      await saveGcode(newGcode);
    } catch (error) {
      console.error("[Calculator] Saving to the G-code library failed.", error);
    }
  };

  const calculateQuote = useCallback(() => {
    const validationError = validateResinForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedMaterial = materials.find(m => m.id === formData.materialId);
    const selectedMachine = machines.find(m => m.id === formData.machineId);
    const selectedConsumables = constants
      .filter(c => formData.selectedConsumableIds.includes(c.id))
      .map(c => ({ name: c.name, value: c.value }));

    if (!selectedMaterial || !selectedMachine) {
      toast.error("Invalid material or machine selection");
      return;
    }

    // Validate mandatory constants
    const electricityRate = getConstantValue("electricity");
    const laborRate = getConstantValue("labor");


    if (!electricityRate || electricityRate <= 0) {
      toast.error("Electricity Rate is required. Please set it in Settings → Consumables.");
      return;
    }

    if (!laborRate || laborRate <= 0) {
      toast.error("Labor Rate is required. Please set it in Settings → Consumables.");
      return;
    }

    // Only bill for paint while the painting section is actually switched on: the engine charges
    // for whatever paints it is handed, so the switch has to be honoured here rather than being
    // inferred from fields that may still hold a previous selection.
    const selectedPaint = isPaintingEnabled && formData.selectedPaintId
      ? constants.find(c => c.id === formData.selectedPaintId)
      : undefined;
    const selectedPaint2 = isPaintingEnabled && formData.selectedPaintId2
      ? constants.find(c => c.id === formData.selectedPaintId2)
      : undefined;

    const quoteData = calculateResinQuote({
      formData: {
        ...formData,
        id: formData.id || calculationId, // Use existing ID if editing, otherwise the stable session ID
        selectedSpoolId: selectedSpoolId || undefined, // Ensure spool ID is passed
      },
      material: selectedMaterial,
      machine: selectedMachine,
      electricityRate: electricityRate,
      laborRate: laborRate,
      // Carbon: the shop's grid factor, plus the bottle in use when one is selected.
      // findConstantValue, not getConstantValue: a missing grid factor must stay undefined so the
      // carbon engine applies its world-average default. A 0 reads as a deliberate figure — a shop
      // on fully renewable power — and would otherwise report every job as zero-carbon.
      gridGPerKWh: findConstantValue("grid_intensity"),
      spool: selectedSpoolId ? sessionStore.getSpools().find(s => s.id === selectedSpoolId) : undefined,
      consumables: selectedConsumables,
      paintConsumable: selectedPaint, // Pass the full object
      paintConsumable2: selectedPaint2, // Pass secondary paint
      customerId: formData.customerId,
      clientName: formData.clientName,
      thumbnail: thumbnail,
    });

    onCalculate(quoteData);
    toast.success("Quote calculated successfully!");
  }, [formData, selectedSpoolId, materials, machines, constants, getConstantValue, findConstantValue, onCalculate, calculationId, thumbnail, isPaintingEnabled]);

  const materialOptions = useMemo(() =>
    materials.map(m => ({
      id: m.id,
      label: m.name,
      sublabel: `${formatPrice(m.cost_per_unit)}/${m.unit}`,
    })), [materials, formatPrice]);

  const machineOptions = useMemo(() =>
    machines.map(m => ({
      id: m.id,
      label: m.name,
      sublabel: `${formatPrice(m.hourly_cost)}/hr`,
    })), [machines, formatPrice]);

  const consumableItems = useMemo(() =>
    constants.map(c => ({
      id: c.id,
      name: c.name,
      value: c.value,
      unit: c.unit,
    })), [constants]);

  const uploadSection = (
    <div className="flex flex-col gap-4 p-4 bg-slate-50/50 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-normal text-foreground">Auto-fill from Resin File</p>
            <p className="text-sm text-muted-foreground">Upload .cxdlpv4 to extract parameters</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(thumbnail || formData.filePath) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveToLibrary}
              className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
              aria-label="Save current file details to library"
              title="Save current file details to library"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save to Library</span>
            </Button>
          )}
          <Suspense fallback={<div className="h-9 w-32 animate-pulse rounded-md bg-muted/50" />}>
            <ResinFileUpload onDataExtracted={handleResinFileData} />
          </Suspense>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Saved Files:</span>
        <Select onValueChange={handleSavedGcodeSelect} disabled={filteredGcodes.length === 0}>
          <SelectTrigger aria-label="Select a saved file" className="h-8 w-full max-w-[300px] bg-background/50">
            <SelectValue placeholder={filteredGcodes.length === 0 ? "No saved files" : "Select a saved file..."} />
          </SelectTrigger>
          <SelectContent>
            {filteredGcodes.map((file) => (
              <SelectItem key={file.id} value={file.id}>
                <div className="flex items-center gap-2">
                  <span>{file.name}</span>
                  <span className="text-sm text-muted-foreground group-focus:text-white font-normal whitespace-nowrap">
                    ({file.printTime}hr, {file.resinVolume}ml)
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <QuoteCalculator loading={loading} onCalculate={calculateQuote} uploadSection={uploadSection}>
      <FormFieldRow label="Project Name" htmlFor="project-name" required>
        <TextField
          id="project-name"
          name="projectName"
          value={formData.projectName}
          onChange={(v) => updateField("projectName", v)}
          placeholder="Enter project name"
          maxLength={100}
        />
      </FormFieldRow>

      <FormFieldRow label="Client" htmlFor="resin-client">
        <ClientSelector
          id="resin-client"
          value={formData.customerId}
          onSelect={(customer) => {
            setFormData(prev => ({
              ...prev,
              customerId: customer?.id || "",
              clientName: customer?.name || ""
            }));
          }}
        />
      </FormFieldRow>

      <FormFieldRow label="Material" htmlFor="resin-material-id" required>
        <SelectField
          id="resin-material-id"
          name="materialId"
          value={formData.materialId}
          onChange={(v) => {
            updateField("materialId", v);
            // Reset spool selection when material changes
            setSelectedSpoolId("");
            updateField("printColour", "");
          }}
          placeholder="Select material"
          options={materialOptions}
        />
      </FormFieldRow>

      <FormFieldRow label="Colour" htmlFor="resin-spool-selector" required>
        <SpoolSelector
          id="resin-spool-selector"
          name="spoolId"
          materialId={formData.materialId}
          value={selectedSpoolId}
          onChange={(spoolId, colour) => {
            setSelectedSpoolId(spoolId);
            updateField("printColour", colour || "");
          }}
          requiredWeight={(parseFloat(formData.resinVolume) || 0) * (parseInt(formData.quantity) || 1)}
          itemType="bottle"
        />
      </FormFieldRow>

      <FormFieldRow label="Machine" htmlFor="resin-machine-id" required>
        <SelectField
          id="resin-machine-id"
          name="machineId"
          value={formData.machineId}
          onChange={(v) => updateField("machineId", v)}
          placeholder="Select machine"
          options={machineOptions}
        />
      </FormFieldRow>

      <FormFieldRow label="Consumables" htmlFor="resin-consumables-selector">
        <ConsumablesSelector
          id="resin-consumables-selector"
          items={consumableItems}
          selectedIds={formData.selectedConsumableIds}
          onChange={handleConsumablesChange}
        />
      </FormFieldRow>

      <FormFieldRow label="Print Time (hours)" htmlFor="resin-print-time" required>
        <TextField
          id="resin-print-time"
          name="printTime"
          type="number"
          step="0.1"
          value={formData.printTime}
          onChange={(v) => updateField("printTime", v)}
          placeholder="4.5"
          min={0.1}
          max={10000}
        />
      </FormFieldRow>

      <FormFieldRow label="Resin Volume (ml)" htmlFor="resin-volume" required>
        <TextField
          id="resin-volume"
          name="resinVolume"
          type="number"
          step="0.1"
          value={formData.resinVolume}
          onChange={(v) => updateField("resinVolume", v)}
          placeholder="150"
          min={0.1}
          max={50000}
        />
      </FormFieldRow>

      <FormFieldRow label="Washing Time (minutes)" htmlFor="washing-time">
        <TextField
          id="washing-time"
          name="washingTime"
          type="number"
          value={formData.washingTime}
          onChange={(v) => updateField("washingTime", v)}
          placeholder="10"
          min={0}
          max={1440}
        />
      </FormFieldRow>

      <FormFieldRow label="Curing Time (minutes)" htmlFor="curing-time">
        <TextField
          id="curing-time"
          name="curingTime"
          type="number"
          value={formData.curingTime}
          onChange={(v) => updateField("curingTime", v)}
          placeholder="15"
          min={0}
          max={1440}
        />
      </FormFieldRow>

      <FormFieldRow label={`IPA/Cleaning Cost (${currency.symbol})`} htmlFor="isopropyl-cost">
        <TextField
          id="isopropyl-cost"
          name="isopropylCost"
          type="number"
          step="0.01"
          value={formData.isopropylCost}
          onChange={(v) => updateField("isopropylCost", v)}
          placeholder="50"
          min={0}
          max={10000}
        />
      </FormFieldRow>

      <FormFieldRow label="Labor Hours" htmlFor="resin-labor-hours">
        <TextField
          id="resin-labor-hours"
          name="laborHours"
          type="number"
          step="0.1"
          value={formData.laborHours}
          onChange={(v) => updateField("laborHours", v)}
          placeholder="1.0"
          min={0}
          max={1000}
        />
      </FormFieldRow>

      <FormFieldRow label="Overhead (%)" htmlFor="resin-overhead-percentage">
        <TextField
          id="resin-overhead-percentage"
          name="overheadPercentage"
          type="number"
          step="0.1"
          value={formData.overheadPercentage}
          onChange={(v) => updateField("overheadPercentage", v)}
          placeholder="15"
          min={0}
          max={1000}
        />
      </FormFieldRow>

      <FormFieldRow label="Profit Markup (%)" htmlFor="resin-markup-percentage">
        <TextField
          id="resin-markup-percentage"
          name="markupPercentage"
          type="number"
          step="0.1"
          value={formData.markupPercentage}
          onChange={(v) => updateField("markupPercentage", v)}
          placeholder="20"
          min={0}
          max={100000}
        />
      </FormFieldRow>

      <FormFieldRow label="Quantity" htmlFor="resin-quantity">
        <TextField
          id="resin-quantity"
          name="quantity"
          type="number"
          step="1"
          value={formData.quantity}
          onChange={(v) => updateField("quantity", v)}
          placeholder="1"
          min={1}
          max={1000000}
        />
      </FormFieldRow>

      <FormFieldRow label="Order Priority" htmlFor="resin-priority">
        <SelectField
          id="resin-priority"
          name="priority"
          value={formData.priority || "Medium"}
          onChange={(v) => updateField("priority", v)}
          placeholder="Select priority"
          options={[
            { id: "Low", label: "Low" },
            { id: "Medium", label: "Medium" },
            { id: "High", label: "High" },
          ]}
        />
      </FormFieldRow>

      <FormFieldRow label="Due Date" htmlFor="resin-due-date">
        <Input
          id="resin-due-date"
          name="dueDate"
          type="date"
          value={formData.dueDate || ""}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => updateField("dueDate", e.target.value)}
          className="h-10"
        />
      </FormFieldRow>

      <FormFieldRow label="Assigned Employee" htmlFor="resin-assigned-employee">
        <SelectField
          id="resin-assigned-employee"
          name="assignedEmployeeId"
          value={formData.assignedEmployeeId || "none"}
          onChange={(v) => updateField("assignedEmployeeId", v === "none" ? "" : v)}
          options={[
            { id: "none", label: "-- Select Employee --" },
            ...employees.map(e => ({ id: e.id, label: `${e.name} (${e.jobPosition})` }))
          ]}
          placeholder="Select employee"
        />
      </FormFieldRow>

      <div className="pt-4 px-2 sm:px-4 border-t border-border">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Post Processing</h2>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-semibold border border-blue-500/20">BETA</span>
        </div>

        <FormFieldRow label="Include Painting" htmlFor="resin-include-painting">
          <div className="flex items-center h-10 gap-2">
            <Checkbox
              id="resin-include-painting"
              checked={isPaintingEnabled}
              onCheckedChange={(checked) => {
                const isChecked = checked === true;
                setIsPaintingEnabled(isChecked);
                if (isChecked) {
                  updateField("paintingLayers", "1");
                  updateField("paintingTime", "0.5");
                } else {
                  // Clear the WHOLE painting section. Leaving the second paint, its coat count
                  // and the surface area behind meant an unticked box still billed a coat of the
                  // secondary paint — invisibly, since the section itself was hidden.
                  updateField("paintingLayers", "");
                  updateField("paintingTime", "");
                  updateField("selectedPaintId", "");
                  updateField("selectedPaintId2", "");
                  updateField("paintingLayers2", "");
                  updateField("surfaceAreaCm2", "");
                }
              }}
              className="border-slate-300 data-[state=checked]:bg-slate-800"
              aria-label="Include Painting"
            />
            <Label htmlFor="resin-include-painting" className="text-sm font-medium cursor-pointer">
              Enable
            </Label>
          </div>
        </FormFieldRow>

        {isPaintingEnabled && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <FormFieldRow label="Surface Area (cm²)" htmlFor="resin-surface-area">
              <div className="flex gap-2 items-center">
                <TextField
                  id="resin-surface-area"
                  type="number"
                  value={formData.surfaceAreaCm2}
                  onChange={(v) => updateField("surfaceAreaCm2", v)}
                  placeholder="Enter area manually"
                  className="flex-1"
                  min={0}
                  max={1000000}
                  endAdornment={
                    <SurfaceAreaUpload
                      className="border-none hover:bg-transparent px-2"
                      onSurfaceAreaDetected={(area) => updateField("surfaceAreaCm2", (area / 100).toString())}
                    />
                  }
                />
              </div>
            </FormFieldRow>

            <FormFieldRow label="Choose paint" htmlFor="resin-paint-choice">
              <SelectField
                id="resin-paint-choice"
                value={formData.selectedPaintId || "none"}
                onChange={(v) => updateField("selectedPaintId", v === "none" ? "" : v)}
                placeholder="Select paint..."
                options={[
                  { id: "none", label: "-- None --" },
                  ...(Array.isArray(constants) ? constants : [])
                    .filter(c => c && typeof c.name === 'string' && c.is_visible !== false)
                    .map(c => {
                      let usageRate = "";
                      const usageMatch = c.description?.match(/Usage Rate:\s*([\d.]+)/i);
                      if (usageMatch) {
                        usageRate = ` @ ${usageMatch[1]}ml/cm²`;
                      }

                      return {
                        id: c.id,
                        label: c.name,
                        sublabel: currency ? `${formatPrice(c.value)} ${c.unit ? `(${c.unit.startsWith('/') ? currency.symbol + c.unit : c.unit})` : ''}${usageRate}` : `${c.value}`
                      };
                    })]}
              />
            </FormFieldRow>

            <FormFieldRow label="Coating Layers" htmlFor="resin-coating-layers">
              <TextField
                id="resin-coating-layers"
                type="number"
                step="1"
                value={formData.paintingLayers}
                onChange={(v) => updateField("paintingLayers", v)}
                placeholder="1"
                min={0}
                max={100}
              />
            </FormFieldRow>

            <FormFieldRow label="Secondary Paint" htmlFor="resin-secondary-paint">
              <SelectField
                id="resin-secondary-paint"
                value={formData.selectedPaintId2 || "none"}
                onChange={(v) => updateField("selectedPaintId2", v === "none" ? "" : v)}
                placeholder="Select second paint..."
                options={[
                  { id: "none", label: "-- None --" },
                  ...(Array.isArray(constants) ? constants : [])
                    .filter(c => c && typeof c.name === 'string' && c.is_visible !== false)
                    .map(c => {
                      let usageRate = "";
                      const usageMatch = c.description?.match(/Usage Rate:\s*([\d.]+)/i);
                      if (usageMatch) {
                        usageRate = ` @ ${usageMatch[1]}ml/cm²`;
                      }

                      return {
                        id: c.id,
                        label: c.name,
                        sublabel: currency ? `${formatPrice(c.value)} ${c.unit ? `(${c.unit.startsWith('/') ? currency.symbol + c.unit : c.unit})` : ''}${usageRate}` : `${c.value}`
                      };
                    })
                ]}
              />
            </FormFieldRow>

            <FormFieldRow label="2nd Coating Layers" htmlFor="resin-coating-layers-2">
              <TextField
                id="resin-coating-layers-2"
                type="number"
                step="1"
                value={formData.paintingLayers2}
                onChange={(v) => updateField("paintingLayers2", v)}
                placeholder="1"
                min={0}
                max={100}
              />
            </FormFieldRow>

            <FormFieldRow label="Painting Labor (hrs)" htmlFor="resin-painting-labor">
              <TextField
                id="resin-painting-labor"
                type="number"
                step="0.1"
                value={formData.paintingTime}
                onChange={(v) => updateField("paintingTime", v)}
                placeholder="0.5"
                min={0}
                max={1000}
              />
            </FormFieldRow>
          </div>
        )}
      </div>
    </QuoteCalculator>
  );
});

ResinCalculatorTable.displayName = "ResinCalculatorTable";

export default ResinCalculatorTable;
