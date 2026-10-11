/*
 * PolymagicPrice - Shop report generation
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

import {
    getQuotes,
    getMachines,
    getMaterials,
    getCompanySettings,
    getLowStockMaterials,
    getStockByMaterial,
    getProductionSettings,
    isMachineMaintenanceDue,
    getConstants,
} from "@/lib/core/sessionStorage";
import { computeQuoteStats } from "@/lib/quoteStats";
import { computeShopLoad } from "@/lib/shopLoad";
import { buildCarbonOverview } from "@/lib/carbon/carbonStats";
import { formatCarbon } from "@/lib/carbon/carbonCalculator";
import { DEFAULT_GRID_G_PER_KWH, GRID_CONSTANT_ID, GRID_PRESETS, resolveMaterialFactor } from "@/lib/carbon/carbonFactors";
import { getFormatters, ContextFormatters } from "@/lib/currencyFormat";
import { formatHours } from "@/lib/capacityCalculator";
import { escapeHTML } from "@/lib/sanitization";
import { QuoteData, Material } from "@/types/quote";

export type ShopReportType = "FINANCIAL" | "MATERIAL" | "USAGE" | "CARBON";

/**
 * Opens generated HTML in an isolated window for printing / saving as PDF.
 *
 * Uses a Blob URL rather than document.write so the new window gets a null
 * `window.opener` and cannot reach back into the app.
 */
export function openPrintableHTML(html: string): void {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow) {
        URL.revokeObjectURL(blobUrl);
        throw new Error('Could not open print window. Please allow popups.');
    }

    // Cleanup Blob URL after a delay to allow the window to load
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 10000);
}

const parseVal = (val: unknown): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    return 0;
};

interface ReportSection {
    heading: string;
    rows: [string, string][];
}

interface ReportTable {
    heading: string;
    columns: string[];
    rows: string[][];
}

interface ReportModel {
    title: string;
    subtitle: string;
    sections: ReportSection[];
    tables: ReportTable[];
}

function buildFinancialReport(fmt: ContextFormatters): ReportModel {
    const quotes = getQuotes();
    const stats = computeQuoteStats(quotes);

    const sections: ReportSection[] = [
        {
            heading: "Revenue & Profit",
            rows: [
                ["Total quotes", String(stats.totalQuotes)],
                ["Accepted quotes", String(stats.revenueQuotes ?? 0)],
                ["Total revenue (accepted quotes)", fmt.money(stats.totalRevenue)],
                ["Awaiting approval", fmt.money(stats.pipelineValue ?? 0)],
                ["Total profit", fmt.money(stats.totalProfit)],
                ["Average margin", `${fmt.number(stats.avgMargin, 1)}%`],
                ["Average accepted quote", fmt.money(stats.avgQuoteValue)],
                ["Revenue growth (last 30d vs prior 30d)", `${fmt.number(stats.revenueGrowth, 1)}%`],
                ["Quotes in the last 7 days", String(stats.recentQuotes)],
            ],
        },
        {
            heading: "Cost Breakdown",
            rows: [
                ["Material", fmt.money(stats.totalMaterialCost)],
                ["Machine time", fmt.money(stats.totalMachineCost ?? 0)],
                ["Labor", fmt.money(stats.totalLaborCost)],
                ["Electricity", fmt.money(stats.totalElectricityCost)],
                ["Painting", fmt.money(stats.totalPaintingCost ?? 0)],
                ["Consumables", fmt.money(stats.totalConsumablesCost ?? 0)],
                ["Overhead", fmt.money(stats.totalOverheadCost)],
            ],
        },
        {
            heading: "Customers",
            rows: [
                ["Repeat customer rate", `${fmt.number(stats.repeatCustomerRate, 1)}%`],
                ["Failed units", String(stats.failedPrintsCount)],
            ],
        },
    ];

    const tables: ReportTable[] = [
        {
            heading: "Top Customers",
            columns: ["Customer", "Orders", "Revenue"],
            rows: stats.topCustomers.map(c => [c.name, String(c.count), fmt.money(c.revenue)]),
        },
        {
            heading: "Orders by Status",
            columns: ["Status", "Orders"],
            rows: Object.entries(stats.statusDistribution).map(([status, count]) => [status, String(count)]),
        },
    ];

    return {
        title: "Financial Report",
        subtitle: `All amounts in ${fmt.currencyCode}`,
        sections,
        tables,
    };
}

function buildMaterialReport(fmt: ContextFormatters): ReportModel {
    const materials = getMaterials();
    const quotes = getQuotes();
    const lowStock = getLowStockMaterials();
    const lowStockIds = new Set(lowStock.map(m => m.id));

    // Consumption per material from the order book
    const consumption = new Map<string, number>();
    quotes.forEach((q: QuoteData) => {
        const name = q.parameters?.materialName as string | undefined;
        if (!name) return;
        const perUnit = q.printType === "FDM"
            ? parseVal(q.parameters?.filamentWeight)
            : parseVal(q.parameters?.resinVolume);
        const used = q.actualMaterialUsed ?? perUnit * (q.quantity || 1);
        consumption.set(name, (consumption.get(name) || 0) + used);
    });

    /*
     * Stock and consumption are both held in the base unit the shop works in — grams for
     * filament, millilitres for resin — while `m.unit` is the unit it BUYS in, typically kg or
     * litre. Printing the one with the other's label reported 10 kg of PLA as "10000kg", which is
     * the sort of figure an accountant reads straight into a purchase order.
     */
    const baseUnit = (m: Material) => (m.print_type === "Resin" ? "ml" : "g");

    // One pass over the spool store for the whole report, rather than one per material row.
    const stockByMaterialId = getStockByMaterial();

    const rows = materials.map(m => {
        const stock = stockByMaterialId.get(m.id) ?? 0;
        const unit = baseUnit(m);
        return [
            m.name,
            m.print_type,
            `${fmt.number(stock, 0)} ${unit}`,
            `${fmt.number(consumption.get(m.name) || 0, 0)} ${unit}`,
            `${fmt.money(m.cost_per_unit)} / ${m.unit}`,
            lowStockIds.has(m.id) ? "LOW STOCK" : "OK",
        ];
    });

    return {
        title: "Material Report",
        subtitle: `${materials.length} materials registered - all amounts in ${fmt.currencyCode}`,
        sections: [
            {
                heading: "Summary",
                rows: [
                    ["Materials registered", String(materials.length)],
                    ["Materials below threshold", String(lowStock.length)],
                ],
            },
        ],
        tables: [
            {
                heading: "Materials",
                columns: ["Material", "Type", "In stock", "Consumed", "Cost / unit", "Status"],
                rows,
            },
        ],
    };
}

function buildUsageReport(fmt: ContextFormatters): ReportModel {
    const machines = getMachines();
    const quotes = getQuotes();
    const load = computeShopLoad(quotes, machines, getProductionSettings());

    const machineCounts = new Map<string, number>();
    quotes.forEach(q => {
        const name = q.parameters?.machineName as string | undefined;
        if (name) machineCounts.set(name, (machineCounts.get(name) || 0) + 1);
    });

    const rows = machines.map(m => [
        m.name,
        m.print_type,
        `${fmt.number(m.totalRuntimeHours || 0, 0)}h`,
        m.maintenanceIntervalHours ? `${fmt.number(m.maintenanceIntervalHours, 0)}h` : "-",
        isMachineMaintenanceDue(m) ? "DUE" : "OK",
        String(machineCounts.get(m.name) || 0),
        fmt.money(m.hourly_cost),
    ]);

    return {
        title: "Machine Usage Report",
        subtitle: `${machines.length} machines registered`,
        sections: [
            {
                heading: "Queue & Capacity",
                rows: [
                    ["Open orders", String(load.queuedOrders)],
                    ["Queued units", String(load.queuedUnits)],
                    ["Queued print time", formatHours(load.queuedPrintHours)],
                    ["Machines in pool", String(load.machineCount)],
                    ["Utilization", `${fmt.number(load.utilizationPercent, 0)}%`],
                    ["Estimated days to clear", fmt.number(load.estimatedDays, 1)],
                    ["Bottleneck", load.bottleneck ? `${load.bottleneck.machineName} (${formatHours(load.bottleneck.hoursOccupied)})` : "None"],
                ],
            },
        ],
        tables: [
            {
                heading: "Machines",
                columns: ["Machine", "Type", "Runtime", "Service interval", "Maintenance", "Quotes", "Hourly rate"],
                rows,
            },
        ],
    };
}

function renderReportHTML(model: ReportModel, companyName: string): string {
    const sectionHTML = model.sections.map(section => `
    <section>
      <h2>${escapeHTML(section.heading)}</h2>
      <dl>
        ${section.rows.map(([label, value]) => `
          <div class="row"><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>
        `).join("")}
      </dl>
    </section>`).join("");

    const tableHTML = model.tables.filter(t => t.rows.length > 0).map(table => `
    <section>
      <h2>${escapeHTML(table.heading)}</h2>
      <table>
        <thead><tr>${table.columns.map(c => `<th>${escapeHTML(c)}</th>`).join("")}</tr></thead>
        <tbody>
          ${table.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHTML(cell)}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </section>`).join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHTML(model.title)} - ${escapeHTML(companyName)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 32px; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #64748b; font-size: 12px; margin: 0; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .06em; color: #475569; margin: 28px 0 10px; }
  dl { margin: 0; display: grid; grid-template-columns: 1fr; gap: 4px; }
  .row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 6px 0; font-size: 13px; }
  dt { color: #475569; margin: 0; }
  dd { margin: 0; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #f1f5f9; padding: 8px; border-bottom: 1px solid #cbd5e1; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
  footer { margin-top: 32px; color: #94a3b8; font-size: 11px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <header>
    <h1>${escapeHTML(model.title)}</h1>
    <p class="muted">${escapeHTML(companyName)} &middot; ${escapeHTML(model.subtitle)} &middot; ${escapeHTML(new Date().toLocaleString())}</p>
  </header>
  ${sectionHTML}
  ${tableHTML}
  <footer>Generated locally by PolymagicPrice. No data left this device.</footer>
</body>
</html>`;
}

/**
 * The carbon report: what the shop emitted, where it came from, and — deliberately — where each
 * figure came from, because a footprint a customer cannot trace is worth nothing to them.
 */
function buildCarbonReport(fmt: ContextFormatters): ReportModel {
    const quotes = getQuotes();
    const stats = computeQuoteStats(quotes);
    const materials = getMaterials();
    const constants = getConstants();

    const gridGPerKWh = constants.find(c => c.id === GRID_CONSTANT_ID)?.value ?? DEFAULT_GRID_G_PER_KWH;
    const gridPreset = GRID_PRESETS.find(p => p.gPerKWh === gridGPerKWh);
    const overview = buildCarbonOverview(quotes);

    const sections: ReportSection[] = [
        {
            heading: "Footprint of completed work",
            rows: [
                ["Total", stats.totalCarbonKg !== undefined ? formatCarbon(stats.totalCarbonKg) : "No completed job yet"],
                ["Per part (average)", stats.carbonPerPart !== undefined ? formatCarbon(stats.carbonPerPart) : "—"],
                ["Intensity", stats.carbonPerKg !== undefined ? `${fmt.number(stats.carbonPerKg, 1)} kgCO2e per kg printed` : "—"],
                ["Energy share", stats.carbonEnergyShare !== undefined ? `${fmt.number(stats.carbonEnergyShare * 100, 0)}%` : "—"],
                ["Quoted but not printed", stats.quotedNotPrintedKg !== undefined ? `${formatCarbon(stats.quotedNotPrintedKg)} (excluded from the total)` : "None"],
            ],
        },
        {
            heading: "By source",
            rows: [
                ["Electricity", formatCarbon(overview.sources.energyKg)],
                ["Material", formatCarbon(overview.sources.materialKg)],
                ["Waste and end of life", formatCarbon(overview.sources.wasteKg)],
            ],
        },
        {
            heading: "Method",
            rows: [
                ["Grid factor", `${fmt.number(gridGPerKWh, 0)} gCO2e/kWh${gridPreset ? ` — ${gridPreset.label}, ${gridPreset.source} (${gridPreset.year})` : " — set by the shop"}`],
                ["Boundary", "Electricity, material and disposal for work that was actually printed"],
                ["Excluded", "Warm-up, consumables, packaging, freight, and the printers themselves"],
                ["Basis", "Estimates from published averages unless a machine's wattage was measured"],
            ],
        },
    ];

    const tables: ReportTable[] = [
        {
            heading: "By month completed",
            columns: ["Month", "Jobs", "Footprint"],
            rows: overview.months.map(m => [m.label, String(m.jobs), formatCarbon(m.kg)]),
        },
        {
            heading: "By machine",
            columns: ["Machine", "Jobs", "kWh", "kWh per hour", "Footprint", "Wattage"],
            rows: overview.fleet.map(row => [
                row.machineName,
                String(row.jobs),
                fmt.number(row.kWh, 2),
                fmt.number(row.energyRate, 3),
                formatCarbon(row.kg),
                row.wattsSource === "measured" ? "Measured" : row.wattsSource === "nameplate" ? "Rated" : "Library",
            ]),
        },
        {
            heading: "Material factors used",
            columns: ["Material", "kgCO2e per kg", "Source"],
            rows: materials.map(material => {
                const resolved = resolveMaterialFactor(material, undefined, material.print_type);
                return [material.name, fmt.number(resolved.kgPerKg, 2), resolved.sourceNote];
            }),
        },
    ];

    return {
        title: "Carbon Report",
        subtitle: "Estimated emissions. This report makes no environmental claim.",
        sections,
        tables,
    };
}

/**
 * Builds and opens a shop report. Everything is computed from local data with
 * the same functions the dashboards use — the model only chooses which report
 * to ask for, it never supplies the numbers.
 */
export function generateShopReport(
    type: ShopReportType,
    formatters: ContextFormatters = getFormatters()
): { opened: boolean; message: string } {
    const company = getCompanySettings();
    const companyName = company?.name || "My 3D Print Shop";

    let model: ReportModel;
    if (type === "FINANCIAL") model = buildFinancialReport(formatters);
    else if (type === "MATERIAL") model = buildMaterialReport(formatters);
    else if (type === "CARBON") model = buildCarbonReport(formatters);
    else model = buildUsageReport(formatters);

    try {
        openPrintableHTML(renderReportHTML(model, companyName));
        return { opened: true, message: `${model.title} generated from local shop data.` };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Could not open the report window.";
        return { opened: false, message };
    }
}
