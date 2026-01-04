import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ClientUsersData, ClientData } from '@/types/client'
import { unlink } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data')

/**
 * Cleanup inactive client accounts that haven't booked within 7 days of signup
 * This endpoint should be called periodically (e.g., via cron job or scheduled task)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here if needed
    // For now, we'll allow it to be called by anyone (you can add auth later)
    
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
    const now = new Date()
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
    
    let deletedCount = 0
    const deletedUsers: Array<{ email: string; createdAt: string; reason: string }> = []
    const remainingUsers = []
    
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
            } catch (fileError: any) {
              // File might not exist, that's okay
              if (fileError.code !== 'ENOENT') {
                console.error(`Error deleting client data file for ${user.email}:`, fileError)
              }
            }
            
            deletedUsers.push({
              email: user.email,
              createdAt: user.createdAt,
              reason: 'No bookings within 7 days of account creation',
            })
            deletedCount++
            continue // Skip adding to remainingUsers
          }
        } catch (error) {
          // If we can't read client data, assume no bookings and delete
          console.error(`Error checking client data for ${user.email}:`, error)
          deletedUsers.push({
            email: user.email,
            createdAt: user.createdAt,
            reason: 'Error checking bookings - account deleted',
          })
          deletedCount++
          continue
        }
      }
      
      // Keep the user
      remainingUsers.push(user)
    }
    
    // Update users.json with remaining users
    await writeDataFile('users.json', { users: remainingUsers })
    
    return NextResponse.json({
      success: true,
      deletedCount,
      totalUsers: usersData.users.length,
      remainingUsers: remainingUsers.length,
      deletedUsers: deletedUsers.slice(0, 50), // Limit to first 50 for response size
      message: `Cleanup completed. ${deletedCount} inactive account(s) deleted.`,
    })
  } catch (error: any) {
    console.error('Error cleaning up inactive accounts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup inactive accounts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check how many accounts would be deleted (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
    const now = new Date()
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
    
    const accountsToDelete: Array<{ email: string; createdAt: string; daysSinceCreation: number }> = []
    
    for (const user of usersData.users) {
      const createdAt = new Date(user.createdAt)
      const daysSinceCreation = now.getTime() - createdAt.getTime()
      
      if (daysSinceCreation > sevenDaysInMs) {
        try {
          const clientDataFile = `client-${user.id}.json`
          const clientData = await readDataFile<ClientData>(clientDataFile, undefined)
          
          if (!clientData || !clientData.lashHistory || clientData.lashHistory.length === 0) {
            accountsToDelete.push({
              email: user.email,
              createdAt: user.createdAt,
              daysSinceCreation: Math.floor(daysSinceCreation / (24 * 60 * 60 * 1000)),
            })
          }
        } catch (error) {
          // Assume no bookings if we can't read the file
          accountsToDelete.push({
            email: user.email,
            createdAt: user.createdAt,
            daysSinceCreation: Math.floor(daysSinceCreation / (24 * 60 * 60 * 1000)),
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      accountsToDelete: accountsToDelete.length,
      totalUsers: usersData.users.length,
      accounts: accountsToDelete.slice(0, 50), // Limit to first 50
      message: `Found ${accountsToDelete.length} account(s) that would be deleted.`,
    })
  } catch (error: any) {
    console.error('Error checking inactive accounts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check inactive accounts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}













