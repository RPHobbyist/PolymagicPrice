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
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    /** What the percentage compares, e.g. "vs last month". */
    label?: string;
  };
}

export const StatsCard = memo(({ title, value, subtitle, trend }: StatsCardProps) => {
  return (
    <Card className="p-5 bg-card shadow-card border-border">
      <div className="space-y-1">
        <h3 className="text-sm font-normal text-slate-600">{title}</h3>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-600">{subtitle}</p>
        )}
        {trend && (
          <p className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
            <span className="sr-only">{trend.isPositive ? 'Positive trend:' : 'Negative trend:'}</span>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}% {trend.label ?? 'this week'}
          </p>
        )}
      </div>
    </Card>
  );
});

StatsCard.displayName = "StatsCard";
