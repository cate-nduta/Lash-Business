import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { generateInviteToken, hashInviteToken } from '@/lib/password-utils'
import { requireOwnerAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'

interface Admin {
  id: string
  username: string
  email: string
  role: 'owner' | 'admin'
  createdAt: string
  canManageAdmins: boolean
}

type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

interface AdminInvite {
  id: string
  email: string
  name: string
  role: 'admin'
  tokenHash: string
  expiresAt: string
  createdAt: string
  invitedBy: string
  status: InviteStatus
  acceptedAt?: string | null
  acceptedBy?: string | null
  revokedAt?: string | null
  revokedBy?: string | null
  lastSentAt?: string | null
  lastTokenIssuedAt?: string | null
  expiredAt?: string | null
}

const INVITE_EXPIRY_HOURS = 72

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function getBaseUrl(request: NextRequest) {
  return (
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    'http://localhost:3000'
  )
}

async function loadInvites() {
  const data = await readDataFile<{ invites: AdminInvite[] }>('admin-invites.json', { invites: [] })
  const invites = data.invites || []
  const now = Date.now()
  let dirty = false

  invites.forEach((invite) => {
    if (invite.status === 'pending' && invite.expiresAt) {
      const expiresAtMs = new Date(invite.expiresAt).getTime()
      if (expiresAtMs < now) {
        invite.status = 'expired'
        invite.expiredAt = invite.expiredAt || new Date().toISOString()
        invite.tokenHash = ''
        dirty = true
      }
    }
  })

  if (dirty) {
    await writeDataFile('admin-invites.json', { invites })
  }

  return invites
}

async function saveInvites(invites: AdminInvite[]) {
  await writeDataFile('admin-invites.json', { invites })
}

async function sendInviteEmail(invite: AdminInvite, token: string, request: NextRequest) {
  const baseUrl = getBaseUrl(request)
  const inviteLink = `${baseUrl.replace(/\/$/, '')}/admin/invite/${token}`

  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Unable to send admin invite email.')
    return { sent: false, error: 'Email service not configured' }
  }

  const subject = `You have been invited to manage Lash Diary`
  const emailHtml = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #fdf8f9; padding: 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background: #ffffff; border-radius: 24px; padding: 48px; border: 1px solid #f4dfe5; box-shadow: 0 18px 48px -18px rgba(207, 130, 150, 0.35);">
              <tr>
                <td>
                  <p style="font-size: 16px; color: #8d4b63; margin: 0 0 12px; letter-spacing: 0.08em; text-transform: uppercase;">Admin Invitation</p>
                  <h1 style="font-size: 28px; color: #3b262f; margin: 0 0 24px;">Hi ${invite.name || 'there'},</h1>
                  <p style="font-size: 16px; color: #4a353d; line-height: 1.6; margin: 0 0 24px;">
                    You have been invited to join the Lash Diary admin team. Use the button below to create your admin account and set your password.
                  </p>
                  <table role="presentation" style="margin: 32px 0;">
                    <tr>
                      <td>
                        <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #9b1c31 0%, #b82c42 100%); color: #ffffff; padding: 14px 32px; border-radius: 999px; font-size: 16px; font-weight: 600; text-decoration: none; box-shadow: 0 12px 30px -12px rgba(155, 28, 49, 0.5);">Accept Invitation</a>
                      </td>
                    </tr>
                  </table>
                  <p style="font-size: 14px; color: #6c535c; line-height: 1.6; margin: 0 0 16px;">
                    This invite will expire in ${INVITE_EXPIRY_HOURS} hours. If you weren’t expecting this email, you can safely ignore it.
                  </p>
                  <p style="font-size: 14px; color: #a27886; line-height: 1.6; margin: 32px 0 0;">
                    — Lash Diary Admin Team
                  </p>
                </td>
              </tr>
            </table>
            <p style="font-size: 12px; color: #a27886; margin: 24px 0 0;">If the button doesn’t work, copy and paste this link into your browser:<br/><span style="color: #8d4b63;">${inviteLink}</span></p>
          </td>
        </tr>
      </table>
    </div>
  `

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Lash Diary Admin <no-reply@lashdiary.com>',
      to: invite.email,
      replyTo: process.env.CALENDAR_EMAIL || process.env.FROM_EMAIL || 'hello@lashdiary.co.ke',
      subject,
      html: emailHtml,
    })

    if (response.error) {
      console.error('Failed to send invite email:', response.error)
      return { sent: false, error: response.error.message }
    }

    return { sent: true }
  } catch (error: any) {
    console.error('Error sending invite email:', error)
    return { sent: false, error: error?.message || 'Unknown error sending invite' }
  }
}

function sanitizeInvite(invite: AdminInvite) {
  const { tokenHash, ...rest } = invite
  return rest
}

export async function GET(request: NextRequest) {
  try {
    await requireOwnerAuth()
    const invites = (await loadInvites()).map(sanitizeInvite)
    return NextResponse.json({ invites })
  } catch (error: any) {
    if (error?.message === 'Owner access required' || error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching admin invites:', error)
    return NextResponse.json({ error: 'Failed to fetch admin invites' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwnerAuth()
    const currentUser = await getAdminUser()
    const body = await request.json()
    const { action } = body

    const adminsData = await readDataFile<{ admins: Admin[] }>('admins.json', { admins: [] })
    const admins = adminsData.admins || []
    const invites = await loadInvites()

    if (action === 'create') {
      const { email, name } = body as { email: string; name?: string }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })
      }

      if (admins.length >= 3) {
        return NextResponse.json({ error: 'Maximum of 3 admins allowed.' }, { status: 400 })
      }

      const existingAdmin = admins.find((admin) => admin.email.toLowerCase() === email.trim().toLowerCase())
      if (existingAdmin) {
        return NextResponse.json({ error: 'An admin with this email already exists.' }, { status: 400 })
      }

      const now = new Date()
      const pendingInvites = invites.filter((invite) => invite.status === 'pending')

      if (admins.length + pendingInvites.length >= 3) {
        return NextResponse.json({ error: 'Invite limit reached. Revoke a pending invite or remove an admin.' }, { status: 400 })
      }

      const normalizedEmail = email.trim().toLowerCase()
      const existingInvite = invites.find(
        (invite) => invite.email.toLowerCase() === normalizedEmail && invite.status === 'pending'
      )

      const token = generateInviteToken()
      const tokenHash = hashInviteToken(token)
      const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
      const nowISO = now.toISOString()

      if (existingInvite) {
        existingInvite.tokenHash = tokenHash
        existingInvite.expiresAt = expiresAt
        existingInvite.lastTokenIssuedAt = nowISO

        const emailResult = await sendInviteEmail(existingInvite, token, request)
        if (emailResult.sent) {
          existingInvite.lastSentAt = nowISO
        }
        await saveInvites(invites)

        await recordActivity({
          module: 'admins',
          action: 'invite',
          performedBy: currentUser?.username || 'owner',
          summary: `Refreshed admin invite for ${existingInvite.email}`,
          targetId: existingInvite.id,
          targetType: 'invite',
          details: {
            email: existingInvite.email,
            status: existingInvite.status,
            emailSent: emailResult.sent,
          },
        })

        return NextResponse.json({
          success: true,
          message: emailResult.sent ? 'Invite refreshed and email sent.' : 'Invite refreshed, but email delivery failed.',
          invites: invites.map(sanitizeInvite),
        })
      }

      const invite: AdminInvite = {
        id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        email: normalizedEmail,
        name: name?.trim() || '',
        role: 'admin',
        tokenHash,
        expiresAt,
        createdAt: nowISO,
        invitedBy: currentUser?.username || 'owner',
        status: 'pending',
        lastTokenIssuedAt: nowISO,
        lastSentAt: null,
      }

      invites.push(invite)
      const emailResult = await sendInviteEmail(invite, token, request)
      if (emailResult.sent) {
        invite.lastSentAt = nowISO
      }
      await saveInvites(invites)

      await recordActivity({
        module: 'admins',
        action: 'invite',
        performedBy: currentUser?.username || 'owner',
        summary: `Sent admin invite to ${invite.email}`,
        targetId: invite.id,
        targetType: 'invite',
        details: {
          email: invite.email,
          name: invite.name,
          emailSent: emailResult.sent,
        },
      })

      return NextResponse.json({
        success: true,
        message: emailResult.sent ? 'Invite sent successfully.' : 'Invite created, but email delivery failed.',
        invites: invites.map(sanitizeInvite),
      })
    }

    if (action === 'resend') {
      const { inviteId } = body as { inviteId: string }
      const invite = invites.find((item) => item.id === inviteId)

      if (!invite) {
        return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
      }

      if (invite.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending invites can be resent.' }, { status: 400 })
      }

      const token = generateInviteToken()
      invite.tokenHash = hashInviteToken(token)
      invite.expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
      const updateISO = new Date().toISOString()
      invite.lastTokenIssuedAt = updateISO

      const emailResult = await sendInviteEmail(invite, token, request)
      if (emailResult.sent) {
        invite.lastSentAt = updateISO
      }
      await saveInvites(invites)

      await recordActivity({
        module: 'admins',
        action: 'invite',
        performedBy: currentUser?.username || 'owner',
        summary: `Resent admin invite to ${invite.email}`,
        targetId: invite.id,
        targetType: 'invite',
        details: {
          email: invite.email,
          emailSent: emailResult.sent,
        },
      })

      return NextResponse.json({
        success: true,
        message: emailResult.sent ? 'Invite email resent successfully.' : 'Invite was refreshed, but email delivery failed.',
        invites: invites.map(sanitizeInvite),
      })
    }

    if (action === 'revoke') {
      const { inviteId } = body as { inviteId: string }
      const invite = invites.find((item) => item.id === inviteId)

      if (!invite) {
        return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
      }

      if (invite.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending invites can be revoked.' }, { status: 400 })
      }

      invite.status = 'revoked'
      invite.revokedAt = new Date().toISOString()
      invite.revokedBy = currentUser?.username || 'owner'
      invite.tokenHash = ''

      await saveInvites(invites)

      await recordActivity({
        module: 'admins',
        action: 'delete',
        performedBy: currentUser?.username || 'owner',
        summary: `Revoked admin invite for ${invite.email}`,
        targetId: invite.id,
        targetType: 'invite',
        details: {
          email: invite.email,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Invite revoked successfully.',
        invites: invites.map(sanitizeInvite),
      })
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (error: any) {
    if (error?.message === 'Owner access required' || error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error managing admin invites:', error)
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 })
  }
}


