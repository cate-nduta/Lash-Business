import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { hashPassword } from '@/lib/password-utils'
import { sanitizeEmail } from '@/lib/input-validation'
import type { ClientUsersData } from '@/types/client'

// CRITICAL: No caching for password reset - always use fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password: rawPassword } = body

    if (!token || !rawPassword) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    const password = rawPassword.toString().trim()
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
    const now = new Date()

    // Find user with valid reset token
    let userFound = false
    let userEmail = ''
    
    for (const user of usersData.users) {
      if (!user.resetTokens || !Array.isArray(user.resetTokens)) {
        continue
      }

      const validToken = user.resetTokens.find(
        (t) => t.token === token && !t.used && new Date(t.expiresAt) > now
      )

      if (validToken) {
        // Mark token as used
        validToken.used = true

        // Update password
        user.passwordHash = hashPassword(password)
        userEmail = user.email

        // Clean up old used tokens (older than 24 hours)
        user.resetTokens = user.resetTokens.filter((t) => {
          if (t.used) {
            const tokenDate = new Date(t.expiresAt)
            return now.getTime() - tokenDate.getTime() < 24 * 60 * 60 * 1000
          }
          return new Date(t.expiresAt) > now
        })

        userFound = true
        break
      }
    }

    if (!userFound) {
      console.error('❌ Password reset failed: Invalid or expired token')
      console.error('Token used:', token)
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset link.' },
        { status: 400 }
      )
    }
    
    console.log('✅ Password reset successful for user:', userEmail)

    await writeDataFile('users.json', usersData)

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}

