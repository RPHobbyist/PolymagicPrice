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

import { Suspense, lazy } from "react";
import { ShieldCheck } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BatchQuoteProvider } from "@/contexts/BatchQuoteProvider";
import { ProductionProvider } from "@/contexts/ProductionProvider";
import { NotificationProvider } from "@/contexts/NotificationProvider";
import { IntelligenceProvider } from "@/contexts/IntelligenceProvider";
import { CurrencyProvider } from "@/components/shared/CurrencyProvider";
import { UIProvider } from "@/contexts/UIContext";

import Layout from "./components/layout/Layout";

// Lazy load pages for code splitting
const Index = lazy(() => import("@/pages/Index"));
const Settings = lazy(() => import("@/pages/Settings"));
const BillingAnalysis = lazy(() => import("@/pages/BillingAnalysis"));
const OrderManager = lazy(() => import("@/pages/OrderManager"));
const PrintManager = lazy(() => import("@/pages/PrintManager"));
const CapacityPlanner = lazy(() => import("@/pages/CapacityPlanner"));
const DatabaseManager = lazy(() => import("@/pages/DatabaseManager"));
const Notification = lazy(() => import("@/pages/Notification"));
const ToolGuide = lazy(() => import("@/pages/ToolGuide"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Loading fallback component with better FCP and visual appeal
const PageLoader = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-gradient-glow animate-fade-in">
    <div className="relative flex flex-col items-center max-w-md w-full gap-8">
      {/* Brand representation in loader */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-xl" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-xl animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-primary/20 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground/80">PolymagicPrice</h2>
          <div className="flex gap-1 justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </div>

      {/* Privacy Guarantee during load */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-[10px] text-muted-foreground animate-pulse-soft">
        <ShieldCheck className="w-3 h-3 text-success" />
        <span>Secure Local Processing</span>
      </div>
    </div>
  </div>
);

// Configure QueryClient with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <IntelligenceProvider>
          <UIProvider>
            <CurrencyProvider>
              <BatchQuoteProvider>
                <ProductionProvider>
                  <TooltipProvider>
                    <Sonner />
                    <BrowserRouter>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route element={<Layout />}>
                            <Route path="/" element={<Navigate to="/cost-calculator" replace />} />
                            <Route path="/cost-calculator" element={<Index />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/billing-analysis" element={<BillingAnalysis />} />
                            <Route path="/order-manager" element={<OrderManager />} />
                            <Route path="/print-manager" element={<PrintManager />} />
                            <Route path="/capacity-planner" element={<CapacityPlanner />} />
                            <Route path="/database-manager" element={<DatabaseManager />} />
                            <Route path="/notification" element={<Notification />} />
                            <Route path="/tool-guide" element={<ToolGuide />} />
                            
                            {/* Backward Compatibility Redirects */}
                            <Route path="/calculator" element={<Navigate to="/cost-calculator" replace />} />
                            <Route path="/manage-orders" element={<Navigate to="/order-manager" replace />} />
                            <Route path="/system-database" element={<Navigate to="/database-manager" replace />} />
                            <Route path="/notifications" element={<Navigate to="/notification" replace />} />
                            <Route path="/saved-quotes" element={<Navigate to="/billing-analysis" replace />} />
                            <Route path="/order-management" element={<Navigate to="/order-manager" replace />} />
                            <Route path="/machine-manager" element={<Navigate to="/print-manager" replace />} />
                            <Route path="/database" element={<Navigate to="/database-manager" replace />} />
                            
                            <Route path="*" element={<NotFound />} />
                          </Route>
                        </Routes>
                      </Suspense>
                    </BrowserRouter>
                  </TooltipProvider>
                </ProductionProvider>
              </BatchQuoteProvider>
            </CurrencyProvider>
          </UIProvider>
        </IntelligenceProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
};

export default App;
