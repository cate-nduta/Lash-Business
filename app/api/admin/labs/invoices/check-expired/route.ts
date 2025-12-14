import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Check for expired invoices and mark them
export async function GET(request: NextRequest) {
  try {
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    const now = new Date()
    let updated = false

    const expiredInvoices: ConsultationInvoice[] = []

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i]
      
      // Only check invoices that have expiration dates and are not already expired/paid
      if (
        invoice.expirationDate &&
        invoice.status !== 'paid' &&
        invoice.status !== 'expired' &&
        invoice.status !== 'cancelled'
      ) {
        const expirationDate = new Date(invoice.expirationDate)
        expirationDate.setHours(23, 59, 59, 999) // End of expiration day

        if (now > expirationDate) {
          invoice.status = 'expired'
          invoice.updatedAt = new Date().toISOString()
          invoices[i] = invoice
          expiredInvoices.push(invoice)
          updated = true
        }
      }
    }

    if (updated) {
      await writeDataFile('labs-invoices.json', invoices)
    }

    return NextResponse.json({
      success: true,
      expiredCount: expiredInvoices.length,
      expiredInvoices: expiredInvoices.map(inv => ({
        invoiceId: inv.invoiceId,
        invoiceNumber: inv.invoiceNumber,
        businessName: inv.businessName,
        email: inv.email,
        expirationDate: inv.expirationDate,
      })),
    })
  } catch (error: any) {
    console.error('Error checking expired invoices:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check expired invoices' },
      { status: 500 }
    )
  }
}

// POST - Manually expire an invoice (admin action)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    const invoiceIndex = invoices.findIndex(
      inv => inv.invoiceId === invoiceId || inv.invoiceNumber === invoiceId
    )

    if (invoiceIndex === -1) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoices[invoiceIndex]

    // Only expire if not already paid or cancelled
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot expire invoice with status: ${invoice.status}` },
        { status: 400 }
      )
    }

    invoice.status = 'expired'
    invoice.updatedAt = new Date().toISOString()
    invoices[invoiceIndex] = invoice
    await writeDataFile('labs-invoices.json', invoices)

    return NextResponse.json({
      success: true,
      message: 'Invoice marked as expired',
      invoice,
    })
  } catch (error: any) {
    console.error('Error expiring invoice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to expire invoice' },
      { status: 500 }
    )
  }
}

