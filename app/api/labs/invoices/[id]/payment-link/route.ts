import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'
import { generateInvoicePaymentLink } from '@/lib/pesapal-invoice-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Generate PesaPal payment link for an invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      )
    }

    // Generate payment link using shared utility
    const result = await generateInvoicePaymentLink({
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      currency: invoice.currency,
      email: invoice.email,
      phone: invoice.phone,
      contactName: invoice.contactName,
      address: invoice.address,
      businessName: invoice.businessName,
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to generate payment link',
          details: result.details,
        },
        { status: result.error === 'PesaPal API credentials not configured' ? 503 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      orderTrackingId: result.orderTrackingId,
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      currency: invoice.currency,
    })
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

