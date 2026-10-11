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

import { memo, useCallback, useMemo, useState, lazy, Suspense } from "react";
import { summariseQuote } from "@/lib/quoteCalculations";
import { buildQuoteText, quoteBreakdownRows } from "@/lib/quoteExportRows";
import { formatCarbon } from "@/lib/carbon/carbonCalculator";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Save, FileDown, Package, Copy, FileSpreadsheet, ChevronDown, Share2 } from "lucide-react";
import { saveAs } from "file-saver";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
/*
 * The chart and the printer animation are the two heaviest things on this screen and neither is
 * needed to show a price: recharts is 101 KB gzipped and framer-motion (which the animation pulls
 * in) another 40 KB, on a page whose whole JavaScript was 383 KB. Both are fetched on demand.
 */
const MaterialBreakdownChart = lazy(() => import("./MaterialBreakdownChart"));
import { QuoteData } from "@/types/quote";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { printQuotePDF } from "@/lib/pdfGenerator";
import { useBatchQuote } from "@/hooks/useBatchQuote";
import { BatchQuoteManager } from "./BatchQuoteManager";

interface QuoteSummaryProps {
  quoteData: QuoteData | null;
  onSaveQuote: (quote: QuoteData) => void;
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

const QuoteSummary = memo(({ quoteData, onSaveQuote }: QuoteSummaryProps) => {
  const { currency, formatPrice, conversionRate } = useCurrency();
  const { addItem, batchItems } = useBatchQuote();
  const [isBatchOpen, setIsBatchOpen] = useState(false);


  const handleExport = useCallback(() => {
    if (!quoteData) return;

    const quoteText = buildQuoteText(quoteData, formatPrice, new Date());

    const blob = new Blob([quoteText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quote-${quoteData.projectName}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Quote exported successfully!");
  }, [quoteData, formatPrice]);

  const handleCopyToClipboard = useCallback(() => {
    if (!quoteData) return;

    const quoteText = buildQuoteText(quoteData, formatPrice);

    navigator.clipboard.writeText(quoteText);
    toast.success("Quote copied to clipboard!");
  }, [quoteData, formatPrice]);

  const handleExportExcel = useCallback(async () => {
    if (!quoteData) return;

    const exportCarbonKg = summariseQuote(quoteData).carbonKg;

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Quote");

      worksheet.columns = [
        { header: "Description", key: "desc", width: 30 },
        { header: "Details", key: "val", width: 40 },
      ];

      worksheet.addRows([
        { desc: "Project Name", val: quoteData.projectName },
        { desc: "Print Type", val: quoteData.printType },
        { desc: "Material", val: quoteData.parameters.materialName || "-" },
        { desc: "Machine", val: quoteData.parameters.machineName || "-" },
        { desc: "Colour", val: quoteData.printColour || "-" },
        { desc: "", val: "" },
        { desc: "Quantity", val: summariseQuote(quoteData).quantity },
        { desc: `COST BREAKDOWN (${currency.code}, whole job)`, val: "" },
        // Numbers, not formatted strings, so the sheet can be summed and sorted.
        ...quoteBreakdownRows(quoteData).map(r => ({ desc: r.label, val: Math.round(r.amount * conversionRate * 100) / 100 })),
        // Carbon last and clearly labelled, so nothing in the money column above changes shape.
        // Read through the shared summary rather than the record, like every other surface, and
        // called here so the callback keeps `quoteData` as its only data dependency.
        ...(exportCarbonKg !== undefined
          ? [{ desc: "Carbon Footprint (estimate)", val: formatCarbon(exportCarbonKg) }]
          : []),
      ]);

      worksheet.getRow(1).font = { bold: true };
      // Bold by content rather than by row number, which drifted every time a line was added.
      worksheet.eachRow(row => {
        const label = String(row.getCell(1).value ?? "");
        if (label.startsWith("COST BREAKDOWN") || ["Subtotal", "TOTAL PRICE"].includes(label)) row.font = { bold: true };
        if (typeof row.getCell(2).value === "number" && label !== "Quantity") row.getCell(2).numFmt = "#,##0.00";
      });


      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `quote-${quoteData.projectName}-${Date.now()}.xlsx`);
      toast.success("Excel file generated!");
    } catch (err) {
      console.error("Excel export failed:", err);
      toast.error("Failed to generate Excel file");
    }
  }, [quoteData, currency, conversionRate]);

  const featureData = quoteData?.featureWeights ? [
    { name: 'Walls', value: quoteData.featureWeights.walls || 0 },
    { name: 'Infill', value: quoteData.featureWeights.infill || 0 },
    { name: 'Supports', value: quoteData.featureWeights.supports || 0 },
    { name: 'Waste', value: quoteData.featureWeights.waste || 0 },
  ].filter(f => f.value > 0).map((f, i) => ({ ...f, colour: CHART_COLORS[i % CHART_COLORS.length] })) : [];

  // Each slice carries its own colour, which is all the chart component needs.

  // Shared money breakdown (same helper the invoice and quotes table use).
  const summary = useMemo(
    () => quoteData ? summariseQuote(quoteData) : null,
    [quoteData]
  );

  const { saveBatchAsQuote } = useBatchQuote();

  const handleSave = useCallback(() => {
    if (!quoteData) return;

    // Check if there are items in the batch. 
    // If so, we assume the user wants to save the whole batch.
    if (batchItems.length > 0) {
      try {
        const masterQuote = saveBatchAsQuote();
        onSaveQuote(masterQuote);
        toast.success("Consolidated Batch saved to history!");
        // We don't automatically clear the batch here to let the user decide, 
        // but typically BatchQuoteManager handles clearing.
        return;
      } catch {
        toast.error("Failed to save batch");
      }
    }

    // Standard single quote save
    onSaveQuote(quoteData);
  }, [quoteData, onSaveQuote, batchItems, saveBatchAsQuote]);


  const handlePDF = useCallback(() => {
    if (!quoteData) return;
    try {
      printQuotePDF(quoteData, currency.symbol, conversionRate, currency.code);
      toast.success("PDF opened for printing. Use 'Save as PDF' in print dialog.");
    } catch (error) {
      console.error("PDF error:", error);
      toast.error("Failed to generate PDF. Please allow popups.");
    }
  }, [quoteData, currency.symbol, currency.code, conversionRate]);

  const handleAddToBatch = useCallback(() => {
    if (!quoteData) return;
    addItem(quoteData);
    toast.success(`"${quoteData.projectName || 'Quote'}" added to batch!`);
  }, [quoteData, addItem]);



  if (!quoteData) {
    return (
      <Card className="p-6 shadow-card bg-card border-dashed border-2 border-border">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-base font-semibold text-foreground mb-1">No quote yet</h2>
          <p className="text-sm text-muted-foreground max-w-[220px]">
            Fill in the details and click Calculate Quote.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-elevated bg-card overflow-hidden">
      <div className="bg-primary p-5 text-primary-foreground">
        <h2 className="text-xl font-semibold">Quote Summary</h2>
        <p
          className="text-sm font-medium mt-1 break-words"
          title={quoteData.projectName}
        >
          {quoteData.projectName}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="inline-flex items-center rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-medium">
            {quoteData.printType} Printing
          </span>
          {quoteData.parameters?.materialName && (
            <span className="inline-flex items-center rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-medium">
              {quoteData.parameters.materialName}
            </span>
          )}
          {quoteData.printColour && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-medium"
              title={quoteData.printColour}
            >
              Colour
              <span
                role="img"
                aria-label={`Colour ${quoteData.printColour}`}
                className="w-3.5 h-3.5 rounded-full border border-white/40"
                style={{ backgroundColor: quoteData.printColour.split(';')[0] || quoteData.printColour }}
              />
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Cost breakdown</h3>

          <div className="space-y-3">
            <CostRow label="Material Cost" value={quoteData.materialCost} />
            <CostRow label="Machine Time" value={quoteData.machineTimeCost} />
            {quoteData.electricityCost > 0 && (
              <CostRow label="Electricity" value={quoteData.electricityCost} />
            )}
            {quoteData.laborCost > 0 && (
              <CostRow label="Labor" value={quoteData.laborCost} />
            )}
            {/* Consumables are inside the subtotal but had no row, so the listed lines
                provably did not add up to the subtotal shown underneath them. */}
            {summary && summary.consumablesTotal > 0 && (
              <CostRow label="Consumables" value={summary.consumablesTotal} />
            )}
            {quoteData.overheadCost > 0 && (
              <CostRow label="Overhead" value={quoteData.overheadCost} />
            )}
            {/* `paintingCost && …` rendered a stray "0" under Overhead whenever painting was 0. */}
            {(quoteData.paintingCost ?? 0) > 0 && (
              <CostRow label="Painting (Beta)" value={quoteData.paintingCost} />
            )}
          </div>

          {featureData.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground text-sm">Material breakdown</h3>
                <div className="h-[140px] w-full bg-muted/30 rounded-xl border border-border/50 p-2">
                  <Suspense fallback={<div className="h-full w-full animate-pulse rounded-lg bg-muted/50" />}>
                    <MaterialBreakdownChart data={featureData} />
                  </Suspense>
                </div>
              </div>
            </>
          )}

          <Separator className="my-4" />

          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">Subtotal</span>
            <span className="font-semibold text-foreground tabular-nums">{formatPrice(quoteData.subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Profit Markup</span>
            <span className="font-medium text-foreground tabular-nums">+{formatPrice(quoteData.markup)}</span>
          </div>
          {!!quoteData.minimumTopUp && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Minimum charge top-up</span>
              <span className="font-medium text-foreground tabular-nums">+{formatPrice(quoteData.minimumTopUp)}</span>
            </div>
          )}
          {!!quoteData.discountAmount && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Discount</span>
              <span className="font-medium text-foreground tabular-nums">-{formatPrice(quoteData.discountAmount)}</span>
            </div>
          )}
          {!!quoteData.shippingCost && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span className="font-medium text-foreground tabular-nums">+{formatPrice(quoteData.shippingCost)}</span>
            </div>
          )}

          {quoteData.quantity > 1 && (
            <>
              <Separator className="my-4" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Quantity</span>
                <span className="font-medium text-foreground tabular-nums">{quoteData.quantity} units</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Unit Price</span>
                <span className="font-medium text-foreground tabular-nums">{formatPrice(quoteData.unitPrice)}</span>
              </div>
            </>
          )}

          <div className="bg-accent rounded-lg px-4 py-3.5 !mt-4">
            <div className="flex justify-between items-center gap-3">
              <span className="text-sm text-accent-foreground font-medium">
                {quoteData.quantity > 1 ? `Total (${quoteData.quantity} units)` : 'Total Price'}
              </span>
              <span className="text-3xl font-semibold tabular-nums text-accent-foreground">
                {formatPrice(quoteData.totalPrice)}
              </span>
            </div>
          </div>

          {/* Carbon sits below the money, never inside it. The line is simply absent when the
              footprint could not be computed — an estimate is never worth breaking a quote for. */}
          {quoteData.carbon && (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                Carbon footprint
                <Badge variant="outline" className="text-[11px] font-normal">
                  {quoteData.carbon.grade === "MEASURED" ? "Measured"
                    : quoteData.carbon.grade === "ACTUAL" ? "Actual" : "Estimate"}
                </Badge>
              </span>
              <span className="font-medium text-foreground tabular-nums whitespace-nowrap">
                {formatCarbon(summary?.carbonPerPart ?? quoteData.carbon.kg)}
                {summary?.carbonPerPart !== undefined && (
                  <span className="text-muted-foreground font-normal"> / part</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2.5 pt-2">
          <Button
            onClick={handleSave}
            className="w-full"
          >
            <Save className="w-4 h-4" />
            {batchItems.length > 0 ? `Save Batch (${batchItems.length})` : "Save Quote"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleAddToBatch}
              variant="outline"
              className="w-full"
            >
              <Package className="w-4 h-4" />
              Add to Batch
            </Button>

            <Button
              onClick={() => setIsBatchOpen(true)}
              variant="outline"
              className="w-full"
              disabled={batchItems.length === 0}
            >
              <Package className="w-4 h-4" />
              View Batch {batchItems.length > 0 && `(${batchItems.length})`}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleCopyToClipboard}
              variant="outline"
              className="w-full"
            >
              <Copy className="w-4 h-4" />
              Copy
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                >
                  <Share2 className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuItem onClick={handlePDF} className="cursor-pointer">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                  <Download className="w-4 h-4 mr-2" />
                  Export as Text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <BatchQuoteManager open={isBatchOpen} onOpenChange={setIsBatchOpen} onSaveQuote={onSaveQuote} />
    </Card>
  );
});

QuoteSummary.displayName = "QuoteSummary";

/**
 * One row of the breakdown. `display` renders a value that is not money — the carbon line uses it,
 * because routing kgCO₂e through `formatPrice` would stamp a currency symbol on an emissions figure.
 */
const CostRow = memo(({ label, value, display }: { label: string; value: number; display?: string }) => {
  const { formatPrice } = useCurrency();
  return (
    <div className="flex justify-between text-sm text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground tabular-nums">{display ?? formatPrice(value)}</span>
    </div>
  );
});

CostRow.displayName = "CostRow";

export default QuoteSummary;
