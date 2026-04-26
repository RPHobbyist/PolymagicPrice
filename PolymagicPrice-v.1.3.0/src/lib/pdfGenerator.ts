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

/**
 * Generate a professional invoice HTML template for the quote
 */
export function generateQuoteHTML(quote: QuoteData, currencySymbol: string): string {
  const formatPrice = (value: number) => `${currencySymbol}${value.toFixed(2)}`;
  const quoteNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const company = getCompanySettings();
  const customer = quote.customerId ? getCustomer(quote.customerId) : null;

  // Format due date if available
  const dueDateStr = quote.dueDate
    ? new Date(quote.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${quote.projectName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.5;
      color: #1f2937;
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
      border-bottom: 2px solid #e5e7eb;
    }
    .company-info img {
      max-height: 60px;
      margin-bottom: 10px;
      object-fit: contain;
    }
    .company-info h1 {
      font-size: 24px;
      color: #111827;
      margin-bottom: 5px;
      font-weight: 700;
    }
    .company-info p {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .company-address {
      white-space: pre-line; 
    }
    .invoice-badge {
      text-align: right;
    }
    .invoice-badge h2 {
      font-size: 28px;
      color: #374151;
      margin-bottom: 8px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .invoice-badge p {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .invoice-badge strong {
      color: #374151;
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
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .bill-to h3 {
      font-size: 16px;
      color: #111827;
      margin-bottom: 4px;
    }
    .bill-to p {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .invoice-details {
      text-align: right;
    }
    .invoice-details .detail-row {
      display: flex;
      justify-content: flex-end;
      gap: 20px;
      margin-bottom: 4px;
    }
    .invoice-details .label {
      color: #6b7280;
      font-size: 13px;
    }
    .invoice-details .value {
      color: #111827;
      font-size: 13px;
      font-weight: 500;
      min-width: 100px;
      text-align: right;
    }
    .priority-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .priority-high { background: #fef2f2; color: #dc2626; }
    .priority-medium { background: #fffbeb; color: #d97706; }
    .priority-low { background: #f3f4f6; color: #6b7280; }

    /* Project Details */
    .project-section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    .project-section h3 {
      font-size: 16px;
      margin-bottom: 12px;
      color: #111827;
    }
    .project-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    .project-item .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #9ca3af;
      margin-bottom: 2px;
    }
    .project-item .value {
      font-size: 14px;
      color: #374151;
      font-weight: 500;
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
      background: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .cost-table th:last-child {
      text-align: right;
    }
    .cost-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }
    .cost-table td:last-child {
      text-align: right;
      font-weight: 500;
      font-family: 'SF Mono', 'Courier New', monospace;
    }
    .subtotal-row {
      background: #f9fafb;
    }
    .subtotal-row td {
      font-weight: 600;
      border-top: 2px solid #e5e7eb;
    }

    /* Total Section */
    .total-section {
      background: #111827;
      color: white;
      padding: 20px 25px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }
    .total-section h3 {
      font-size: 14px;
      font-weight: 500;
      opacity: 0.9;
    }
    .total-section .amount {
      font-size: 28px;
      font-weight: 700;
      font-family: 'SF Mono', 'Courier New', monospace;
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
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 30px;
    }
    .terms h4 {
      color: #374151;
      margin-bottom: 10px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .terms ul {
      margin-left: 20px;
    }
    .terms li {
      margin-bottom: 4px;
    }

    /* Footer */
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin-bottom: 4px;
    }

    @media print {
      body {
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="company-info">
      ${company?.logoUrl ? `<img src="${company.logoUrl}" alt="Company Logo" />` : ''}
      <h1>${company?.name || 'Your Company'}</h1>
      ${company?.address ? `<p class="company-address">${company.address}</p>` : ''}
      ${company?.phone ? `<p>${company.phone}</p>` : ''}
      ${company?.email ? `<p>${company.email}</p>` : ''}
      ${company?.website ? `<p>${company.website}</p>` : ''}
      ${company?.taxId ? `<p>Tax ID: ${company.taxId}</p>` : ''}
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
        <h3>${customer.name}</h3>
        ${customer.company ? `<p>${customer.company}</p>` : ''}
        ${customer.address ? `<p>${customer.address}</p>` : ''}
        ${customer.email ? `<p>${customer.email}</p>` : ''}
        ${customer.phone ? `<p>${customer.phone}</p>` : ''}
      ` : quote.clientName ? `
        <h3>${quote.clientName}</h3>
      ` : `
        <p style="color: #9ca3af; font-style: italic;">No client specified</p>
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
          <span class="priority-badge priority-${quote.priority.toLowerCase()}">${quote.priority}</span>
        </span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="label">Status:</span>
        <span class="value">${quote.status || 'Pending'}</span>
      </div>
    </div>
  </div>

  <!-- Project Details -->
  <div class="project-section">
    <h3>${quote.projectName}</h3>
    <div class="project-grid">
      <div class="project-item">
        <div class="label">Print Type</div>
        <div class="value">${quote.printType}</div>
      </div>
      <div class="project-item">
        <div class="label">Material</div>
        <div class="value">${quote.parameters?.materialName || '-'}</div>
      </div>
      <div class="project-item">
        <div class="label">Quantity</div>
        <div class="value">${quote.quantity}x</div>
      </div>
    </div>
  </div>

  <!-- Cost Breakdown Table -->
  <table class="cost-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Manufacturing Cost</td>
        <td>${formatPrice(quote.materialCost + quote.machineTimeCost + quote.electricityCost + quote.overheadCost + (quote.parameters?.consumablesTotal || 0) + (quote.paintingCost || 0))}</td>
      </tr>
      <tr>
        <td>Labour Charges</td>
        <td>${formatPrice(quote.laborCost)}</td>
      </tr>
      <tr class="subtotal-row">
        <td>Subtotal</td>
        <td>${formatPrice(quote.subtotal)}</td>
      </tr>
      <tr>
        <td>Tax</td>
        <td>+${formatPrice(quote.markup)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Total -->
  <div class="total-section">
    <h3>Total Amount Due</h3>
    <div class="amount">${formatPrice(quote.totalPrice)}</div>
  </div>

  <!-- Notes -->
  ${quote.notes ? `
  <div class="notes-section">
    <h4>Notes</h4>
    <p>${quote.notes}</p>
  </div>
  ` : ''}

  <!-- Terms -->
  <div class="terms">
    <h4>Terms & Conditions</h4>
    <ul>
      <li>This invoice is valid for 30 days from the date of issue.</li>
      <li>50% deposit required to begin production.</li>
      <li>Final payment due upon completion and before delivery.</li>
      <li>Prices are subject to material availability.</li>
    </ul>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>${company?.footerText || 'Thank you for your business!'}</p>
    <p>Generated by PolymagicPrice</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Open quote in a new window for printing/saving as PDF
 */
export function printQuotePDF(quote: QuoteData, currencySymbol: string): void {
  const html = generateQuoteHTML(quote, currencySymbol);

  // Open new window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.');
  }

  // Write HTML content
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}
