import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho } from '@/lib/email/zoho-config'
import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'
import { createInvoiceEmailTemplate } from '@/lib/invoice-email-template'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

function normalizeBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ''

  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  return 'https://lashdiary.co.ke'
}

const BASE_URL = normalizeBaseUrl()

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
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

// POST - Send invoice via email
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    const invoiceIndex = invoices.findIndex(inv => inv.invoiceId === params.id || inv.invoiceNumber === params.id)

    if (invoiceIndex === -1) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoices[invoiceIndex]

    // Ensure invoice has a viewToken for email links (generate if missing)
    if (!invoice.viewToken) {
      const crypto = await import('crypto')
      invoice.viewToken = crypto.randomBytes(32).toString('hex')
      invoice.updatedAt = new Date().toISOString()
      invoices[invoiceIndex] = invoice
      await writeDataFile('labs-invoices.json', invoices)
    }

    // Generate email HTML
    const html = createInvoiceEmailTemplate(invoice)

    // Generate plain text version
    const text = `
Invoice ${invoice.invoiceNumber}

Hi ${invoice.contactName},

Please find your invoice from LashDiary Labs below. All details are included for your records.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Issue Date: ${formatDate(invoice.issueDate)}
- Due Date: ${formatDate(invoice.dueDate)}
${invoice.expirationDate ? `- Valid Until: ${formatDate(invoice.expirationDate)}\n` : ''}- Status: ${invoice.status.toUpperCase()}

Bill To:
${invoice.businessName}
${invoice.contactName}
${invoice.email}
${invoice.phone}
${invoice.address ? invoice.address : ''}

Invoice Items:
${invoice.items.map(item => `- ${item.description} (Qty: ${item.quantity}) - ${formatCurrency(item.unitPrice, invoice.currency)} each = ${formatCurrency(item.total, invoice.currency)}`).join('\n')}

Subtotal: ${formatCurrency(invoice.subtotal, invoice.currency)}
${invoice.tax && invoice.taxRate ? `Tax (${invoice.taxRate}%): ${formatCurrency(invoice.tax, invoice.currency)}\n` : ''}Total: ${formatCurrency(invoice.total, invoice.currency)}

${invoice.notes ? `\nNotes:\n${invoice.notes}\n` : ''}

View PDF Invoice: ${invoice.viewToken 
    ? `${BASE_URL}/api/labs/invoices/${invoice.invoiceId}/pdf?token=${invoice.viewToken}`
    : `${BASE_URL}/api/admin/labs/invoices/${invoice.invoiceId}/pdf`}

Payment Instructions:
Please make payment by the due date (${formatDate(invoice.dueDate)}).${invoice.expirationDate ? `\n\nIMPORTANT: This invoice is valid for 7 days (expires ${formatDate(invoice.expirationDate)}). If unpaid, your project slot will be released.` : ''} If you have any questions about this invoice, please contact us at hello@lashdiary.co.ke.

This invoice was sent to ${invoice.email}
LashDiary Labs - Professional System Setup Services
    `.trim()

    // Send email
    const result = await sendEmailViaZoho({
      to: invoice.email,
      subject: `Invoice ${invoice.invoiceNumber} from LashDiary Labs`,
      html,
      text,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    // Update invoice status to 'sent' if it's currently 'draft'
    if (invoice.status === 'draft') {
      invoice.status = 'sent'
      invoice.updatedAt = new Date().toISOString()
      invoices[invoiceIndex] = invoice
      await writeDataFile('labs-invoices.json', invoices)
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully',
      invoice,
    })
  } catch (error: any) {
    console.error('Error sending invoice email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send invoice email' },
      { status: 500 }
    )
  }
}
