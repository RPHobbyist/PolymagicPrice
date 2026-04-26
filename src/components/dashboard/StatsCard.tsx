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
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "accent";
}

export const StatsCard = memo(({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatsCardProps) => {
  const bgClass = {
    default: "bg-card",
    primary: "bg-gradient-primary",
    accent: "bg-gradient-accent",
  }[variant];

  const textClass = variant === "default" ? "text-foreground" : "text-primary-foreground";
  const subtitleClass = variant === "default" ? "text-slate-600" : "text-primary-foreground/80";

  return (
    <Card className={`p-5 ${bgClass} shadow-card hover-lift border-border overflow-hidden relative`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className={`text-sm font-normal ${subtitleClass}`}>{title}</h3>
          <p className={`text-2xl font-semibold ${textClass} tabular-nums`}>{value}</p>
          {subtitle && (
            <p className={`text-xs ${subtitleClass}`}>{subtitle}</p>
          )}
          {trend && (
            <p className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
              <span className="sr-only">{trend.isPositive ? 'Positive trend:' : 'Negative trend:'}</span>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% this week
            </p>
          )}
        </div>
        <div className="flex items-center justify-center">
          <Icon className={cn(
            "w-6 h-6 transition-colors", 
            variant === "default" ? "text-primary" : "text-primary-foreground"
          )} aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
});

StatsCard.displayName = "StatsCard";
