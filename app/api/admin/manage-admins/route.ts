import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { recordActivity } from '@/lib/activity-log'

interface Admin {
  id: string
  username: string
  email: string
  password?: string
  passwordHash?: string
  role: 'owner' | 'admin'
  createdAt: string
  canManageAdmins: boolean
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const data = await readDataFile<{ admins: Admin[] }>('admins.json', { admins: [] })

    const adminsWithoutPasswords = (data.admins || []).map(admin => {
      const { password, passwordHash, ...adminWithoutSecret } = admin as Admin & { password?: string; passwordHash?: string }
      return adminWithoutSecret
    })

    return NextResponse.json({ admins: adminsWithoutPasswords })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching admins:', error)
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const body = await request.json()
    const { action, adminId } = body

    const data = await readDataFile<{ admins: Admin[] }>('admins.json', { admins: [] })
    const admins = data.admins || []

    if (action === 'add') {
      return NextResponse.json(
        { error: 'Direct admin creation is disabled. Please use the invite flow.' },
        { status: 400 }
      )
    } else if (action === 'delete') {
      if (!adminId) {
        return NextResponse.json(
          { error: 'Admin ID is required' },
          { status: 400 }
        )
      }

      const adminIndex = admins.findIndex(admin => admin.id === adminId)

      if (adminIndex === -1) {
        return NextResponse.json(
          { error: 'Admin not found' },
          { status: 404 }
        )
      }

      if (admins[adminIndex].role === 'owner') {
        return NextResponse.json(
          { error: 'Cannot delete the owner account' },
          { status: 400 }
        )
      }

      const [removedAdmin] = admins.splice(adminIndex, 1)
      await writeDataFile('admins.json', { admins })

      await recordActivity({
        module: 'admins',
        action: 'delete',
        performedBy,
        summary: `Removed admin ${removedAdmin.username}`,
        targetId: removedAdmin.id,
        targetType: 'admin',
        details: {
          username: removedAdmin.username,
          email: removedAdmin.email,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Admin removed successfully',
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error managing admins:', error)
    return NextResponse.json(
      { error: 'Failed to manage admins' },
      { status: 500 }
    )
  }
}

