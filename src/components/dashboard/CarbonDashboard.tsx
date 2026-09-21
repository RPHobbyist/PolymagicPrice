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
import { formatCarbon } from "@/lib/carbon/carbonCalculator";
import { Leaf, Package, Gauge, Zap } from "lucide-react";

interface CarbonDashboardProps {
  stats: QuoteStats;
}

/**
 * The shop's footprint, in the same four-card shape as the Shop Analysis strip beside it.
 *
 * Every figure covers work that actually ran: a quote that was priced but never printed emitted
 * nothing, and is reported separately underneath rather than inflating the total.
 */
export const CarbonDashboard = memo(({ stats }: CarbonDashboardProps) => {
  const total = stats.totalCarbonKg;
  const perPart = stats.carbonPerPart;
  const intensity = stats.carbonPerKg;
  const energyShare = stats.carbonEnergyShare;

  const dash = "—";

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          variant="default"
          title="Total Footprint"
          value={total !== undefined ? formatCarbon(total) : dash}
          subtitle="Completed work"
          icon={Leaf}
        />
        <StatsCard
          variant="default"
          title="Per Part"
          value={perPart !== undefined ? formatCarbon(perPart) : dash}
          subtitle="Average, estimated"
          icon={Package}
        />
        <StatsCard
          variant="default"
          title="Carbon Intensity"
          value={intensity !== undefined ? intensity.toFixed(1) : dash}
          subtitle="kgCO₂e per kg printed"
          icon={Gauge}
        />
        <StatsCard
          variant="default"
          title="Energy vs Material"
          value={energyShare !== undefined
            ? `${Math.round(energyShare * 100)}% / ${100 - Math.round(energyShare * 100)}%`
            : dash}
          subtitle="Share of the total"
          icon={Zap}
        />
      </div>

      {stats.quotedNotPrintedKg !== undefined && (
        <p className="text-xs text-slate-600">
          A further {formatCarbon(stats.quotedNotPrintedKg)} sits in quotes that have not been printed.
          Estimates only — see the Tool Guide for what they cover.
        </p>
      )}
    </div>
  );
});

CarbonDashboard.displayName = "CarbonDashboard";
