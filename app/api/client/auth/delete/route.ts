import { NextRequest, NextResponse } from 'next/server'
import { getClientUserId } from '@/lib/client-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ClientUsersData } from '@/types/client'
import { promises as fs } from 'fs'
import path from 'path'

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getClientUserId()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Load users data
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
    const userIndex = usersData.users.findIndex(u => u.id === userId)

    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Remove user from users list
    usersData.users.splice(userIndex, 1)
    await writeDataFile('users.json', usersData)

    // Delete client data file
    try {
      const dataDir = path.join(process.cwd(), 'data')
      const clientDataFile = path.join(dataDir, `client-${userId}.json`)
      await fs.unlink(clientDataFile).catch(() => {
        // File might not exist, that's okay
      })
    } catch (error) {
      console.error('Error deleting client data file:', error)
      // Continue even if file deletion fails
    }

    // Clear authentication cookies
    const response = NextResponse.json(
      { success: true, message: 'Account deleted successfully' },
      { status: 200 }
    )

    response.cookies.delete('client-auth')
    response.cookies.delete('client-user-id')
    response.cookies.delete('client-last-active')

    return response
  } catch (error: any) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    )
  }
}

