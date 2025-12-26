/**
 * Automatic Cleanup Cron Job for Old Tickets
 * 
 * This endpoint automatically deletes closed tickets that are older than 30 days.
 * 
 * SETUP FOR AUTOMATIC EXECUTION:
 * 
 * Since most hosting platforms don't have built-in cron jobs, you'll need to use
 * an external cron service. Here are the best options:
 * 
 * OPTION 1: cron-job.org (Free & Recommended)
 * 1. Go to https://cron-job.org and create a free account
 * 2. Click "Create cronjob"
 * 3. Configure:
 *    - Title: "LashDiary Cleanup Old Tickets"
 *    - Address: https://yourdomain.com/api/cron/cleanup-old-tickets
 *    - Schedule: Daily at 3 AM (use cron: "0 3 * * *")
 *    - Request method: GET
 *    - Optional: Add Authorization header if you set CRON_SECRET:
 *      Header name: Authorization
 *      Header value: Bearer YOUR_CRON_SECRET
 * 4. Click "Create cronjob"
 * 
 * OPTION 2: EasyCron (Free tier available)
 * 1. Go to https://www.easycron.com and sign up
 * 2. Create a new cron job:
 *    - URL: https://yourdomain.com/api/cron/cleanup-old-tickets
 *    - Schedule: 0 3 * * * (daily at 3 AM)
 *    - Method: GET
 * 3. Save and activate
 * 
 * OPTION 3: UptimeRobot (Free - monitors + cron)
 * 1. Go to https://uptimerobot.com and sign up
 * 2. Add a new monitor:
 *    - Monitor Type: HTTP(s)
 *    - URL: https://yourdomain.com/api/cron/cleanup-old-tickets
 *    - Monitoring Interval: 1440 minutes (24 hours)
 * 
 * SECURITY (Optional but Recommended):
 * Add to your environment variables:
 * CRON_SECRET=your-random-secret-string-here
 * 
 * Then configure your cron service to send:
 * Authorization: Bearer your-random-secret-string-here
 * 
 * MANUAL TESTING:
 * Visit: https://yourdomain.com/api/cron/cleanup-old-tickets
 * Or use curl:
 * curl https://yourdomain.com/api/cron/cleanup-old-tickets
 * 
 * The system automatically:
 * - Checks all tickets
 * - Deletes closed tickets that are older than 30 days
 * - Logs all deletions for audit purposes
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export async function GET(request: NextRequest) {
  try {
    // Optional: Add a secret token check for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cleanup Cron] Starting cleanup of old tickets...')
    
    const tickets = await readDataFile<any[]>('labs-tickets.json', [])
    const now = new Date()
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000
    
    let deletedCount = 0
    const deletedTickets: Array<{ id: string; subject: string; closedAt: string; createdAt: string }> = []
    const remainingTickets = []
    
    console.log(`[Cleanup Cron] Checking ${tickets.length} tickets...`)
    
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
        const daysOld = Math.floor(daysSinceUpdate / (24 * 60 * 60 * 1000))
        console.log(`[Cleanup Cron] ✅ Deleted ticket: ${ticket.subject} (closed ${daysOld} days ago)`)
        continue // Skip adding to remainingTickets
      } else {
        // Ticket is less than 30 days old, keep it
        const daysRemaining = Math.ceil((thirtyDaysInMs - daysSinceUpdate) / (24 * 60 * 60 * 1000))
        console.log(`[Cleanup Cron] Keeping ticket: ${ticket.subject} (${daysRemaining} day(s) remaining)`)
      }
      
      // Keep the ticket
      remainingTickets.push(ticket)
    }
    
    // Update labs-tickets.json with remaining tickets
    if (deletedCount > 0) {
      await writeDataFile('labs-tickets.json', remainingTickets)
      console.log(`[Cleanup Cron] ✅ Updated labs-tickets.json - removed ${deletedCount} old ticket(s)`)
    }
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      deletedCount,
      totalTickets: tickets.length,
      remainingTickets: remainingTickets.length,
      deletedTickets: deletedTickets.slice(0, 50), // Limit to first 50 for response size
      message: `Cleanup completed. ${deletedCount} old ticket(s) deleted.`,
    }
    
    console.log(`[Cleanup Cron] ✅ Cleanup completed: ${deletedCount} ticket(s) deleted, ${remainingTickets.length} ticket(s) remaining`)
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Cleanup Cron] ❌ Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup old tickets',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for manual cleanup (same as GET, but allows for future expansion)
 */
export async function POST(request: NextRequest) {
  return GET(request)
}








