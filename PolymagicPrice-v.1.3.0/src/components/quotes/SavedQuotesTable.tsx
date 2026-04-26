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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, FileSpreadsheet, Edit, Eye, Database, AlertTriangle, Copy, Printer, Search } from "lucide-react";
import { PrintJobDialog } from "@/components/print-management/PrintJobDialog";
import { QuoteData } from "@/types/quote";
import { BambuDevice, PrinterConnection, PrintOptions } from "@/types/printer";
import { toast } from "sonner";
// import ExcelJS from "exceljs"; // Lazy loaded instead
import { saveAs } from "file-saver";
import { useCurrency } from "@/hooks/useCurrency";

// New Hooks & Components
import { useQuotesFilter } from "@/hooks/useQuotesFilter";
import { QuotesToolbar } from "@/components/saved-quotes/QuotesToolbar";
import { QuoteDetailsDialog } from "@/components/saved-quotes/QuoteDetailsDialog";

interface SavedQuotesTableProps {
  quotes: QuoteData[];
  onDeleteQuote: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDuplicateQuote?: (quote: QuoteData) => void;
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
    default: return 'Pending';
  }
};

const getStatusStyle = (status?: string) => {
  switch (status) {
    case 'APPROVED': return 'bg-emerald-100 text-emerald-700';
    case 'PRINTING': return 'bg-blue-100 text-blue-700';
    case 'POST_PROCESSING': return 'bg-amber-100 text-amber-700';
    case 'DONE': return 'bg-green-100 text-green-700';
    case 'DISPATCHED': return 'bg-purple-100 text-purple-700';
    case 'DELIVERED': return 'bg-teal-100 text-teal-700';
    case 'FAILED': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const getPriorityStyle = (priority?: string) => {
  switch (priority) {
    case 'High': return 'bg-red-100 text-red-700';
    case 'Low': return 'bg-slate-100 text-slate-600';
    default: return 'bg-amber-100 text-amber-700'; // Medium
  }
};

const SavedQuotesTable = memo(({ quotes, onDeleteQuote, onUpdateNotes, onDuplicateQuote }: SavedQuotesTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
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

  const exportToExcel = useCallback(async () => {
    if (quotes.length === 0) {
      toast.error("No quotes to export");
      return;
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Quotes");

    worksheet.columns = [
      { header: "S.No", key: "sno", width: 8 },
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
        projectName: quote.projectName,
        clientName: quote.clientName || "",
        printType: quote.printType,
        printColour: quote.printColour,
        materialName: quote.parameters.materialName,
        machineName: quote.parameters.machineName,
        materialCost: formatPrice(quote.materialCost),
        machineTimeCost: formatPrice(quote.machineTimeCost),
        electricityCost: formatPrice(quote.electricityCost),
        laborCost: formatPrice(quote.laborCost),
        consumablesCost: quote.parameters.consumablesTotal ? formatPrice(quote.parameters.consumablesTotal) : formatPrice(0),
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
  }, [quotes, formatPrice]);

  const handleEditClick = useCallback((quote: QuoteData) => {
    setEditingId(quote.id || null);
    setEditNotes(quote.notes || "");
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (editingId !== null) {
      onUpdateNotes(editingId, editNotes);
      setEditingId(null);
      setEditNotes("");
    }
  }, [editingId, editNotes, onUpdateNotes]);

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
            <Database className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">No Saved Quotes</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
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
        <div className="bg-gradient-primary p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Database className="w-5 h-5 text-primary-foreground" />
            <h2 className="text-xl font-bold text-primary-foreground">
              Saved Quotes
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
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12 font-semibold text-foreground">S.No</TableHead>
                <TableHead className="font-semibold text-foreground">Project Name</TableHead>
                <TableHead className="font-semibold text-foreground">Client</TableHead>
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
                  const originalIndex = quotes.findIndex(q => q.id === quote.id);

                  return (
                    <TableRow
                      key={quote.id || index}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{quote.projectName}</TableCell>
                      <TableCell className="text-muted-foreground">{quote.clientName || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${quote.printType === "FDM"
                          ? "bg-primary/10 text-primary"
                          : "bg-accent/10 text-accent"
                          }`}>
                          {quote.printType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(quote.status)}`}>
                          {getStatusLabel(quote.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityStyle(quote.priority)}`}>
                          {quote.priority || 'Medium'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {quote.dueDate ? new Date(quote.dueDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground tabular-nums">
                        {formatPrice(quote.totalPrice)}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm text-muted-foreground" title={quote.notes || ""}>
                        {quote.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingQuote(quote)}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {onDuplicateQuote && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (onDuplicateQuote) onDuplicateQuote(quote);
                              }}
                              className="text-muted-foreground hover:text-success hover:bg-success/10 h-8 w-8"
                              title="Duplicate quote"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          )}

                          {quote.filePath && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSendingQuote(quote)}
                              className="text-muted-foreground hover:text-green-600 hover:bg-green-600/10 h-8 gap-1 px-2"
                              title="Print Plate"
                            >
                              <Printer className="w-4 h-4" />
                              <span className="text-xs font-medium">Print</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(quote)}
                            className="text-muted-foreground hover:text-accent hover:bg-accent/10 h-8 w-8"
                            title="Edit notes"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(quote.id || null)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            title="Delete quote"
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
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
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
            <DialogDescription className="text-muted-foreground">
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
              Edit Notes
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Add additional details or notes for this quote..."
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            className="min-h-[120px] bg-background border-input focus:ring-2 focus:ring-ring"
          />
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
      />

      {/* Print Job Dialog (Bambu Style) */}
      <PrintJobDialog
        open={!!sendingQuote}
        onOpenChange={(open) => !open && setSendingQuote(null)}
        job={{ id: sendingQuote?.id || "temp-job", quote: sendingQuote }}
        machines={printers}
        connections={connections}
        onSend={handleSendFileConfirm}
      />
    </>
  );
});

SavedQuotesTable.displayName = "SavedQuotesTable";

export default SavedQuotesTable;
