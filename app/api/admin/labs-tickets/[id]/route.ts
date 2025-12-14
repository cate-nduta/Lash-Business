import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { getAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET - Get a specific ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    const ticket = tickets.find(t => t.id === params.id)

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Mark all client messages as read when admin views the ticket
    if (ticket.messages && Array.isArray(ticket.messages)) {
      let updated = false
      ticket.messages.forEach((msg: any) => {
        if (msg.sender === 'client' && !msg.read) {
          msg.read = true
          updated = true
        }
      })

      if (updated) {
        const ticketIndex = tickets.findIndex(t => t.id === params.id)
        tickets[ticketIndex] = ticket
        await writeDataFile('labs-tickets.json', tickets)
      }
    }

    return NextResponse.json({ ticket })
  } catch (error: any) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 })
  }
}

// POST - Respond to a ticket (admin sends message)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, status } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    const ticketIndex = tickets.findIndex(t => t.id === params.id)

    if (ticketIndex === -1) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const ticket = tickets[ticketIndex]
    
    // Initialize messages array if it doesn't exist
    if (!ticket.messages) {
      ticket.messages = []
    }

    // Add admin message
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: 'admin',
      senderName: admin.username || 'Admin',
      content: message.trim(),
      createdAt: new Date().toISOString(),
      read: false
    }

    ticket.messages.push(newMessage)
    ticket.updatedAt = new Date().toISOString()
    
    // Update status if provided
    if (status && ['open', 'closed'].includes(status)) {
      ticket.status = status
    }

    tickets[ticketIndex] = ticket
    await writeDataFile('labs-tickets.json', tickets)

    return NextResponse.json({ message: newMessage, ticket })
  } catch (error: any) {
    console.error('Error responding to ticket:', error)
    return NextResponse.json({ error: 'Failed to respond to ticket' }, { status: 500 })
  }
}

// PATCH - Update ticket status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['open', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
    }

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    const ticketIndex = tickets.findIndex(t => t.id === params.id)

    if (ticketIndex === -1) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    tickets[ticketIndex].status = status
    tickets[ticketIndex].updatedAt = new Date().toISOString()
    
    await writeDataFile('labs-tickets.json', tickets)

    return NextResponse.json({ ticket: tickets[ticketIndex] })
  } catch (error: any) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}

