import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import crypto from 'crypto'

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

// GET - List tickets for the current labs user
export async function GET(request: NextRequest) {
  try {
    const user = await getLabsUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    const userTickets = tickets.filter(t => t.userId === user.id)
    
    // Sort by created date (newest first)
    userTickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ tickets: userTickets })
  } catch (error: any) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

// POST - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const user = await getLabsUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject, description, priority = 'medium' } = body

    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 })
    }

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    
    const ticketId = `ticket-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const newTicket = {
      id: ticketId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name || user.labsBusinessName || user.email,
      subject,
      description,
      priority: priority || 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [] // Array to store conversation messages
    }

    tickets.push(newTicket)
    await writeDataFile('labs-tickets.json', tickets)

    return NextResponse.json({ ticket: newTicket, message: 'Ticket created successfully' })
  } catch (error: any) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}









