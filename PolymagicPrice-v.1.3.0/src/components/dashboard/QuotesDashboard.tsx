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
import { FileText, TrendingUp, Printer, Clock } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface QuotesDashboardProps {
  stats: QuoteStats;
}

export const QuotesDashboard = memo(({ stats }: QuotesDashboardProps) => {
  const { currency } = useCurrency();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      <StatsCard
        title="Total Quotes"
        value={stats.totalQuotes}
        subtitle={`${stats.recentQuotes} this week`}
        icon={FileText}
      />
      <StatsCard
        title="Total Revenue"
        value={`${currency.symbol}${stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        icon={TrendingUp}
        variant="primary"
      />
      <StatsCard
        title="Avg Quote Value"
        value={`${currency.symbol}${stats.avgQuoteValue.toFixed(0)}`}
        icon={Clock}
      />
      <StatsCard
        title="Print Types"
        value={`${stats.fdmCount}/${stats.resinCount}`}
        subtitle="FDM / Resin"
        icon={Printer}
        variant="accent"
      />
    </div>
  );
});

QuotesDashboard.displayName = "QuotesDashboard";
