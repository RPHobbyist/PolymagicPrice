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

import { memo, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuoteData, QuoteStatus } from "@/types/quote";
import { useCurrency } from "@/hooks/useCurrency";
import { AlertTriangle, History, Edit, Save, X, Share2, FileDown, FileSpreadsheet, Download, ChevronDown, Send, RotateCcw } from "lucide-react";
import { getOrderId } from "@/lib/utils/order-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { printQuotePDF } from "@/lib/pdfGenerator";
import { saveAs } from "file-saver";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useProduction } from "@/hooks/useProduction";

interface QuoteDetailsDialogProps {
    quote: QuoteData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdateQuote?: (id: string, updates: Partial<QuoteData>) => void;
}

export const QuoteDetailsDialog = memo(({ quote, open, onOpenChange, onUpdateQuote }: QuoteDetailsDialogProps) => {
    const { formatPrice, currency } = useCurrency();
    const { jobs, addJob, moveJob } = useProduction();
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<Partial<QuoteData>>({});



    // Reset edit state when quote changes or dialog closes
    useEffect(() => {
        if (quote) {
            setEditData({
                projectName: quote.projectName,
                clientName: quote.clientName,
                materialCost: quote.materialCost,
                machineTimeCost: quote.machineTimeCost,
                electricityCost: quote.electricityCost,
                laborCost: quote.laborCost,
                overheadCost: quote.overheadCost,
                markup: quote.markup,
                failedUnits: quote.failedUnits || 0,
                notes: quote.notes || "",
                status: quote.status || "PENDING",
                priority: quote.priority || "Medium",
                paintingCost: quote.paintingCost || 0,
            });
        }
    }, [quote, open]);

    const handleSave = useCallback(() => {
        if (!quote?.id || !onUpdateQuote) return;

        // Calculate new totals based on overrides
        const subtotal = (editData.materialCost || 0) +
            (editData.machineTimeCost || 0) +
            (editData.electricityCost || 0) +
            (editData.laborCost || 0) +
            (editData.overheadCost || 0) +
            (editData.paintingCost || 0) +
            (quote.parameters?.consumablesTotal || 0);

        const totalPrice = subtotal + (editData.markup || 0);

        onUpdateQuote(quote.id, {
            ...editData,
            subtotal,
            totalPrice,
            // Automatically update unit price based on quantity
            unitPrice: totalPrice / (quote.quantity || 1)
        });

        setIsEditMode(false);
        toast.success("Quote updated and dashboard synced!");
    }, [quote, editData, onUpdateQuote]);

    const handlePDF = useCallback(() => {
        if (!quote) return;
        try {
            printQuotePDF(quote, currency.symbol);
            toast.success("PDF opened for printing");
        } catch {
            toast.error("Failed to generate PDF. Check popups.");
        }
    }, [quote, currency.symbol]);

    const handleExportExcel = useCallback(async () => {
        if (!quote) return;
        try {
            const ExcelJS = (await import("exceljs")).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Quote");

            worksheet.columns = [
                { header: "Description", key: "desc", width: 30 },
                { header: "Details", key: "val", width: 40 },
            ];

            worksheet.addRows([
                { desc: "Project Name", val: quote.projectName },
                { desc: "Order ID", val: getOrderId(quote.id) },
                { desc: "Print Type", val: quote.printType },
                { desc: "Material", val: quote.parameters?.materialName || "-" },
                { desc: "Client", val: quote.clientName || "Valued Customer" },
                { desc: "", val: "" },
                { desc: "COST BREAKDOWN", val: "" },
                { desc: "Material Cost", val: formatPrice(quote.materialCost) },
                { desc: "Machine Time", val: formatPrice(quote.machineTimeCost) },
                { desc: "Electricity", val: formatPrice(quote.electricityCost) },
                { desc: "Labor", val: formatPrice(quote.laborCost) },
                { desc: "Overhead", val: formatPrice(quote.overheadCost) },
                { desc: "Subtotal", val: formatPrice(quote.subtotal) },
                { desc: "Profit Markup", val: formatPrice(quote.markup) },
                { desc: "TOTAL PRICE", val: formatPrice(quote.totalPrice) },
            ]);

            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(7).font = { bold: true };
            worksheet.getRow(15).font = { bold: true };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, `quote-${quote.projectName}-${Date.now()}.xlsx`);
            toast.success("Excel generated!");
        } catch {
            toast.error("Excel export failed");
        }
    }, [quote, formatPrice]);

    const handleExportText = useCallback(() => {
        if (!quote) return;
        const text = `
QUOTE: ${quote.projectName} (${getOrderId(quote.id)})
Project: ${quote.projectName}
Total: ${formatPrice(quote.totalPrice)}
Status: ${quote.status}
        `.trim();
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `quote-${quote.projectName}.txt`;
        a.click();
        toast.success("Text file generated!");
    }, [quote, formatPrice]);

    if (!open || !quote) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-2xl font-black tracking-tight text-foreground font-heading">
                            Quote Details
                        </DialogTitle>
                    </div>

                    <div className="flex items-center gap-2 pr-4">
                        {!isEditMode && (
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-2">
                                            <Share2 className="w-4 h-4" />
                                            Export
                                            <ChevronDown className="w-3 h-3 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handlePDF} className="cursor-pointer">
                                            <FileDown className="w-4 h-4 mr-2" /> Export as PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export as Excel
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleExportText} className="cursor-pointer">
                                            <Download className="w-4 h-4 mr-2" /> Export as Text
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditMode(true)}
                                    className="h-8 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                </Button>

                                {quote?.status === 'APPROVED' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (onUpdateQuote && quote?.id) {
                                                const isReprint = (quote.failedUnits || 0) > 0;
                                                
                                                if (isReprint) {
                                                    onUpdateQuote(quote.id, { status: 'APPROVED', reprintCount: (quote.reprintCount || 0) + 1 });
                                                    const existingJob = jobs.find(j => j.quote.id === quote.id);
                                                    if (existingJob) {
                                                        moveJob(existingJob.id, 'queued', null);
                                                    }
                                                    toast.success("Job queued for reprint!");
                                                } else {
                                                    onUpdateQuote(quote.id, { status: 'APPROVED' });
                                                    const existingJob = jobs.find(j => j.quote.id === quote.id);
                                                    if (!existingJob) {
                                                        addJob(quote);
                                                    }
                                                    toast.success("Order sent to production!");
                                                }
                                            }
                                        }}
                                        className="h-8 gap-2 border-foreground/20 text-foreground hover:bg-foreground hover:text-background transition-all font-black uppercase text-[10px] tracking-widest px-4"
                                    >
                                        {(quote?.failedUnits || 0) > 0 ? <RotateCcw className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                        {(quote?.failedUnits || 0) > 0 ? "Reprint" : "Send to Production"}
                                    </Button>
                                )}
                            </>
                        )}
                        {isEditMode && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditMode(false)}
                                    className="h-8 gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    className="h-8 gap-2 bg-gradient-primary shadow-sm hover:shadow-md transition-all"
                                >
                                    <Save className="w-4 h-4" />
                                    Save
                                </Button>
                            </>
                        )}
                    </div>
                </DialogHeader>

                {quote && (
                    <div className="py-6 space-y-8">
                        {/* Primary Information Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-8 px-1">
                            {/* Row 1: Order ID & Project Name */}
                            <DetailItem label="Order ID" value={getOrderId(quote?.id) || "-"} />
                            
                            {isEditMode ? (
                                <div className="space-y-1.5 col-span-2">
                                    <Label className="text-foreground/40 text-[10px] uppercase font-black tracking-widest pl-0.5">Project Name</Label>
                                    <Input
                                        value={editData.projectName}
                                        onChange={(e) => setEditData({ ...editData, projectName: e.target.value })}
                                        className="h-9 text-base bg-background border-input font-bold"
                                    />
                                </div>
                            ) : (
                                <div className="col-span-2">
                                    <DetailItem label="Project Name" value={quote.projectName || "-"} />
                                </div>
                            )}

                            {/* Row 2: Basic Project Metadata */}
                            <DetailItem label="Print Type" value={quote.printType || "-"} />
                            <DetailItem label="Material" value={quote.parameters?.materialName || "-"} />
                            
                            {isEditMode ? (
                                <div className="space-y-1.5">
                                    <Label className="text-black text-[11px] uppercase font-bold tracking-normal">Client</Label>
                                    <Input
                                        value={editData.clientName}
                                        onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
                                        className="h-9 text-base bg-background border-input font-medium"
                                    />
                                </div>
                            ) : (
                                <DetailItem label="Client" value={quote.clientName || "-"} />
                            )}
                            
                            <div className="space-y-1.5">
                                <span className="text-foreground/40 text-[10px] uppercase font-black tracking-widest block pl-0.5">Colour Palette</span>
                                <div className="flex flex-wrap gap-2">
                                    {(typeof quote.printColour === 'string' && quote.printColour.trim() && !["-", "default", "none", "unknown", "standard"].includes(quote.printColour.toLowerCase().trim())) ? (
                                        quote.printColour.split(';').filter(c => c.trim()).map((colour, idx) => {
                                            const cleanColour = colour.trim();
                                            const isHex = cleanColour.startsWith('#') && /^#([0-9A-F]{3}){1,2}$/i.test(cleanColour);
                                            const isRgb = cleanColour.startsWith('rgb') && /^(rgb|rgba)\(.*\)$/i.test(cleanColour);
                                            const isSafeName = /^[a-z]+$/i.test(cleanColour) && cleanColour.length < 20;
                                            const isValid = isHex || isRgb || isSafeName;

                                            return (
                                                <div key={idx} className="flex items-center gap-2 bg-muted/40 px-2.5 py-1 rounded-full border border-border/50 shadow-sm">
                                                    {isValid && (
                                                        <div
                                                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner"
                                                            style={{ backgroundColor: cleanColour }}
                                                        />
                                                    )}
                                                    <span className="font-black text-foreground text-[10px] uppercase tracking-wider">{cleanColour}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="font-medium text-black opacity-50">-</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Status & Priority (New) */}
                        <div className="grid grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border border-border/50">
                             {isEditMode ? (
                                <>
                                    <div className="space-y-1.5 flex-1">
                                        <Label className="text-foreground/40 text-[10px] uppercase font-black tracking-widest pl-0.5">Status</Label>
                                        <Select 
                                            value={editData.status} 
                                            onValueChange={(val: QuoteStatus) => setEditData({ ...editData, status: val })}
                                        >
                                            <SelectTrigger className="h-10 bg-background font-medium text-sm">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PENDING">Quoted</SelectItem>
                                                <SelectItem value="APPROVED">Approved</SelectItem>
                                                <SelectItem value="PRINTING">Printing</SelectItem>
                                                <SelectItem value="POST_PROCESSING">Post-Processing</SelectItem>
                                                <SelectItem value="DONE">Done</SelectItem>
                                                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                                                <SelectItem value="DELIVERED">Delivered</SelectItem>

                                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <Label className="text-foreground/40 text-[10px] uppercase font-black tracking-widest pl-0.5">Priority</Label>
                                        <Select 
                                            value={editData.priority} 
                                            onValueChange={(val: QuoteData['priority']) => setEditData({ ...editData, priority: val })}
                                        >
                                            <SelectTrigger className="h-10 bg-background font-medium text-sm">
                                                <SelectValue placeholder="Select priority" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Low">Low</SelectItem>
                                                <SelectItem value="Medium">Medium</SelectItem>
                                                <SelectItem value="High">High</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <DetailItem label="Status" value={quote.status === "PENDING" ? "Quoted" : (quote.status || "Quoted")} />
                                    <DetailItem label="Priority" value={quote.priority || "Medium"} />
                                </>
                            )}
                        </div>

                        {/* Cost Breakdown with Overrides */}
                          <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <h3 className="font-black text-foreground/40 text-[10px] uppercase tracking-widest">
                                    Financial Breakdown
                                </h3>
                                {isEditMode && (
                                    <Badge variant="outline" className="text-[10px] text-primary font-bold bg-primary/5 border-primary/20">
                                        Override Mode
                                    </Badge>
                                )}
                            </div>
                            
                            <div className="space-y-1 bg-slate-50/50 p-6 rounded-xl border border-slate-200">
                                <EditableCostRow 
                                    label="Material Cost" 
                                    value={quote.materialCost} 
                                    editValue={editData.materialCost}
                                    isEditMode={isEditMode}
                                    onChange={(val) => setEditData({ ...editData, materialCost: val })}
                                    formatPrice={formatPrice} 
                                />
                                <EditableCostRow 
                                    label="Machine Time" 
                                    value={quote.machineTimeCost} 
                                    editValue={editData.machineTimeCost}
                                    isEditMode={isEditMode}
                                    onChange={(val) => setEditData({ ...editData, machineTimeCost: val })}
                                    formatPrice={formatPrice} 
                                />
                                <EditableCostRow 
                                    label="Electricity" 
                                    value={quote.electricityCost} 
                                    editValue={editData.electricityCost}
                                    isEditMode={isEditMode}
                                    onChange={(val) => setEditData({ ...editData, electricityCost: val })}
                                    formatPrice={formatPrice} 
                                />
                                <EditableCostRow 
                                    label="Labor Cost" 
                                    value={quote.laborCost} 
                                    editValue={editData.laborCost}
                                    isEditMode={isEditMode}
                                    onChange={(val) => setEditData({ ...editData, laborCost: val })}
                                    formatPrice={formatPrice} 
                                />
                                {quote.paintingCost !== undefined && (
                                    <EditableCostRow 
                                        label="Painting (Beta)" 
                                        value={quote.paintingCost} 
                                        editValue={editData.paintingCost}
                                        isEditMode={isEditMode}
                                        onChange={(val) => setEditData({ ...editData, paintingCost: val })}
                                        formatPrice={formatPrice} 
                                    />
                                )}
                                <EditableCostRow 
                                    label="Overhead" 
                                    value={quote.overheadCost} 
                                    editValue={editData.overheadCost}
                                    isEditMode={isEditMode}
                                    onChange={(val) => setEditData({ ...editData, overheadCost: val })}
                                    formatPrice={formatPrice} 
                                />

                                <div className="my-4 h-px bg-border/50" />

                                <CostDetailRow label="Subtotal" value={isEditMode ? ((editData.materialCost || 0) + (editData.machineTimeCost || 0) + (editData.electricityCost || 0) + (editData.laborCost || 0) + (editData.overheadCost || 0) + (editData.paintingCost || 0) + (quote.parameters?.consumablesTotal || 0)) : quote.subtotal} highlight formatPrice={formatPrice} />
                                
                                <EditableCostRow 
                                    label="Profit Markup" 
                                    value={quote.markup} 
                                    editValue={editData.markup}
                                    isEditMode={isEditMode}
                                    onChange={(val) => setEditData({ ...editData, markup: val })}
                                    formatPrice={formatPrice} 
                                />
                            </div>

                            <div className="bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-800">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest block pl-0.5">Grand Total</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-white tabular-nums tracking-tight">
                                                {formatPrice(isEditMode ? ((editData.materialCost || 0) + (editData.machineTimeCost || 0) + (editData.electricityCost || 0) + (editData.laborCost || 0) + (editData.overheadCost || 0) + (editData.paintingCost || 0) + (quote.parameters?.consumablesTotal || 0) + (editData.markup || 0)) : quote.totalPrice)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Quantity</p>
                                            <p className="text-base font-bold text-white">{quote.quantity}x Units</p>
                                        </div>

                                        {isEditMode ? (
                                            <div className="flex items-center gap-2">
                                                <Label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Fail Units</Label>
                                                <Input
                                                    type="number"
                                                    value={editData.failedUnits}
                                                    onChange={(e) => setEditData({ ...editData, failedUnits: parseInt(e.target.value) || 0 })}
                                                    className="w-16 h-8 bg-slate-800 border-slate-700 text-white font-bold text-xs text-center"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                            {(quote.failedUnits || 0) > 0 && (
                                                <div className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1.5 mt-1">
                                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{quote.failedUnits} FAILED</span>
                                                </div>
                                            )}
                                            {(quote.reprintCount || 0) > 0 && (
                                                <div className="bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 flex items-center gap-1.5 mt-1">
                                                    <RotateCcw className="w-3 h-3 text-amber-500" />
                                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{quote.reprintCount}x REPRINT</span>
                                                </div>
                                            )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-black text-xs uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                                Project Notes
                            </h3>
                            {isEditMode ? (
                                <Textarea
                                    value={editData.notes}
                                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                    placeholder="Enter additional project observations..."
                                    className="min-h-[100px] bg-muted/20 border-border focus:ring-primary/20"
                                />
                            ) : (
                                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 text-sm text-black leading-relaxed italic">
                                    {quote.notes || "No special notes recorded for this quote."}
                                </div>
                            )}
                        </div>

                        {/* Batch Contents Section */}
                        {quote.isBatch && quote.batchItems && quote.batchItems.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <h3 className="font-bold text-black text-xs uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm" />
                                    Batch Contents ({quote.batchItems.length} Projects)
                                </h3>
                                <div className="space-y-3">
                                    {quote.batchItems.map((item, idx) => (
                                        <div key={item.id || idx} className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-center hover:bg-primary/10 transition-colors">
                                            <div className="space-y-1">
                                                <p className="font-bold text-black text-sm uppercase tracking-tight">{item.projectName}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                                                    <span>{item.printType}</span>
                                                    <span>•</span>
                                                    <span>{item.parameters?.materialName}</span>
                                                    <span>•</span>
                                                    <span>{item.quantity}x Units</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-black tabular-nums">{formatPrice(item.totalPrice)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-amber-800 leading-tight">
                                        This is a consolidated batch. Sending to production will create <strong>{quote.batchItems.length} separate jobs</strong> in the queue.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Revisions */}
                        {Array.isArray(quote.revisions) && quote.revisions.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <h3 className="font-bold text-black text-xs uppercase tracking-widest flex items-center gap-2">
                                    <History className="w-3.5 h-3.5 text-slate-950" />
                                    Edit History
                                </h3>
                                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-3 custom-scrollbar">
                                    {quote.revisions.slice().reverse().map((rev, idx) => (
                                        <div key={rev.id} className="p-4 rounded-xl bg-muted/20 border border-border/50 flex justify-between items-center group/rev hover:bg-muted/40 transition-colors">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded tracking-tighter">v{quote.revisions!.length - idx}</span>
                                                    <span className="text-[11px] text-slate-500 font-medium">{new Date(rev.timestamp).toLocaleString()}</span>
                                                </div>
                                                {rev.notes && <p className="text-[11px] text-slate-600 italic line-clamp-1">{rev.notes}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-black tabular-nums tracking-tight">{formatPrice(rev.totalPrice)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});

QuoteDetailsDialog.displayName = "QuoteDetailsDialog";

const DetailItem = memo(({ label, value }: { label: string; value: string }) => (
    <div className="space-y-1">
        <span className="text-foreground/40 text-[10px] uppercase font-black tracking-widest block pl-0.5">{label}</span>
        <p className="font-bold text-foreground text-base truncate uppercase tracking-tight" title={value}>{value}</p>
    </div>
));
DetailItem.displayName = "DetailItem";

const EditableCostRow = memo(({ label, value, editValue, isEditMode, onChange, formatPrice }: { 
    label: string, 
    value: number, 
    editValue?: number, 
    isEditMode: boolean, 
    onChange: (val: number) => void,
    formatPrice: (v: number) => string 
}) => (
    <div className="flex justify-between items-center py-2 group/row -mx-4 px-4 rounded-lg transition-colors">
        <span className="text-foreground/60 text-sm font-medium tracking-tight">{label}</span>
        {isEditMode ? (
            <div className="flex items-center gap-2">
                <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    className="w-28 h-9 text-base font-bold text-right pr-3 bg-white border-primary/20 focus:border-primary shadow-sm hover:border-primary/40 transition-all font-mono text-black"
                />
            </div>
        ) : (
            <span className="text-foreground font-black text-base tabular-nums tracking-tight font-mono">
                {formatPrice(value)}
            </span>
        )}
    </div>
));
EditableCostRow.displayName = "EditableCostRow";

const CostDetailRow = memo(({ label, value, highlight, formatPrice }: { label: string; value: number; highlight?: boolean, formatPrice: (val: number) => string }) => {
    return (
        <div className="flex justify-between items-center">
            <span className={cn("text-black font-bold uppercase text-[10px] tracking-widest", highlight && "text-black")}>{label}</span>
            <span className={cn("tabular-nums text-black font-black tracking-tight", highlight ? "text-xl" : "text-base")}>
                {formatPrice(value)}
            </span>
        </div>
    );
});
CostDetailRow.displayName = "CostDetailRow";
