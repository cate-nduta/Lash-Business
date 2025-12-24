import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'
import { initializeTransaction } from '@/lib/paystack-utils'
import type { Invoice } from '@/types/consultation-workflow'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Generate Paystack payment link for a consultation workflow invoice
 * GET /api/invoices/[id]/payment-link
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Allow both admin and public access (for email links)
  // If admin auth fails, we'll still allow public access for invoice payment links
  let isAdmin = false
  try {
    await requireAdminAuth()
    isAdmin = true
  } catch {
    // Not admin - allow public access for invoice payment links sent via email
    // You can add token validation here later if needed
  }

  try {

    const invoices = await readDataFile<Invoice[]>('invoices.json', [])
    const invoice = invoices.find(inv => inv.id === params.id || inv.invoiceNumber === params.id)

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

    // Check if invoice is expired
    const now = new Date()
    const expiryDate = new Date(invoice.expiryDate)
    if (now > expiryDate) {
      return NextResponse.json(
        { error: 'Invoice has expired' },
        { status: 400 }
      )
    }

    // Determine currency (default to KES for consultation invoices)
    const currency = 'KES' // Consultation invoices are typically in KES

    // Initialize Paystack transaction
    const paymentResult = await initializeTransaction({
      email: invoice.clientEmail.toLowerCase().trim(),
      amount: invoice.amount,
      currency: currency,
      metadata: {
        payment_type: 'invoice',
        invoice_id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        contract_id: invoice.contractId,
        consultation_id: invoice.consultationId,
      },
      customerName: invoice.clientName,
    })

    if (!paymentResult.success || !paymentResult.authorizationUrl) {
      console.error('Paystack initialization failed:', paymentResult.error)
      return NextResponse.json(
        { 
          error: paymentResult.error || 'Failed to initialize payment. Please try again.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      paymentUrl: paymentResult.authorizationUrl,
      authorizationUrl: paymentResult.authorizationUrl, // Alias for consistency
      reference: paymentResult.reference,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      currency: currency,
      message: 'Payment link generated successfully',
    })
  } catch (error: any) {
    if (error.status === 401 && !isAdmin) {
      // For public access, return a more helpful error
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      )
    }
    console.error('Error generating invoice payment link:', error)
    return NextResponse.json(
      { error: 'Failed to generate payment link' },
      { status: 500 }
    )
  }
}

