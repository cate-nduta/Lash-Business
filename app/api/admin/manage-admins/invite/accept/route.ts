import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { hashPassword, verifyInviteToken } from '@/lib/password-utils'
import { recordActivity } from '@/lib/activity-log'

interface Admin {
  id: string
  username: string
  email: string
  role: 'owner' | 'admin'
  createdAt: string
  canManageAdmins: boolean
  password?: string
  passwordHash?: string
}

interface AdminInvite {
  id: string
  email: string
  name: string
  role: 'admin'
  tokenHash: string
  expiresAt: string
  createdAt: string
  invitedBy: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  acceptedAt?: string | null
  acceptedBy?: string | null
  lastSentAt?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { token, username, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invite token is required.' }, { status: 400 })
    }

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json({ error: 'Please choose a username with at least 3 characters.' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const invitesData = await readDataFile<{ invites: AdminInvite[] }>('admin-invites.json', { invites: [] })
    const invites = invitesData.invites || []

    const invite = invites.find((item) => {
      if (item.status !== 'pending' || !item.tokenHash) {
        return false
      }
      const expiresAt = new Date(item.expiresAt)
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
        return false
      }
      return verifyInviteToken(token, item.tokenHash)
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite is invalid, expired, or already used.' }, { status: 400 })
    }

    const adminsData = await readDataFile<{ admins: Admin[] }>('admins.json', { admins: [] })
    const admins = adminsData.admins || []

    if (admins.length >= 3) {
      return NextResponse.json({ error: 'Admin limit reached. Contact the owner to remove an admin.' }, { status: 400 })
    }

    const normalizedUsername = username.trim()
    const usernameExists = admins.some((admin) => admin.username.toLowerCase() === normalizedUsername.toLowerCase())
    if (usernameExists) {
      return NextResponse.json({ error: 'This username is already taken. Please choose another.' }, { status: 400 })
    }

    const emailExists = admins.some((admin) => admin.email.toLowerCase() === invite.email.toLowerCase())
    if (emailExists) {
      return NextResponse.json({ error: 'An admin with this email already exists.' }, { status: 400 })
    }

    const passwordHash = hashPassword(password)
    const newAdmin: Admin = {
      id: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      username: normalizedUsername,
      email: invite.email,
      role: invite.role,
      createdAt: new Date().toISOString(),
      canManageAdmins: false,
      passwordHash,
    }

    admins.push(newAdmin)
    await writeDataFile('admins.json', { admins })

    invite.status = 'accepted'
    invite.acceptedAt = new Date().toISOString()
    invite.acceptedBy = normalizedUsername
    invite.tokenHash = ''
    await writeDataFile('admin-invites.json', { invites })

    await recordActivity({
      module: 'admins',
      action: 'invite',
      performedBy: normalizedUsername,
      summary: `Accepted admin invite for ${invite.email}`,
      targetId: newAdmin.id,
      targetType: 'admin',
      details: {
        email: invite.email,
        invitedBy: invite.invitedBy,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error accepting admin invite:', error)
    return NextResponse.json({ error: 'Failed to accept invitation.' }, { status: 500 })
  }
}


