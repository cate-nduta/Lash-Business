import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

// Get current labs user from session
async function getLabsUser(request: NextRequest) {
  const sessionCookie = request.cookies.get('labs-session')
  if (!sessionCookie) return null

  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie.value))
    const users = await readDataFile<any[]>('users.json', [])
    const user = users.find(u => u.email === sessionData.email && u.labsAccess)
    return user
  } catch {
    return null
  }
}

// GET - Get a specific ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getLabsUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    const ticket = tickets.find(t => t.id === params.id && t.userId === user.id)

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error: any) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 })
  }
}

// POST - Add a message to a ticket (client response)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getLabsUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    const ticketIndex = tickets.findIndex(t => t.id === params.id && t.userId === user.id)

    if (ticketIndex === -1) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const ticket = tickets[ticketIndex]
    
    // Initialize messages array if it doesn't exist
    if (!ticket.messages) {
      ticket.messages = []
    }

    // Add client message
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: 'client',
      senderName: user.name || user.labsBusinessName || user.email,
      content: message.trim(),
      createdAt: new Date().toISOString(),
      read: false
    }

    ticket.messages.push(newMessage)
    ticket.updatedAt = new Date().toISOString()
    ticket.status = 'open' // Reopen if it was closed

    tickets[ticketIndex] = ticket
    await writeDataFile('labs-tickets.json', tickets)

    return NextResponse.json({ message: newMessage, ticket })
  } catch (error: any) {
    console.error('Error adding message to ticket:', error)
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
  }
}

