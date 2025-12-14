import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

interface LabsBusiness {
  orderId: string
  tierId: string
  businessName: string
  email: string
  phone?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  amountKES: number
  currency: string
  createdAt: string
  completedAt?: string
  subdomain?: string
  customDomain?: string
  accountCreated: boolean
  tier?: {
    id: string
    name: string
  }
  settings?: any
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    // Load all Labs orders
    const orders = await readDataFile<any[]>('labs-orders.json', [])
    
    // Load tier information
    const labsSettings = await readDataFile<any>('labs-settings.json', { tiers: [] })
    const tiers = labsSettings.tiers || []

    // Load settings for each business
    const businesses: LabsBusiness[] = await Promise.all(
      orders.map(async (order) => {
        const tier = tiers.find((t: any) => t.id === order.tierId)
        
        // Try to load settings if account is created
        let settings = null
        if (order.accountCreated && order.orderId) {
          try {
            const settingsFileName = `labs-${order.orderId}-settings.json`
            settings = await readDataFile<any>(settingsFileName, null)
          } catch (error) {
            // Settings file doesn't exist yet, that's okay
            console.log(`Settings not found for order ${order.orderId}`)
          }
        }

        return {
          orderId: order.orderId,
          tierId: order.tierId,
          businessName: order.businessName,
          email: order.email,
          phone: order.phone,
          status: order.status || 'pending',
          amountKES: order.amountKES,
          currency: order.currency || 'KES',
          createdAt: order.createdAt,
          completedAt: order.completedAt,
          subdomain: order.subdomain,
          customDomain: order.customDomain,
          accountCreated: order.accountCreated || false,
          tier: tier ? { id: tier.id, name: tier.name } : undefined,
          settings: settings,
        }
      })
    )

    // Sort by creation date, newest first
    businesses.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ businesses })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading Labs businesses:', error)
    return NextResponse.json(
      { error: 'Failed to load Labs businesses' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const { orderId, updates } = body

    if (!orderId || !updates) {
      return NextResponse.json(
        { error: 'Order ID and updates are required' },
        { status: 400 }
      )
    }

    // Load orders
    const orders = await readDataFile<any[]>('labs-orders.json', [])
    const orderIndex = orders.findIndex(o => o.orderId === orderId)

    if (orderIndex === -1) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Update order
    orders[orderIndex] = {
      ...orders[orderIndex],
      ...updates,
    }

    await writeDataFile('labs-orders.json', orders)

    // If settings are being updated
    if (updates.settings && orders[orderIndex].accountCreated) {
      const settingsFileName = `labs-${orderId}-settings.json`
      const currentSettings = await readDataFile<any>(settingsFileName, {})
      const updatedSettings = {
        ...currentSettings,
        ...updates.settings,
      }
      await writeDataFile(settingsFileName, updatedSettings)
    }

    return NextResponse.json({ success: true, order: orders[orderIndex] })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating Labs business:', error)
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    )
  }
}

