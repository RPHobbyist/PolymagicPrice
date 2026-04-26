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

export interface Currency {
    code: string;
    symbol: string;
    name: string;
}

export const CURRENCIES: Currency[] = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
    { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
    { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
    { code: "SEK", symbol: "kr", name: "Swedish Krona" },
    { code: "KRW", symbol: "₩", name: "South Korean Won" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
    { code: "MXN", symbol: "$", name: "Mexican Peso" },
    { code: "RUB", symbol: "₽", name: "Russian Ruble" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
    { code: "TRY", symbol: "₺", name: "Turkish Lira" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
    { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar" },
    { code: "DKK", symbol: "kr", name: "Danish Krone" },
    { code: "PLN", symbol: "zł", name: "Polish Zloty" },
    { code: "THB", symbol: "฿", name: "Thai Baht" },
    { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
    { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
    { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
    { code: "ILS", symbol: "₪", name: "Israeli New Shekel" },
    { code: "CLP", symbol: "$", name: "Chilean Peso" },
    { code: "PHP", symbol: "₱", name: "Philippine Peso" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "COP", symbol: "$", name: "Colombian Peso" },
    { code: "SAR", symbol: "ر.س", name: "Saudi Riyal" },
    { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
    { code: "RON", symbol: "lei", name: "Romanian Leu" },
    { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
    { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
    { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
    { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
    { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
    { code: "LKR", symbol: "₨", name: "Sri Lankan Rupee" },
    { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
    { code: "OMR", symbol: "ر.ع.", name: "Omani Rial" },
    { code: "QAR", symbol: "ر.ق", name: "Qatari Riyal" },
    { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar" },
    { code: "BHD", symbol: ".د.ب", name: "Bahraini Dinar" },
    { code: "JOD", symbol: "د.ا", name: "Jordanian Dinar" },
    { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
    { code: "ARS", symbol: "$", name: "Argentine Peso" },
];
