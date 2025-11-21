import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface ProductsPayload {
  products: any[]
  orders?: any[]
  pendingPurchases?: any[]
  transportationFee?: number
  shopNotice?: string
  pickupLocation?: string
  pickupDays?: string[]
  updatedAt?: string | null
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    // Read current data
    const data = await readDataFile<ProductsPayload>('shop-products.json', {
      products: [],
      transportationFee: 150,
      shopNotice: '',
      pickupLocation: 'Pick up Mtaani',
      pickupDays: ['Monday', 'Wednesday', 'Friday'],
      updatedAt: null,
    })

    // Clear all orders and pending purchases
    const updated = {
      ...data,
      orders: [],
      pendingPurchases: [],
      updatedAt: new Date().toISOString(),
    }

    await writeDataFile('shop-products.json', updated)

    return NextResponse.json({ 
      success: true, 
      message: 'All orders and pending purchases have been cleared.',
      updatedAt: updated.updatedAt
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error clearing orders:', error)
    return NextResponse.json({ error: 'Failed to clear orders' }, { status: 500 })
  }
}

