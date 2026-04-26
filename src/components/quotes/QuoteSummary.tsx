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

import { memo, useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Save, FileDown, Package, PieChart as PieChartIcon, Copy, FileSpreadsheet, ChevronDown, Share2 } from "lucide-react";
import { saveAs } from "file-saver";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
  const { currency, formatPrice } = useCurrency();
  const { addItem, batchItems } = useBatchQuote();
  const [isBatchOpen, setIsBatchOpen] = useState(false);


  const handleExport = useCallback(() => {
    if (!quoteData) return;

    const quoteText = `
3D PRINT QUOTE - ${quoteData.printType} Printing
==========================================
Project: ${quoteData.projectName}
Colour: ${quoteData.printColour || "N/A"}

COST BREAKDOWN:
- Material Cost:        ${formatPrice(quoteData.materialCost)}
- Machine Time:         ${formatPrice(quoteData.machineTimeCost)}
- Electricity:          ${formatPrice(quoteData.electricityCost)}
- Labor:                ${formatPrice(quoteData.laborCost)}
- Overhead:             ${formatPrice(quoteData.overheadCost)}

SUBTOTAL:               ${formatPrice(quoteData.subtotal)}
Profit Markup:          ${formatPrice(quoteData.markup)}

==========================================
TOTAL PRICE:            ${formatPrice(quoteData.totalPrice)}
==========================================

Generated: ${new Date().toLocaleString()}
    `.trim();

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

    const quoteText = `
3D PRINT QUOTE - ${quoteData.printType} Printing
==========================================
Project: ${quoteData.projectName}
Colour: ${quoteData.printColour || "N/A"}

COST BREAKDOWN:
- Material Cost:        ${formatPrice(quoteData.materialCost)}
- Machine Time:         ${formatPrice(quoteData.machineTimeCost)}
- Electricity:          ${formatPrice(quoteData.electricityCost)}
- Labor:                ${formatPrice(quoteData.laborCost)}
- Overhead:             ${formatPrice(quoteData.overheadCost)}

SUBTOTAL:               ${formatPrice(quoteData.subtotal)}
Profit Markup:          ${formatPrice(quoteData.markup)}

==========================================
TOTAL PRICE:            ${formatPrice(quoteData.totalPrice)}
==========================================
    `.trim();

    navigator.clipboard.writeText(quoteText);
    toast.success("Quote copied to clipboard!");
  }, [quoteData, formatPrice]);

  const handleExportExcel = useCallback(async () => {
    if (!quoteData) return;

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
        { desc: "COST BREAKDOWN", val: "" },
        { desc: "Material Cost", val: formatPrice(quoteData.materialCost) },
        { desc: "Machine Time", val: formatPrice(quoteData.machineTimeCost) },
        { desc: "Electricity", val: formatPrice(quoteData.electricityCost) },
        { desc: "Labor", val: formatPrice(quoteData.laborCost) },
        { desc: "Overhead", val: formatPrice(quoteData.overheadCost) },
        { desc: "Subtotal", val: formatPrice(quoteData.subtotal) },
        { desc: "Profit Markup", val: formatPrice(quoteData.markup) },
        { desc: "TOTAL PRICE", val: formatPrice(quoteData.totalPrice) },
      ]);

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(7).font = { bold: true };
      worksheet.getRow(15).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `quote-${quoteData.projectName}-${Date.now()}.xlsx`);
      toast.success("Excel file generated!");
    } catch (err) {
      console.error("Excel export failed:", err);
      toast.error("Failed to generate Excel file");
    }
  }, [quoteData, formatPrice]);

  const featureData = quoteData?.featureWeights ? [
    { name: 'Walls', value: quoteData.featureWeights.walls || 0 },
    { name: 'Infill', value: quoteData.featureWeights.infill || 0 },
    { name: 'Supports', value: quoteData.featureWeights.supports || 0 },
    { name: 'Waste', value: quoteData.featureWeights.waste || 0 },
  ].filter(f => f.value > 0).map((f, i) => ({ ...f, colour: CHART_COLORS[i % CHART_COLORS.length] })) : [];

  const COLORS = featureData.map(f => f.colour);

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
      printQuotePDF(quoteData, currency.symbol);
      toast.success("PDF opened for printing. Use 'Save as PDF' in print dialog.");
    } catch (error) {
      console.error("PDF error:", error);
      toast.error("Failed to generate PDF. Please allow popups.");
    }
  }, [quoteData, currency.symbol]);

  const handleAddToBatch = useCallback(() => {
    if (!quoteData) return;
    addItem(quoteData);
    toast.success(`"${quoteData.projectName || 'Quote'}" added to batch!`);
  }, [quoteData, addItem]);



  if (!quoteData) {
    return (
      <Card className="p-6 shadow-card bg-card border-dashed border-2 border-border animate-fade-in">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-gradient-subtle rounded-2xl p-5 mb-5 shadow-card">
            <FileText className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No Quote Yet</h2>
          <p className="text-sm text-muted-foreground max-w-[200px]">
            Fill in the parameters and click Calculate to generate a quote
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-elevated bg-card overflow-hidden animate-scale-in hover-glow">
      <div className="bg-gradient-primary p-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-semibold">Quote Summary</h2>
          </div>
          <p className="text-sm font-medium">{quoteData.printType} Printing</p>
          <p className="text-sm mt-1">Project: {quoteData.projectName}</p>
          {quoteData.parameters?.materialName && (
            <p className="text-sm mt-1">Material: {quoteData.parameters.materialName}</p>
          )}
          {quoteData.printColour && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm">Colour:</span>
              <div
                className="w-5 h-5 rounded-full border-2 border-white/30"
                style={{ backgroundColor: quoteData.printColour.split(';')[0] || quoteData.printColour }}
                title={quoteData.printColour}
              />
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">Cost Breakdown</h3>

          <div className="space-y-3">
            <CostRow label="Material Cost" value={quoteData.materialCost} />
            <CostRow label="Machine Time" value={quoteData.machineTimeCost} />
            {quoteData.electricityCost > 0 && (
              <CostRow label="Electricity" value={quoteData.electricityCost} />
            )}
            {quoteData.laborCost > 0 && (
              <CostRow label="Labor" value={quoteData.laborCost} />
            )}
            {quoteData.overheadCost > 0 && (
              <CostRow label="Overhead" value={quoteData.overheadCost} />
            )}
            {quoteData.paintingCost && quoteData.paintingCost > 0 && (
              <CostRow label="Painting (Beta)" value={quoteData.paintingCost} />
            )}
          </div>

          {featureData.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4">
                <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                  <PieChartIcon className="w-3.5 h-3.5" />
                  Material Breakdown
                </h3>
                <div className="h-[180px] w-full bg-muted/30 rounded-xl border border-border/50 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={featureData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {featureData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))', 
                          borderRadius: 'var(--radius)', 
                          fontSize: '10px' 
                        }}
                        itemStyle={{ fontSize: '10px', padding: '0' }}
                        formatter={(value: number) => [`${value.toFixed(2)}g`, '']}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          <Separator className="my-4" />

          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">Subtotal</span>
            <span className="font-semibold text-foreground">{formatPrice(quoteData.subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Profit Markup</span>
            <span className="font-medium text-foreground">+{formatPrice(quoteData.markup)}</span>
          </div>

          {quoteData.quantity > 1 && (
            <>
              <Separator className="my-4" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Quantity</span>
                <span className="font-medium text-foreground">{quoteData.quantity} units</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Unit Price</span>
                <span className="font-medium text-foreground">{formatPrice(quoteData.unitPrice)}</span>
              </div>
            </>
          )}

          <Separator className="my-4" />

          <div className="bg-gradient-accent rounded-xl p-4 shadow-card">
            <div className="flex justify-between items-center">
              <span className="text-accent-foreground font-semibold">
                {quoteData.quantity > 1 ? `Total (${quoteData.quantity} units)` : 'Total Price'}
              </span>
              <span className="text-2xl font-semibold text-accent-foreground">
                {formatPrice(quoteData.totalPrice)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <Button
            onClick={handleSave}
            className="w-full bg-primary hover:bg-primary/90 transition-all shadow-card hover:shadow-md hover:scale-[1.02] duration-200"
          >
            <Save className="w-4 h-4 mr-2" />
            {batchItems.length > 0 ? `Save Batch (${batchItems.length})` : "Save Quote"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleAddToBatch}
              variant="outline"
              className="w-full hover:scale-[1.02] transition-all duration-200"
            >
              <Package className="w-4 h-4 mr-2" />
              Add to Batch
            </Button>

            <Button
              onClick={() => setIsBatchOpen(true)}
              variant="secondary"
              className="w-full hover:scale-[1.02] transition-all duration-200 font-bold bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
              disabled={batchItems.length === 0}
            >
              <Package className="w-4 h-4 mr-2" />
              View Batch {batchItems.length > 0 && `(${batchItems.length})`}
            </Button>
          </div>



          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleCopyToClipboard}
              variant="outline"
              className="w-full hover:scale-[1.02] transition-all duration-200"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full hover:scale-[1.02] transition-all duration-200"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
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

const CostRow = memo(({ label, value }: { label: string; value: number }) => {
  const { formatPrice } = useCurrency();
  return (
    <div className="flex justify-between text-muted-foreground group">
      <span className="group-hover:text-foreground transition-colors">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{formatPrice(value)}</span>
    </div>
  );
});

CostRow.displayName = "CostRow";

export default QuoteSummary;
