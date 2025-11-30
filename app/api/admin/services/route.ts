import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { normalizeServiceCatalog, type ServiceCatalog, type Service } from '@/lib/services-utils'
import { sendNewServiceAnnouncement } from '@/lib/email/new-service-announcement'

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

// Helper function to extract all services from catalog
function getAllServices(catalog: ServiceCatalog): Array<Service & { categoryName: string }> {
  const allServices: Array<Service & { categoryName: string }> = []
  for (const category of catalog.categories) {
    for (const service of category.services) {
      allServices.push({ ...service, categoryName: category.name })
    }
  }
  return allServices
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const payload = await request.json()
    const { catalog: newCatalog, serviceCount } = normalizeServiceCatalog(payload)
    
    // Check if email notifications are enabled
    const notifySubscribers = payload.notifySubscribers === true

    // Get old catalog to detect new services
    const oldRaw = await readDataFile('services.json', {})
    const { catalog: oldCatalog } = normalizeServiceCatalog(oldRaw)

    // Find new services
    const oldServices = getAllServices(oldCatalog)
    const newServices = getAllServices(newCatalog)
    const oldServiceIds = new Set(oldServices.map(s => s.id))
    const newServicesList = newServices.filter(s => !oldServiceIds.has(s.id))

    await writeDataFile('services.json', newCatalog)

    // Send email notifications for new services if enabled
    let emailResult = null
    if (notifySubscribers && newServicesList.length > 0) {
      try {
        // Send announcement for each new service
        for (const service of newServicesList) {
          if (service.name && service.name.trim()) {
            const result = await sendNewServiceAnnouncement({
              id: service.id,
              name: service.name,
              price: service.price || 0,
              priceUSD: service.priceUSD,
              duration: service.duration,
              categoryName: service.categoryName,
            })
            emailResult = result
            console.log(`New service announcement sent: ${service.name} - Sent: ${result.sent}, Failed: ${result.failed}`)
          }
        }
      } catch (emailError) {
        console.error('Error sending new service announcements:', emailError)
        // Don't fail the whole request if email fails
      }
    }

    await recordActivity({
      module: 'services',
      action: 'update',
      performedBy,
      summary: `Updated service catalog (${serviceCount} services)${newServicesList.length > 0 ? ` - ${newServicesList.length} new service(s) added` : ''}`,
      targetId: 'service-catalog',
      targetType: 'services',
      details: newCatalog,
    })

    revalidatePath('/services')
    revalidatePath('/booking')
    revalidatePath('/api/services')

    return NextResponse.json({ 
      success: true,
      newServicesCount: newServicesList.length,
      emailSent: emailResult ? { sent: emailResult.sent, failed: emailResult.failed } : null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving services:', error)
    return NextResponse.json({ error: 'Failed to save services' }, { status: 500 })
  }
}

