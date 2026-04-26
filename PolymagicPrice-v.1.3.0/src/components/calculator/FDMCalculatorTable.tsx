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

import { useState, useCallback, useMemo, memo, useEffect } from "react";
import { Calculator, Save } from "lucide-react";
import { toast } from "sonner";
import { QuoteData, FDMFormData, StoredGcode } from "@/types/quote";
import { useCalculatorData } from "@/hooks/useCalculatorData";
import { calculateFDMQuote, validateFDMForm } from "@/lib/quoteCalculations";
import { QuoteCalculator } from "./QuoteCalculator";
import { FormFieldRow, TextField, SelectField } from "./FormField";
import { ConsumablesSelector } from "./ConsumablesSelector";
import { SpoolSelector } from "./SpoolSelector";
import GcodeUpload from "./GcodeUpload";
import { GcodeData } from "@/lib/parsers/gcodeParser";
import { useCurrency } from "@/hooks/useCurrency";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { Customer, Employee } from "@/types/quote";
import { SurfaceAreaUpload } from "./SurfaceAreaUpload";
import { getEmployees } from "@/lib/core/sessionStorage";
import { useStoredGcodes } from "@/hooks/useStoredGcodes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface FDMCalculatorProps {
  onCalculate: (data: QuoteData) => void;
}

const initialFormData: FDMFormData = {
  projectName: "",
  printColour: "",
  materialId: "",
  machineId: "",
  printTime: "",
  filamentWeight: "",
  laborHours: "",
  overheadPercentage: "",
  markupPercentage: "20",
  quantity: "1",
  priority: "Medium",
  dueDate: "",
  selectedConsumableIds: [],
  filePath: "", // Store uploaded file path
  customerId: "",

  clientName: "",
  assignedEmployeeId: "",
  paintingTime: "",
  paintingLayers: "",
  selectedPaintId: "",
  surfaceAreaCm2: "",
};

const FDMCalculatorTable = memo(({ onCalculate }: FDMCalculatorProps) => {
  const { materials, machines, constants, loading, getConstantValue } = useCalculatorData({ printType: "FDM" });
  const [formData, setFormData] = useState<FDMFormData>(initialFormData);
  const [selectedSpoolId, setSelectedSpoolId] = useState<string>("");
  const { currency } = useCurrency();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { gcodes, saveGcode } = useStoredGcodes();

  // Filter for FDM files only (has filament weight and no resin volume)
  const filteredGcodes = useMemo(() => {
    return gcodes.filter(g => (g.filamentWeight || 0) > 0 && !g.resinVolume);
  }, [gcodes]);

  const [currentGcodeData, setCurrentGcodeData] = useState<GcodeData | null>(null);

  // Load employees on mount
  useEffect(() => {
    setEmployees(getEmployees());
  }, []);

  const [isPaintingEnabled, setIsPaintingEnabled] = useState(false);

  // Sync isPaintingEnabled with initial data if needed (e.g. when editing a quote)
  useEffect(() => {
    if (formData.paintingLayers && parseInt(formData.paintingLayers) > 0 && !isPaintingEnabled) {
      setIsPaintingEnabled(true);
    }
  }, [formData.paintingLayers, isPaintingEnabled]);

  const updateField = useCallback(<K extends keyof FDMFormData>(field: K, value: FDMFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleClientSelect = useCallback((customer: Customer | null) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer?.id || "",
      clientName: customer?.name || ""
    }));
  }, []);

  const handleGcodeData = useCallback((data: GcodeData) => {
    let matchedMachineId = '';
    let matchedMaterialId = '';

    // Normalize function: lowercase and remove non-alphanumeric chars
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (data.printerModel) {
      const normalizedModel = normalize(data.printerModel);



      // Find exact match only - the normalized G-code model must match the normalized machine name
      const matchedMachine = machines.find(m => {
        const normalizedMachineName = normalize(m.name);

        // Exact normalized match
        if (normalizedMachineName === normalizedModel) {
          return true;
        }

        // Check if one fully contains the other AND they have same key identifiers
        // e.g., "bambulaba1mini" should match "bambulaba1mini" but NOT "bambulaba1"
        if (normalizedMachineName.includes(normalizedModel) || normalizedModel.includes(normalizedMachineName)) {
          // Additional check: both must have the same suffix (mini, pro, plus, etc.) if any exists
          const modelHasMini = normalizedModel.includes('mini');
          const machineHasMini = normalizedMachineName.includes('mini');
          const modelHasPro = normalizedModel.includes('pro');
          const machineHasPro = normalizedMachineName.includes('pro');
          const modelHasPlus = normalizedModel.includes('plus');
          const machineHasPlus = normalizedMachineName.includes('plus');

          // Only match if modifiers are the same
          return modelHasMini === machineHasMini &&
            modelHasPro === machineHasPro &&
            modelHasPlus === machineHasPlus;
        }

        return false;
      });

      if (matchedMachine) {
        matchedMachineId = matchedMachine.id;
        toast.info(`Auto-selected machine: ${matchedMachine.name}`);
      } else {
        // No machine match found
      }

      // Match material from filament_settings_id
      if (data.filamentSettingsId) {
        const normalizedMaterial = normalize(data.filamentSettingsId);

        const matchedMaterial = materials.find(m => {
          const normalizedName = normalize(m.name);
          return normalizedName.includes(normalizedMaterial) ||
            normalizedMaterial.includes(normalizedName);
        });

        if (matchedMaterial) {
          matchedMaterialId = matchedMaterial.id;
          toast.info(`Auto-selected material: ${matchedMaterial.name}`);
        } else {
          // No material match found
        }
      }

      setFormData(prev => ({
        ...prev,
        projectName: data.fileName ? data.fileName.substring(0, data.fileName.lastIndexOf('.')) || data.fileName : prev.projectName,
        printTime: data.printTimeHours > 0 ? data.printTimeHours.toString() : prev.printTime,
        filamentWeight: data.filamentWeightGrams > 0 ? data.filamentWeightGrams.toString() : prev.filamentWeight,
        machineId: matchedMachineId || prev.machineId,
        materialId: matchedMaterialId || prev.materialId,
        printColour: data.filamentColour || prev.printColour,
        filePath: data.filePath || prev.filePath, // Store the file path
        surfaceAreaCm2: data.surfaceAreaMm2 ? (data.surfaceAreaMm2 / 100).toString() : undefined,
      }));

      // Keep track of current Gcode data for saving
      setCurrentGcodeData(data);
    }
  }, [machines, materials]);

  const handleSavedGcodeSelect = useCallback((gcodeId: string) => {
    const gcode = gcodes.find(g => g.id === gcodeId);
    if (!gcode) return;

    const gcodeData: GcodeData = {
      fileName: gcode.name,
      filePath: gcode.filePath,
      printTimeHours: gcode.printTime,
      filamentWeightGrams: gcode.filamentWeight,
      printerModel: gcode.machineName,
      filamentSettingsId: gcode.materialName,
      thumbnail: gcode.thumbnail,
    };

    handleGcodeData(gcodeData);
    toast.success(`Loaded saved file: ${gcode.name}`);
  }, [gcodes, handleGcodeData]);

  const handleSaveToLibrary = async () => {
    if (!currentGcodeData) return;

    // Find material and machine names for better storage metadata
    const material = materials.find(m => m.id === formData.materialId);
    const machine = machines.find(m => m.id === formData.machineId);

    const gcodeToSave: StoredGcode = {
      id: '', // Will be generated
      name: formData.projectName || currentGcodeData.fileName,
      filePath: currentGcodeData.filePath || formData.filePath || "Uploaded File",
      printTime: parseFloat(formData.printTime) || currentGcodeData.printTimeHours,
      filamentWeight: parseFloat(formData.filamentWeight) || currentGcodeData.filamentWeightGrams,
      machineName: machine?.name || currentGcodeData.printerModel,
      materialName: material?.name || currentGcodeData.filamentSettingsId,
      printType: "FDM",
      thumbnail: currentGcodeData.thumbnail,
      createdAt: new Date().toISOString()
    };

    if (gcodeToSave.printTime <= 0) {
      toast.error("Cannot save file with 0 print time");
      return;
    }

    try {
      await saveGcode(gcodeToSave);
      // Toast is handled in hook
    } catch (error) {
      // Error handling in hook
    }
  };

  const handleConsumablesChange = useCallback((selectedIds: string[]) => {
    updateField("selectedConsumableIds", selectedIds);
    if (selectedIds.length > 0) {
      const totalValue = constants
        .filter(c => selectedIds.includes(c.id))
        .reduce((sum, c) => sum + c.value, 0);
      toast.info(`Selected ${selectedIds.length} consumables (Total: ${currency.symbol}${totalValue.toFixed(2)})`);
    }
  }, [constants, updateField, currency]);

  const calculateQuote = useCallback(() => {
    const validationError = validateFDMForm(formData);
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

    const selectedPaintConsumable = constants.find(c => c.id === formData.selectedPaintId);
    const paintConsumableValue = selectedPaintConsumable ? selectedPaintConsumable.value : 0;

    if (!electricityRate || electricityRate <= 0) {
      toast.error("Electricity Rate is required. Please set it in Settings → Consumables.");
      return;
    }

    if (!laborRate || laborRate <= 0) {
      toast.error("Labor Rate is required. Please set it in Settings → Consumables.");
      return;
    }

    // Include selectedSpoolId in formData for inventory tracking
    const selectedPaint = formData.selectedPaintId ? constants.find(c => c.id === formData.selectedPaintId) : undefined;
    const selectedPaint2 = formData.selectedPaintId2 ? constants.find(c => c.id === formData.selectedPaintId2) : undefined;

    const quoteData = calculateFDMQuote({
      formData: {
        ...formData,
        selectedSpoolId: selectedSpoolId || undefined,
      },
      material: selectedMaterial,
      machine: selectedMachine,
      electricityRate: getConstantValue("electricity"),
      laborRate: getConstantValue("labor"),
      consumables: selectedConsumables,
      paintConsumable: selectedPaint, // Pass the full object
      paintConsumable2: selectedPaint2, // Pass secondary paint
      customerId: formData.customerId,
      clientName: formData.clientName,
    });

    onCalculate(quoteData);
    toast.success("Quote calculated successfully!");
  }, [formData, selectedSpoolId, materials, machines, constants, getConstantValue, onCalculate]);

  const materialOptions = useMemo(() =>
    materials.map(m => ({
      id: m.id,
      label: m.name,
      sublabel: `${currency.symbol}${m.cost_per_unit}/${m.unit}`,
    })), [materials, currency]);

  const machineOptions = useMemo(() =>
    machines.map(m => ({
      id: m.id,
      label: m.name,
      sublabel: `${currency.symbol}${m.hourly_cost}/hr`,
    })), [machines, currency]);

  const consumableItems = useMemo(() =>
    constants.map(c => ({
      id: c.id,
      name: c.name,
      value: c.value,
      unit: c.unit,
    })), [constants]);

  const uploadSection = (
    <div className="flex flex-col gap-4 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Auto-fill from G-code</p>
            <p className="text-sm text-muted-foreground">Upload or select a saved file</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Save Button */}
          {(formData.printTime && parseFloat(formData.printTime) > 0 && currentGcodeData) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveToLibrary}
              className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
              title="Save current file details to library"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save to Library</span>
            </Button>
          )}
          <GcodeUpload onDataExtracted={handleGcodeData} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Saved Files:</span>
        <Select onValueChange={handleSavedGcodeSelect} disabled={filteredGcodes.length === 0}>
          <SelectTrigger className="h-8 w-full max-w-[300px] bg-background/50">
            <SelectValue placeholder={filteredGcodes.length === 0 ? "No saved files" : "Select a saved file..."} />
          </SelectTrigger>
          <SelectContent>
            {filteredGcodes.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                <div className="flex items-center gap-2">
                  <span>{g.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({g.printTime}h, {g.filamentWeight}g)
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

      <FormFieldRow label="Client" htmlFor="fdm-client">
        <ClientSelector
          id="fdm-client"
          value={formData.customerId}
          onSelect={handleClientSelect}
        />
      </FormFieldRow>

      <FormFieldRow label="Material" htmlFor="fdm-material-id" required>
        <SelectField
          id="fdm-material-id"
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

      <FormFieldRow label="Color" htmlFor="fdm-spool-selector" required>
        <SpoolSelector
          id="fdm-spool-selector"
          name="spoolId"
          materialId={formData.materialId}
          value={selectedSpoolId}
          onChange={(spoolId, color) => {
            setSelectedSpoolId(spoolId);
            updateField("printColour", color);
          }}
          requiredWeight={parseFloat(formData.filamentWeight) * (parseInt(formData.quantity) || 1) || 0}
        />
      </FormFieldRow>

      <FormFieldRow label="Machine" htmlFor="fdm-machine-id" required>
        <SelectField
          id="fdm-machine-id"
          name="machineId"
          value={formData.machineId}
          onChange={(v) => updateField("machineId", v)}
          placeholder="Select machine"
          options={machineOptions}
        />
      </FormFieldRow>

      <FormFieldRow label="Consumables" htmlFor="fdm-consumables-selector">
        <ConsumablesSelector
          id="fdm-consumables-selector"
          items={consumableItems}
          selectedIds={formData.selectedConsumableIds}
          onChange={handleConsumablesChange}
        />
      </FormFieldRow>

      <FormFieldRow label="Print Time (hours)" htmlFor="fdm-print-time" required>
        <TextField
          id="fdm-print-time"
          name="printTime"
          type="number"
          step="0.1"
          value={formData.printTime}
          onChange={(v) => updateField("printTime", v)}
          placeholder="8.5"
          min={0.1}
          max={10000}
        />
      </FormFieldRow>

      <FormFieldRow label="Filament Weight (grams)" htmlFor="fdm-filament-weight" required>
        <TextField
          id="fdm-filament-weight"
          name="filamentWeight"
          type="number"
          step="0.1"
          value={formData.filamentWeight}
          onChange={(v) => updateField("filamentWeight", v)}
          placeholder="250"
          min={0.1}
          max={50000}
        />
      </FormFieldRow>

      <FormFieldRow label="Labor Hours" htmlFor="fdm-labor-hours">
        <TextField
          id="fdm-labor-hours"
          name="laborHours"
          type="number"
          step="0.1"
          value={formData.laborHours}
          onChange={(v) => updateField("laborHours", v)}
          placeholder="0.5"
          min={0}
          max={1000}
        />
      </FormFieldRow>

      <FormFieldRow label="Overhead (%)" htmlFor="fdm-overhead-percentage">
        <TextField
          id="fdm-overhead-percentage"
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

      <FormFieldRow label="Profit Markup (%)" htmlFor="markup-percentage">
        <TextField
          id="markup-percentage"
          name="markupPercentage"
          type="number"
          step="0.1"
          value={formData.markupPercentage}
          onChange={(v) => updateField("markupPercentage", v)}
          placeholder="20"
          min={0}
          max={10000}
        />
      </FormFieldRow>

      <FormFieldRow label="Quantity" htmlFor="quantity">
        <TextField
          id="quantity"
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

      <FormFieldRow label="Order Priority" htmlFor="priority">
        <SelectField
          id="priority"
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

      <FormFieldRow label="Due Date" htmlFor="due-date">
        <input
          id="due-date"
          name="dueDate"
          type="date"
          value={formData.dueDate || ""}
          onChange={(e) => updateField("dueDate", e.target.value)}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </FormFieldRow>

      <FormFieldRow label="Assigned Employee" htmlFor="assigned-employee">
        <SelectField
          id="assigned-employee"
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Post Processing</h2>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-500/20">BETA</span>
        </div>

        <FormFieldRow label="Include Painting" htmlFor="fdm-include-painting">
          <div className="flex items-center h-10">
            <input
              id="fdm-include-painting"
              type="checkbox"
              aria-label="Include Painting"
              className="w-5 h-5 rounded border-input bg-background"
              checked={isPaintingEnabled}
              onChange={(e) => {
                setIsPaintingEnabled(e.target.checked);
                if (e.target.checked) {
                  updateField("paintingLayers", "1");
                  updateField("paintingTime", "0.5");
                } else {
                  updateField("paintingLayers", "");
                  updateField("paintingTime", "");
                  updateField("selectedPaintId", "");
                }
              }}
            />
            <span className="ml-2 text-sm text-foreground">Enable</span>
          </div>
        </FormFieldRow>

        {isPaintingEnabled && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <FormFieldRow label="Surface Area (cm²)">
              <div className="flex gap-2 w-full">
                <TextField
                  type="number"
                  value={formData.surfaceAreaCm2}
                  onChange={(v) => updateField("surfaceAreaCm2", v)}
                  placeholder="Enter area manually"
                  endAdornment={
                    <SurfaceAreaUpload
                      className="border-none hover:bg-transparent px-2"
                      onSurfaceAreaDetected={(area) => updateField("surfaceAreaCm2", (area / 100).toString())}
                    />
                  }
                  min={0}
                  max={1000000}
                />
                {formData.surfaceAreaCm2 && (
                  <div className="text-xs text-muted-foreground self-center whitespace-nowrap">
                    (Auto-detected from 3MF)
                  </div>
                )}
              </div>
            </FormFieldRow>



            <FormFieldRow label="Choose paint">
              <SelectField
                value={formData.selectedPaintId || "none"}
                onChange={(v) => updateField("selectedPaintId", v === "none" ? "" : v)}
                placeholder="Select paint..."
                options={[
                  { id: "none", label: "-- None --" },
                  ...(Array.isArray(constants) ? constants : [])
                    .filter(c => c && typeof c.name === 'string' && c.is_visible !== false)
                    .map(c => {
                      let usageRate = "";
                      // Parse usage rate from description if available (e.g., "Usage Rate: 0.04ml/cm2")
                      const usageMatch = c.description?.match(/Usage Rate:\s*([\d.]+)/i);
                      if (usageMatch) {
                        usageRate = ` @ ${usageMatch[1]}ml/cm²`;
                      }

                      return {
                        id: c.id,
                        label: c.name,
                        sublabel: currency ? `${c.value} ${c.unit ? `(${c.unit.replace('$', currency.symbol)})` : ''}${usageRate}` : `${c.value}`
                      };
                    })
                ]}
              />
            </FormFieldRow>

            <FormFieldRow label="Coating Layers">
              <TextField
                type="number"
                step="1"
                value={formData.paintingLayers}
                onChange={(v) => updateField("paintingLayers", v)}
                placeholder="1"
                min={0}
                max={100}
              />
            </FormFieldRow>



            <FormFieldRow label="Secondary Paint">
              <SelectField
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
                        sublabel: currency ? `${c.value} ${c.unit ? `(${c.unit.replace('$', currency.symbol)})` : ''}${usageRate}` : `${c.value}`
                      };
                    })
                ]}
              />
            </FormFieldRow>

            <FormFieldRow label="2nd Coating Layers">
              <TextField
                type="number"
                step="1"
                value={formData.paintingLayers2}
                onChange={(v) => updateField("paintingLayers2", v)}
                placeholder="1"
                min={0}
                max={100}
              />
            </FormFieldRow>

            <FormFieldRow label="Painting Labor (hrs)">
              <TextField
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

FDMCalculatorTable.displayName = "FDMCalculatorTable";

export default FDMCalculatorTable;
