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

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Printer, Package, Users, Building2, UserCircle, Brush, FileCode } from "lucide-react";
import MaterialsManager from "@/components/settings/MaterialsManager";

import MachinesManager from "@/components/settings/MachinesManager";
import ConstantsManager from "@/components/settings/ConstantsManager";
import SettingsExportImport from "@/components/settings/SettingsExportImport";
import SettingsCRM from "@/components/settings/SettingsCRM";
import SettingsEmployee from "@/components/settings/SettingsEmployee";
import CompanySettings from "@/components/settings/CompanySettings";
import GcodeManager from "@/components/settings/GcodeManager";
import { useSearchParams, Link } from "react-router-dom";
import { SYSTEM_CONFIG } from "@/lib/core/core-system";
import { NavLink } from "@/components/layout/NavLink";
import { CurrencySelector } from "@/components/shared/CurrencySelector";
import { PrinterConnectionDialog } from "@/components/printer/PrinterConnectionDialog";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wifi } from "lucide-react";

const Settings = () => {
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);

  const [connectedPrinter, setConnectedPrinter] = useState<{ name?: string; dev_name?: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get("tab") || "materials";

  // Updates URL when tab changes, so on refresh we stay on same tab
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    // Optional: Check if already connected on mount
    if ('electronAPI' in window) {
      // We could add an API to get current connection status if needed
    }
  }, []);
  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Glow effect */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-50 shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">
              <Link to="/" className="hover-lift flex-shrink-0">
                <img src={SYSTEM_CONFIG.logo} alt={SYSTEM_CONFIG.vendor} width={1024} height={1024} className="h-16 max-w-80 w-auto object-contain" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings & Database</h1>
                <p className="text-sm text-muted-foreground">
                  by <a href={SYSTEM_CONFIG.vendorLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{SYSTEM_CONFIG.vendor}</a> • Manage materials, machines, and constants
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 hidden md:flex"
                onClick={() => setShowPrinterDialog(true)}
              >
                <Wifi className="w-4 h-4" />
                {connectedPrinter ? `Connected: ${connectedPrinter.name || connectedPrinter.dev_name}` : "Connect Printer"}
              </Button>
              <CurrencySelector />
              <NavLink to="/">Back to Calculator</NavLink>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-24 relative space-y-6">
        <Card className="shadow-elevated border-border bg-card overflow-hidden animate-fade-in hover-glow">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b border-border px-6 pt-6 pb-4">
              <TabsList className="bg-secondary/50 p-1.5 rounded-xl">
                <TabsTrigger
                  value="materials"
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-5 py-2.5 transition-all duration-200"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Materials
                </TabsTrigger>

                <TabsTrigger
                  value="machines"
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-5 py-2.5 transition-all duration-200"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Machines
                </TabsTrigger>
                <TabsTrigger
                  value="constants"
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-5 py-2.5 transition-all duration-200"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Consumables
                </TabsTrigger>
                <TabsTrigger
                  value="gcodes"
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-5 py-2.5 transition-all duration-200"
                >
                  <FileCode className="w-4 h-4 mr-2" />
                  Saved Projects
                </TabsTrigger>
                <TabsTrigger
                  value="customers"
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-5 py-2.5 transition-all duration-200"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Customers
                </TabsTrigger>
                <TabsTrigger
                  value="employees"
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-5 py-2.5 transition-all duration-200"
                >
                  <UserCircle className="w-4 h-4 mr-2" />
                  Employees
                </TabsTrigger>
                <TabsTrigger
                  value="company"
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-5 py-2.5 transition-all duration-200"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Company
                </TabsTrigger>
              </TabsList>
            </div>


            <TabsContent value="materials" className="p-6 mt-0 animate-fade-in">
              <MaterialsManager />
            </TabsContent>



            <TabsContent value="machines" className="p-6 mt-0 animate-fade-in">
              <MachinesManager />
            </TabsContent>

            <TabsContent value="constants" className="p-6 mt-0 animate-fade-in">
              <ConstantsManager />
            </TabsContent>

            <TabsContent value="gcodes" className="p-6 mt-0 animate-fade-in">
              <GcodeManager />
            </TabsContent>

            <TabsContent value="customers" className="p-6 mt-0 animate-fade-in">
              <SettingsCRM />
            </TabsContent>

            <TabsContent value="employees" className="p-6 mt-0 animate-fade-in">
              <SettingsEmployee />
            </TabsContent>

            <TabsContent value="company" className="p-6 mt-0 animate-fade-in">
              <CompanySettings />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Export/Import Section */}
        <SettingsExportImport />
      </main>

      <PrinterConnectionDialog
        open={showPrinterDialog}
        onOpenChange={setShowPrinterDialog}
        onConnected={setConnectedPrinter}
      />

    </div >
  );
};

export default Settings;
