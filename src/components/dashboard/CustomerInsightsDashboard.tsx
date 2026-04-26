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
import { Users, TrendingUp, Award, UserCheck } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { sanitize } from "@/lib/sanitization";

interface CustomerInsightsDashboardProps {
  stats: QuoteStats;
}

export const CustomerInsightsDashboard = memo(({ stats }: CustomerInsightsDashboardProps) => {
  const { currency } = useCurrency();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* High-level metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <StatsCard
          variant="default"
          title="Repeat Customer Rate"
          value={`${stats.repeatCustomerRate.toFixed(1)}%`}
          subtitle="Client loyalty metric"
          icon={UserCheck}
        />
        <StatsCard
          variant="default"
          title="Revenue Growth"
          value={`${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}%`}
          subtitle="Last 30 vs Prev. 30 Days"
          icon={TrendingUp}
          trend={{
            value: Math.abs(stats.revenueGrowth),
            isPositive: stats.revenueGrowth >= 0
          }}
        />
      </div>

      {/* Top Customers List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Top Revenue Contributors</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ranked by Value</span>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.topCustomers.length > 0 ? (
            stats.topCustomers.map((customer, index) => (
              <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-amber-100 text-amber-600' : 
                    index === 1 ? 'bg-slate-200 text-slate-600' :
                    index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{sanitize(customer.name)}</div>
                    <div className="text-[11px] font-medium text-slate-500 capitalize">{customer.count} Successful Jobs</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">
                    {currency.symbol}{customer.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Gross Contribution</div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">No customer transaction history available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CustomerInsightsDashboard.displayName = "CustomerInsightsDashboard";
