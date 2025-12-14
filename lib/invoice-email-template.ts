import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://lashdiary.co.ke'

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

function formatDate(dateStr: string): string {
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

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (currency === 'EUR') {
    return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `KSH ${Math.round(amount).toLocaleString('en-KE')}`
}

export function createInvoiceEmailTemplate(invoice: ConsultationInvoice): string {
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  // Use public route with token for email links (bypasses admin auth requirement)
  const pdfUrl = invoice.viewToken 
    ? `${BASE_URL}/api/labs/invoices/${invoice.invoiceId}/pdf?token=${invoice.viewToken}`
    : `${BASE_URL}/api/admin/labs/invoices/${invoice.invoiceId}/pdf` // Fallback for admin access

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Serif+Text&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'DM Serif Text', Georgia, serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${card}; border-radius:18px; border:1px solid ${accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${card};">
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">📄 Invoice</p>
              <h1 style="margin:12px 0 0 0; font-size:36px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600; line-height:1.3; letter-spacing:0.5px;">Payment Request</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                Hi ${invoice.contactName},<br><br>
                Please find your invoice from LashDiary Labs below. All details are included for your records.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <div style="background:${accent}; border-radius:12px; padding:24px; margin:0 0 24px 0;">
                <h2 style="margin:0 0 16px 0; font-size:20px; color:${brand}; font-family:'Playfair Display', Georgia, serif; font-weight:600;">
                  Invoice Details
                </h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.8;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; width:140px;">Invoice Number:</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600;">${invoice.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Issue Date:</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formatDate(invoice.issueDate)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Due Date:</td>
                    <td style="padding:6px 0; color:${textPrimary};">${formatDate(invoice.dueDate)}</td>
                  </tr>
                  ${invoice.expirationDate ? `
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Valid Until:</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600;">${formatDate(invoice.expirationDate)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Status:</td>
                    <td style="padding:6px 0; color:${textPrimary};">
                      <span style="display:inline-block; padding:4px 12px; background:${invoice.status === 'paid' ? '#e8f5e9' : invoice.status === 'sent' ? '#e3f2fd' : '#f0f0f0'}; color:${invoice.status === 'paid' ? '#388e3c' : invoice.status === 'sent' ? '#1976d2' : '#666'}; border-radius:4px; font-size:13px; font-weight:600; text-transform:uppercase;">
                        ${invoice.status}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <h2 style="margin:0 0 16px 0; font-size:20px; color:${brand}; font-family:'Playfair Display', Georgia, serif; font-weight:600;">
                Bill To
              </h2>
              <div style="background:${background}; border-radius:8px; padding:16px;">
                <p style="margin:0 0 8px 0; font-size:16px; color:${textPrimary}; font-weight:600;">${invoice.businessName}</p>
                <p style="margin:0 0 4px 0; font-size:14px; color:${textSecondary};">${invoice.contactName}</p>
                <p style="margin:0 0 4px 0; font-size:14px; color:${textSecondary};">${invoice.email}</p>
                <p style="margin:0 0 4px 0; font-size:14px; color:${textSecondary};">${invoice.phone}</p>
                ${invoice.address ? `<p style="margin:4px 0 0 0; font-size:14px; color:${textSecondary};">${invoice.address}</p>` : ''}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <h2 style="margin:0 0 16px 0; font-size:20px; color:${brand}; font-family:'Playfair Display', Georgia, serif; font-weight:600;">
                Invoice Items
              </h2>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; border:1px solid ${accent};">
                <thead>
                  <tr style="background:${brand}; color:#FFFFFF;">
                    <th style="padding:12px; text-align:left; font-size:14px; font-weight:600; border-right:1px solid rgba(255,255,255,0.2);">Description</th>
                    <th style="padding:12px; text-align:center; font-size:14px; font-weight:600; border-right:1px solid rgba(255,255,255,0.2);">Qty</th>
                    <th style="padding:12px; text-align:right; font-size:14px; font-weight:600; border-right:1px solid rgba(255,255,255,0.2);">Unit Price</th>
                    <th style="padding:12px; text-align:right; font-size:14px; font-weight:600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items.map(item => `
                    <tr style="border-bottom:1px solid ${accent};">
                      <td style="padding:12px; font-size:14px; color:${textPrimary}; border-right:1px solid ${accent};">${item.description}</td>
                      <td style="padding:12px; text-align:center; font-size:14px; color:${textPrimary}; border-right:1px solid ${accent};">${item.quantity}</td>
                      <td style="padding:12px; text-align:right; font-size:14px; color:${textPrimary}; border-right:1px solid ${accent};">${formatCurrency(item.unitPrice, invoice.currency)}</td>
                      <td style="padding:12px; text-align:right; font-size:14px; color:${textPrimary}; font-weight:600;">${formatCurrency(item.total, invoice.currency)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <div style="margin-left:auto; width:300px;">
                <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:15px;">
                  <span style="color:${textSecondary};">Subtotal:</span>
                  <span style="color:${textPrimary}; font-weight:600;">${formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                ${invoice.tax && invoice.taxRate ? `
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid ${accent}; font-size:15px;">
                  <span style="color:${textSecondary};">Tax (${invoice.taxRate}%):</span>
                  <span style="color:${textPrimary}; font-weight:600;">${formatCurrency(invoice.tax, invoice.currency)}</span>
                </div>
                ` : ''}
                <div style="display:flex; justify-content:space-between; padding:16px 0; border-top:2px solid ${brand}; border-bottom:2px solid ${brand}; margin-top:8px; font-size:20px;">
                  <span style="color:${brand}; font-weight:700;">Total:</span>
                  <span style="color:${brand}; font-weight:700;">${formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
              </div>
            </td>
          </tr>

          ${invoice.notes ? `
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <h2 style="margin:0 0 12px 0; font-size:18px; color:${brand}; font-family:'Playfair Display', Georgia, serif; font-weight:600;">
                Notes
              </h2>
              <div style="background:${background}; border-radius:8px; padding:16px;">
                <p style="margin:0; font-size:14px; color:${textPrimary}; line-height:1.6; white-space:pre-wrap;">${invoice.notes}</p>
              </div>
            </td>
          </tr>
          ` : ''}

          <tr>
            <td style="padding:0 32px 32px 32px; text-align:center;">
              <a href="${pdfUrl}" style="display:inline-block; background:${brand}; color:#FFFFFF; text-decoration:none; padding:16px 32px; border-radius:8px; font-size:18px; font-weight:600; font-family:'Playfair Display', Georgia, serif; letter-spacing:0.5px;">
                View PDF Invoice →
              </a>
              <p style="margin:16px 0 0 0; font-size:14px; color:${textSecondary};">
                Or visit: <a href="${pdfUrl}" style="color:${brand}; text-decoration:underline;">${pdfUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px 32px;">
              <div style="border-top:1px solid ${accent}; padding-top:24px;">
                ${invoice.expirationDate ? `
                <div style="background-color:#fff3cd; border:2px solid #ffc107; border-radius:8px; padding:16px; margin-bottom:16px;">
                  <p style="margin:0 0 8px 0; font-size:14px; color:#856404; font-weight:600;">
                    ⏰ Important: Invoice Expiration
                  </p>
                  <p style="margin:0; font-size:14px; color:#856404; line-height:1.6;">
                    This invoice is valid for 7 days (expires ${formatDate(invoice.expirationDate)}).<br>
                    If unpaid, your build slot will be released to ensure we can serve other clients effectively.
                  </p>
                </div>
                ` : ''}
                <p style="margin:0 0 12px 0; font-size:14px; color:${textSecondary};">
                  <strong>Payment Instructions</strong>
                </p>
                <p style="margin:0; font-size:14px; color:${textSecondary}; line-height:1.6;">
                  Please make payment by the due date (${formatDate(invoice.dueDate)}). If you have any questions about this invoice, please contact us at hello@lashdiary.co.ke.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px 32px; text-align:center; border-top:1px solid ${accent};">
              <p style="margin:0; font-size:12px; color:${textSecondary};">
                This invoice was sent to ${invoice.email}<br>
                LashDiary Labs - Professional System Setup Services
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

