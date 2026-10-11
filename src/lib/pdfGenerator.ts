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

import { QuoteData } from "@/types/quote";
import { getCompanySettings, getCustomer } from "@/lib/core/sessionStorage";
import { escapeHTML } from "./sanitization";
import { getOrderId } from "./utils/order-utils";
import { summariseQuote } from "./quoteCalculations";
import { openPrintableHTML } from "./reportGenerator";
import { formatCarbon } from "@/lib/carbon/carbonCalculator";
import { currencyDigits } from "@/lib/currencyFormat";

/**
 * Generate a professional invoice HTML template for the quote
 */
function generateQuoteHTML(quote: QuoteData, currencySymbol: string, conversionRate: number = 1, currencyCode?: string): string {
  // The date the quote was made, not today: reprinting an old quote must not re-date it.
  const issuedAt = quote.createdAt && !Number.isNaN(new Date(quote.createdAt).getTime()) ? new Date(quote.createdAt) : new Date();
  const date = issuedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const safeCurrency = escapeHTML(currencySymbol);
  const pdfDigits = currencyCode ? currencyDigits(currencyCode) : 2;
  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
  // Amounts are stored in the base currency and converted for display. The PDF used to skip
  // the conversion, so an invoice printed base-currency numbers under the converted symbol.
  const rate = Number.isFinite(conversionRate) && conversionRate > 0 ? conversionRate : 1;
  const formatPrice = (value: number) => {
    const amount = Number.isFinite(value) ? value * rate : 0;
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: pdfDigits,
      maximumFractionDigits: pdfDigits
    }).format(amount);
    return `${safeCurrency}${formatted}`;
  };

  // Single source of truth for the money breakdown (shared with the details dialog and
  // saved-quotes table) so the printed lines always reconcile with the printed total.
  const totals = summariseQuote(quote);
  const orderId = getOrderId(quote.id);
  const quoteNumber = `INV-${orderId}`;

  const company = getCompanySettings();
  const customer = quote.customerId ? getCustomer(quote.customerId) : null;
  const showCarbon = !!company?.showCarbonOnInvoice;

  const dueDateStr = quote.dueDate
    ? new Date(quote.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  // Escape all dynamic content for safe HTML rendering
  const safeProjectName = escapeHTML(quote.projectName);
  const safeCustomerName = escapeHTML(customer?.name || quote.clientName || 'Valued Customer');
  const safeNotes = escapeHTML(quote.notes || '');
  const safeCompanyName = escapeHTML(company?.name || 'Your Company');
  const safeCompanyAddress = escapeHTML(company?.address || '');
  const clampNumber = (value: unknown, fallback: number, max: number) => {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    return Number.isFinite(n) && n >= 0 ? Math.min(max, n) : fallback;
  };
  const validityDays = Math.round(clampNumber(company?.validityDays, 30, 365));
  const depositPercent = clampNumber(company?.depositPercent, 50, 100);
  // Tax goes on top of the saved total at invoice time; the quote, revenue and profit stay pre-tax.
  const taxRate = clampNumber(company?.taxRate, 0, 100);
  const taxAmount = Math.round((quote.totalPrice * taxRate) / 100 * 100) / 100;
  const safeFooter = escapeHTML(company?.footerText || 'Thank you for your business!');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${safeProjectName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: sans-serif;
      line-height: 1.4;
      color: #1e293b;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    
    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .company-info img {
      max-height: 40px;
      margin-bottom: 12px;
    }
    .company-info h1 {
      font-size: 20px;
      color: #0f172a;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .company-info p {
      color: #64748b;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .invoice-badge {
      text-align: right;
    }
    .invoice-badge h2 {
      font-size: 24px;
      color: #0f172a;
      margin-bottom: 2px;
      font-weight: 700;
    }
    .invoice-badge p {
      color: #64748b;
      font-size: 13px;
    }

    /* Billing Section */
    .billing-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      gap: 40px;
    }
    .bill-to, .invoice-details {
      flex: 1;
    }
    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .bill-to h3 {
      font-size: 16px;
      color: #0f172a;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .bill-to p {
      color: #475569;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .invoice-details {
      text-align: right;
    }
    .invoice-details .detail-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      margin-bottom: 4px;
    }
    .invoice-details .label {
      color: #64748b;
      font-size: 12px;
    }
    .invoice-details .value {
      color: #0f172a;
      font-size: 13px;
      font-weight: 700;
      min-width: 100px;
    }
    .priority-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #f1f5f9; color: #475569; }

    /* Project Details */
    .project-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .project-section h3 {
      font-size: 16px;
      margin-bottom: 12px;
      color: #0f172a;
      font-weight: 700;
    }
    .project-grid {
      display: flex;
      gap: 30px;
    }
    .project-item .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 2px;
      font-weight: 700;
    }
    .project-item .value {
      font-size: 14px;
      color: #0f172a;
      font-weight: 600;
    }

    /* Cost Table */
    .cost-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .cost-table th {
      text-align: left;
      padding: 12px 15px;
      border-bottom: 1px solid #e2e8f0;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    .cost-table th:last-child {
      text-align: right;
    }
    .cost-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
      color: #334155;
    }
    .cost-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .subtotal-row td {
      font-weight: 700;
      color: #0f172a;
      border-top: 1px solid #e2e8f0;
    }

    /* Total Section */
    .total-container {
      margin-bottom: 30px;
    }
    .total-bar {
      background: #1e293b;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-bar h3 {
      font-size: 14px;
      font-weight: 600;
    }
    .total-bar .amount {
      font-size: 24px;
      font-weight: 700;
    }

    /* Notes Section */
    .notes-section {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    .notes-section h4 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #92400e;
      margin-bottom: 8px;
    }
    .notes-section p {
      font-size: 13px;
      color: #78350f;
    }

    /* Terms Section */
    .terms {
      padding: 0 10px;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 40px;
    }
    .terms h4 {
      color: #0f172a;
      margin-bottom: 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 800;
    }
    .terms ul {
      margin-left: 18px;
    }
    .terms li {
      margin-bottom: 6px;
      line-height: 1.4;
    }

    /* Footer */
    .footer {
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      padding-top: 30px;
      padding-bottom: 20px;
      border-top: 1px solid #f1f5f9;
    }

    @media print {
      body {
        padding: 0;
      }
      .total-bar {
        background: #0f172a !important;
        color: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="company-info">
      ${company?.logoUrl ? `<img src="${escapeHTML(company.logoUrl)}" alt="Company Logo" />` : ''}
      <h1>${safeCompanyName}</h1>
      ${safeCompanyAddress ? `<p class="company-address">${safeCompanyAddress}</p>` : ''}
      ${company?.phone ? `<p>${escapeHTML(company.phone)}</p>` : ''}
      ${company?.email ? `<p>${escapeHTML(company.email)}</p>` : ''}
      ${company?.website ? `<p>${escapeHTML(company.website)}</p>` : ''}
      ${company?.taxId ? `<p>Tax ID: ${escapeHTML(company.taxId)}</p>` : ''}
    </div>
    <div class="invoice-badge">
      <h2>INVOICE</h2>
      <p><strong>${quoteNumber}</strong></p>
    </div>
  </div>

  <!-- Billing Section -->
  <div class="billing-section">
    <div class="bill-to">
      <div class="section-title">Bill To</div>
      ${customer ? `
        <h3>${safeCustomerName}</h3>
        ${customer.company ? `<p>${escapeHTML(customer.company)}</p>` : ''}
        ${customer.address ? `<p>${escapeHTML(customer.address)}</p>` : ''}
        ${customer.email ? `<p>${escapeHTML(customer.email)}</p>` : ''}
        ${customer.phone ? `<p>${escapeHTML(customer.phone)}</p>` : ''}
      ` : `
        <h3>${safeCustomerName}</h3>
      `}
    </div>
    <div class="invoice-details">
      <div class="section-title">Invoice Details</div>
      <div class="detail-row">
        <span class="label">Invoice Date:</span>
        <span class="value">${date}</span>
      </div>
      ${dueDateStr ? `
      <div class="detail-row">
        <span class="label">Due Date:</span>
        <span class="value">${dueDateStr}</span>
      </div>
      ` : ''}
      ${quote.priority ? `
      <div class="detail-row">
        <span class="label">Priority:</span>
        <span class="value">
          <span class="priority-badge priority-${escapeHTML(String(quote.priority).toLowerCase().replace(/[^a-z]/g, ''))}">${escapeHTML(quote.priority)}</span>
        </span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="label">Status:</span>
        <span class="value">${escapeHTML(quote.status || 'Pending')}</span>
      </div>
    </div>
  </div>

  <!-- Project Details -->
  <div class="project-section">
    <h3>${safeProjectName} ${quote.isBatch ? '<span style="font-size: 12px; opacity: 0.6; font-weight: normal;">(Consolidated Batch)</span>' : ''}</h3>
    ${!quote.isBatch ? `
    <div class="project-grid">
      <div class="project-item">
        <div class="label">Print Type</div>
        <div class="value">${escapeHTML(quote.printType)}</div>
      </div>
      <div class="project-item">
        <div class="label">Material</div>
        <div class="value">${escapeHTML(quote.parameters?.materialName || '-')}</div>
      </div>
      <div class="project-item">
        <div class="label">Quantity</div>
        <div class="value">${escapeHTML(String(totals.quantity))}x</div>
      </div>
    </div>
    ` : `
    <div class="project-grid">
       <div class="project-item">
         <div class="label">Total Items</div>
         <div class="value">${quote.batchItems?.length || 0} Projects</div>
       </div>
    </div>
    `}
  </div>

  <!-- Cost Breakdown Table -->
  <table class="cost-table">
    <thead>
      ${quote.isBatch ? `
      <tr>
        <th>Description / Part Name</th>
        <th>Type</th>
        <th>Qty</th>
        <th>Amount</th>
      </tr>
      ` : `
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
      `}
    </thead>
    <tbody>
      ${quote.isBatch ? (quote.batchItems || []).map(item => `
      <tr>
        <td><strong>${escapeHTML(item.projectName)}</strong><br/><small style="color: #64748b">${escapeHTML(item.parameters?.materialName || '-')}</small></td>
        <td>${escapeHTML(item.printType)}</td>
        <td>${item.quantity}x</td>
        <td>${formatPrice(item.totalPrice)}</td>
      </tr>
      `).join('') : `
      <tr>
        <td>Manufacturing Cost${totals.quantity > 1 ? ` (${totals.quantity} units)` : ''}</td>
        <td>${formatPrice(totals.manufacturing)}</td>
      </tr>
      <tr>
        <td>Labour Charges</td>
        <td>${formatPrice(totals.labour)}</td>
      </tr>
      ${totals.painting > 0 ? `
      <tr>
        <td>Post-Processing &amp; Painting</td>
        <td>${formatPrice(totals.painting)}</td>
      </tr>
      ` : ''}
      <tr>
        <td>Overhead</td>
        <td>${formatPrice(totals.overhead)}</td>
      </tr>
      <tr class="subtotal-row">
        <td>Subtotal</td>
        <td>${formatPrice(totals.subtotal)}</td>
      </tr>
      <tr>
        <td>Profit Markup</td>
        <td>+${formatPrice(totals.markup)}</td>
      </tr>
      `}
      ${!quote.isBatch && totals.minimumTopUp > 0 ? `<tr><td>Minimum charge top-up</td><td>+${formatPrice(totals.minimumTopUp)}</td></tr>` : ''}
      ${!quote.isBatch && totals.discount > 0 ? `<tr><td>Discount</td><td>-${formatPrice(totals.discount)}</td></tr>` : ''}
      ${!quote.isBatch && totals.shipping > 0 ? `<tr><td>Shipping</td><td>+${formatPrice(totals.shipping)}</td></tr>` : ''}
      ${taxAmount > 0 ? `<tr><td>Tax (${taxRate}%)</td><td>+${formatPrice(taxAmount)}</td></tr>` : ''}
    </tbody>
  </table>

  <!-- Total -->
  <div class="total-container">
    <div class="total-bar">
      <h3>Total Amount Due</h3>
      <div class="amount">${formatPrice(quote.totalPrice + taxAmount)}</div>
    </div>
  </div>

  <!-- Carbon: outside the money table because it is not money, and only when the shop has
       deliberately turned it on in Settings. States its own basis so a customer can weigh it. -->
  ${showCarbon && totals.carbonKg !== undefined ? `
  <div class="notes-section">
    <h4>Estimated Carbon Footprint</h4>
    <p>${escapeHTML(formatCarbon(totals.carbonKg))} for this order${totals.carbonPerPart !== undefined
        ? ` (${escapeHTML(formatCarbon(totals.carbonPerPart))} per part)` : ''}.
    Covers electricity, material and waste${totals.carbonGrade === 'ESTIMATE'
        ? ', from planned print time and published averages' : ', from recorded print time and material'}.
    An estimate, not a measurement, and not an environmental claim.</p>
  </div>
  ` : ''}

  <!-- Notes -->
  ${safeNotes ? `
  <div class="notes-section">
    <h4>Notes</h4>
    <p>${safeNotes}</p>
  </div>
  ` : ''}

  <!-- Terms -->
  <div class="terms">
    <h4>Terms & Conditions</h4>
    <ul>
      <li>This invoice is valid for ${validityDays} days from the date of issue.</li>
      ${depositPercent > 0 ? `<li>${depositPercent}% deposit required to begin production.</li>` : ''}
      <li>Final payment due upon completion and before delivery.</li>
      <li>Prices are subject to material availability.</li>
    </ul>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>${safeFooter}</p>
    <p>Generated by PolymagicPrice</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Open quote in a new window for printing/saving as PDF
 */
export function printQuotePDF(quote: QuoteData, currencySymbol: string, conversionRate: number = 1, currencyCode?: string): void {
  const html = generateQuoteHTML(quote, currencySymbol, conversionRate, currencyCode);

  // SECURITY FIX (H1): Blob URL instead of document.write, so the print window
  // opens in an isolated context with a null window.opener. Shared with the
  // shop reports via openPrintableHTML so there is one implementation.
  openPrintableHTML(html);
}
