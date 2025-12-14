import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - List invoices for the authenticated Labs client
export async function GET(request: NextRequest) {
  try {
    // Check Labs client authentication
    const labsSessionCookie = request.cookies.get('labs-session')
    
    if (!labsSessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to view your invoices' },
        { status: 401 }
      )
    }

    let clientEmail: string | null = null
    
    try {
      const sessionData = JSON.parse(decodeURIComponent(labsSessionCookie.value))
      const users = await readDataFile<any[]>('users.json', [])
      const user = users.find((u: any) => u.email === sessionData.email && u.labsAccess)
      
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid session' },
          { status: 401 }
        )
      }
      
      clientEmail = user.email
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      )
    }

    // Load all invoices
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    
    // Filter invoices for this client (by email)
    const clientInvoices = invoices.filter(
      (inv) => inv.email.toLowerCase() === clientEmail!.toLowerCase()
    )

    // Sort by most recent first
    const sorted = [...clientInvoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Add PDF URLs with tokens for each invoice
    const invoicesWithUrls = sorted.map((invoice) => ({
      ...invoice,
      pdfUrl: invoice.viewToken
        ? `/api/labs/invoices/${invoice.invoiceId}/pdf?token=${invoice.viewToken}`
        : `/api/labs/invoices/${invoice.invoiceId}/pdf`, // Will work if client is logged in
    }))

    return NextResponse.json({
      success: true,
      invoices: invoicesWithUrls,
      total: invoicesWithUrls.length,
    })
  } catch (error: any) {
    console.error('Error loading client invoices:', error)
    return NextResponse.json(
      { error: 'Failed to load invoices', invoices: [], total: 0 },
      { status: 500 }
    )
  }
}

