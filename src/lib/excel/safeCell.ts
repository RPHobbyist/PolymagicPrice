/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 */

/**
 * Prevents Excel formula injection (CSV/DDE attack) by prefixing a cell that opens with a
 * dangerous character with a single quote.
 *
 * This lives apart from the export code on purpose. It used to sit in excelExport.ts beside a
 * top-level `import ExcelJS from 'exceljs'`, and the three components that import nothing but
 * this five-line guard therefore pulled the whole 920 KB library into their chunks — including
 * the cost calculator and the settings page, neither of which writes a spreadsheet. The exports
 * themselves were already loading ExcelJS on demand; only this co-location defeated it.
 */
export function safeCell(value: string | undefined | null): string {
    if (!value) return '';
    const s = String(value);
    if (/^[=+\-@\t\r]/.test(s)) {
        return `'${s}`;
    }
    return s;
}
