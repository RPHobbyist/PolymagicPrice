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
}

export interface QuoteStats {
  totalQuotes: number;
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
  avgMargin: number; // New: Weighted average margin %
  statusDistribution: Record<string, number>; // New: Count of quotes per status
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
    port: number;
    model: string;
    contextLength: number;
}
