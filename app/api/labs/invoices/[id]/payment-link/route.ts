import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'
import { initializeTransaction } from '@/lib/paystack-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

// GET - Generate Paystack payment link and redirect to Paystack
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get query parameters (for remaining balance payments)
    const { searchParams } = new URL(request.url)
    const amountParam = searchParams.get('amount')
    const isRemainingBalance = searchParams.get('invoiceNumber')?.includes('-FINAL')

    // Load invoice
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    const invoice = invoices.find(inv => inv.invoiceId === params.id || inv.invoiceNumber === params.id)

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid' && !isRemainingBalance) {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      )
    }

    // Determine payment amount
    // If amount is provided in query params (for remaining balance), use that
    // Otherwise, use invoiceAmount if specified (for split payments), or total
    let paymentAmount: number
    if (amountParam) {
      paymentAmount = parseFloat(amountParam)
    } else if (invoice.invoiceAmount) {
      paymentAmount = invoice.invoiceAmount
    } else {
      paymentAmount = invoice.total
    }

    // For remaining balance payments, calculate 20% if not provided
    if (isRemainingBalance && !amountParam && invoice.invoiceType === 'downpayment') {
      paymentAmount = Math.round(invoice.total * 0.2)
    }

    // Generate Paystack payment link
    const baseUrl = normalizeBaseUrl()
    const paymentResult = await initializeTransaction({
      email: invoice.email,
      amount: paymentAmount,
      currency: invoice.currency || 'KES',
      metadata: {
        payment_type: isRemainingBalance ? 'invoice_remaining_balance' : 'invoice',
        invoice_id: invoice.invoiceId,
        invoice_number: invoice.invoiceNumber,
        invoice_type: invoice.invoiceType || 'full',
        payment_stage: isRemainingBalance ? 'final_20' : (invoice.invoiceType === 'downpayment' ? 'upfront_80' : 'full'),
      },
      customerName: invoice.contactName || invoice.businessName,
      phone: invoice.phone,
      callbackUrl: `${baseUrl}/api/paystack/callback`,
    })

    if (!paymentResult.success || !paymentResult.authorizationUrl) {
      return NextResponse.json(
        { 
          error: paymentResult.error || 'Failed to generate payment link',
        },
        { status: 500 }
      )
    }

    // Redirect to Paystack payment page
    return NextResponse.redirect(paymentResult.authorizationUrl)
  } catch (error: any) {
    console.error('Error generating payment link:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate payment link',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

