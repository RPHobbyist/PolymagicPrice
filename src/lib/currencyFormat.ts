/*
 * PolymagicPrice - Currency formatting primitives
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

import { Currency, CURRENCIES } from "@/types/currency";

export const CURRENCY_STORAGE_KEY = "preferred-currency";
export const RATE_STORAGE_KEY = "conversion-rate";

/**
 * Money/number formatting decoupled from React, so non-component callers
 * (the AI context builder, report generation) format exactly like the UI does.
 */
export interface ContextFormatters {
    money: (amount: number) => string;
    number: (value: number, decimals?: number) => string;
    currencyCode: string;
    currencySymbol: string;
    conversionRate: number;
}

/**
 * Returns the user's browser/OS locale (respects Windows Region/Language settings).
 * Falls back to the currency's default locale if navigator.language is unavailable.
 */
export function resolveLocale(currencyLocale: string): string {
    if (typeof navigator !== "undefined" && navigator.language) {
        return navigator.language;
    }
    return currencyLocale;
}

/**
 * Reads the currency preferences straight from storage.
 * For components prefer `useCurrency()`; this exists for plain modules.
 */
export function readCurrencyPrefs(): { currency: Currency; conversionRate: number } {
    let currency = CURRENCIES[0];
    let conversionRate = 1.0;

    try {
        if (typeof window !== "undefined") {
            const savedCode = localStorage.getItem(CURRENCY_STORAGE_KEY);
            if (savedCode) {
                const found = CURRENCIES.find(c => c.code === savedCode);
                if (found) currency = found;
            }

            const savedRate = localStorage.getItem(RATE_STORAGE_KEY);
            const parsed = savedRate !== null ? parseFloat(savedRate) : NaN;
            if (Number.isFinite(parsed) && parsed > 0) conversionRate = parsed;
        }
    } catch (err) {
        console.warn("[Currency] Could not read stored currency preferences:", err);
    }

    return { currency, conversionRate };
}

/**
 * Builds the formatter pair used by both CurrencyProvider and non-React callers.
 * Amounts are multiplied by the conversion rate exactly once, here.
 */
export function makeFormatters(currency: Currency, conversionRate: number): ContextFormatters {
    const locale = resolveLocale(currency.locale);

    /*
     * Build each formatter once and keep it.
     *
     * `Intl.NumberFormat` is expensive to construct — it resolves locale data every time — and
     * these were being constructed inside the functions, so a quote table paid for one per money
     * cell per render. The two-decimal case covers money and the default `number()` call; other
     * precisions are cached on first use, since `number()` takes a `decimals` argument.
     */
    const twoDecimals = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const byPrecision = new Map<number, Intl.NumberFormat>([[2, twoDecimals]]);
    const formatterFor = (decimals: number): Intl.NumberFormat => {
        let formatter = byPrecision.get(decimals);
        if (!formatter) {
            formatter = new Intl.NumberFormat(locale, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
            byPrecision.set(decimals, formatter);
        }
        return formatter;
    };

    const money = (amount: number): string => {
        if (amount === undefined || amount === null || isNaN(amount) || !isFinite(amount)) {
            return `${currency.symbol} --`;
        }

        const converted = amount * conversionRate;
        if (isNaN(converted) || !isFinite(converted)) return `${currency.symbol} --`;

        return `${currency.symbol}${twoDecimals.format(converted)}`;
    };

    const number = (value: number, decimals: number = 2): string => {
        if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
            return "--";
        }
        return formatterFor(decimals).format(value);
    };

    return {
        money,
        number,
        currencyCode: currency.code,
        currencySymbol: currency.symbol,
        conversionRate,
    };
}

/**
 * Convenience for modules with no access to React context.
 */
export function getFormatters(): ContextFormatters {
    const { currency, conversionRate } = readCurrencyPrefs();
    return makeFormatters(currency, conversionRate);
}
