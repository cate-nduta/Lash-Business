/**
 * Automatic Cleanup Cron Job for Inactive Accounts
 * 
 * This endpoint automatically deletes client accounts that haven't booked
 * an appointment within 7 days of signup.
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
 *    - Title: "LashDiary Cleanup Inactive Accounts"
 *    - Address: https://yourdomain.com/api/cron/cleanup-inactive-accounts
 *    - Schedule: Daily at 2 AM (use cron: "0 2 * * *")
 *    - Request method: GET
 *    - Optional: Add Authorization header if you set CRON_SECRET:
 *      Header name: Authorization
 *      Header value: Bearer YOUR_CRON_SECRET
 * 4. Click "Create cronjob"
 * 
 * OPTION 2: EasyCron (Free tier available)
 * 1. Go to https://www.easycron.com and sign up
 * 2. Create a new cron job:
 *    - URL: https://yourdomain.com/api/cron/cleanup-inactive-accounts
 *    - Schedule: 0 2 * * * (daily at 2 AM)
 *    - Method: GET
 * 3. Save and activate
 * 
 * OPTION 3: UptimeRobot (Free - monitors + cron)
 * 1. Go to https://uptimerobot.com and sign up
 * 2. Add a new monitor:
 *    - Monitor Type: HTTP(s)
 *    - URL: https://yourdomain.com/api/cron/cleanup-inactive-accounts
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
 * Visit: https://yourdomain.com/api/cron/cleanup-inactive-accounts
 * Or use curl:
 * curl https://yourdomain.com/api/cron/cleanup-inactive-accounts
 * 
 * The system automatically:
 * - Checks all user accounts
 * - Deletes accounts created more than 7 days ago with no bookings
 * - Removes associated client data files
 * - Logs all deletions for audit purposes
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ClientUsersData, ClientData } from '@/types/client'
import { unlink } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data')

export async function GET(request: NextRequest) {
  try {
    // Optional: Add a secret token check for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cleanup Cron] Starting cleanup of inactive accounts...')
    
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
    const now = new Date()
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
    
    let deletedCount = 0
    const deletedUsers: Array<{ email: string; createdAt: string; reason: string }> = []
    const remainingUsers = []
    
    console.log(`[Cleanup Cron] Checking ${usersData.users.length} user accounts...`)
    
    for (const user of usersData.users) {
      const createdAt = new Date(user.createdAt)
      const daysSinceCreation = now.getTime() - createdAt.getTime()
      
      // Check if it's been more than 7 days since account creation
      if (daysSinceCreation > sevenDaysInMs) {
        // Check if user has any bookings
        try {
          const clientDataFile = `client-${user.id}.json`
          const clientData = await readDataFile<ClientData>(clientDataFile, undefined)
          
          // If user has no lash history (no bookings), delete the account
          if (!clientData || !clientData.lashHistory || clientData.lashHistory.length === 0) {
            // Delete client data file
            try {
              const filePath = join(DATA_DIR, clientDataFile)
              await unlink(filePath)
              console.log(`[Cleanup Cron] Deleted client data file for ${user.email}`)
            } catch (fileError: any) {
              // File might not exist, that's okay
              if (fileError.code !== 'ENOENT') {
                console.error(`[Cleanup Cron] Error deleting client data file for ${user.email}:`, fileError)
              }
            }
            
            deletedUsers.push({
              email: user.email,
              createdAt: user.createdAt,
              reason: 'No bookings within 7 days of account creation',
            })
            deletedCount++
            console.log(`[Cleanup Cron] ✅ Deleted account: ${user.email} (created ${Math.floor(daysSinceCreation / (24 * 60 * 60 * 1000))} days ago)`)
            continue // Skip adding to remainingUsers
          } else {
            // User has bookings, keep the account
            console.log(`[Cleanup Cron] Keeping account: ${user.email} (has ${clientData.lashHistory.length} booking(s))`)
          }
        } catch (error) {
          // If we can't read client data, assume no bookings and delete
          console.error(`[Cleanup Cron] Error checking client data for ${user.email}:`, error)
          deletedUsers.push({
            email: user.email,
            createdAt: user.createdAt,
            reason: 'Error checking bookings - account deleted',
          })
          deletedCount++
          console.log(`[Cleanup Cron] ✅ Deleted account: ${user.email} (error reading data)`)
          continue
        }
      } else {
        // Account is less than 7 days old, keep it
        const daysRemaining = Math.ceil((sevenDaysInMs - daysSinceCreation) / (24 * 60 * 60 * 1000))
        console.log(`[Cleanup Cron] Keeping account: ${user.email} (${daysRemaining} day(s) remaining)`)
      }
      
      // Keep the user
      remainingUsers.push(user)
    }
    
    // Update users.json with remaining users
    if (deletedCount > 0) {
      await writeDataFile('users.json', { users: remainingUsers })
      console.log(`[Cleanup Cron] ✅ Updated users.json - removed ${deletedCount} inactive account(s)`)
    }
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      deletedCount,
      totalUsers: usersData.users.length,
      remainingUsers: remainingUsers.length,
      deletedUsers: deletedUsers.slice(0, 50), // Limit to first 50 for response size
      message: `Cleanup completed. ${deletedCount} inactive account(s) deleted.`,
    }
    
    console.log(`[Cleanup Cron] ✅ Cleanup completed: ${deletedCount} account(s) deleted, ${remainingUsers.length} account(s) remaining`)
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Cleanup Cron] ❌ Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup inactive accounts',
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
















