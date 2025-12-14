import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Generate PDF-ready HTML for invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    const invoice = invoices.find(inv => inv.invoiceId === params.id || inv.invoiceNumber === params.id)

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Format dates
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      } catch {
        return dateStr
      }
    }

    // Format currency
    const formatCurrency = (amount: number, currency: string) => {
      if (currency === 'USD') {
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
      return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
    }

    // Generate PDF-ready HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      color: #333;
      line-height: 1.6;
      background: #fff;
      padding: 40px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #7C4B31;
    }
    .logo-section {
      flex: 1;
    }
    .logo-section h1 {
      font-size: 32px;
      color: #7C4B31;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .logo-section p {
      color: #666;
      font-size: 14px;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h2 {
      font-size: 28px;
      color: #7C4B31;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .invoice-info p {
      color: #666;
      font-size: 14px;
      margin: 4px 0;
    }
    .billing-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .bill-to, .bill-from {
      flex: 1;
    }
    .bill-to {
      margin-right: 40px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #7C4B31;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .bill-to p, .bill-from p {
      color: #333;
      font-size: 14px;
      margin: 4px 0;
      line-height: 1.8;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table thead {
      background: #7C4B31;
      color: #fff;
    }
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
    }
    .items-table tbody tr:hover {
      background: #f9f9f9;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-section {
      margin-left: auto;
      width: 300px;
      margin-bottom: 30px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .totals-row.subtotal {
      border-top: 2px solid #e0e0e0;
      padding-top: 12px;
      margin-top: 8px;
    }
    .totals-row.tax {
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 12px;
    }
    .totals-row.total {
      border-top: 3px solid #7C4B31;
      border-bottom: 3px solid #7C4B31;
      padding: 16px 0;
      margin-top: 8px;
      font-size: 20px;
      font-weight: 700;
      color: #7C4B31;
    }
    .totals-label {
      color: #666;
    }
    .totals-value {
      font-weight: 600;
      color: #333;
    }
    .notes-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
    }
    .notes-section p {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-draft {
      background: #f0f0f0;
      color: #666;
    }
    .status-sent {
      background: #e3f2fd;
      color: #1976d2;
    }
    .status-paid {
      background: #e8f5e9;
      color: #388e3c;
    }
    .status-cancelled {
      background: #ffebee;
      color: #c62828;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    @media print {
      body {
        padding: 20px;
      }
      .invoice-container {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo-section">
        <h1>LashDiary Labs</h1>
        <p>Professional System Setup Services</p>
        <p style="margin-top: 8px;">Email: hello@lashdiary.co.ke</p>
      </div>
      <div class="invoice-info">
        <h2>INVOICE</h2>
        <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        <p style="margin-top: 12px;">
          <span class="status-badge status-${invoice.status}">${invoice.status}</span>
        </p>
      </div>
    </div>

    <div class="billing-section">
      <div class="bill-to">
        <div class="section-title">Bill To</div>
        <p><strong>${invoice.businessName}</strong></p>
        <p>${invoice.contactName}</p>
        <p>${invoice.email}</p>
        <p>${invoice.phone}</p>
        ${invoice.address ? `<p style="margin-top: 8px;">${invoice.address}</p>` : ''}
      </div>
      <div class="bill-from">
        <div class="section-title">From</div>
        <p><strong>LashDiary Labs</strong></p>
        <p>hello@lashdiary.co.ke</p>
        <p>Nairobi, Kenya</p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Description</th>
          <th class="text-center" style="width: 15%;">Quantity</th>
          <th class="text-right" style="width: 17.5%;">Unit Price</th>
          <th class="text-right" style="width: 17.5%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice, invoice.currency)}</td>
            <td class="text-right">${formatCurrency(item.total, invoice.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-section">
      <div class="totals-row subtotal">
        <span class="totals-label">Subtotal:</span>
        <span class="totals-value">${formatCurrency(invoice.subtotal, invoice.currency)}</span>
      </div>
      ${invoice.tax && invoice.taxRate ? `
      <div class="totals-row tax">
        <span class="totals-label">Tax (${invoice.taxRate}%):</span>
        <span class="totals-value">${formatCurrency(invoice.tax, invoice.currency)}</span>
      </div>
      ` : ''}
      <div class="totals-row total">
        <span class="totals-label">Total:</span>
        <span class="totals-value">${formatCurrency(invoice.total, invoice.currency)}</span>
      </div>
    </div>

    ${invoice.notes ? `
    <div class="notes-section">
      <div class="section-title">Notes</div>
      <p>${invoice.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p style="margin-top: 8px;">This is a computer-generated invoice. No signature required.</p>
    </div>
  </div>
</body>
</html>
    `.trim()

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating invoice HTML:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}

