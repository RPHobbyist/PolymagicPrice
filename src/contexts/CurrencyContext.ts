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

import { createContext } from "react";
import { Currency } from "@/types/currency";

export interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    conversionRate: number;
    setConversionRate: (rate: number) => void;
    formatPrice: (amount: number) => string;
    formatNumber: (value: number, decimals?: number) => string;
    getLocale: () => string;
    /**
     * What to print beside a field whose value is STORED as typed (rates, costs). Amounts are saved
     * in the base currency and multiplied by the conversion rate only for display, so with a rate
     * other than 1 the display symbol would mislabel what the user is typing.
     */
    inputSymbol: string;
}

export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);
