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

export type QuoteStatus = 'PENDING' | 'APPROVED' | 'PRINTING' | 'POST_PROCESSING' | 'DONE' | 'DISPATCHED' | 'DELIVERED' | 'FAILED';

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
  statusTimeline?: { [_key in QuoteStatus]?: string }; // ISO dates for when it entered each stage
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string; // ISO date string
  assignedEmployeeId?: string; // ID of assigned employee
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
}

export interface Machine {
  id: string;
  name: string;
  hourly_cost: number;
  power_consumption_watts: number | null;
  print_type: "FDM" | "Resin";
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
}

export interface ResinFormData {
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
  // Painting params (Beta)
  paintingTime?: string; // Hours spent on painting labor
  paintingLayers?: string; // Number of paint coats/layers
  selectedPaintId?: string; // Selected paint consumable
  selectedPaintId2?: string; // Secondary paint consumable
  paintingLayers2?: string; // Number of coats for secondary paint
  surfaceAreaCm2?: string; // Surface area in cm² (auto-filled from 3MF)
}

export interface QuoteStats {
  totalQuotes: number;
  totalRevenue: number;
  avgQuoteValue: number;
  fdmCount: number;
  resinCount: number;
  recentQuotes: number;
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
  color?: string;
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
  printTimePerUnit: number; // hours
  machineIds?: string[];    // Specific machines or all
  workHoursPerDay: number;  // e.g., 8 or 24
  startDate?: string;
}

export interface CapacityResult {
  totalPrintHours: number;
  machineCount: number;
  estimatedDays: number;
  completionDate: Date;
  utilizationPercent: number;
  breakdown: {
    machineId: string;
    machineName: string;
    unitsAssigned: number;
    hoursOccupied: number;
  }[];
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
}
