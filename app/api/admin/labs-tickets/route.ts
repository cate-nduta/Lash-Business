import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { getAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET - List all tickets (admin view)
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    
    // Sort by updated date (newest first)
    tickets.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())

    // Count tickets by status
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      unread: tickets.filter(t => {
        if (!t.messages || !Array.isArray(t.messages)) return false
        return t.messages.some((m: any) => m.sender === 'client' && !m.read)
      }).length
    }

    return NextResponse.json({ tickets, stats })
  } catch (error: any) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}













