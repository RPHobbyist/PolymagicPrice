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
import { Button } from "@/components/ui/button";
import { Calculator, Loader2 } from "lucide-react";

interface QuoteCalculatorProps {
  loading: boolean;
  onCalculate: () => void;
  children: React.ReactNode;
  uploadSection?: React.ReactNode;
}

export const QuoteCalculator = memo(({ loading, onCalculate, children, uploadSection }: QuoteCalculatorProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-muted-foreground">Loading calculator...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {uploadSection}

      <div className="border border-border rounded-xl overflow-hidden shadow-card">
        <div className="divide-y divide-border/50">
          {children}
        </div>
      </div>

      <Button
        onClick={onCalculate}
        className="w-full font-bold shadow-elevated hover:shadow-md hover:scale-[1.02] transition-all duration-200"
        size="lg"
        variant="default"
      >
        <Calculator className="w-5 h-5 mr-2" />
        Calculate Quote
      </Button>
    </div>
  );
});

QuoteCalculator.displayName = "QuoteCalculator";
