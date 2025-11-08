import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { verifyInviteToken } from '@/lib/password-utils'

interface AdminInvite {
  id: string
  email: string
  name: string
  role: 'admin'
  tokenHash: string
  expiresAt: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required.' }, { status: 400 })
    }

    const data = await readDataFile<{ invites: AdminInvite[] }>('admin-invites.json', { invites: [] })
    const invites = data.invites || []

    const invite = invites.find((item) => {
      if (item.status !== 'pending' || !item.tokenHash) {
        return false
      }
      const expiresAtMs = new Date(item.expiresAt).getTime()
      if (Number.isNaN(expiresAtMs) || expiresAtMs < Date.now()) {
        return false
      }
      return verifyInviteToken(token, item.tokenHash)
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite is invalid, expired, or already used.' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error) {
    console.error('Error validating admin invite:', error)
    return NextResponse.json({ error: 'Failed to validate invite.' }, { status: 500 })
  }
}


