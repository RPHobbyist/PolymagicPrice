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

// Centralized types for the quote calculator application

export type QuoteStatus = 'PENDING' | 'APPROVED' | 'PRINTING' | 'POST_PROCESSING' | 'DONE' | 'DISPATCHED' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export interface QuoteRevision {
  id: string;
  timestamp: string;
  materialCost: number;
  machineTimeCost: number;
  electricityCost: number;
  laborCost: number;
  overheadCost: number;
  subtotal: number;
  markup: number;
  totalPrice: number;
  parameters: QuoteParameters;
  notes?: string;
  label?: string; // e.g. "Draft", "Final", "Revised Size"
}

export interface QuoteData {
  id?: string;
  materialCost: number;
  machineTimeCost: number;
  electricityCost: number;
  laborCost: number;
  overheadCost: number;
  subtotal: number;
  markup: number;
  totalPrice: number;
  paintingCost?: number; // New: Cost of hand painting
  unitPrice: number;  // Price per single unit
  /**
   * Whole-job adjustments applied after markup/margin. Stored as amounts (base currency), only
   * when non-zero, so a quote saved before they existed reads as "none" and an edit in the details
   * dialog keeps them: total = subtotal + markup + minimumTopUp - discountAmount + shippingCost.
   */
  minimumTopUp?: number;   // lifts a small job up to the shop's minimum charge
  discountAmount?: number; // taken off the (marked-up) price
  shippingCost?: number;   // pass-through: billed to the customer, not shop revenue
  quantity: number;   // Number of units
  printType: "FDM" | "Resin";
  projectName: string;
  printColour: string;
  parameters: QuoteParameters;
  paintingTime?: number; // hours
  paintingLayers?: number;
  surfaceAreaCm2?: number; // Surface area in cm²
  createdAt?: string;
  notes?: string;
  filePath?: string;  // Original uploaded file path for printing
  customerId?: string; // Reference to a customer
  clientName?: string; // Snapshot of name for display/legacy
  // Kanban Fields
  status?: QuoteStatus;
  assignedMachineId?: string;
  actualPrintTime?: number; // hours (for "Actuals vs Estimates" analytics)
  actualMaterialUsed?: number; // grams or ml (including scrap)
  failedUnits?: number; // Number of failed items in this batch
  totalPowerCost?: number; // Actual power cost during production
  statusTimeline?: { [_key in QuoteStatus]?: string }; // ISO dates for when it entered each stage
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string; // ISO date string
  assignedEmployeeId?: string; // ID of assigned employee
  featureWeights?: {
    walls?: number;
    infill?: number;
    supports?: number;
    waste?: number;
  };
  thumbnail?: string; // Base64 or URL thumbnail preview
  carbon?: QuoteCarbon; // Frozen footprint; absent when it could not be computed
  revisions?: QuoteRevision[]; // New: Snapshot history of past versions
  reprintCount?: number; // Tracks how many times a print was failed and requeued
  isBatch?: boolean; // NEW: Indicates this is a consolidated batch of multiple quotes
  batchItems?: QuoteData[]; // NEW: Stores individual items within a master batch quote
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  averageRating?: number;
  reviewCount?: number;
}

export interface Employee {
  id: string;
  name: string;
  jobPosition: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

/** How a stored footprint was arrived at — the worst of its three inputs wins. */
export type CarbonGrade = 'ESTIMATE' | 'ACTUAL' | 'MEASURED';

/**
 * Shop-wide carbon choices that are not numbers a constant can hold.
 *
 * The grid factor itself lives in the constants table beside the electricity rate; this holds the
 * things that have no home there — which region was picked, how waste is assumed to be disposed of,
 * and when history was last restated.
 */
export interface CarbonSettings {
  /** Preset id from the factor library, or "custom" when the shop typed its own figure. */
  regionId?: string;
  /** Whether the shop has confirmed a region, so the app stops saying it is on the world average. */
  regionConfirmed?: boolean;
  defaultEolPath?: 'landfill' | 'incineration' | 'recycling';
  lastRecalculatedAt?: string;
}

/**
 * A job's frozen footprint, stored on the quote exactly as `electricityCost` is.
 *
 * Freezing rather than recomputing keeps history stable when a factor is edited later, and keeps
 * the dashboard, the assistant, the reports and the invoice reading one number. Kept small on
 * purpose: quotes already carry base64 thumbnails inside the same ~5 MB origin quota.
 */
export interface QuoteCarbon {
  kg: number;            // whole job, kgCO2e
  energyKg: number;
  materialKg: number;
  wasteKg: number;
  kWh: number;
  /** Mass that shipped: parts only, without failed units or supports where the slicer said so.
   *  Stored because intensity (kgCO₂e per kg) is needed in places that cannot look up a material. */
  deliveredKg: number;
  gridGPerKWh: number;   // the grid factor used
  efKgPerKg: number;     // the material factor used
  wattsUsed: number;
  /**
   * Hours the job ran, stored because rebuilding them as kWh / watts is wrong for resin (the kWh
   * includes wash and cure stations at other wattages) and for batches (watts come from one child).
   * Absent on records written before it existed; readers fall back to the old derivation.
   */
  jobHours?: number;
  /** Provenance per input; the badge shows the weakest of the three. */
  src: {
    time: 'estimate' | 'actual';
    mass: 'estimate' | 'actual';
    watts: 'measured' | 'library' | 'nameplate';
    ef: 'spool' | 'material' | 'preset' | 'library';
  };
  grade: CarbonGrade;
  /**
   * Why a figure is weaker than it looks: missing slicer feature data, no machine on the quote, or
   * `aggregate` — a batch master, whose totals are real sums but whose per-unit fields below are
   * taken from one child and are only indicative when the batch mixes materials or machines.
   */
  flags?: ('no-feature-data' | 'no-machine' | 'no-density' | 'aggregate')[];
}

export interface QuoteParameters {
  materialName?: string;
  machineName?: string;
  consumables?: { name: string; value: number }[];
  consumablesTotal?: number;
  printTime?: string;
  filamentWeight?: string;
  resinVolume?: string;
  laborHours?: string;
  overheadPercentage?: string;
  markupPercentage?: string;
  [key: string]: string | number | boolean | undefined | object;
}

export interface Material {
  id: string;
  name: string;
  cost_per_unit: number;
  unit: string;
  print_type: "FDM" | "Resin";
  totalInStock?: number;
  lowStockThreshold?: number;
  description?: string;
  // --- Carbon (all optional; resolved from the factor library when absent) ---
  co2PerKg?: number;        // cradle-to-gate kgCO2e per kg of filament or resin
  co2Source?: string;       // where that figure came from, shown in the method panel and exports
  densityGCm3?: number;     // resin volume → mass
  carbonFraction?: number;  // mass fraction of carbon, for the incineration route (C × 44/12)
  eolPath?: 'landfill' | 'incineration' | 'recycling';
}

export interface Machine {
  id: string;
  name: string;
  hourly_cost: number;
  power_consumption_watts: number | null;
  print_type: "FDM" | "Resin";
  // Maintenance tracking
  totalRuntimeHours?: number;
  maintenanceIntervalHours?: number; // e.g. 500
  lastMaintenanceHours?: number;
  lastMaintenanceDate?: string;
  totalPowerCost?: number; // Total electricity cost accumulated by this printer
  // Connection Details
  ipAddress?: string;
  accessCode?: string;
  serialNumber?: string;
  apiKey?: string; // For OctoPrint, Moonraker, PrusaLink
  driverType?: 'OFFLINE' | 'BAMBU' | 'OCTOPRINT' | 'MOONRAKER' | 'PRUSALINK' | 'ULTIMAKER' | 'RAISE3D' | 'FORMLABS';
  isOffline?: boolean;
  isCloudEnabled?: boolean;
  buildVolume?: string; // e.g. "256 x 256 x 256 mm"
  certFingerprint?: string; // SHA-256 fingerprint for LAN certificate validation (TOFU)
  /**
   * Measured average draw while printing, in watts.
   *
   * Deliberately separate from `power_consumption_watts`, which is a nameplate/PSU rating that
   * pricing depends on — an Ender 3 is stored at 350 W but averages 75-125 W in use. Only ever
   * written by a human reading a plug meter.
   */
  measuredWatts?: number;
  /** Standby draw; used for shop-level overhead only, never inside a job's footprint. */
  idleWatts?: number;
}

export interface CostConstant {
  id: string;
  name: string;
  value: number;
  unit: string;
  is_visible?: boolean;
  description?: string | null;
}

export interface FDMFormData {
  id?: string;
  projectName: string;
  printColour: string;
  materialId: string;
  machineId: string;
  printTime: string;
  filamentWeight: string;
  laborHours: string;
  overheadPercentage: string;
  markupPercentage: string;
  quantity: string;
  selectedConsumableIds: string[];
  selectedSpoolId?: string; // Selected spool for inventory tracking
  filePath?: string; // Optional file path for uploaded G-code
  customerId?: string;
  clientName?: string;
  priority?: string;
  dueDate?: string;
  assignedEmployeeId?: string; // ID of assigned employee
  // Painting params (Beta)
  paintingTime?: string; // Hours spent on painting labor
  paintingLayers?: string; // Number of paint coats/layers
  selectedPaintId?: string; // Selected paint consumable
  selectedPaintId2?: string; // Secondary paint consumable
  paintingLayers2?: string; // Number of coats for secondary paint
  surfaceAreaCm2?: string; // Surface area in cm² (auto-filled from 3MF)
  notes?: string;
  status?: QuoteStatus;
  failedUnits?: string;
  thumbnail?: string;
  /** "markup" (default): price = cost x (1 + m). "margin": price = cost / (1 - m). */
  pricingMode?: "markup" | "margin";
  discountType?: "percent" | "amount";
  discountValue?: string;
  shippingCost?: string;
}

export interface ResinFormData {
  id?: string;
  projectName: string;
  printColour: string;
  materialId: string;
  machineId: string;
  printTime: string;
  resinVolume: string;
  washingTime: string;
  curingTime: string;
  isopropylCost: string;
  laborHours: string;
  overheadPercentage: string;
  markupPercentage: string;
  quantity: string;
  selectedConsumableIds: string[];
  selectedSpoolId?: string; // Selected spool for inventory tracking
  customerId?: string;
  clientName?: string;
  priority?: string;
  dueDate?: string;
  assignedEmployeeId?: string; // ID of assigned employee
  filePath?: string; // Optional file path for uploaded resin file
  // Painting params (Beta)
  paintingTime?: string; // Hours spent on painting labor
  paintingLayers?: string; // Number of paint coats/layers
  selectedPaintId?: string; // Selected paint consumable
  selectedPaintId2?: string; // Secondary paint consumable
  paintingLayers2?: string; // Number of coats for secondary paint
  surfaceAreaCm2?: string; // Surface area in cm² (auto-filled from 3MF)
  notes?: string;
  status?: QuoteStatus;
  failedUnits?: string;
  thumbnail?: string;
  /** "markup" (default): price = cost x (1 + m). "margin": price = cost / (1 - m). */
  pricingMode?: "markup" | "margin";
  discountType?: "percent" | "amount";
  discountValue?: string;
  shippingCost?: string;
}

export interface QuoteStats {
  totalQuotes: number;
  revenueQuotes?: number;  // accepted quotes (approved -> delivered): what revenue and averages are over
  pipelineValue?: number;  // value of quotes still waiting for a yes, kept out of revenue
  totalRevenue: number;
  totalProfit: number;
  avgQuoteValue: number;
  fdmCount: number;
  resinCount: number;
  recentQuotes: number;
  totalPrintTime: number; // hours
  totalFilamentUsed: number; // kg
  totalResinUsed: number; // liters
  failedPrintsCount: number;
  repeatCustomerRate: number; // New: Percentage of customers with >1 order
  topCustomers: { id?: string; name: string; revenue: number; count: number }[]; // New: Top 5 customers
  revenueGrowth: number; // New: % change in revenue (last 30d vs previous 30d)
  totalLaborCost: number; // New: Total spent on labor
  totalElectricityCost: number; // New: Total spent on power
  totalMaterialCost: number; // New: Total spent on materials
  totalOverheadCost: number; // New: Total spent on overhead
  // Optional like the carbon fields: literal QuoteStats objects elsewhere predate them. Together
  // with the four above they add up to total revenue less profit, so the breakdown reconciles.
  totalMachineCost?: number;
  totalPaintingCost?: number;
  totalConsumablesCost?: number;
  avgMargin: number; // New: Weighted average margin %
  statusDistribution: Record<string, number>; // New: Count of quotes per status
  // --- Carbon. Optional on purpose: existing callers and test fixtures build this object
  // literally, and required fields would break them. Readers use `?? 0`.
  totalCarbonKg?: number;      // jobs that actually ran — never quotes that were only priced
  carbonPerPart?: number;
  carbonPerKg?: number;        // intensity against delivered mass
  carbonEnergyShare?: number;  // 0-1, energy's share of the total
  quotedNotPrintedKg?: number; // pipeline only, reported separately
}

// Customer Review/Rating System
export interface CustomerReview {
  id: string;
  customerId: string;
  quoteId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  tags?: ('quality' | 'communication' | 'timeliness' | 'value')[];
  createdAt: string;
}

// Material Inventory Tracking
export interface MaterialSpool {
  id: string;
  materialId: string;
  name?: string;           // e.g., "PLA Red #3"
  colour?: string;
  initialWeight: number;   // grams (FDM) or ml (Resin)
  currentWeight: number;   // Remaining
  purchaseDate?: string;
  purchaseCost?: number;
  location?: string;       // e.g., "Shelf A1"
  notes?: string;
  /** The strongest material anchor available: the factor of the product actually bought. */
  co2PerKg?: number;
  co2Source?: string;
}

// Capacity Planning
export interface CapacityQuery {
  quantity: number;
  printTimePerUnit: number; // hours per unit (printing only)
  turnoverTimePerUnit?: number; // hours per unit (prep/bed clearing)
  efficiency?: number;      // 0.1 to 1.0 (default 1.0)
  machineIds?: string[];    // Specific machines or all
  workHoursPerDay: number;  // e.g., 8 or 24
  includeWeekends?: boolean; // default true
  startDate?: string;
}

export interface CapacityResult {
  totalPrintHours: number; // Just the printing
  totalLaborHours: number; // Print + Turnover
  machineCount: number;
  estimatedDays: number;
  completionDate: Date;
  utilizationPercent: number;
  breakdown: {
    machineId: string;
    machineName: string;
    unitsAssigned: number;
    hoursOccupied: number; // Includes efficiency adjustment
  }[];
  recoveryPlan?: {
    machinesNeededForDeadline: number;
    hoursPerDayNeededForDeadline: number;
  };
}

export interface CompanySettings {
  name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  taxId?: string;
  logoUrl?: string; // Optional logo buffer/base64
  footerText?: string;
  /** Tax added on top of an invoice, as a percentage. Quote totals and revenue stay pre-tax. */
  taxRate?: number;
  /** Days an invoice stays valid. Printed in its terms; defaults to 30 when unset. */
  validityDays?: number;
  /** Deposit required to start production, as a percentage. 0 omits the line; defaults to 50 when unset. */
  depositPercent?: number;
  /**
   * Whether an invoice shows the job's estimated footprint.
   *
   * Off by default: a customer-facing document is the one place a shop could accidentally publish
   * a figure it has not reviewed, so showing it has to be a deliberate act.
   */
  showCarbonOnInvoice?: boolean;
}

// Stored G-code Files
export interface StoredGcode {
  id: string;
  name: string;
  filePath: string;
  printTime: number; // hours
  filamentWeight: number; // grams
  resinVolume?: number; // ml (for Resin printers)
  machineName?: string;
  materialName?: string;
  printType?: "FDM" | "Resin";
  thumbnail?: string;
  createdAt: string;
  featureWeights?: {
    walls?: number;
    infill?: number;
    supports?: number;
    waste?: number;
  };
}

export interface BridgeSettings {
    enabled: boolean;
    port: number;
}


export interface AISettings {
    enabled: boolean;
    /** Local AI stays on this machine: loopback hosts only. */
    host: 'localhost' | '127.0.0.1';
    port: number;
    model: string;
    contextLength: number;
    /** 0 = deterministic. Analytics answers want a low value. */
    temperature: number;
    requestTimeoutMs: number;
    /** Redact emails/phones/card numbers out of AI answers before display. */
    redactPII: boolean;
    /** Keep the chat transcript across reloads (stored locally, obfuscated). */
    persistChat: boolean;
    /** Optional shop-specific instructions appended after the built-in rules. */
    customInstructions?: string;
}

export type AIAuditEvent = 'PROPOSED' | 'EXECUTED' | 'REJECTED' | 'BLOCKED' | 'REDACTED';

export interface AIAuditEntry {
    timestamp: string;
    event: AIAuditEvent;
    command: string;
    detail: string;
}

export interface AIChatMessageRecord {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}
