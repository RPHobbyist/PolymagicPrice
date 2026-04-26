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
import { memo } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Trash2, Save, FileSpreadsheet } from "lucide-react";
import { useBatchQuote } from "@/hooks/useBatchQuote";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { saveAs } from "file-saver";
import { saveQuote } from "@/lib/core/sessionStorage";
import { QuoteData } from "@/types/quote";

interface BatchQuoteManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaveQuote?: (quote: QuoteData) => void;
}

export const BatchQuoteManager = memo(({ open, onOpenChange, onSaveQuote }: BatchQuoteManagerProps) => {
    const { batchItems, batchTotals, removeItem, clearBatch, saveBatchAsQuote } = useBatchQuote();
    const { formatPrice } = useCurrency();

    const handleClearBatch = () => {
        clearBatch();
        toast.success("Batch cleared");
    };

    const handleSaveBatch = () => {
        const masterQuote = saveBatchAsQuote();
        if (masterQuote) {
            if (onSaveQuote) {
                // Use the passed callback to ensure UI state (Index/useSavedQuotes) updates
                onSaveQuote(masterQuote);
            } else {
                // Fallback direct save
                saveQuote(masterQuote);
                toast.success("Batch saved to history!");
            }
            clearBatch();
            onOpenChange(false);
        }
    };


    const handleExportBatchExcel = async () => {
        if (batchItems.length === 0) return;
        
        try {
            const ExcelJS = (await import("exceljs")).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Batch Quote Export");

            worksheet.columns = [
                { header: "Project Name", key: "projectName", width: 25 },
                { header: "Type", key: "type", width: 10 },
                { header: "Quantity", key: "qty", width: 10 },
                { header: "Material Cost", key: "matCost", width: 15 },
                { header: "Machine Cost", key: "machCost", width: 15 },
                { header: "Total Price", key: "total", width: 15 },
            ];

            batchItems.forEach(item => {
                worksheet.addRow({
                    projectName: item.projectName,
                    type: item.printType,
                    qty: item.quantity,
                    matCost: formatPrice(item.materialCost * item.quantity),
                    machCost: formatPrice(item.machineTimeCost * item.quantity),
                    total: formatPrice(item.totalPrice)
                });
            });

            worksheet.addRow({});
            worksheet.addRow({
                projectName: "BATCH TOTALS",
                qty: batchTotals.totalQuantity,
                total: formatPrice(batchTotals.grandTotal)
            });

            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(worksheet.rowCount).font = { bold: true };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, `batch-quote-${Date.now()}.xlsx`);
            toast.success("Batch Excel generated!");
        } catch {
            toast.error("Excel export failed");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] bg-card border-border shadow-elevated p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-4 bg-slate-50 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div>
                                <DialogTitle className="text-xl font-bold text-slate-900">Batch Quote Manager</DialogTitle>
                                <DialogDescription className="text-slate-500 text-sm mt-0.5">
                                    Manage multiple quotes as a single production batch
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleExportBatchExcel}
                                className="h-8 gap-2 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                <span className="hidden sm:inline">Export Batch</span>
                            </Button>
                            <Badge variant="secondary" className="bg-slate-200 text-slate-700 font-bold px-3 py-1">
                                {batchItems.length} Items
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                {batchItems.length > 0 ? (
                    <>
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-3">
                                {batchItems.map((item, idx) => (
                                    <div 
                                        key={item.id || idx} 
                                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-primary/30 transition-all group shadow-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors">
                                                    {item.projectName || "Unnamed Project"}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded tracking-tighter">
                                                        {item.printType}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {item.quantity} units × {formatPrice(item.unitPrice)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-slate-900 tabular-nums">
                                                {formatPrice(item.totalPrice)}
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => removeItem(idx)}
                                                className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/5"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="p-6 bg-slate-50 border-t space-y-4">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                <TotalRow label="Client" value={batchItems[0]?.clientName || "Valued Customer"} />
                                <TotalRow label="Total Items" value={batchTotals.totalItems.toString()} />
                                <TotalRow label="Total Quantity" value={batchTotals.totalQuantity.toString()} />
                                <TotalRow label="Material Cost" value={formatPrice(batchTotals.totalMaterialCost)} />
                                <TotalRow label="Production Cost" value={formatPrice(batchTotals.totalMachineTimeCost + batchTotals.totalLaborCost)} />
                                <div className="col-span-2 pt-2 pb-1">
                                    <Separator />
                                </div>
                                <div className="col-span-2 flex justify-between items-center py-1">
                                    <span className="text-lg font-bold text-slate-900">Batch Grand Total</span>
                                    <span className="text-2xl font-black text-primary tracking-tight">
                                        {formatPrice(batchTotals.grandTotal)}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant="outline" 
                                    onClick={handleClearBatch}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Clear
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={handleSaveBatch}
                                    className="border-primary/20 text-primary hover:bg-primary/5 font-bold w-full"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Save as Quote
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                        <div className="bg-slate-100 p-6 rounded-full mb-4">
                            <Package className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Empty Batch</h3>
                        <p className="text-slate-500 text-sm mt-2 max-w-[280px]">
                            Add items from the calculator to create a production batch.
                        </p>
                        <Button 
                            variant="outline" 
                            onClick={() => onOpenChange(false)} 
                            className="mt-6 border-slate-200 font-bold"
                        >
                            Return to Calculator
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});

BatchQuoteManager.displayName = "BatchQuoteManager";

const TotalRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="font-bold text-slate-900 tabular-nums">{value}</span>
    </div>
);
