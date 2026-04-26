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
import { QuoteStats } from "@/types/quote";
import { StatsCard } from "./StatsCard";
import { Clock, Weight, Droplets, AlertTriangle } from "lucide-react";

interface ShopAnalysisDashboardProps {
  stats: QuoteStats;
}

export const ShopAnalysisDashboard = memo(({ stats }: ShopAnalysisDashboardProps) => {
  // Fallback values for numerical stability
  const safeTime = Math.max(0, stats.totalPrintTime || 0);
  const safeFilament = Math.max(0, stats.totalFilamentUsed || 0);
  const safeResin = Math.max(0, stats.totalResinUsed || 0);
  const safeFailed = Math.max(0, stats.failedPrintsCount || 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      <StatsCard
        variant="default"
        title="Printer Run Time"
        value={`${safeTime.toFixed(1)}h`}
        subtitle="Cumulative"
        icon={Clock}
      />
      <StatsCard
        variant="default"
        title="Total Filament"
        value={`${safeFilament.toFixed(2)}kg`}
        subtitle="Used (FDM)"
        icon={Weight}
      />
      <StatsCard
        variant="default"
        title="Total Resin"
        value={`${safeResin.toFixed(2)}L`}
        subtitle="Used (Resin)"
        icon={Droplets}
      />
      <StatsCard
        variant="default"
        title="Failed Prints"
        value={safeFailed}
        subtitle="Production Loss"
        icon={AlertTriangle}
      />
    </div>
  );
});

ShopAnalysisDashboard.displayName = "ShopAnalysisDashboard";
