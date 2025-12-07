import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ClientUsersData } from '@/types/client'
import { sanitizeEmail, sanitizeText, ValidationError } from '@/lib/input-validation'

// Generate a 7-character verification code with numbers, letters, and punctuation
function generateVerificationCode(): string {
  const numbers = '0123456789'
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz' // Excluding confusing characters
  const punctuation = '!@#$%&*'
  const allChars = numbers + letters + punctuation
  
  // Ensure at least one of each type
  let code = ''
  code += numbers[Math.floor(Math.random() * numbers.length)]
  code += letters[Math.floor(Math.random() * letters.length)]
  code += punctuation[Math.floor(Math.random() * punctuation.length)]
  
  // Fill the rest randomly
  for (let i = code.length; i < 7; i++) {
    code += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the code
  return code.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Verify email with verification code
 * POST /api/client/verify-email
 * Body: { email: string, code: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail, code: rawCode } = body

    if (!rawEmail || !rawCode) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    let email: string
    let code: string

    try {
      email = sanitizeEmail(rawEmail)
      code = sanitizeText(rawCode, { fieldName: 'Verification code', maxLength: 10 })
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    const normalizedEmail = email.toLowerCase().trim()
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })

    // Find user by email
    const user = usersData.users.find(u => u.email.toLowerCase().trim() === normalizedEmail)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please complete your booking first.' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        verified: true,
      })
    }

    // Check if verification code exists
    if (!user.verificationCode) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new code.' },
        { status: 400 }
      )
    }

    // Check if code has expired
    if (user.verificationCodeExpires) {
      const expiresAt = new Date(user.verificationCodeExpires)
      const now = new Date()
      if (now > expiresAt) {
        return NextResponse.json(
          { error: 'Verification code has expired. Please request a new code.' },
          { status: 400 }
        )
      }
    }

    // Verify the code (case-sensitive)
    if (user.verificationCode !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please check and try again.' },
        { status: 400 }
      )
    }

    // Code is valid - mark email as verified
    user.emailVerified = true
    user.verificationCode = undefined // Clear the code after verification
    user.verificationCodeExpires = undefined

    // Update users.json
    await writeDataFile('users.json', usersData)

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      verified: true,
    })
  } catch (error: any) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Resend verification code
 * POST /api/client/verify-email/resend
 * Body: { email: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail } = body

    if (!rawEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    let email: string
    try {
      email = sanitizeEmail(rawEmail)
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    const normalizedEmail = email.toLowerCase().trim()
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })

    // Find user by email
    const user = usersData.users.find(u => u.email.toLowerCase().trim() === normalizedEmail)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please complete your booking first.' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        verified: true,
      })
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode()
    const verificationExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes

    // Update user with new code
    user.verificationCode = verificationCode
    user.verificationCodeExpires = verificationExpires

    await writeDataFile('users.json', usersData)

    // Send verification code email
    const { sendVerificationCodeEmail } = await import('../../booking/email/utils')
    try {
      await sendVerificationCodeEmail({
        name: user.name,
        email: normalizedEmail,
        code: verificationCode,
      })
      console.log(`Verification code resent to ${normalizedEmail}`)
    } catch (emailError) {
      console.error('Error sending verification code email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification code email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code resent successfully',
    })
  } catch (error: any) {
    console.error('Error resending verification code:', error)
    return NextResponse.json(
      {
        error: 'Failed to resend verification code',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

