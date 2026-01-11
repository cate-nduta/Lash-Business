import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

interface HighValueTicket {
  id: string
  name: string
  email: string
  phoneNumber: string
  orderDetails: {
    items: Array<{
      name: string
      price: number
      quantity: number
      setupFee?: number
      billingPeriod?: string
    }>
  }
  totalAmount: number
  createdAt: string
}

interface HighValueTicketsData {
  tickets: HighValueTicket[]
}

// GET: Fetch all high-value tickets
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const data = await readDataFile<HighValueTicketsData>('high-value-tickets.json', { tickets: [] })
    
    // Sort by creation date (newest first)
    const sortedTickets = [...(data.tickets || [])].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return NextResponse.json({ tickets: sortedTickets })
  } catch (error: any) {
    console.error('Error fetching high-value tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch high-value tickets', details: error.message },
      { status: 500 }
    )
  }
}

