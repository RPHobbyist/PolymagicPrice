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

// Local Storage - Data persists until explicitly cleared
// Data remains even after app closes/restarts

import { QuoteData, Material, Machine, CostConstant, Customer, CustomerReview, MaterialSpool, CompanySettings, QuoteStatus, Employee, StoredGcode } from "@/types/quote";

// Generate unique IDs
const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Default Materials
const defaultMaterials: Material[] = [
    // FDM Materials
    { id: "fdm-pla", name: "PLA", cost_per_unit: 25, unit: "kg", print_type: "FDM" },
    { id: "fdm-pla-plus", name: "PLA+", cost_per_unit: 28, unit: "kg", print_type: "FDM" },
    { id: "fdm-pla-silk", name: "PLA Silk", cost_per_unit: 32, unit: "kg", print_type: "FDM" },
    { id: "fdm-abs", name: "ABS", cost_per_unit: 28, unit: "kg", print_type: "FDM" },
    { id: "fdm-asa", name: "ASA", cost_per_unit: 35, unit: "kg", print_type: "FDM" },
    { id: "fdm-petg", name: "PETG", cost_per_unit: 30, unit: "kg", print_type: "FDM" },
    { id: "fdm-petg-cf", name: "PETG-CF", cost_per_unit: 55, unit: "kg", print_type: "FDM" },
    { id: "fdm-tpu", name: "TPU", cost_per_unit: 45, unit: "kg", print_type: "FDM" },
    { id: "fdm-nylon", name: "Nylon", cost_per_unit: 50, unit: "kg", print_type: "FDM" },
    { id: "fdm-pc", name: "Polycarbonate (PC)", cost_per_unit: 55, unit: "kg", print_type: "FDM" },
    { id: "fdm-pla-cf", name: "PLA-CF", cost_per_unit: 50, unit: "kg", print_type: "FDM" },
    // Resin Materials
    { id: "resin-standard", name: "Standard Resin", cost_per_unit: 35, unit: "liter", print_type: "Resin" },
    { id: "resin-water-washable", name: "Water Washable Resin", cost_per_unit: 45, unit: "liter", print_type: "Resin" },
    { id: "resin-abs-like", name: "ABS-Like Resin", cost_per_unit: 50, unit: "liter", print_type: "Resin" },
    { id: "resin-tough", name: "Tough Resin", cost_per_unit: 55, unit: "liter", print_type: "Resin" },
    { id: "resin-flexible", name: "Flexible Resin", cost_per_unit: 60, unit: "liter", print_type: "Resin" },
    { id: "resin-8k", name: "8K High-Detail Resin", cost_per_unit: 50, unit: "liter", print_type: "Resin" },
    { id: "resin-castable", name: "Castable Resin", cost_per_unit: 80, unit: "liter", print_type: "Resin" },
    { id: "resin-clear", name: "Clear/Transparent Resin", cost_per_unit: 55, unit: "liter", print_type: "Resin" },
];

// Default Machines
const defaultMachines: Machine[] = [
    // FDM Printers
    { id: "fdm-ender3", name: "Ender 3", hourly_cost: 2, power_consumption_watts: 350, print_type: "FDM" },
    { id: "fdm-ender3-v2", name: "Ender 3 V2", hourly_cost: 2.5, power_consumption_watts: 350, print_type: "FDM" },
    { id: "fdm-ender3-v3", name: "Ender 3 V3", hourly_cost: 3, power_consumption_watts: 300, print_type: "FDM" },
    { id: "fdm-creality-k1", name: "Creality K1", hourly_cost: 6, power_consumption_watts: 350, print_type: "FDM" },
    { id: "fdm-creality-k1-max", name: "Creality K1 Max", hourly_cost: 8, power_consumption_watts: 500, print_type: "FDM" },
    { id: "fdm-prusa-mk3", name: "Prusa i3 MK3S+", hourly_cost: 5, power_consumption_watts: 120, print_type: "FDM" },
    { id: "fdm-prusa-mk4", name: "Prusa MK4", hourly_cost: 6, power_consumption_watts: 150, print_type: "FDM" },
    { id: "fdm-bambu-a1-mini", name: "Bambu Lab A1 Mini", hourly_cost: 5, power_consumption_watts: 150, print_type: "FDM" },
    { id: "fdm-bambu-a1", name: "Bambu Lab A1", hourly_cost: 6, power_consumption_watts: 200, print_type: "FDM" },
    { id: "fdm-bambu-p1s", name: "Bambu Lab P1S", hourly_cost: 8, power_consumption_watts: 350, print_type: "FDM" },
    { id: "fdm-bambu-x1c", name: "Bambu Lab X1 Carbon", hourly_cost: 10, power_consumption_watts: 400, print_type: "FDM" },
    { id: "fdm-voron-24", name: "Voron 2.4", hourly_cost: 7, power_consumption_watts: 400, print_type: "FDM" },
    { id: "fdm-artillery-x3", name: "Artillery Sidewinder X3", hourly_cost: 4, power_consumption_watts: 450, print_type: "FDM" },
    { id: "fdm-qidi-x-max3", name: "QIDI X-Max 3", hourly_cost: 7, power_consumption_watts: 500, print_type: "FDM" },
    // Resin Printers
    { id: "resin-elegoo-mars3", name: "Elegoo Mars 3", hourly_cost: 3, power_consumption_watts: 45, print_type: "Resin" },
    { id: "resin-elegoo-mars4", name: "Elegoo Mars 4 Ultra", hourly_cost: 4, power_consumption_watts: 48, print_type: "Resin" },
    { id: "resin-elegoo-saturn3", name: "Elegoo Saturn 3", hourly_cost: 5, power_consumption_watts: 60, print_type: "Resin" },
    { id: "resin-elegoo-saturn4", name: "Elegoo Saturn 4 Ultra", hourly_cost: 6, power_consumption_watts: 65, print_type: "Resin" },
    { id: "resin-anycubic", name: "Anycubic Photon Mono", hourly_cost: 4, power_consumption_watts: 50, print_type: "Resin" },
    { id: "resin-anycubic-m5s", name: "Anycubic Photon Mono M5s", hourly_cost: 5, power_consumption_watts: 55, print_type: "Resin" },
    { id: "resin-halot-mage", name: "Creality Halot Mage", hourly_cost: 4, power_consumption_watts: 50, print_type: "Resin" },
    { id: "resin-halot-ray", name: "Creality Halot Ray", hourly_cost: 3, power_consumption_watts: 45, print_type: "Resin" },
    { id: "resin-phrozen-mini8k", name: "Phrozen Sonic Mini 8K", hourly_cost: 5, power_consumption_watts: 50, print_type: "Resin" },
    { id: "resin-phrozen-mega8k", name: "Phrozen Mega 8K", hourly_cost: 7, power_consumption_watts: 80, print_type: "Resin" },
];

// Default Constants/Consumables
const defaultConstants: CostConstant[] = [
    { id: "electricity", name: "Electricity Rate", value: 0.12, unit: "$/kWh", is_visible: false, description: "Cost per kilowatt-hour" },
    { id: "labor", name: "Labor Rate", value: 15, unit: "$/hr", is_visible: false, description: "Hourly labor cost" },
    { id: "overhead", name: "Overhead Rate", value: 10, unit: "%", is_visible: false, description: "Overhead percentage" },
    { id: "markup", name: "Default Markup", value: 30, unit: "%", is_visible: false, description: "Default profit margin" },
    // Paint Consumables
    { id: "paint-acrylic-standard", name: "Acrylic Paint (Standard)", value: 0.10, unit: "$/ml", is_visible: true, description: "Standard hobby painting. Usage Rate: 0.02ml/cm2" },
    { id: "paint-spray-primer", name: "Spray Primer", value: 0.08, unit: "$/ml", is_visible: true, description: "Base coat primer. Usage Rate: 0.03ml/cm2" },
    { id: "paint-clear-coat", name: "Clear Coat Varnish", value: 0.12, unit: "$/ml", is_visible: true, description: "Protective finish. Usage Rate: 0.02ml/cm2" },
    { id: "paint-enamel", name: "Enamel Paint", value: 0.15, unit: "$/ml", is_visible: true, description: "Durable detail work. Usage Rate: 0.02ml/cm2" },
];

// Session Storage Keys
const STORAGE_KEYS = {
    QUOTES: "session_quotes",
    MATERIALS: "session_materials",
    MACHINES: "session_machines",
    CONSTANTS: "session_constants",
    CUSTOMERS: "session_customers",
    REVIEWS: "session_reviews",
    SPOOLS: "session_spools",
    COMPANY: "session_company",
    EMPLOYEES: "session_employees",
    GCODES: "session_gcodes",
    INITIALIZED: "session_initialized",
};

// Initialize session storage with defaults if not already done
const initializeDefaults = () => {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
        localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(defaultMaterials));
        localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(defaultMachines));
        localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(defaultConstants));
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.GCODES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(null));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
    }

    // Migration: Add default paint consumables if they don't exist
    const existingConstants: CostConstant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONSTANTS) || "[]");
    const paintConsumables = defaultConstants.filter(c => c.id.startsWith("paint-"));
    let needsUpdate = false;

    for (const paint of paintConsumables) {
        const index = existingConstants.findIndex(c => c.id === paint.id);

        if (index === -1) {
            // New paint, add it
            existingConstants.push(paint);
            needsUpdate = true;
        } else {
            // Check if existing paint needs update (migration from flat to calculated)
            // Legacy values: 5, 8, 6, 7. New values are < 1.
            const existing = existingConstants[index];
            if (existing.unit === "flat" && existing.value > 1) {
                // Update to new default
                existingConstants[index] = paint;
                needsUpdate = true;
            }
        }
    }

    // Migration: Ensure system constants are hidden (not visible in paint/consumable selection)
    const systemIds = ["electricity", "labor", "overhead", "markup"];
    const systemNames = ["Electricity Rate", "Labor Rate", "Overhead Rate", "Default Markup"];

    for (let i = 0; i < existingConstants.length; i++) {
        const c = existingConstants[i];
        if ((systemIds.includes(c.id) || systemNames.includes(c.name)) && c.is_visible !== false) {
            existingConstants[i].is_visible = false;
            needsUpdate = true;
        }
    }

    if (needsUpdate) {
        localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(existingConstants));
    }
};

// Quotes
export const getQuotes = (): QuoteData[] => {
    initializeDefaults();
    const rawQuotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUOTES) || "[]");

    // Migration: Ensure all quotes have a status and proper defaults
    return rawQuotes.map((q: QuoteData) => ({
        ...q,
        status: q.status || 'PENDING',
        statusTimeline: q.statusTimeline || { PENDING: q.createdAt },
        assignedMachineId: q.assignedMachineId || undefined,
        actualPrintTime: q.actualPrintTime || undefined
    }));
};

export const saveQuote = (quote: QuoteData): QuoteData => {
    const quotes = getQuotes();
    const newQuote: QuoteData = {
        ...quote,
        id: generateId(),
        createdAt: new Date().toISOString(),
    };
    quotes.unshift(newQuote);
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
    return newQuote;
};

export const deleteQuote = (id: string): void => {
    const quotes = getQuotes().filter(q => q.id !== id);
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
};

export const updateQuoteNotes = (id: string, notes: string): void => {
    const quotes = getQuotes().map(q =>
        q.id === id ? { ...q, notes } : q
    );
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
};

export const updateQuoteStatus = (id: string, status: QuoteStatus): void => {
    const quotes = getQuotes().map(q => {
        if (q.id === id) {
            return {
                ...q,
                status,
                statusTimeline: {
                    ...q.statusTimeline,
                    [status]: new Date().toISOString()
                },
                // If moving to DONE, allow setting completedAt logic
                ...(status === 'DONE' && !q.statusTimeline?.DONE ? { actualPrintTime: q.actualPrintTime /* Keep if set */ } : {})
            };
        }
        return q;
    });
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
};

// Materials
export const getMaterials = (printType?: "FDM" | "Resin"): Material[] => {
    initializeDefaults();
    const materials: Material[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERIALS) || "[]");
    return printType ? materials.filter(m => m.print_type === printType) : materials;
};

export const saveMaterial = (material: Omit<Material, "id"> & { id?: string }): Material => {
    const materials = getMaterials();
    if (material.id) {
        // Update existing
        const index = materials.findIndex(m => m.id === material.id);
        if (index !== -1) {
            materials[index] = material as Material;
        }
    } else {
        // Add new
        const newMaterial: Material = {
            ...material,
            id: generateId(),
        } as Material;
        materials.push(newMaterial);
    }
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    return material as Material;
};

export const deleteMaterial = (id: string): void => {
    const materials = getMaterials().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
};

// Machines
export const getMachines = (printType?: "FDM" | "Resin"): Machine[] => {
    initializeDefaults();
    const machines: Machine[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MACHINES) || "[]");
    return printType ? machines.filter(m => m.print_type === printType) : machines;
};

export const saveMachine = (machine: Omit<Machine, "id"> & { id?: string }): Machine => {
    const machines = getMachines();
    if (machine.id) {
        // Update existing
        const index = machines.findIndex(m => m.id === machine.id);
        if (index !== -1) {
            machines[index] = machine as Machine;
        }
    } else {
        // Add new
        const newMachine: Machine = {
            ...machine,
            id: generateId(),
        } as Machine;
        machines.push(newMachine);
    }
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
    return machine as Machine;
};

export const deleteMachine = (id: string): void => {
    const machines = getMachines().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
};

// Constants
export const getConstants = (): CostConstant[] => {
    initializeDefaults();
    const constants = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONSTANTS) || "[]");

    // Enforce system constants to be hidden
    const systemIds = ["electricity", "labor", "overhead", "markup"];
    const systemNames = ["Electricity Rate", "Labor Rate", "Overhead Rate", "Default Markup"];

    return constants.map((c: CostConstant) => {
        if (systemIds.includes(c.id) || systemNames.includes(c.name)) {
            return { ...c, is_visible: false };
        }
        return c;
    });
};

export const saveConstant = (constant: Omit<CostConstant, "id"> & { id?: string }): CostConstant => {
    const constants = getConstants();
    if (constant.id) {
        // Update existing
        const index = constants.findIndex(c => c.id === constant.id);
        if (index !== -1) {
            constants[index] = constant as CostConstant;
        }
    } else {
        // Add new
        const newConstant: CostConstant = {
            ...constant,
            id: generateId(),
        } as CostConstant;
        constants.push(newConstant);
    }
    localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(constants));
    return constant as CostConstant;
};

export const deleteConstant = (id: string): void => {
    const constants = getConstants().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(constants));
};



// Reset all session data
export const resetSessionData = (): void => {
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    localStorage.removeItem(STORAGE_KEYS.QUOTES);
    localStorage.removeItem(STORAGE_KEYS.MATERIALS);
    localStorage.removeItem(STORAGE_KEYS.MACHINES);
    localStorage.removeItem(STORAGE_KEYS.CONSTANTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
    localStorage.removeItem(STORAGE_KEYS.SPOOLS);
    localStorage.removeItem(STORAGE_KEYS.GCODES);
    initializeDefaults();
};

// Customers
export const getCustomers = (): Customer[] => {
    initializeDefaults();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || "[]");
};

export const saveCustomer = (customer: Omit<Customer, "id" | "createdAt"> & { id?: string, createdAt?: string }): Customer => {
    const customers = getCustomers();
    if (customer.id) {
        // Update existing
        const index = customers.findIndex(c => c.id === customer.id);
        if (index !== -1) {
            customers[index] = { ...customers[index], ...customer };
        }
    } else {
        // Add new
        const newCustomer: Customer = {
            ...customer,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        customers.unshift(newCustomer);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    return customer.id
        ? customers.find(c => c.id === customer.id)!
        : customers[0];
};

export const deleteCustomer = (id: string): void => {
    const customers = getCustomers().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
};

export const getCustomer = (id: string): Customer | undefined => {
    return getCustomers().find(c => c.id === id);
};

export const getCustomerStats = (customerId: string) => {
    initializeDefaults();
    const quotes = getQuotes();
    const customerQuotes = quotes.filter(q => q.customerId === customerId);

    const totalSpent = customerQuotes.reduce((sum, q) => sum + (q.totalPrice || 0), 0);
    const orderCount = customerQuotes.length;
    const lastOrderDate = customerQuotes.length > 0
        ? customerQuotes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0].createdAt
        : null;

    return {
        totalSpent,
        orderCount,
        lastOrderDate,
        quotes: customerQuotes
    };
};

// ==================== EMPLOYEES ====================

export const getEmployees = (): Employee[] => {
    initializeDefaults();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || "[]");
};

export const saveEmployee = (employee: Omit<Employee, "id" | "createdAt"> & { id?: string }): Employee => {
    const employees = getEmployees();
    if (employee.id) {
        // Update existing
        const index = employees.findIndex(e => e.id === employee.id);
        if (index !== -1) {
            employees[index] = { ...employees[index], ...employee };
        }
    } else {
        // Add new
        const newEmployee: Employee = {
            ...employee,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        employees.unshift(newEmployee);
    }
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    return employee.id
        ? employees.find(e => e.id === employee.id)!
        : employees[0];
};

export const deleteEmployee = (id: string): void => {
    const employees = getEmployees().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
};

export const getEmployee = (id: string): Employee | undefined => {
    return getEmployees().find(e => e.id === id);
};

// ==================== CUSTOMER REVIEWS ====================

export const getReviews = (customerId?: string): CustomerReview[] => {
    initializeDefaults();
    const reviews: CustomerReview[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || "[]");
    return customerId ? reviews.filter(r => r.customerId === customerId) : reviews;
};

export const saveReview = (review: Omit<CustomerReview, "id" | "createdAt"> & { id?: string }): CustomerReview => {
    const reviews = getReviews();
    if (review.id) {
        const index = reviews.findIndex(r => r.id === review.id);
        if (index !== -1) {
            reviews[index] = { ...reviews[index], ...review } as CustomerReview;
        }
    } else {
        const newReview: CustomerReview = {
            ...review,
            id: generateId(),
            createdAt: new Date().toISOString(),
        } as CustomerReview;
        reviews.unshift(newReview);
    }
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));

    // Update customer's average rating
    updateCustomerRating(review.customerId);

    return review.id ? reviews.find(r => r.id === review.id)! : reviews[0];
};

export const deleteReview = (id: string): void => {
    const reviews = getReviews();
    const review = reviews.find(r => r.id === id);
    const filtered = reviews.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(filtered));

    if (review) {
        updateCustomerRating(review.customerId);
    }
};

export const getCustomerAverageRating = (customerId: string): { average: number; count: number } => {
    const reviews = getReviews(customerId);
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
};

const updateCustomerRating = (customerId: string): void => {
    const { average, count } = getCustomerAverageRating(customerId);
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === customerId);
    if (index !== -1) {
        customers[index].averageRating = average;
        customers[index].reviewCount = count;
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    }
};

// ==================== MATERIAL SPOOLS (INVENTORY) ====================

export const getSpools = (materialId?: string): MaterialSpool[] => {
    initializeDefaults();
    const spools: MaterialSpool[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SPOOLS) || "[]");
    return materialId ? spools.filter(s => s.materialId === materialId) : spools;
};

export const saveSpool = (spool: Omit<MaterialSpool, "id"> & { id?: string }): MaterialSpool => {
    const spools = getSpools();
    if (spool.id) {
        const index = spools.findIndex(s => s.id === spool.id);
        if (index !== -1) {
            spools[index] = spool as MaterialSpool;
        }
    } else {
        const newSpool: MaterialSpool = {
            ...spool,
            id: generateId(),
        };
        spools.push(newSpool);
    }
    localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify(spools));
    updateMaterialStock(spool.materialId);
    return spool.id ? spools.find(s => s.id === spool.id)! : spools[spools.length - 1];
};

export const deleteSpool = (id: string): void => {
    const spools = getSpools();
    const spool = spools.find(s => s.id === id);
    const filtered = spools.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify(filtered));

    if (spool) {
        updateMaterialStock(spool.materialId);
    }
};

export const deductFromSpool = (spoolId: string, amount: number): boolean => {
    const spools = getSpools();
    const index = spools.findIndex(s => s.id === spoolId);
    if (index === -1) return false;

    // Allow negative stock (if over-consumed) or adding back (if amount is negative)
    const newWeight = spools[index].currentWeight - amount;
    spools[index].currentWeight = newWeight;

    localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify(spools));
    updateMaterialStock(spools[index].materialId);
    return true;
};

export const restoreToSpool = (spoolId: string, amount: number): boolean => {
    return deductFromSpool(spoolId, -amount);
};

export const getMaterialStock = (materialId: string): number => {
    const spools = getSpools(materialId);
    return spools.reduce((sum, s) => sum + s.currentWeight, 0);
};

export const getLowStockMaterials = (threshold?: number): Material[] => {
    const materials = getMaterials();
    return materials.filter(m => {
        const stock = getMaterialStock(m.id);
        const limit = m.lowStockThreshold ?? threshold ?? 200; // Default 200g threshold
        return stock < limit && stock >= 0;
    });
};

const updateMaterialStock = (materialId: string): void => {
    const stock = getMaterialStock(materialId);
    const materials = getMaterials();
    const index = materials.findIndex(m => m.id === materialId);
    if (index !== -1) {
        materials[index].totalInStock = stock;
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    }
};

// ==================== STORED G-CODES ====================

export const getGcodes = (): StoredGcode[] => {
    initializeDefaults();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.GCODES) || "[]");
};

export const saveGcode = (gcode: Omit<StoredGcode, "id"> & { id?: string }): StoredGcode => {
    const gcodes = getGcodes();
    if (gcode.id) {
        // Update existing
        const index = gcodes.findIndex(g => g.id === gcode.id);
        if (index !== -1) {
            gcodes[index] = gcode as StoredGcode;
        }
    } else {
        // Add new
        const newGcode: StoredGcode = {
            ...gcode,
            id: generateId(),
        } as StoredGcode;
        gcodes.unshift(newGcode);
    }
    localStorage.setItem(STORAGE_KEYS.GCODES, JSON.stringify(gcodes));
    return gcode.id ? gcodes.find(g => g.id === gcode.id)! : gcodes[0];
};

export const deleteGcode = (id: string): void => {
    const gcodes = getGcodes().filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.GCODES, JSON.stringify(gcodes));
};

// ==================== COMPANY SETTINGS ====================


export const getCompanySettings = (): CompanySettings | null => {
    initializeDefaults();
    const data = localStorage.getItem(STORAGE_KEYS.COMPANY);
    return data ? JSON.parse(data) : null;
};

export const saveCompanySettings = (settings: CompanySettings): void => {
    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(settings));
};

// ==================== EXPORT/IMPORT ====================

// Settings data structure for export/import
export interface SettingsExport {
    version: string;
    exportDate: string;
    materials: Material[];
    machines: Machine[];
    constants: CostConstant[];
    customers: Customer[];
    reviews?: CustomerReview[];
    spools?: MaterialSpool[];
    gcodes?: StoredGcode[];
    company?: CompanySettings | null;
}

// Export all settings to JSON
export const exportAllSettings = (): SettingsExport => {
    return {
        version: "1.1",
        exportDate: new Date().toISOString(),
        materials: getMaterials(),
        machines: getMachines(),
        constants: getConstants(),
        customers: getCustomers(),
        reviews: getReviews(),
        spools: getSpools(),
        gcodes: getGcodes(),
        company: getCompanySettings(),
    };
};

// Import settings from JSON
export const importAllSettings = (data: SettingsExport): { success: boolean; message: string } => {
    try {
        // Validate structure
        if (!data.version || !data.materials || !data.machines || !data.constants) {
            return { success: false, message: "Invalid settings file format" };
        }

        // Validate arrays
        if (!Array.isArray(data.materials) || !Array.isArray(data.machines) || !Array.isArray(data.constants)) {
            return { success: false, message: "Settings data is corrupted" };
        }

        // Validate customers (optional for backward compatibility)
        if (data.customers && !Array.isArray(data.customers)) {
            return { success: false, message: "Customer data is corrupted" };
        }

        // Import materials
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(data.materials));

        // Import machines
        localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(data.machines));

        // Import constants
        localStorage.setItem(STORAGE_KEYS.CONSTANTS, JSON.stringify(data.constants));

        // Import customers (if present)
        if (data.customers) {
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
        }

        // Import reviews (if present)
        if (data.reviews) {
            localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(data.reviews));
        }

        // Import spools (if present)
        if (data.spools) {
            localStorage.setItem(STORAGE_KEYS.SPOOLS, JSON.stringify(data.spools));
        }

        // Import G-codes (if present)
        if (data.gcodes) {
            localStorage.setItem(STORAGE_KEYS.GCODES, JSON.stringify(data.gcodes));
        }

        // Import company settings (if present)
        if (data.company) {
            localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(data.company));
        }

        return {
            success: true,
            message: `Imported ${data.materials.length} materials, ${data.machines.length} machines, ${data.constants.length} consumables${data.customers ? `, ${data.customers.length} customers` : ''}${data.reviews ? `, ${data.reviews.length} reviews` : ''}${data.spools ? `, ${data.spools.length} spools` : ''}${data.gcodes ? `, ${data.gcodes.length} G-codes` : ''}`
        };
    } catch (error) {
        console.error("Import error:", error);
        return { success: false, message: "Failed to import settings" };
    }
};
