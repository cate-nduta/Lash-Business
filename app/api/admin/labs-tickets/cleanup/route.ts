import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { getAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// POST - Manually trigger cleanup of old tickets (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Manual Cleanup] Starting cleanup of old tickets...')
    
    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    const now = new Date()
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000
    
    let deletedCount = 0
    const deletedTickets: Array<{ id: string; subject: string; closedAt: string; createdAt: string }> = []
    const remainingTickets = []
    
    for (const ticket of tickets) {
      // Only delete closed tickets
      if (ticket.status !== 'closed') {
        remainingTickets.push(ticket)
        continue
      }

      // Use updatedAt if available, otherwise use createdAt
      const ticketDate = ticket.updatedAt || ticket.createdAt
      const ticketDateObj = new Date(ticketDate)
      const daysSinceUpdate = now.getTime() - ticketDateObj.getTime()
      
      // Check if it's been more than 30 days since the ticket was closed/updated
      if (daysSinceUpdate > thirtyDaysInMs) {
        deletedTickets.push({
          id: ticket.id,
          subject: ticket.subject,
          closedAt: ticket.updatedAt || ticket.createdAt,
          createdAt: ticket.createdAt,
        })
        deletedCount++
        continue
      }
      
      // Keep the ticket
      remainingTickets.push(ticket)
    }
    
    // Update labs-tickets.json with remaining tickets
    if (deletedCount > 0) {
      await writeDataFile('labs-tickets.json', remainingTickets)
    }
    
    return NextResponse.json({
      success: true,
      deletedCount,
      totalTickets: tickets.length,
      remainingTickets: remainingTickets.length,
      deletedTickets: deletedTickets.slice(0, 50),
      message: `Cleanup completed. ${deletedCount} old ticket(s) deleted.`,
    })
  } catch (error: any) {
    console.error('Error cleaning up tickets:', error)
    return NextResponse.json({ error: 'Failed to cleanup tickets' }, { status: 500 })
  }
}















