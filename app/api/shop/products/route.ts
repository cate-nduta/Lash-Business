import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  imageUrl?: string
  images?: string[]
  createdAt?: string
  updatedAt?: string
}

interface ProductsPayload {
  products: Product[]
  transportationFee?: number
  shopNotice?: string
  pickupLocation?: string
  updatedAt?: string
}

const DEFAULT_PRODUCTS: ProductsPayload = { 
  products: [], 
  transportationFee: 150, 
  shopNotice: '',
  pickupLocation: 'Pick up Mtaani',
  updatedAt: null 
}

export async function GET() {
  try {
    const data = await readDataFile<ProductsPayload>('shop-products.json', DEFAULT_PRODUCTS)
    
    // Only return products that are active (quantity > 0)
    const availableProducts = data.products || []
    const transportationFee = typeof data.transportationFee === 'number' && data.transportationFee >= 0 
      ? data.transportationFee 
      : 150
    const shopNotice = typeof data.shopNotice === 'string' ? data.shopNotice : ''
    const pickupLocation = typeof data.pickupLocation === 'string' && data.pickupLocation.trim().length > 0
      ? data.pickupLocation.trim()
      : 'Pick up Mtaani'
    
    return NextResponse.json({ 
      products: availableProducts,
      transportationFee,
      shopNotice,
      pickupLocation
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ 
      products: [], 
      transportationFee: 150,
      shopNotice: '',
      pickupLocation: 'Pick up Mtaani'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

