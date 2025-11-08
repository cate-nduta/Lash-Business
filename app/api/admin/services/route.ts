import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminAuth()
    const services = await readDataFile('services.json', [])
    return NextResponse.json(services, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const services = await request.json()
    await writeDataFile('services.json', services)

    const serviceCount = Array.isArray((services as any)?.services)
      ? (services as any).services.length
      : Array.isArray(services)
      ? (services as any[]).length
      : undefined

    await recordActivity({
      module: 'services',
      action: 'update',
      performedBy,
      summary: `Updated service catalog${serviceCount !== undefined ? ` (${serviceCount} services)` : ''}`,
      targetId: 'service-catalog',
      targetType: 'services',
      details: services,
    })

    revalidatePath('/services')
    revalidatePath('/booking')
    revalidatePath('/api/services')

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save services' }, { status: 500 })
  }
}

