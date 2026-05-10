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
import { Database, Printer, Package, Users, Building2, UserCircle, FileCode, Bot, Network, Coins } from "lucide-react";
import MaterialsManager from "@/components/settings/MaterialsManager";

import MachinesManager from "@/components/settings/MachinesManager";
import ConstantsManager from "@/components/settings/ConstantsManager";
import SettingsCRM from "@/components/settings/SettingsCRM";
import SettingsEmployee from "@/components/settings/SettingsEmployee";
import CompanySettings from "@/components/settings/CompanySettings";
import SettingsAI from "@/components/settings/SettingsAI";
import SettingsBridge from "@/components/settings/SettingsBridge";
import SavedProjectsManager from "@/components/settings/SavedProjectsManager";
import CurrencySettings from "@/components/settings/CurrencySettings";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { PageHeader } from "@/components/layout/PageHeader";

const Settings = () => {
  useDocumentSEO({
    title: "Workshop Settings — 3D Printer & Material Configuration",
    description: "Configure your 3D printing workshop in PolymagicPrice. Manage material inventory (FDM/Resin), printer profiles, personnel, and company branding for professional quotes.",
    canonical: "/settings",
    ogTitle: "Workshop Settings & Shop Configuration | PolymagicPrice",
    ogDescription: "Complete workshop management. Configure printers, materials, labor rates, and business details for accurate cost calculation."
  });


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
      <PageHeader 
        title="Settings" 
        subtitle="Workshop Configuration, Personnel, and System Governance"
        actions={null}
      />
      {/* Glow effect */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />


      <main className="container mx-auto px-4 py-8 pb-24 relative space-y-6 max-w-[1600px] flex-1">

        <Card className="shadow-elevated border-border bg-card overflow-hidden animate-fade-in hover-glow">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b border-border pt-6 pb-4 overflow-x-auto scrollbar-none flex justify-start sm:justify-center">
              <TabsList className="bg-secondary p-1.5 rounded-xl flex w-full max-w-[calc(100%-48px)] mx-6 justify-between shadow-sm">
                <TabsTrigger
                  value="materials"
                  className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Package className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Materials
                </TabsTrigger>

                <TabsTrigger
                  value="machines"
                  className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Printer className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Machines
                </TabsTrigger>
                <TabsTrigger
                  value="constants"
                  className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Database className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Consumables
                </TabsTrigger>
                <TabsTrigger
                  value="gcodes"
                  className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <FileCode className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Saved Projects
                </TabsTrigger>
                <TabsTrigger
                  value="customers"
                  className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Users className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Customers
                </TabsTrigger>
                <TabsTrigger
                    value="currency"
                    className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                    <Coins className="w-4 h-4 mr-1.5 sm:mr-2" />
                    Currency
                </TabsTrigger>
                <TabsTrigger
                  value="employees"
                  className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <UserCircle className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Employees
                </TabsTrigger>
                <TabsTrigger
                  value="company"
                  className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Building2 className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Company
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Bot className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Local AI
                </TabsTrigger>
                <TabsTrigger
                  value="bridge"
                  className="flex-1 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card rounded-lg px-3 sm:px-4 py-2.5 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Network className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Polymagic Bridge
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
              <SavedProjectsManager />
            </TabsContent>

            <TabsContent value="customers" className="p-6 mt-0 animate-fade-in">
              <SettingsCRM />
            </TabsContent>

            <TabsContent value="currency" className="p-6 mt-0 animate-fade-in">
              <CurrencySettings />
            </TabsContent>

            <TabsContent value="employees" className="p-6 mt-0 animate-fade-in">
              <SettingsEmployee />
            </TabsContent>

            <TabsContent value="company" className="p-6 mt-0 animate-fade-in">
              <CompanySettings />
            </TabsContent>

            <TabsContent value="ai" className="p-6 mt-0 animate-fade-in">
              <SettingsAI />
            </TabsContent>

            <TabsContent value="bridge" className="p-6 mt-0 animate-fade-in">
              <SettingsBridge />
            </TabsContent>
          </Tabs>
        </Card>

      </main>

    </div >
  );
};

export default Settings;
