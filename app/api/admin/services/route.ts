import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { normalizeServiceCatalog } from '@/lib/services-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminAuth()
    const raw = await readDataFile('services.json', {})
    const { catalog, changed } = normalizeServiceCatalog(raw)

    if (changed) {
      await writeDataFile('services.json', catalog)
    }

    return NextResponse.json(catalog, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading services:', error)
    return NextResponse.json({ error: 'Failed to load services' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const payload = await request.json()
    const { catalog, serviceCount } = normalizeServiceCatalog(payload)

    await writeDataFile('services.json', catalog)

    await recordActivity({
      module: 'services',
      action: 'update',
      performedBy,
      summary: `Updated service catalog (${serviceCount} services)`,
      targetId: 'service-catalog',
      targetType: 'services',
      details: catalog,
    })

    revalidatePath('/services')
    revalidatePath('/booking')
    revalidatePath('/api/services')

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving services:', error)
    return NextResponse.json({ error: 'Failed to save services' }, { status: 500 })
  }
}

