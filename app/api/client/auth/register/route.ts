import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { hashPassword } from '@/lib/password-utils'
import { sanitizeEmail, sanitizeText, sanitizePhone, ValidationError } from '@/lib/input-validation'
import type { ClientProfile, ClientUsersData, ClientData } from '@/types/client'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail, password: rawPassword, name: rawName, phone: rawPhone, birthday: rawBirthday } = body

    if (!rawEmail || !rawPassword || !rawName || !rawPhone) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate inputs
    let email: string
    let name: string
    let phone: string
    let password: string

    try {
      email = sanitizeEmail(rawEmail)
      name = sanitizeText(rawName, { fieldName: 'Name', maxLength: 80 })
      phone = sanitizePhone(rawPhone)
      password = rawPassword.toString().trim()
      
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        )
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    // Check if user already exists
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
    const normalizedEmail = email.toLowerCase().trim()
    
    const existingUser = usersData.users.find(
      (u) => u.email.toLowerCase().trim() === normalizedEmail
    )

    // If user exists but has no password (created from booking), allow them to set password
    if (existingUser) {
      if (existingUser.passwordHash && existingUser.passwordHash.length > 0) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 400 }
        )
      }
      // User exists but no password - update with password
      existingUser.passwordHash = hashPassword(password)
      existingUser.name = name // Update name if changed
      existingUser.phone = phone // Update phone if changed
      existingUser.emailVerified = true // Mark email as verified when registering
      if (rawBirthday && typeof rawBirthday === 'string' && rawBirthday.trim()) {
        existingUser.birthday = rawBirthday.trim()
      }
      
      await writeDataFile('users.json', usersData)
      
      // Also update client data file if it exists
      try {
        const clientDataFile = `client-${existingUser.id}.json`
        const clientData = await readDataFile<ClientData>(clientDataFile, undefined)
        if (clientData && clientData.profile) {
          clientData.profile.birthday = existingUser.birthday
          await writeDataFile(clientDataFile, clientData)
        }
      } catch (error) {
        // Client data file might not exist yet, that's okay
      }

      // Set authentication cookies
      const response = NextResponse.json(
        {
          success: true,
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
          },
        },
        { status: 200 }
      )

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      }

      response.cookies.set('client-auth', 'authenticated', cookieOptions)
      response.cookies.set('client-user-id', existingUser.id, cookieOptions)
      response.cookies.set('client-last-active', String(Date.now()), cookieOptions)

      return response
    }

    // Create new user
    const userId = randomBytes(16).toString('hex')
    const passwordHash = hashPassword(password)
    const now = new Date().toISOString()

    const newProfile: ClientProfile = {
      id: userId,
      email: normalizedEmail,
      name,
      phone,
      passwordHash,
      createdAt: now,
      isActive: true,
      emailVerified: true, // Email is verified when registering
      birthday: rawBirthday && typeof rawBirthday === 'string' && rawBirthday.trim() ? rawBirthday.trim() : undefined,
    }

    // Create full client data structure
    const newClientData: ClientData = {
      profile: newProfile,
      lashHistory: [],
      preferences: {
        preferredCurl: null,
        lengthRange: null,
        densityLevel: null,
        eyeShape: null,
        mappingStyle: null,
        signatureLook: null,
      },
      allergies: {
        hasReaction: false,
      },
      aftercare: {},
      lashMaps: [],
      retentionCycles: [],
    }

    // Save user profile
    usersData.users.push(newProfile)
    await writeDataFile('users.json', usersData)

    // Save full client data
    const clientDataFile = `client-${userId}.json`
    await writeDataFile(clientDataFile, newClientData)

    // Set authentication cookies
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email: normalizedEmail,
          name,
        },
      },
      { status: 201 }
    )

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    }

    response.cookies.set('client-auth', 'authenticated', cookieOptions)
    response.cookies.set('client-user-id', userId, cookieOptions)
    response.cookies.set('client-last-active', String(Date.now()), cookieOptions)

    return response
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}

