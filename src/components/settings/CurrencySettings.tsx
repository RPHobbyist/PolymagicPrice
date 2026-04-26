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

import { useCurrency } from "@/hooks/useCurrency";
import { CURRENCIES } from "@/types/currency";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CurrencySettings = () => {
  const { currency, setCurrency } = useCurrency();

  const handleCurrencyCodeChange = (code: string) => {
    const selected = CURRENCIES.find(c => c.code === code);
    if (selected) {
      setCurrency(selected);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section matching other managers */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Currency Settings</h2>
        <p className="text-sm text-slate-600">Manage your workspace's primary display currency.</p>
      </div>

      <div className="grid gap-6 max-w-2xl bg-background/50 p-6 border border-border rounded-xl">
        {/* Currency Selection */}
        <div className="grid gap-2">
          <Label htmlFor="currency-select" className="text-sm font-medium">Display Currency</Label>
          <Select 
            value={currency.code} 
            onValueChange={handleCurrencyCodeChange}
          >
            <SelectTrigger id="currency-select" className="w-full h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary w-6 text-center">{c.symbol}</span>
                    <span>{c.name} ({c.code})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-600">Select the default currency symbol for all pricing and reports.</p>
        </div>
      </div>
    </div>
  );
};

export default CurrencySettings;
