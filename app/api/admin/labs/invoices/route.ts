import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho } from '@/lib/email/zoho-config'

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
  if (currency === 'EUR') {
    return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `KSH ${Math.round(amount).toLocaleString('en-KE')}`
}

async function generateInvoiceEmailHTML(invoice: ConsultationInvoice): Promise<string> {
  // Import the template from the utility file
  const { createInvoiceEmailTemplate } = await import('@/lib/invoice-email-template')
  return createInvoiceEmailTemplate(invoice)
}

async function generateInvoiceEmailText(invoice: ConsultationInvoice): Promise<string> {
  const pdfUrl = `${BASE_URL}/api/admin/labs/invoices/${invoice.invoiceId}/pdf`
  
  return `
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

View PDF Invoice: ${pdfUrl}

${invoice.expirationDate ? `\nIMPORTANT: This invoice is valid for 7 days (expires ${formatDate(invoice.expirationDate)}). If unpaid, your project slot will be released.\n` : ''}Payment Instructions:
Please make payment by the due date (${formatDate(invoice.dueDate)}). If you have any questions about this invoice, please contact us at hello@lashdiary.co.ke.

This invoice was sent to ${invoice.email}
LashDiary Labs - Professional System Setup Services
  `.trim()
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface ConsultationInvoice {
  invoiceId: string
  consultationId: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  expirationDate?: string // 7 days from issue date for build invoices
  businessName: string
  contactName: string
  email: string
  phone: string
  address?: string
  items: InvoiceItem[]
  subtotal: number
  tax?: number
  taxRate?: number
  total: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'expired'
  notes?: string
  // Split payment support for Tier 3
  paymentStructure?: 'full' | 'split'
  upfrontAmount?: number // For split payments
  secondAmount?: number // For split payments
  upfrontPaid?: boolean
  secondPaid?: boolean
  createdAt: string
  updatedAt: string
}

// GET - List all invoices
export async function GET(request: NextRequest) {
  try {
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    
    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultationId')
    
    if (consultationId) {
      const filtered = invoices.filter(inv => inv.consultationId === consultationId)
      return NextResponse.json({ invoices: filtered })
    }
    
    // Sort by most recent first
    const sorted = [...invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return NextResponse.json({ invoices: sorted, total: sorted.length })
  } catch (error) {
    console.error('Error loading invoices:', error)
    return NextResponse.json(
      { error: 'Failed to load invoices', invoices: [], total: 0 },
      { status: 500 }
    )
  }
}

// POST - Create a new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      consultationId,
      items,
      taxRate,
      notes,
      dueDate,
    } = body

    if (!consultationId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: consultationId and items are required' },
        { status: 400 }
      )
    }

    // Load consultation data
    const consultationsData = await readDataFile<{ consultations: any[] }>(
      'labs-consultations.json',
      { consultations: [] }
    )
    const consultation = consultationsData.consultations.find(
      (c: any) => c.consultationId === consultationId || c.submittedAt === consultationId
    )

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: InvoiceItem) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 1)
      return sum + itemTotal
    }, 0)

    const tax = taxRate ? subtotal * (taxRate / 100) : 0
    const total = subtotal + tax

    // Generate invoice number (INV-YYYYMMDD-XXX)
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    const todayInvoices = invoices.filter(inv => inv.invoiceNumber.startsWith(`INV-${dateStr}`))
    const invoiceNumber = `INV-${dateStr}-${String(todayInvoices.length + 1).padStart(3, '0')}`

    // Determine if this is a split payment (Tier 3)
    const selectedTier = consultation.selectedTier || consultation.interestedTier || ''
    const isTier3 = selectedTier.includes('Full Operations Suite') || selectedTier.includes('Premium')
    const paymentStructure: 'full' | 'split' = isTier3 ? 'split' : 'full'
    
    // Calculate split amounts for Tier 3
    const upfrontAmount = isTier3 ? Math.round(total * 0.5) : total
    const secondAmount = isTier3 ? Math.round(total * 0.5) : 0
    
    // Set expiration date (7 days from issue date for build invoices)
    const issueDate = new Date().toISOString().split('T')[0]
    const expirationDate = new Date(issueDate)
    expirationDate.setDate(expirationDate.getDate() + 7)

    // Create invoice
    const invoice: ConsultationInvoice = {
      invoiceId: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      consultationId: consultation.consultationId || consultation.submittedAt,
      invoiceNumber,
      issueDate,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      expirationDate: expirationDate.toISOString().split('T')[0], // 7 days for build invoices
      businessName: consultation.businessName,
      contactName: consultation.contactName,
      email: consultation.email,
      phone: consultation.phone,
      address: consultation.meetingCountry && consultation.meetingCity && consultation.meetingBuilding && consultation.meetingStreet
        ? `${consultation.meetingBuilding}, ${consultation.meetingStreet}, ${consultation.meetingCity}, ${consultation.meetingCountry}`
        : undefined,
      items: items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: (item.unitPrice || 0) * (item.quantity || 1),
      })),
      subtotal,
      tax: tax > 0 ? tax : undefined,
      taxRate: taxRate || undefined,
      total,
      currency: consultation.currency || 'KES',
      status: 'draft',
      notes: notes || undefined,
      paymentStructure,
      upfrontAmount: isTier3 ? upfrontAmount : undefined,
      secondAmount: isTier3 ? secondAmount : undefined,
      upfrontPaid: false,
      secondPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Save invoice
    invoices.push(invoice)
    await writeDataFile('labs-invoices.json', invoices)

    // Automatically send invoice email to client
    try {
      const sendResult = await sendEmailViaZoho({
        to: invoice.email,
        subject: `Invoice ${invoice.invoiceNumber} from LashDiary Labs`,
        html: await generateInvoiceEmailHTML(invoice),
        text: await generateInvoiceEmailText(invoice),
      })

      if (sendResult.success) {
        // Update invoice status to 'sent'
        invoice.status = 'sent'
        invoice.updatedAt = new Date().toISOString()
        const updatedIndex = invoices.findIndex(inv => inv.invoiceId === invoice.invoiceId)
        if (updatedIndex !== -1) {
          invoices[updatedIndex] = invoice
          await writeDataFile('labs-invoices.json', invoices)
        }
      }
    } catch (emailError) {
      console.error('Error sending invoice email automatically:', emailError)
      // Don't fail the invoice creation if email fails
    }

    return NextResponse.json({ success: true, invoice })
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    )
  }
}

