import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { Invoice } from '@/types/consultation-workflow'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET: Check and mark expired invoices
export async function GET(request: NextRequest) {
  try {
    const invoices = await readDataFile<Invoice[]>('invoices.json', [])
    const now = new Date()
    const expired: Invoice[] = []

    const updated = invoices.map(invoice => {
      // Only check invoices that are sent but not paid
      if (invoice.status === 'sent' && !invoice.paidAt) {
        const expiryDate = new Date(invoice.expiryDate)
        if (now > expiryDate) {
          expired.push(invoice)
          return {
            ...invoice,
            status: 'expired' as const,
            updatedAt: new Date().toISOString(),
          }
        }
      }
      return invoice
    })

    if (expired.length > 0) {
      await writeDataFile('invoices.json', updated)
    }

    return NextResponse.json({ 
      expired: expired.length,
      expiredInvoices: expired,
    })
  } catch (error) {
    console.error('Error checking expired invoices:', error)
    return NextResponse.json(
      { error: 'Failed to check expired invoices' },
      { status: 500 }
    )
  }
}

// POST: Manually expire an invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoiceId is required' },
        { status: 400 }
      )
    }

    const invoices = await readDataFile<Invoice[]>('invoices.json', [])
    const index = invoices.findIndex(i => i.id === invoiceId)

    if (index === -1) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoices[index]
    
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot expire a paid invoice' },
        { status: 400 }
      )
    }

    invoices[index] = {
      ...invoice,
      status: 'expired',
      updatedAt: new Date().toISOString(),
    }

    await writeDataFile('invoices.json', invoices)

    return NextResponse.json({ 
      success: true,
      invoice: invoices[index],
    })
  } catch (error) {
    console.error('Error expiring invoice:', error)
    return NextResponse.json(
      { error: 'Failed to expire invoice' },
      { status: 500 }
    )
  }
}

