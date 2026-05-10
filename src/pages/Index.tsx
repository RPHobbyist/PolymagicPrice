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

import { useState, useCallback, memo, lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, RotateCcw, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import FDMCalculatorTable from "@/components/calculator/FDMCalculatorTable";
import ResinCalculatorTable from "@/components/calculator/ResinCalculatorTable";
import QuoteSummary from "@/components/quotes/QuoteSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { Link } from "react-router-dom";
import { QuoteData, FDMFormData, ResinFormData } from "@/types/quote";
import { useSavedQuotes } from "@/hooks/useSavedQuotes";
import { useBatchQuote } from "@/hooks/useBatchQuote";
import { parseGcode } from "@/lib/parsers/gcodeParser";
import { calculateFDMQuote, calculateResinQuote } from "@/lib/quoteCalculations";
import { getMaterials, getMachines, getConstants, validateQuoteData } from "@/lib/core/sessionStorage";
import { toast } from "sonner";
import { AIInsights } from "@/components/ai/AIInsights";
import { KanbanSquare } from "lucide-react";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { sanitize, sanitizeObject } from "@/lib/sanitization";
import { SYSTEM_CONFIG } from "@/lib/core/core-system";

const SavedQuotesTable = lazy(() => import("@/components/quotes/SavedQuotesTable"));

interface IncomingGcodeData {
  printType?: string;
  resinVolume?: number;
  machineName?: string;
  printerModel?: string;
  materialName?: string;
  filamentSettingsId?: string;
  printColour?: string;
  name?: string;
  printTime?: number | string;
  filamentWeight?: number | string;
  filePath?: string;
  thumbnail?: string;
  printTimeHours?: number;
  filamentWeightGrams?: number;
  featureWeights?: Record<string, number>;
}

const Index = memo(() => {
  const location = useLocation();

  // --- STATE DECLARATIONS (Moved to top to prevent TDZ ReferenceErrors) ---
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [preFillData, setPreFillData] = useState<Record<string, unknown> | null>(null);
  const [editQuoteId, setEditQuoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("fdm");
  const [resetKey, setResetKey] = useState(0);

  const {
    quotes,
    loading,
    saveQuote,
    deleteQuote,
    updateQuote,
  } = useSavedQuotes();

  // --- HANDLERS ---
  const handleIncomingGcode = useCallback((gcodeData: IncomingGcodeData) => {
    try {
      const type = gcodeData.printType || ((gcodeData.resinVolume || 0) > 0 ? "Resin" : "FDM");
      setActiveTab(type.toLowerCase());

      const materials = getMaterials(type as "FDM" | "Resin");
      const machines = getMachines(type as "FDM" | "Resin");
      const constants = getConstants();

      // Better Matching Logic: Try to find machine and material by name (extracted from file)
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let matchedMachineId = machines[0]?.id || '';
      if (gcodeData.machineName || gcodeData.printerModel) {
        const target = normalize((gcodeData.machineName || gcodeData.printerModel) as string);
        const match = machines.find(m => {
          const name = normalize(m.name);
          return name.includes(target) || target.includes(name);
        });
        if (match) matchedMachineId = match.id;
      }

      let matchedMaterialId = materials[0]?.id || '';
      if (gcodeData.materialName || gcodeData.filamentSettingsId) {
        const target = normalize((gcodeData.materialName || gcodeData.filamentSettingsId) as string);
        const match = materials.find(m => {
          const name = normalize(m.name);
          return name.includes(target) || target.includes(name);
        });
        if (match) matchedMaterialId = match.id;
      }

      // Filter palette strings (semicolons)
      const rawColour = gcodeData.printColour || '';
      const cleanColour = (rawColour && !(rawColour as string).includes(';')) ? rawColour : '-';

      // Transform library item to form data structure for calculation engine
      const baseFormData = {
        projectName: gcodeData.name,
        printColour: cleanColour,
        materialId: matchedMaterialId,
        machineId: matchedMachineId,
        printTime: String(gcodeData.printTime),
        filamentWeight: String(gcodeData.filamentWeight || '0'),
        resinVolume: String(gcodeData.resinVolume || '0'),
        laborHours: '0',
        overheadPercentage: '0',
        markupPercentage: '0',
        quantity: '1',
        selectedConsumableIds: [],
        filePath: gcodeData.filePath
      };

      const material = materials.find(m => m.id === matchedMaterialId) || materials[0];
      const machine = machines.find(m => m.id === matchedMachineId) || machines[0];

      const quote = type === "FDM" 
        ? calculateFDMQuote({
            formData: baseFormData as unknown as FDMFormData,
            material,
            machine,
            electricityRate: constants.find(c => c.id === 'electricity')?.value || 0,
            laborRate: constants.find(c => c.id === 'labor')?.value || 0,
          })
        : calculateResinQuote({
            formData: baseFormData as unknown as ResinFormData,
            material,
            machine,
            electricityRate: constants.find(c => c.id === 'electricity')?.value || 0,
            laborRate: constants.find(c => c.id === 'labor')?.value || 0,
          });

      setQuoteData({
        ...quote,
        printType: type as "FDM" | "Resin",
        thumbnail: gcodeData.thumbnail as string
      });
      
      toast.info(`Imported ${gcodeData.name} with auto-matched settings`);
    } catch (e) {
      console.error("Import failed:", e);
      toast.error("Failed to populate calculator from library");
    }
  }, []);

  useEffect(() => {
    if (location.state?.gcodeData) {
      const gcodeData = location.state.gcodeData;
      const isRevision = !!gcodeData.editQuoteId || !!gcodeData.id;

      setPreFillData(gcodeData as unknown as Record<string, unknown>);
      setEditQuoteId(gcodeData.editQuoteId || null);
      
      if (!isRevision) {
        // Only run the auto-matching logic for NEW file imports
        handleIncomingGcode(gcodeData);
      } else {
        // For revisions, just ensure the tab matches the saved print type
        const type = gcodeData.printType || ((gcodeData.resinVolume || 0) > 0 ? "Resin" : "FDM");
        setActiveTab(type.toLowerCase());
        
        // Populate the results immediately so the "Save/Update" card is visible
        setQuoteData(gcodeData);
      }

      // Clear state after handling to prevent re-populating on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, handleIncomingGcode]);

  useDocumentSEO({
    title: "Cost Calculator — Professional 3D Print Quotation Engine",
    description: "Calculate accurate 3D printing costs for FDM filament and Resin (SLA/DLP). Upload G-code files, auto-calculate material costs, electricity, labor, and generate professional quotes.",
    canonical: "/cost-calculator",
    ogTitle: "Free 3D Printing Price Calculator | FDM & Resin Cost Estimator",
    ogDescription: "Calculate exact 3D printing costs for FDM and Resin. Upload G-code, auto-fill parameters, and generate professional PDF quotes.",
    ogImage: SYSTEM_CONFIG.logo
  });

  const {
    addQuote: addToBatch,
    items: batchItems,
    clear: clearBatch,
    totalPrice: batchTotal
  } = useBatchQuote();


  const handleReset = useCallback(() => {
    setQuoteData(null);
    setPreFillData(null);
    setEditQuoteId(null);
    clearBatch();
    setResetKey(prev => prev + 1);
  }, [clearBatch]);

  const handleSaveQuote = useCallback(async (quote: QuoteData) => {
    if (editQuoteId) {
      await updateQuote(editQuoteId, quote);
      setEditQuoteId(null);
      toast.success("Revision saved successfully!");
    } else {
      await saveQuote(quote);
    }
    handleReset();
  }, [saveQuote, updateQuote, editQuoteId, handleReset]);




  // Handle incoming G-code files via Electron bridge
  useEffect(() => {
    if (!('electronAPI' in window)) return;

    const unsubscribe = window.electronAPI.bridge.onFileReceived(({ filename, content }) => {
      try {
        // Strictly sanitize incoming data from bridge socket
        const safeFilename = sanitize(filename);

        // Pre-calculation Structural Validation for Bridge Metadata
        if (!content || typeof content !== 'string') {
            throw new Error("Bridge delivered invalid slicer metadata payload (expected string)");
        }

        const parsedData = parseGcode(content);
        
        // DEEP LOGIC: Apply the same strict sanitization to the parsed metadata objects
        // and ensure thumbnails are valid image URIs
        if (parsedData.thumbnail) {
            if (!parsedData.thumbnail.startsWith('data:image/') || parsedData.thumbnail.length > 1048576) {
                console.warn("Rejected malformed or oversized thumbnail from bridge");
                parsedData.thumbnail = undefined;
            }
        }

        const gcodeData = sanitizeObject(parsedData) as IncomingGcodeData;
        
        const fdmMaterials = getMaterials('FDM');
        const fdmMachines = getMachines('FDM');
        const constants = getConstants();
        
        const material = fdmMaterials[0];
        const machine = fdmMachines[0];
        const electricityRate = constants.find(c => c.id === 'electricity')?.value || 0.12;
        const laborRate = constants.find(c => c.id === 'labor')?.value || 15;

        if (!material || !machine) {
          toast.error("Bridge Error: Please configure at least one FDM material and machine in settings.");
          return;
        }

        // Map to Form Data
        const formData = {
          projectName: sanitize(safeFilename.replace(/\.gcode$/i, '').substring(0, 100)), // Enforce strict length cap and sanitization
          printTime: (gcodeData.printTimeHours as number).toFixed(2),
          filamentWeight: (gcodeData.filamentWeightGrams as number).toFixed(2),
          markupPercentage: "20",
          quantity: "1",
          materialId: material.id,
          machineId: machine.id,
          priority: "Medium",
          assignedEmployeeId: "",
          selectedConsumableIds: [],
          projectName_custom: safeFilename
        } as Record<string, unknown>;

        // Final Schema Validation before state injection
        if (!validateQuoteData(formData)) {
          throw new Error("Integrated Bridge sent malformed project data. Validation rejected.");
        }

        const calculatedQuote = calculateFDMQuote({
          formData: formData as unknown as FDMFormData,
          material,
          machine,
          electricityRate,
          laborRate,
          consumables: []
        });

        // Set state to trigger UI update
        setQuoteData({
            ...calculatedQuote,
            featureWeights: gcodeData.featureWeights // Now sanitized
        });
        
        // Switch tab to FDM
        setActiveTab("fdm");
        
        toast.success(`Received ${safeFilename} via Polymagic Bridge!`, {
            description: "Quote calculated instantly from slicer data.",
            duration: 5000,
            icon: <Bot className="w-4 h-4 text-indigo-500" />
        });

      } catch (err: unknown) {
        toast.error("Bridge Error: Failed to process incoming file");
        console.error("Bridge Fail:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex-1 bg-background flex flex-col relative">
      <PageHeader 
        title="Cost Calculator" 
        subtitle="Standardized Industrial Quotation Engine"
      />
      {/* Glow effect */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />

      <main className="mx-auto px-4 py-4 pb-20 sm:px-6 lg:px-8 max-w-[1800px] w-full animate-fade-in stagger-1 relative z-10">
        <div className="grid lg:grid-cols-[1fr_380px] gap-4 sm:gap-6">
          {/* Calculator Section */}
          <div className="space-y-6 animate-fade-in">
            <Card className="shadow-elevated border-border bg-card overflow-hidden hover-glow">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b border-border px-3 sm:px-6 pt-4 sm:pt-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <TabsList className="bg-secondary p-1 sm:p-1.5 rounded-xl w-full sm:w-auto">
                    <TabsTrigger
                      value="fdm"
                      className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-6 py-2 sm:py-2.5 transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none"
                    >
                      <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      FDM Printing
                    </TabsTrigger>
                    <TabsTrigger
                      value="resin"
                      className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-6 py-2 sm:py-2.5 transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none"
                    >
                      <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" aria-hidden="true" />
                      Resin Printing
                    </TabsTrigger>
                  </TabsList>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReset}
                    className="h-10 px-4 gap-2 bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm rounded-xl shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm font-semibold">Reset Calculator</span>
                  </Button>
                </div>

                <TabsContent value="fdm" className="p-3 sm:p-6 mt-0 animate-fade-in">
                  <FDMCalculatorTable key={`fdm-${resetKey}`} onCalculate={setQuoteData} preFillData={activeTab === 'fdm' ? preFillData : null} />
                </TabsContent>

                <TabsContent value="resin" className="p-3 sm:p-6 mt-0 animate-fade-in">
                  <ResinCalculatorTable key={`resin-${resetKey}`} onCalculate={setQuoteData} preFillData={activeTab === 'resin' ? preFillData : null} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Quote Summary Section */}
          <div className="lg:sticky lg:top-24 h-fit animate-fade-in stagger-2 space-y-6">
            <QuoteSummary quoteData={quoteData} onSaveQuote={handleSaveQuote} />
            
            {quoteData && (
                <Suspense fallback={<div className="h-40 bg-primary/5 rounded-xl border border-dashed animate-pulse" />}>
                    <AIInsights quoteData={quoteData} />
                </Suspense>
            )}
          </div>
        </div>

        {/* Saved Quotes Section */}
        <div className="mt-10 animate-fade-in stagger-3">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-normal tracking-tight">Recent Quotes</h2>
              <p className="text-sm font-normal text-slate-600">Your recently calculated quotes</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="shadow-sm hover:shadow-md transition-all">
                <Link to="/print-manager">
                  <KanbanSquare className="w-4 h-4 mr-2 text-slate-700" aria-hidden="true" />
                  Print Manager
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                <Link to="/order-manager">
                  <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
                  Order Manager
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/billing-analysis">
                  <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                  View History
                </Link>
              </Button>
            </div>

          </div>

          {loading ? (
            <Card className="p-10 shadow-card">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
                </div>
                <span className="text-slate-600 font-medium">Loading saved quotes...</span>
              </div>
            </Card>
          ) : (
            <Suspense fallback={
              <Card className="p-10 shadow-card">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
                  </div>
                  <span className="text-slate-600 font-medium">Loading component...</span>
                </div>
              </Card>
            }>
              <SavedQuotesTable
                quotes={quotes.slice(0, 5)}
                onDeleteQuote={deleteQuote}
                onUpdateQuote={updateQuote}
              />
              {quotes.length > 5 && (
                <div className="mt-6 flex justify-center">
                  <Button variant="ghost" asChild className="text-primary hover:text-primary/80 hover:bg-primary/5 gap-2 group transition-all duration-200">
                    <Link to="/billing-analysis">
                      <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform duration-300" />
                      View Full History ({quotes.length} total)
                    </Link>
                  </Button>
                </div>
              )}
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
});

Index.displayName = "Index";

export default Index;
