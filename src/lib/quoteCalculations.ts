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

import { QuoteData, Material, Machine, FDMFormData, ResinFormData, CostConstant, MaterialSpool, QuoteCarbon, CarbonGrade } from "@/types/quote";
import { parseTimeToHours } from "@/lib/utils/time";
import { calculateJobCarbon, CarbonInput, toStoredCarbon } from "@/lib/carbon/carbonCalculator";

interface CalculationParams {
  material: Material;
  machine: Machine;
  electricityRate: number;
  laborRate: number;
  /**
   * Optional carbon inputs. Both are omitted by older call sites, which simply means the estimate
   * falls back to the world-average grid factor and the material's own figure — never a failure.
   */
  gridGPerKWh?: number;
  spool?: MaterialSpool;
}

/**
 * The carbon estimate that rides along with a price.
 *
 * A footprint must never be able to break a quote, which is the actual product: the engine
 * swallows its own errors and returns undefined, and every surface omits the line rather than
 * rendering a blank or a NaN.
 */
const estimateCarbon = (input: CarbonInput): QuoteCarbon | undefined => {
  const breakdown = calculateJobCarbon(input);
  return breakdown ? toStoredCarbon(breakdown) : undefined;
};

const round = (val: number) => {
  // Never let a non-finite value escape into a stored quote: JSON.stringify turns NaN into
  // null, which silently corrupts totals and every dashboard aggregate downstream.
  if (!Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Parses a form value into a usable number.
 *
 * Form fields are strings and may be empty or partially typed ("", "-", "1e"). Bare
 * parseFloat on those yields NaN, which then propagates through every downstream sum.
 */
const toNum = (value: string | number | undefined | null, fallback = 0): number => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Integer variant of `toNum`, used for counts (quantity, layers, failed units). */
const toInt = (value: string | number | undefined | null, fallback = 0): number => {
  const parsed = toNum(value, fallback);
  return Math.trunc(parsed);
};

interface ConsumableInfo {
  name: string;
  value: number;
}

interface FDMCalculationInput extends CalculationParams {
  formData: FDMFormData;
  consumables?: ConsumableInfo[];
  paintConsumable?: CostConstant;
  paintConsumable2?: CostConstant;
  customerId?: string;
  clientName?: string;
  /** Preview image extracted from the uploaded file, if any. */
  thumbnail?: string;
}

interface ResinCalculationInput extends CalculationParams {
  formData: ResinFormData;
  consumables?: ConsumableInfo[];
  paintConsumable?: CostConstant;
  paintConsumable2?: CostConstant;
  customerId?: string;
  clientName?: string;
  /** Preview image extracted from the uploaded file, if any. */
  thumbnail?: string;
}

export const calculateFDMQuote = ({
  formData,
  material,
  machine,
  electricityRate,
  laborRate,
  gridGPerKWh,
  spool,
  consumables = [],
  paintConsumable,
  paintConsumable2,
  customerId,
  clientName,
  thumbnail,
}: FDMCalculationInput): QuoteData => {
  // Shared parser: "1:30" must mean 1.5 h here exactly as it does in production.
  const printTimeHours = parseTimeToHours(formData.printTime);
  const filamentWeightKg = toNum(formData.filamentWeight) / 1000;
  const laborHours = toNum(formData.laborHours);
  const overheadPercentage = toNum(formData.overheadPercentage);
  // Markup was the one field parsed without a guard: clearing the input produced NaN, which
  // flowed into subtotal/unitPrice/totalPrice and was persisted as null.
  const markupPercentage = toNum(formData.markupPercentage);
  const quantity = Math.max(1, toInt(formData.quantity, 1));

  const materialCost = filamentWeightKg * toNum(material.cost_per_unit);
  const machineTimeCost = printTimeHours * toNum(machine.hourly_cost);
  const powerConsumptionKw = toNum(machine.power_consumption_watts) / 1000;
  const electricityCost = printTimeHours * powerConsumptionKw * toNum(electricityRate);
  const laborCost = laborHours * toNum(laborRate);
  const consumablesTotal = consumables.reduce((sum, c) => sum + toNum(c.value), 0);

  // Painting Calculation
  const paintingTime = toNum(formData.paintingTime);
  const paintingLayers = toInt(formData.paintingLayers);
  // Painting fields removed from FormData, using flat consumable value
  const surfaceAreaCm2 = toNum(formData.surfaceAreaCm2);


  const paintingLaborCost = paintingTime * toNum(laborRate);

  // Revised formula: Supports both flat rate AND calculated ($/ml) paints
  let paintingMaterialCost = 0;

  if (paintConsumable) {
    // Check if it's a calculated paint (/ml)
    if (paintConsumable.unit.includes('/ml')) {
      // Extract usage rate from description (e.g. "Usage Rate: 0.02ml/cm2")
      // matches "Usage Rate: 0.02" with optional unit suffix
      const usageRateMatch = paintConsumable.description?.match(/Usage Rate:\s*([\d.]+)/i);
      const usageRate = usageRateMatch ? toNum(usageRateMatch[1], 0.02) : 0.02; // Default to 0.02 if not found

      paintingMaterialCost = toNum(paintConsumable.value) * surfaceAreaCm2 * Math.max(1, paintingLayers) * usageRate;
    } else {
      // Flat rate
      paintingMaterialCost = toNum(paintConsumable.value);
    }
  }

  // Second Painting Calculation (Primary Paint)
  // Re-use logic for second paint if present
  let paintingMaterialCost2 = 0;
  const paintingLayers2 = toInt(formData.paintingLayers2);

  if (paintConsumable2) {
    if (paintConsumable2.unit.includes('/ml')) {
      const usageRateMatch = paintConsumable2.description?.match(/Usage Rate:\s*([\d.]+)/i);
      const usageRate = usageRateMatch ? toNum(usageRateMatch[1], 0.02) : 0.02;

      paintingMaterialCost2 = toNum(paintConsumable2.value) * surfaceAreaCm2 * Math.max(1, paintingLayers2) * usageRate;
    } else {
      paintingMaterialCost2 = toNum(paintConsumable2.value);
    }
  }

  const paintingCost = paintingLaborCost + paintingMaterialCost + paintingMaterialCost2;

  const subtotalBeforeOverhead = materialCost + machineTimeCost + electricityCost + laborCost + consumablesTotal + paintingCost;
  const overheadCost = (subtotalBeforeOverhead * overheadPercentage) / 100;
  const subtotal = subtotalBeforeOverhead + overheadCost;

  const markup = (subtotal * markupPercentage) / 100;
  const unitPrice = subtotal + markup;

  // Calculate total price based on quantity
  const totalPrice = unitPrice * quantity;

  return {
    materialCost: round(materialCost * quantity),
    machineTimeCost: round(machineTimeCost * quantity),
    electricityCost: round(electricityCost * quantity),
    laborCost: round(laborCost * quantity),
    overheadCost: round(overheadCost * quantity),
    subtotal: round(subtotal * quantity),
    markup: round(markup * quantity),
    paintingCost: round(paintingCost * quantity),
    unitPrice: round(unitPrice),
    quantity,
    totalPrice: round(totalPrice),
    printType: "FDM",
    projectName: formData.projectName,
    printColour: formData.printColour,
    filePath: formData.filePath, // Include file path for printing
    customerId,
    clientName,
    priority: formData.priority as 'Low' | 'Medium' | 'High' | undefined,
    dueDate: formData.dueDate,
    assignedEmployeeId: formData.assignedEmployeeId,
    assignedMachineId: formData.machineId,
    parameters: {
      ...formData,
      materialName: material.name,
      machineName: machine.name,
      consumables,
      consumablesTotal,
      // Snapshot the rates this quote was priced with. Five places already read
      // `parameters.electricityRate` / `parameters.laborRate` — production's power cost,
      // the pricing-drift rule, the job card and the order list — but nothing ever wrote
      // them, so every read resolved to 0 and those features silently did nothing.
      // Storing the rate as of pricing is also what a drift comparison needs.
      electricityRate: toNum(electricityRate),
      laborRate: toNum(laborRate),
      paintConsumableValue: paintingMaterialCost,
      paintConsumableValue2: paintingMaterialCost2,
    },
    surfaceAreaCm2: surfaceAreaCm2,
    status: formData.status,
    failedUnits: formData.failedUnits ? toInt(formData.failedUnits) : undefined,
    // The calculators pass the extracted preview as `thumbnail`; formData never carries one,
    // so reading only formData meant every calculated quote lost its preview image.
    thumbnail: thumbnail ?? formData.thumbnail,
    carbon: estimateCarbon({
      printType: "FDM",
      quantity,
      printTimePerUnit: formData.printTime,
      perUnitMaterial: formData.filamentWeight,
      failedUnits: formData.failedUnits ? toInt(formData.failedUnits) : 0,
      machine,
      material,
      spool,
      gridGPerKWh,
    }),
  };
};

export const calculateResinQuote = ({
  formData,
  material,
  machine,
  electricityRate,
  laborRate,
  gridGPerKWh,
  spool,
  consumables = [],
  paintConsumable,
  paintConsumable2,
  customerId,
  clientName,
  thumbnail,
}: ResinCalculationInput): QuoteData => {
  const printTimeHours = parseTimeToHours(formData.printTime);
  const resinVolumeLiters = toNum(formData.resinVolume) / 1000;
  const washingTimeHours = toNum(formData.washingTime) / 60;
  const curingTimeHours = toNum(formData.curingTime) / 60;
  const isopropylCost = toNum(formData.isopropylCost);
  const laborHours = toNum(formData.laborHours);
  const overheadPercentage = toNum(formData.overheadPercentage);
  const markupPercentage = toNum(formData.markupPercentage);
  const quantity = Math.max(1, toInt(formData.quantity, 1));

  const materialCost = resinVolumeLiters * toNum(material.cost_per_unit) + isopropylCost;
  const totalProcessTime = printTimeHours + washingTimeHours + curingTimeHours;
  const machineTimeCost = totalProcessTime * toNum(machine.hourly_cost);
  const powerConsumptionKw = toNum(machine.power_consumption_watts) / 1000;
  const electricityCost = totalProcessTime * powerConsumptionKw * toNum(electricityRate);
  const laborCost = laborHours * toNum(laborRate);
  const consumablesTotal = consumables.reduce((sum, c) => sum + toNum(c.value), 0);

  // Painting Calculation
  const paintingTime = toNum(formData.paintingTime);
  const paintingLayers = toInt(formData.paintingLayers);
  // Painting fields removed from FormData, using flat consumable value
  const surfaceAreaCm2 = toNum(formData.surfaceAreaCm2);

  const paintingLaborCost = paintingTime * toNum(laborRate);

  // Primary Paint
  let paintingMaterialCost = 0;

  if (paintConsumable) {
    if (paintConsumable.unit.includes('/ml')) {
      const usageRateMatch = paintConsumable.description?.match(/Usage Rate:\s*([\d.]+)/i);
      const usageRate = usageRateMatch ? toNum(usageRateMatch[1], 0.02) : 0.02;
      paintingMaterialCost = paintConsumable.value * surfaceAreaCm2 * Math.max(1, paintingLayers) * usageRate;
    } else {
      paintingMaterialCost = toNum(paintConsumable.value);
    }
  }

  // Secondary Paint
  let paintingMaterialCost2 = 0;
  const paintingLayers2 = toInt(formData.paintingLayers2);

  if (paintConsumable2) {
    if (paintConsumable2.unit.includes('/ml')) {
      const usageRateMatch = paintConsumable2.description?.match(/Usage Rate:\s*([\d.]+)/i);
      const usageRate = usageRateMatch ? toNum(usageRateMatch[1], 0.02) : 0.02;
      paintingMaterialCost2 = toNum(paintConsumable2.value) * surfaceAreaCm2 * Math.max(1, paintingLayers2) * usageRate;
    } else {
      paintingMaterialCost2 = toNum(paintConsumable2.value);
    }
  }

  const paintingCost = paintingLaborCost + paintingMaterialCost + paintingMaterialCost2;

  const subtotalBeforeOverhead = materialCost + machineTimeCost + electricityCost + laborCost + consumablesTotal + paintingCost;
  const overheadCost = (subtotalBeforeOverhead * overheadPercentage) / 100;
  const subtotal = subtotalBeforeOverhead + overheadCost;

  const markup = (subtotal * markupPercentage) / 100;
  const unitPrice = subtotal + markup;

  // Calculate total price based on quantity
  const totalPrice = unitPrice * quantity;

  return {
    materialCost: round(materialCost * quantity),
    machineTimeCost: round(machineTimeCost * quantity),
    electricityCost: round(electricityCost * quantity),
    laborCost: round(laborCost * quantity),
    overheadCost: round(overheadCost * quantity),
    subtotal: round(subtotal * quantity),
    markup: round(markup * quantity),
    paintingCost: round(paintingCost * quantity),
    unitPrice: round(unitPrice),
    quantity,
    totalPrice: round(totalPrice),
    printType: "Resin",
    projectName: formData.projectName,
    printColour: formData.printColour,
    customerId,
    clientName,
    parameters: {
      ...formData,
      materialName: material.name,
      machineName: machine.name,
      consumables,
      consumablesTotal,
      // See the FDM path: these two are read in five places and were never written.
      electricityRate: toNum(electricityRate),
      laborRate: toNum(laborRate),
      paintingTime,
      paintingLayers,
      paintingLayers2,
      paintConsumableValue: paintingMaterialCost,
      paintConsumableValue2: paintingMaterialCost2,
      surfaceAreaCm2: formData.surfaceAreaCm2 ? toNum(formData.surfaceAreaCm2) : undefined,
    },
    surfaceAreaCm2: surfaceAreaCm2,
    priority: formData.priority as 'Low' | 'Medium' | 'High' | undefined,
    dueDate: formData.dueDate,
    assignedEmployeeId: formData.assignedEmployeeId,
    assignedMachineId: formData.machineId,
    status: formData.status,
    failedUnits: formData.failedUnits ? toInt(formData.failedUnits) : undefined,
    // The calculators pass the extracted preview as `thumbnail`; formData never carries one,
    // so reading only formData meant every calculated quote lost its preview image.
    thumbnail: thumbnail ?? formData.thumbnail,
    carbon: estimateCarbon({
      printType: "Resin",
      quantity,
      printTimePerUnit: formData.printTime,
      perUnitMaterial: formData.resinVolume,
      failedUnits: formData.failedUnits ? toInt(formData.failedUnits) : 0,
      // Wash and cure are billed to the printer's wattage for pricing; carbon uses their own.
      washingTimeMinutes: formData.washingTime,
      curingTimeMinutes: formData.curingTime,
      machine,
      material,
      spool,
      gridGPerKWh,
    }),
  };
};

/**
 * Validates one optional numeric form field against an inclusive range.
 *
 * An empty field is allowed (it means "not set" and calculates as 0), but a field that has
 * been typed into must be a real number inside the range. Non-numeric text is rejected here
 * rather than being silently coerced to 0 during calculation.
 */
const validateNumericField = (
  raw: string | undefined,
  label: string,
  min: number,
  max: number,
  unit = ""
): string | null => {
  if (raw === undefined || raw === "") return null;
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return `${label} must be a number`;
  if (value < min) return `${label} cannot be less than ${min}${unit}`;
  if (value > max) return `${label} exceeds maximum (${max}${unit})`;
  return null;
};

export const validateFDMForm = (formData: FDMFormData): string | null => {
  if (!formData.projectName.trim()) return "Project name is required";
  if (formData.projectName.length > 100) return "Project name is too long (max 100 chars)";
  if (!formData.materialId) return "Please select a material";
  if (!formData.machineId) return "Please select a machine";

  const printTime = parseFloat(formData.printTime);
  if (isNaN(printTime) || printTime <= 0) return "Print time must be greater than 0";
  if (printTime > 10000) return "Print time exceeds maximum (10000h)";

  const weight = parseFloat(formData.filamentWeight);
  if (isNaN(weight) || weight <= 0) return "Filament weight must be greater than 0";
  if (weight > 50000) return "Filament weight exceeds maximum (50000g)";

  // Bound BOTH ends. Only the upper end was checked, so negative labor/overhead and a markup
  // below -100% were accepted and produced negative costs and negative totals.
  const numericFieldError = validateNumericField(formData.laborHours, "Labor hours", 0, 1000);
  if (numericFieldError) return numericFieldError;

  const overheadError = validateNumericField(formData.overheadPercentage, "Overhead", 0, 1000, "%");
  if (overheadError) return overheadError;

  const markupError = validateNumericField(formData.markupPercentage, "Markup", -100, 10000, "%");
  if (markupError) return markupError;

  const quantity = parseInt(formData.quantity);
  if (isNaN(quantity) || quantity < 1) return "Quantity must be at least 1";
  if (quantity > 1000000) return "Quantity exceeds maximum (1,000,000)";

  // Post-processing validation
  const paintingTimeError = validateNumericField(formData.paintingTime, "Painting labor", 0, 1000);
  if (paintingTimeError) return paintingTimeError;

  const surfaceAreaError = validateNumericField(formData.surfaceAreaCm2, "Surface area", 0, 10000000);
  if (surfaceAreaError) return surfaceAreaError;

  const layersError = validateNumericField(formData.paintingLayers, "Painting layers", 0, 100);
  if (layersError) return layersError;

  return null;
};

export const validateResinForm = (formData: ResinFormData): string | null => {
  if (!formData.projectName.trim()) return "Project name is required";
  if (formData.projectName.length > 100) return "Project name is too long (max 100 chars)";
  if (!formData.materialId) return "Please select a material";
  if (!formData.machineId) return "Please select a machine";

  const printTime = parseFloat(formData.printTime);
  if (isNaN(printTime) || printTime <= 0) return "Print time must be greater than 0";
  if (printTime > 10000) return "Print time exceeds maximum (10000h)";

  const volume = parseFloat(formData.resinVolume);
  if (isNaN(volume) || volume <= 0) return "Resin volume must be greater than 0";
  if (volume > 50000) return "Resin volume exceeds maximum (50000ml)";

  // Bound BOTH ends. Only the upper end was checked, so negative labor/overhead and a markup
  // below -100% were accepted and produced negative costs and negative totals.
  const numericFieldError = validateNumericField(formData.laborHours, "Labor hours", 0, 1000);
  if (numericFieldError) return numericFieldError;

  const overheadError = validateNumericField(formData.overheadPercentage, "Overhead", 0, 1000, "%");
  if (overheadError) return overheadError;

  const markupError = validateNumericField(formData.markupPercentage, "Markup", -100, 10000, "%");
  if (markupError) return markupError;

  const quantity = parseInt(formData.quantity);
  if (isNaN(quantity) || quantity < 1) return "Quantity must be at least 1";
  if (quantity > 1000000) return "Quantity exceeds maximum (1,000,000)";

  // Post-processing validation
  const paintingTimeError = validateNumericField(formData.paintingTime, "Painting labor", 0, 1000);
  if (paintingTimeError) return paintingTimeError;

  const surfaceAreaError = validateNumericField(formData.surfaceAreaCm2, "Surface area", 0, 10000000);
  if (surfaceAreaError) return surfaceAreaError;

  const layersError = validateNumericField(formData.paintingLayers, "Painting layers", 0, 100);
  if (layersError) return layersError;

  return null;
};

/**
 * The single source of truth for presenting a saved quote's money breakdown.
 *
 * Every stored `*Cost` field is already multiplied by quantity (see the calculators above),
 * but `parameters.consumablesTotal` is stored PER UNIT. Call sites that added the two
 * together disagreed with the quote's own subtotal by `consumablesTotal * (quantity - 1)`,
 * which is why invoices, the details dialog and the saved-quotes table could each print a
 * different total for the same quote. Use this everywhere instead of re-deriving the sums.
 */
export interface QuoteSummaryTotals {
  quantity: number;
  consumablesTotal: number;
  manufacturing: number;
  labour: number;
  painting: number;
  overhead: number;
  subtotal: number;
  markup: number;
  total: number;
  /**
   * The frozen footprint, surfaced here so the quote summary, the details dialog and the invoice
   * all read one value. Carbon is not money and never enters the sums above.
   */
  carbonKg?: number;
  /** Undefined for a batch master, whose quantity is 1 and whose "per part" would be the whole batch. */
  carbonPerPart?: number;
  carbonGrade?: CarbonGrade;
}

export const summariseQuote = (quote: QuoteData): QuoteSummaryTotals => {
  const num = (value: unknown): number => {
    const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const quantity = Math.max(1, Math.trunc(num(quote.quantity) || 1));

  // Scale the per-unit consumables figure to match the quantity-inclusive cost fields.
  const consumablesTotal = num(quote.parameters?.consumablesTotal) * quantity;

  const manufacturing = num(quote.materialCost) + num(quote.machineTimeCost) + num(quote.electricityCost) + consumablesTotal;
  const labour = num(quote.laborCost);
  const painting = num(quote.paintingCost);
  const overhead = num(quote.overheadCost);

  const subtotal = manufacturing + labour + painting + overhead;
  const markup = num(quote.markup);

  const carbonKg = quote.carbon?.kg;

  return {
    quantity,
    consumablesTotal,
    manufacturing,
    labour,
    painting,
    overhead,
    subtotal,
    markup,
    total: subtotal + markup,
    carbonKg,
    carbonPerPart: carbonKg !== undefined && !quote.isBatch ? carbonKg / quantity : undefined,
    carbonGrade: quote.carbon?.grade,
  };
};
