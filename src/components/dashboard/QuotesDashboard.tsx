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
import { useCurrency } from "@/hooks/useCurrency";

interface QuotesDashboardProps {
  stats: QuoteStats;
}

export const QuotesDashboard = memo(({ stats }: QuotesDashboardProps) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
      <StatsCard
        title="Total Quotes"
        value={stats.totalQuotes}
        subtitle={`${stats.recentQuotes} this week`}
      />
      <StatsCard
        title="Total Revenue"
        value={formatPrice(stats.totalRevenue)}
        subtitle={stats.pipelineValue ? `${formatPrice(stats.pipelineValue)} awaiting approval` : "Approved quotes and later"}
      />
      <StatsCard
        title="Total Profit"
        value={formatPrice(stats.totalProfit)}
        subtitle={`${stats.avgMargin.toFixed(1)}% Margin`}
      />
      <StatsCard
        title="Avg Won Quote"
        value={formatPrice(stats.avgQuoteValue)}
      />
      <StatsCard
        title="Print Types"
        value={`${stats.fdmCount}/${stats.resinCount}`}
        subtitle="FDM / Resin"
      />
    </div>
  );
});

QuotesDashboard.displayName = "QuotesDashboard";
