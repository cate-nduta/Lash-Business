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

// GET - Get all messages for the current labs user
export async function GET(request: NextRequest) {
  try {
    const user = await getLabsUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    const userTickets = tickets.filter(t => t.userId === user.id)
    
    // Collect all messages from user's tickets
    const allMessages: any[] = []
    userTickets.forEach(ticket => {
      if (ticket.messages && Array.isArray(ticket.messages)) {
        ticket.messages.forEach((msg: any) => {
          allMessages.push({
            ...msg,
            ticketId: ticket.id,
            ticketSubject: ticket.subject,
            ticketStatus: ticket.status
          })
        })
      }
    })

    // Sort by created date (newest first)
    allMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Count unread messages
    const unreadCount = allMessages.filter(m => m.sender === 'admin' && !m.read).length

    return NextResponse.json({ 
      messages: allMessages,
      unreadCount 
    })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// PATCH - Mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await getLabsUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messageIds, ticketId } = body

    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    let updated = false

    // If ticketId is provided, mark all admin messages in that ticket as read
    if (ticketId) {
      const ticketIndex = tickets.findIndex(t => t.id === ticketId && t.userId === user.id)
      if (ticketIndex !== -1) {
        const ticket = tickets[ticketIndex]
        if (ticket.messages && Array.isArray(ticket.messages)) {
          ticket.messages.forEach((msg: any) => {
            if (msg.sender === 'admin' && !msg.read) {
              msg.read = true
              updated = true
            }
          })
          tickets[ticketIndex] = ticket
        }
      }
    } 
    // If messageIds are provided, mark specific messages as read
    else if (messageIds && Array.isArray(messageIds)) {
      tickets.forEach((ticket, ticketIndex) => {
        if (ticket.userId === user.id && ticket.messages && Array.isArray(ticket.messages)) {
          ticket.messages.forEach((msg: any) => {
            if (messageIds.includes(msg.id) && msg.sender === 'admin' && !msg.read) {
              msg.read = true
              updated = true
            }
          })
          tickets[ticketIndex] = ticket
        }
      })
    }

    if (updated) {
      await writeDataFile('labs-tickets.json', tickets)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 })
  }
}









