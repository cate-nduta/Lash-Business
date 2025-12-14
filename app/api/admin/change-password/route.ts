import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { hashPassword, verifyPassword } from '@/lib/password-utils'

// Fallback to env variable for backward compatibility
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'lashdiary2025'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { currentPassword, newPassword, confirmPassword } = body
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }
    
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirm password do not match' },
        { status: 400 }
      )
    }
    
    // Validate new password
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }
    
    // Try to verify password from admins.json first
    let passwordValid = false
    try {
      const data = await readDataFile<{ admins: any[] }>('admins.json', { admins: [] })
      const admins = data.admins || []
      
      // Find the current user's admin record
      const admin = admins.find(a => 
        a && (a.username === currentUser.username || a.email === currentUser.username)
      )
      
      if (admin) {
        // Check password from admin record
        if (admin.passwordHash) {
          passwordValid = verifyPassword(currentPassword, admin.passwordHash)
        } else if (admin.password) {
          passwordValid = admin.password === currentPassword
        }
      }
    } catch (error) {
      console.log('Could not read admins.json, trying env password')
    }
    
    // Fallback to env password if not found in admins.json
    if (!passwordValid) {
      passwordValid = currentPassword === ADMIN_PASSWORD
    }
    
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }
    
    // Update password in admins.json (works in production!)
    try {
      const data = await readDataFile<{ admins: any[] }>('admins.json', { admins: [] })
      const admins = data.admins || []
      
      // Find and update the admin record
      const adminIndex = admins.findIndex(a => 
        a && (a.username === currentUser.username || a.email === currentUser.username)
      )
      
      if (adminIndex >= 0) {
        // Update existing admin password
        const hashedPassword = hashPassword(newPassword)
        admins[adminIndex] = {
          ...admins[adminIndex],
          passwordHash: hashedPassword,
          password: undefined, // Remove plain password if it exists
          updatedAt: new Date().toISOString(),
        }
      } else {
        // Create new admin record if it doesn't exist (for owner)
        const hashedPassword = hashPassword(newPassword)
        admins.push({
          id: `admin-${Date.now()}`,
          username: currentUser.username || 'owner',
          email: currentUser.username === 'owner' ? 'hello@lashdiary.co.ke' : currentUser.username,
          role: currentUser.role || 'owner',
          passwordHash: hashedPassword,
          canManageAdmins: currentUser.canManageAdmins || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      
      // Save updated admins
      await writeDataFile('admins.json', { admins })
      
      return NextResponse.json({
        success: true,
        message: 'Password changed successfully! You can now use your new password to log in.',
      })
    } catch (fileError) {
      console.error('Error updating password in admins.json:', fileError)
      return NextResponse.json(
        { error: 'Failed to update password. Please try again or contact support.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error changing password:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}

