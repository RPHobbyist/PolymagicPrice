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
    locale: string;
}

export const CURRENCIES: Currency[] = [
    { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
    { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
    { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
    { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
    { code: "CHF", symbol: "Fr", name: "Swiss Franc", locale: "de-CH" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
    { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "zh-HK" },
    { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
    { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
    { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
    { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
    { code: "MXN", symbol: "$", name: "Mexican Peso", locale: "es-MX" },
    { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU" },
    { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
    { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
    { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar", locale: "zh-TW" },
    { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK" },
    { code: "PLN", symbol: "zł", name: "Polish Zloty", locale: "pl-PL" },
    { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH" },
    { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID" },
    { code: "HUF", symbol: "Ft", name: "Hungarian Forint", locale: "hu-HU" },
    { code: "CZK", symbol: "Kč", name: "Czech Koruna", locale: "cs-CZ" },
    { code: "ILS", symbol: "₪", name: "Israeli New Shekel", locale: "he-IL" },
    { code: "CLP", symbol: "$", name: "Chilean Peso", locale: "es-CL" },
    { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
    { code: "COP", symbol: "$", name: "Colombian Peso", locale: "es-CO" },
    { code: "SAR", symbol: "ر.س", name: "Saudi Riyal", locale: "ar-SA" },
    { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY" },
    { code: "RON", symbol: "lei", name: "Romanian Leu", locale: "ro-RO" },
    { code: "VND", symbol: "₫", name: "Vietnamese Dong", locale: "vi-VN" },
    { code: "KES", symbol: "KSh", name: "Kenyan Shilling", locale: "en-KE" },
    { code: "EGP", symbol: "E£", name: "Egyptian Pound", locale: "ar-EG" },
    { code: "PKR", symbol: "₨", name: "Pakistani Rupee", locale: "en-PK" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
    { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", locale: "bn-BD" },
    { code: "LKR", symbol: "₨", name: "Sri Lankan Rupee", locale: "si-LK" },
    { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi", locale: "en-GH" },
    { code: "OMR", symbol: "ر.ع.", name: "Omani Rial", locale: "ar-OM" },
    { code: "QAR", symbol: "ر.ق", name: "Qatari Riyal", locale: "ar-QA" },
    { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", locale: "ar-KW" },
    { code: "BHD", symbol: ".د.ب", name: "Bahraini Dinar", locale: "ar-BH" },
    { code: "JOD", symbol: "د.ا", name: "Jordanian Dinar", locale: "ar-JO" },
    { code: "PEN", symbol: "S/", name: "Peruvian Sol", locale: "es-PE" },
    { code: "ARS", symbol: "$", name: "Argentine Peso", locale: "es-AR" },
];
