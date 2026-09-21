/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Customer, QuoteData } from '@/types/quote';

/**
 * SECURITY FIX (L1): Prevents Excel formula injection (CSV/DDE attack).
 * Prefixes cells starting with dangerous characters with a single quote.
 */
export function safeCell(value: string | undefined | null): string {
    if (!value) return '';
    const s = String(value);
    if (/^[=+\-@\t\r]/.test(s)) {
        return `'${s}`;
    }
    return s;
}

/**
 * Export a professional customer report to Excel
 */
export async function exportCustomerToExcel(
    customer: Customer, 
    stats: { 
        orderCount: number; 
        totalSpent: number; 
        lastOrderDate: string | null; 
    }, 
    orders: QuoteData[],
    currencySymbol: string = '₹',
    // Stored amounts are in the base currency; the UI multiplies by this rate at display
    // time. Without it the report printed base-currency numbers under a converted symbol.
    conversionRate: number = 1
) {
    const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
    const rate = Number.isFinite(conversionRate) && conversionRate > 0 ? conversionRate : 1;
    const fmtPrice = (value: number) => {
        const amount = Number.isFinite(value) ? value * rate : 0;
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
        return `${currencySymbol}${formatted}`;
    };
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${customer.name.slice(0, 20)} Report`);

    // --- 1. Customer Profile Section ---
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'CUSTOMER PERFORMANCE REPORT';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' } // Primary Blue
    };

    worksheet.addRow([]); // Spacer

    worksheet.addRow(['Customer Name:', safeCell(customer.name)]);
    worksheet.addRow(['Company:', safeCell(customer.company || '-')]);
    worksheet.addRow(['Email:', safeCell(customer.email || '-')]);
    worksheet.addRow(['Phone:', safeCell(customer.phone || '-')]);
    worksheet.addRow(['Address:', safeCell(customer.address || '-')]);
    worksheet.addRow(['Member Since:', new Date(customer.createdAt).toLocaleDateString()]);
    
    worksheet.addRow([]); // Spacer

    // --- 2. Summary Stats Section ---
    worksheet.addRow(['ACCOUNT SUMMARY']).font = { bold: true };
    worksheet.addRow(['Total Orders', stats.orderCount]);
    worksheet.addRow(['Total Revenue', fmtPrice(stats.totalSpent)]);
    worksheet.addRow(['Last Order Date', stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString() : 'N/A']);

    worksheet.addRow([]); // Spacer
    worksheet.addRow([]); // Spacer

    // --- 3. Order History Table ---
    const tableHeader = worksheet.addRow(['Order ID', 'Project Name', 'Date', 'Type', 'Amount']);
    tableHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    tableHeader.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F2937' } // Dark Slate
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    orders.forEach((order) => {
        const row = worksheet.addRow([
            order.id?.slice(-8).toUpperCase() || 'N/A',
            safeCell(order.projectName),
            order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
            order.printType,
            fmtPrice(order.totalPrice)
        ]);
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // --- 4. Final Formatting ---
    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 15;

    // --- 5. Save ---
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Customer_Report_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
}
