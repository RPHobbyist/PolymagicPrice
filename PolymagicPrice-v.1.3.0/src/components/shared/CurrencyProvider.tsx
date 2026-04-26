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

import { useState, ReactNode } from "react";
import { Currency, CURRENCIES } from "@/types/currency";
import { CurrencyContext } from "@/contexts/CurrencyContext";

interface CurrencyProviderProps {
    children: ReactNode;
}

const STORAGE_KEY = "preferred-currency";

export const CurrencyProvider = ({ children }: CurrencyProviderProps) => {
    const [currency, setCurrencyState] = useState<Currency>(() => {
        // Load from localStorage on initial render
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const found = CURRENCIES.find(c => c.code === saved);
                if (found) return found;
            }
        }
        return CURRENCIES[0]; // Default to INR
    });

    const setCurrency = (newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem(STORAGE_KEY, newCurrency.code);
    };

    const formatPrice = (amount: number): string => {
        return `${currency.symbol}${amount.toFixed(2)}`;
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
            {children}
        </CurrencyContext.Provider>
    );
};
