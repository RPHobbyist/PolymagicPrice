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

import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react";
import { Calculator, Save } from "lucide-react";
import { toast } from "sonner";
import { QuoteData, ResinFormData, StoredGcode } from "@/types/quote";
import { useCalculatorData } from "@/hooks/useCalculatorData";
import { calculateResinQuote, validateResinForm } from "@/lib/quoteCalculations";
import { QuoteCalculator } from "./QuoteCalculator";
import { FormFieldRow, TextField, SelectField } from "./FormField";
import { ConsumablesSelector } from "./ConsumablesSelector";
import { SpoolSelector } from "./SpoolSelector";
import ResinFileUpload from "./ResinFileUpload";
import { ResinFileData } from "@/lib/parsers/resinFileParser";
import { useCurrency } from "@/hooks/useCurrency";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { SurfaceAreaUpload } from "./SurfaceAreaUpload";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStoredGcodes } from "@/hooks/useStoredGcodes";

interface ResinCalculatorProps {
  onCalculate: (data: QuoteData) => void;
}

const initialFormData: ResinFormData = {
  projectName: "",
  printColour: "",
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
  surfaceAreaCm2: "",
};

const ResinCalculatorTable = memo(({ onCalculate }: ResinCalculatorProps) => {
  const { materials, machines, constants, loading, getConstantValue } = useCalculatorData({ printType: "Resin" });
  const [formData, setFormData] = useState<ResinFormData>(initialFormData);
  const [selectedSpoolId, setSelectedSpoolId] = useState<string>("");
  const { currency } = useCurrency();
  const { gcodes, saveGcode } = useStoredGcodes();

  // Filter for Resin files only
  const filteredGcodes = useMemo(() => {
    return gcodes.filter(g => (g.resinVolume || 0) > 0);
  }, [gcodes]);

  const [currentGcodeData, setCurrentGcodeData] = useState<{
    fileName: string;
    filePath: string;
    printTimeHours: number;
    resinVolumeMl: number;
    printerModel?: string;
  } | null>(null);

  const [isPaintingEnabled, setIsPaintingEnabled] = useState(false);

  // Sync isPaintingEnabled with initial data if needed
  useEffect(() => {
    if (formData.paintingLayers && parseInt(formData.paintingLayers) > 0 && !isPaintingEnabled) {
      setIsPaintingEnabled(true);
    }
  }, [formData.paintingLayers, isPaintingEnabled]);

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
      projectName: data.fileName ? data.fileName.substring(0, data.fileName.lastIndexOf('.')) || data.fileName : prev.projectName,
      printTime: data.printTimeHours > 0 ? data.printTimeHours.toString() : prev.printTime,
      resinVolume: data.resinVolumeMl > 0 ? data.resinVolumeMl.toString() : prev.resinVolume,
      machineId: matchedMachineId || prev.machineId,
    }));

    setCurrentGcodeData({
      fileName: data.fileName || "Unknown File",
      filePath: data.filePath || "",
      printTimeHours: data.printTimeHours,
      resinVolumeMl: data.resinVolumeMl,
      printerModel: data.printerModel
    });
  }, [machines]);

  const handleConsumablesChange = useCallback((selectedIds: string[]) => {
    updateField("selectedConsumableIds", selectedIds);
    if (selectedIds.length > 0) {
      const totalValue = constants
        .filter(c => selectedIds.includes(c.id))
        .reduce((sum, c) => sum + c.value, 0);
      toast.info(`Selected ${selectedIds.length} consumables (Total: ${currency.symbol}${totalValue.toFixed(2)})`);
    }
  }, [constants, updateField, currency]);

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
    if (!currentGcodeData) return;

    try {
      // Find material and machine names for metadata
      const machine = machines.find(m => m.id === formData.machineId);
      const material = materials.find(m => m.id === formData.materialId);

      const newGcode: StoredGcode = {
        id: crypto.randomUUID(),
        name: currentGcodeData.fileName,
        filePath: currentGcodeData.filePath,
        printTime: currentGcodeData.printTimeHours,
        filamentWeight: 0, // Not used for resin
        resinVolume: currentGcodeData.resinVolumeMl,
        machineName: machine?.name || currentGcodeData.printerModel,
        materialName: material?.name,
        printType: "Resin",
        createdAt: new Date().toISOString(),
      };

      await saveGcode(newGcode);
      toast.success("File saved to library");
    } catch (error) {
      console.error("Failed to save file", error);
      toast.error("Failed to save file to library");
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

    const selectedPaint = formData.selectedPaintId ? constants.find(c => c.id === formData.selectedPaintId) : undefined;
    const selectedPaint2 = formData.selectedPaintId2 ? constants.find(c => c.id === formData.selectedPaintId2) : undefined;

    const quoteData = calculateResinQuote({
      formData: {
        ...formData,
        selectedSpoolId: selectedSpoolId || undefined, // Ensure spool ID is passed
      },
      material: selectedMaterial,
      machine: selectedMachine,
      electricityRate: electricityRate,
      laborRate: laborRate,
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
            <p className="font-medium text-foreground">Auto-fill from Resin File</p>
            <p className="text-sm text-muted-foreground">Upload .cxdlpv4 to extract parameters</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentGcodeData && (
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
          <ResinFileUpload onDataExtracted={handleResinFileData} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Saved Files:</span>
        <Select onValueChange={handleSavedGcodeSelect} disabled={filteredGcodes.length === 0}>
          <SelectTrigger className="h-8 w-full max-w-[300px] bg-background/50">
            <SelectValue placeholder={filteredGcodes.length === 0 ? "No saved files" : "Select a saved file..."} />
          </SelectTrigger>
          <SelectContent>
            {filteredGcodes.map((file) => (
              <SelectItem key={file.id} value={file.id}>
                <div className="flex items-center gap-2">
                  <span>{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({file.printTime}h, {file.resinVolume}ml)
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

      <FormFieldRow label="Color" htmlFor="resin-spool-selector" required>
        <SpoolSelector
          id="resin-spool-selector"
          name="spoolId"
          materialId={formData.materialId}
          value={selectedSpoolId}
          onChange={(spoolId, color) => {
            setSelectedSpoolId(spoolId);
            updateField("printColour", color);
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

      <div className="pt-4 px-2 sm:px-4 border-t border-border">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Post Processing</h2>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-500/20">BETA</span>
        </div>

        <FormFieldRow label="Include Painting" htmlFor="resin-include-painting">
          <div className="flex items-center h-10">
            <input
              id="resin-include-painting"
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
              <div className="flex gap-2 items-center">
                <TextField
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
                      const usageMatch = c.description?.match(/Usage Rate:\s*([\d.]+)/i);
                      if (usageMatch) {
                        usageRate = ` @ ${usageMatch[1]}ml/cm²`;
                      }

                      return {
                        id: c.id,
                        label: c.name,
                        sublabel: currency ? `${c.value} ${c.unit ? `(${c.unit.replace('$', currency.symbol)})` : ''}${usageRate}` : `${c.value}`
                      };
                    })]}
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

    </QuoteCalculator >
  );
});

ResinCalculatorTable.displayName = "ResinCalculatorTable";

export default ResinCalculatorTable;
