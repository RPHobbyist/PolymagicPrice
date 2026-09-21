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

import { useState, ReactNode, useCallback, useMemo } from "react";
import { Currency, CURRENCIES } from "@/types/currency";
import { CurrencyContext, CurrencyContextType } from "@/contexts/CurrencyContext";
import {
    makeFormatters,
    resolveLocale,
    CURRENCY_STORAGE_KEY as STORAGE_KEY,
    RATE_STORAGE_KEY,
} from "@/lib/currencyFormat";

interface CurrencyProviderProps {
    children: ReactNode;
}

export const CurrencyProvider = ({ children }: CurrencyProviderProps) => {
    const [currency, setCurrencyState] = useState<Currency>(() => {
        // Load from localStorage on initial render
        try {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const found = CURRENCIES.find(c => c.code === saved);
                    if (found) return found;
                }
            }
        } catch (err) {
            console.warn("[Currency] Could not read the saved currency:", err);
        }
        return CURRENCIES[0]; // Default to INR
    });

    const [conversionRate, setRateState] = useState<number>(() => {
        try {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem(RATE_STORAGE_KEY);
                const parsed = saved !== null ? parseFloat(saved) : NaN;
                // A corrupt value used to yield NaN here, which made EVERY price in the app
                // render as "--" with no explanation and no way to diagnose it.
                if (Number.isFinite(parsed) && parsed > 0) return parsed;
            }
        } catch (err) {
            console.warn("[Currency] Could not read the saved conversion rate:", err);
        }
        return 1.0;
    });

    const setCurrency = (newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        try {
            localStorage.setItem(STORAGE_KEY, newCurrency.code);
        } catch (err) {
            // Storage can be full or blocked (private windows); keep the in-memory choice.
            console.warn("[Currency] Could not persist the selected currency:", err);
        }
    };

    const setConversionRate = (rate: number) => {
        // Reject zero/negative/non-finite rates: they silently zero out or break every price.
        const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
        setRateState(safeRate);
        try {
            localStorage.setItem(RATE_STORAGE_KEY, safeRate.toString());
        } catch (err) {
            console.warn("[Currency] Could not persist the conversion rate:", err);
        }
    };

    const getLocale = useCallback((): string => {
        return resolveLocale(currency.locale);
    }, [currency.locale]);

    // Shared with non-React callers (AI context, reports) so every surface of the
    // app formats and converts money identically.
    const formatters = useMemo(
        () => makeFormatters(currency, conversionRate),
        [currency, conversionRate]
    );

    const formatPrice = useCallback(
        (amount: number): string => formatters.money(amount),
        [formatters]
    );

    const formatNumber = useCallback(
        (value: number, decimals: number = 2): string => formatters.number(value, decimals),
        [formatters]
    );

    const contextValue: CurrencyContextType = {
        currency,
        setCurrency,
        conversionRate,
        setConversionRate,
        formatPrice,
        formatNumber,
        getLocale
    };

    return (
        <CurrencyContext.Provider value={contextValue}>
            {children}
        </CurrencyContext.Provider>
    );
};

