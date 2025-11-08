import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'lashdiary2025'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const body = await request.json()
    const { currentPassword, newPassword } = body
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }
    
    // Verify current password
    if (currentPassword !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
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
    
    // Update .env.local file
    try {
      const envPath = path.join(process.cwd(), '.env.local')
      let envContent = ''
      
      // Read existing .env.local if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8')
      }
      
      // Update or add ADMIN_PASSWORD
      const lines = envContent.split('\n')
      let passwordLineFound = false
      
      const updatedLines = lines.map(line => {
        if (line.startsWith('ADMIN_PASSWORD=')) {
          passwordLineFound = true
          return `ADMIN_PASSWORD=${newPassword}`
        }
        return line
      })
      
      // If ADMIN_PASSWORD line wasn't found, add it
      if (!passwordLineFound) {
        updatedLines.push(`ADMIN_PASSWORD=${newPassword}`)
      }
      
      // Write back to .env.local
      fs.writeFileSync(envPath, updatedLines.join('\n'))
      
      return NextResponse.json({
        success: true,
        message: 'Password changed successfully. Please restart your server for changes to take effect.',
      })
    } catch (fileError) {
      console.error('Error updating .env.local:', fileError)
      return NextResponse.json(
        { error: 'Failed to update password file. You may need to manually edit .env.local' },
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

