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

import { useState, memo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit, Eye, Database, AlertTriangle, Printer, FileSpreadsheet, Search, Send, RotateCcw } from "lucide-react";
import { PrintJobDialog } from "@/components/print-management/PrintJobDialog";
import { QuoteData } from "@/types/quote";
import { getOrderId } from "@/lib/utils/order-utils";
import { BambuDevice, PrinterConnection, PrintOptions } from "@/types/printer";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { useCurrency } from "@/hooks/useCurrency";
import { sanitize } from "@/lib/sanitization";

// New Hooks & Components
import { useQuotesFilter } from "@/hooks/useQuotesFilter";
import { QuotesToolbar } from "@/components/saved-quotes/QuotesToolbar";
import { QuoteDetailsDialog } from "@/components/saved-quotes/QuoteDetailsDialog";
import { useProduction } from "@/hooks/useProduction";

interface SavedQuotesTableProps {
  quotes: QuoteData[];
  onDeleteQuote: (id: string) => void;
  onUpdateQuote: (id: string, updates: Partial<QuoteData>) => void;
}

// Status helper functions
const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'APPROVED': return 'Approved';
    case 'PRINTING': return 'Printing';
    case 'POST_PROCESSING': return 'Post-Processing';
    case 'DONE': return 'Done';
    case 'DISPATCHED': return 'Dispatched';
    case 'DELIVERED': return 'Delivered';
    case 'FAILED': return 'Failed';
    case 'CANCELLED': return 'Cancelled';
    default: return 'Quoted';
  }
};


const SavedQuotesTable = memo(({ quotes, onDeleteQuote, onUpdateQuote }: SavedQuotesTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editFailedUnits, setEditFailedUnits] = useState<number | "">(0);
  const [viewingQuote, setViewingQuote] = useState<QuoteData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sendingQuote, setSendingQuote] = useState<QuoteData | null>(null);
  const [printers, setPrinters] = useState<BambuDevice[]>([]);
  const [connections, setConnections] = useState<Record<string, PrinterConnection>>({});

  // Use Custom Hook for Filtering & Sorting
  const {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortOrder,
    setSortOrder,
    filteredAndSortedQuotes
  } = useQuotesFilter(quotes);

  const fetchPrinters = useCallback(async () => {
    if ('electronAPI' in window) {
      try {
        const devices = await window.electronAPI.bambu.getDevices();
        // Ensure id property exists for BambuDevice interface compatibility
        const mappedDevices = devices.map((d: Partial<BambuDevice> & { dev_id?: string }) => ({ ...d, id: d.dev_id || d.id } as BambuDevice));
        setPrinters(mappedDevices);
        const conns = await window.electronAPI.printer.getConnectedPrinters();
        const connMap = conns.reduce((acc: Record<string, PrinterConnection>, c: PrinterConnection) => ({ ...acc, [c.serial]: c }), {});
        setConnections(connMap);
      } catch (e) {
        console.error("Failed to fetch printers", e);
      }
    }
  }, []);

  useEffect(() => {
    if (sendingQuote) {
      fetchPrinters();
    }
  }, [sendingQuote, fetchPrinters]);

  const handleSendFileConfirm = async (machineId: string, fileOrPath: File | string, options: PrintOptions) => {
    const conn = connections[machineId];
    if (!conn) {
      toast.error("Printer not connected");
      return;
    }

    try {
      const filePath = typeof fileOrPath === 'string' ? fileOrPath : (fileOrPath as File & { path: string }).path;

      toast.info("Uploading file...");
      await window.electronAPI.printer.sendFile({ ip: conn.ip, filePath });

      toast.info(`Starting print...`);
      await window.electronAPI.printer.startPrint({ ip: conn.ip, fileName: filePath, options });

      toast.success("Print started successfully!");
      setSendingQuote(null);
    } catch (error) {
      const err = error as Error;
      console.error(err);
      toast.error(`Error: ${err.message}`);
    }
  };

  const { currency, formatPrice } = useCurrency();
  const { jobs, addJob, moveJob } = useProduction();



  const exportToExcel = useCallback(async () => {
    if (quotes.length === 0) {
      toast.error("No quotes to export");
      return;
    }

    try {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Quotes");

        worksheet.columns = [
      { header: "S.No", key: "sno", width: 8 },
      { header: "Order ID", key: "orderId", width: 12 },
      { header: "Project Name", key: "projectName", width: 25 },
      { header: "Client", key: "clientName", width: 20 },
      { header: "Print Type", key: "printType", width: 12 },
      { header: "Colour", key: "printColour", width: 15 },
      { header: "Material", key: "materialName", width: 20 },
      { header: "Machine", key: "machineName", width: 20 },
      { header: "Material Cost", key: "materialCost", width: 15 },
      { header: "Machine Cost", key: "machineTimeCost", width: 15 },
      { header: "Electricity", key: "electricityCost", width: 15 },
      { header: "Labor", key: "laborCost", width: 15 },
      { header: "Consumables", key: "consumablesCost", width: 15 },
      { header: "Overhead", key: "overheadCost", width: 15 },
      { header: "Subtotal", key: "subtotal", width: 15 },
      { header: "Markup", key: "markup", width: 15 },
      { header: "Total Price", key: "totalPrice", width: 15 },
      { header: "Notes", key: "notes", width: 30 },
      { header: "Date", key: "createdAt", width: 20 },
    ];

    quotes.forEach((quote, index) => {
      worksheet.addRow({
        sno: index + 1,
        orderId: getOrderId(quote.id),
        projectName: quote.projectName,
        clientName: quote.clientName || "",
        printType: quote.printType,
        printColour: quote.printColour,
        materialName: quote.parameters?.materialName || "-",
        machineName: quote.parameters?.machineName || "-",
        materialCost: formatPrice(quote.materialCost),
        machineTimeCost: formatPrice(quote.machineTimeCost),
        electricityCost: formatPrice(quote.electricityCost),
        laborCost: formatPrice(quote.laborCost),
        consumablesCost: quote.parameters?.consumablesTotal ? formatPrice(quote.parameters.consumablesTotal) : formatPrice(0),
        overheadCost: formatPrice(quote.overheadCost),
        subtotal: formatPrice(quote.subtotal),
        markup: formatPrice(quote.markup),
        totalPrice: formatPrice(quote.totalPrice),
        notes: quote.notes || "",
        createdAt: quote.createdAt ? new Date(quote.createdAt).toLocaleString() : "",
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `3d-print-quotes-${Date.now()}.xlsx`);

    toast.success("Quotes exported to Excel!");
    } catch (err) {
        console.error("Excel Export Failed:", err);
        toast.error("Failed to generate Excel file. Please check your connection or reload the app.");
    }
  }, [quotes, formatPrice]);

  const handleEditClick = useCallback((quote: QuoteData) => {
    setEditingId(quote.id || null);
    setEditNotes(quote.notes || "");
    setEditFailedUnits(quote.failedUnits ?? 0);
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (editingId !== null) {
      if (onUpdateQuote) {
        onUpdateQuote(editingId, { 
          notes: editNotes, 
          failedUnits: editFailedUnits === "" ? 0 : editFailedUnits 
        });
      }
      setEditingId(null);
      setEditNotes("");
      setEditFailedUnits(0);
    }
  }, [editingId, editNotes, editFailedUnits, onUpdateQuote]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId !== null) {
      onDeleteQuote(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, onDeleteQuote]);

  if (quotes.length === 0) {
    return (
      <Card className="p-10 shadow-card bg-card border-dashed border-2 border-border animate-fade-in">
        <div className="flex flex-col items-center justify-center text-center gap-5">
          <div className="p-5 bg-gradient-subtle rounded-2xl shadow-card">
            <Database className="w-10 h-10 text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">No Quote History</h2>
            <p className="text-sm text-slate-600 mt-2 max-w-sm">
              Calculate and save quotes to see them here.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-elevated bg-card overflow-hidden border-border animate-fade-in">
        <div className="bg-primary p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Database className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">
              History
              <span className="ml-2 text-sm font-normal opacity-75">
                ({filteredAndSortedQuotes.length} / {quotes.length})
              </span>
            </h2>
          </div>
          <Button
            onClick={exportToExcel}
            variant="secondary"
            size="sm"
            className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 shadow-card whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {/* New Quotes Toolbar */}
        <QuotesToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType}
          setFilterType={setFilterType}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100 hover:bg-slate-100">
                <TableHead className="w-12 font-semibold text-foreground">S.No</TableHead>
                <TableHead className="w-24 font-semibold text-foreground">Order ID</TableHead>
                <TableHead className="font-semibold text-foreground">Project Name</TableHead>
                <TableHead className="font-semibold text-foreground">Client Name</TableHead>
                <TableHead className="font-semibold text-foreground">Type</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground">Priority</TableHead>
                <TableHead className="font-semibold text-foreground">Due Date</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Total ({currency.symbol})</TableHead>
                <TableHead className="font-semibold text-foreground">Notes</TableHead>
                <TableHead className="w-36 font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedQuotes.length > 0 ? (
                filteredAndSortedQuotes.map((quote, index) => {
                  return (
                    <TableRow
                      key={quote.id || index}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <TableCell className="font-medium text-black">{index + 1}</TableCell>
                      <TableCell className="font-normal text-black uppercase tracking-tight">
                        {getOrderId(quote.id)}
                      </TableCell>
                      <TableCell className="text-foreground font-medium max-w-[200px] break-words whitespace-normal leading-tight" title={quote.projectName}>
                        <div className="flex flex-col gap-1">
                          {quote.isBatch && (
                            <Badge variant="outline" className="w-fit text-[9px] h-4 bg-primary/5 text-primary border-primary/30 uppercase font-normal tracking-tighter px-1.5">
                              Batch ({quote.batchItems?.length || 0} items)
                            </Badge>
                          )}
                          <span className="truncate">
                            {sanitize(quote.projectName.length > 30 ? quote.projectName.substring(0, 30) + "..." : quote.projectName)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-black max-w-[200px] break-words whitespace-normal leading-tight" title={quote.clientName || ""}>
                        {sanitize((quote.clientName || "-").length > 30 ? (quote.clientName || "").substring(0, 30) + "..." : (quote.clientName || "-"))}
                      </TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-bold",
                            quote.printType === "FDM" ? "bg-primary/10 text-primary" : "bg-purple-500/10 text-purple-600"
                          )}>
                            {quote.printType}
                          </span>
                        </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-bold",
                          quote.status === "DONE" || quote.status === "APPROVED" || quote.status === "DELIVERED" ? "bg-emerald-100/80 text-emerald-700" :
                          quote.status === "PRINTING" || quote.status === "POST_PROCESSING" || quote.status === "DISPATCHED" ? "bg-primary/10 text-primary" :
                          quote.status === "FAILED" ? "bg-red-100/80 text-red-700" : "bg-amber-100/80 text-amber-700"
                        )}>
                          {getStatusLabel(quote.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-bold",
                          quote.priority === "High" ? "bg-red-100/80 text-red-700" :
                          quote.priority === "Low" ? "bg-slate-100 text-slate-600" : "bg-amber-100/80 text-amber-700"
                        )}>
                          {quote.priority || 'Medium'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-black">
                        {quote.dueDate ? new Date(quote.dueDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground tabular-nums">
                        {formatPrice(quote.totalPrice)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm" title={quote.notes || ""}>
                        <div className="flex flex-col gap-1">
                          {(quote.failedUnits || 0) > 0 && (
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100/80 text-red-700 flex items-center gap-1 w-fit animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {quote.failedUnits} FAILED
                            </span>
                          )}
                          <span className="text-black">
                            {quote.notes || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingQuote(quote)}
                            className="text-black hover:text-primary hover:bg-primary/10 h-8 w-8"
                            title="View details"
                            aria-label="View quote details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={quote.status !== 'APPROVED'}
                            onClick={() => {
                                if (onUpdateQuote && quote.id) {
                                    const isReprint = quote.status === 'FAILED' || (quote.failedUnits || 0) > 0;
                                    
                                    if (isReprint) {
                                        // 1. Clear failed units and approve
                                        onUpdateQuote(quote.id, { status: 'APPROVED', reprintCount: (quote.reprintCount || 0) + 1 });
                                        
                                        // 2. Reset production job if it exists
                                        const existingJob = jobs.find(j => j.quote.id === quote.id);
                                        if (existingJob) {
                                            moveJob(existingJob.id, 'queued', null);
                                        }
                                        
                                        toast.success("Job queued for reprint!");
                                    } else {
                                        // 1. Move status to approved
                                        onUpdateQuote(quote.id, { status: 'APPROVED' });
                                        
                                        // 2. Create production job if it doesn't exist
                                        const existingJob = jobs.find(j => j.quote.id === quote.id);
                                        if (!existingJob) {
                                            addJob(quote);
                                        }
                                        
                                        toast.success("Quote sent to production queue!");
                                    }
                                }
                            }}
                            className={cn(
                                "h-8 w-8 transition-all hover:bg-primary/10",
                                !['PENDING', 'FAILED'].includes(quote.status || '') && (quote.failedUnits || 0) === 0
                                    ? "text-slate-300 cursor-not-allowed" 
                                    : "text-black hover:text-primary"
                            )}
                            title={quote.status === 'FAILED' || (quote.failedUnits || 0) > 0 ? "Reprint Failed Job" : "Send to Production"}
                            aria-label={quote.status === 'FAILED' || (quote.failedUnits || 0) > 0 ? "Reprint order" : "Send to production"}
                          >
                            {quote.status === 'FAILED' || (quote.failedUnits || 0) > 0 ? <RotateCcw className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                          </Button>

                          {quote.filePath && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSendingQuote(quote)}
                              className="text-slate-600 hover:text-green-600 hover:bg-green-600/10 h-8 gap-1 px-2"
                              title="Print Plate"
                              aria-label="Print plate to machine"
                            >
                              <Printer className="w-4 h-4" />
                              <span className="text-xs font-medium">Print</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(quote)}
                            className="text-black hover:text-accent hover:bg-accent/10 h-8 w-8"
                            title="Edit notes"
                            aria-label="Edit quote notes"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(quote.id || null)}
                            className="text-black hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            title="Delete quote"
                            aria-label="Delete quote"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>

                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-600">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>No quotes match your search filters.</p>
                      <Button variant="link" onClick={() => { setSearchQuery(""); setFilterType("all"); }}>
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table >
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Are you sure you want to delete this quote?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Edit Notes Dialog */}
      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Edit Project Records
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="failed-units" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Production Loss (Failed Units)
              </Label>
              <Input
                id="failed-units"
                type="number"
                min="0"
                placeholder="0"
                value={editFailedUnits}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== "" && parseInt(val) < 0) return;
                  setEditFailedUnits(val === "" ? "" : parseInt(val) || 0);
                }}
                className="bg-background border-input"
              />
              <p className="text-[10px] text-slate-600 italic">
                Record units that failed during printing. These will be added to the dashboard stats.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                General Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add additional details or notes for this quote..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="min-h-[100px] bg-background border-input focus:ring-2 focus:ring-ring"
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} className="bg-gradient-primary text-primary-foreground">
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Use QuoteDetailsDialog Component */}
      <QuoteDetailsDialog
        quote={viewingQuote}
        open={viewingQuote !== null}
        onOpenChange={(open) => !open && setViewingQuote(null)}
        onUpdateQuote={onUpdateQuote}
      />

      {/* Print Job Dialog (Bambu Style) */}
      <PrintJobDialog
        open={!!sendingQuote}
        onOpenChange={(open) => !open && setSendingQuote(null)}
        job={{ id: sendingQuote?.id || "temp-job", quote: sendingQuote }}
        machines={printers}
        connections={connections}
        onSend={(machineId, jobId, fileOrPath, options) => handleSendFileConfirm(machineId, fileOrPath, options)}
      />
    </>
  );
});

SavedQuotesTable.displayName = "SavedQuotesTable";

export default SavedQuotesTable;
