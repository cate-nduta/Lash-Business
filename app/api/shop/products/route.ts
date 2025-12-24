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
  type?: 'physical' | 'digital' // Product type: physical (default) or digital
  downloadUrl?: string // URL to downloadable file for digital products
  downloadFileName?: string // Original filename for download
  category?: string // Category for organizing products (e.g., "Guides", "Templates", "Tutorials")
}

interface ProductsPayload {
  products: Product[]
  transportationFee?: number
  shopNotice?: string
  pickupLocation?: string
  updatedAt?: string | null
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
    
    // Return all products (including out of stock ones, they'll be marked as out of stock on frontend)
    const availableProducts = (data.products || []).filter((product: Product) => {
      // Only filter out products that are completely invalid
      return product && product.name && product.name.trim().length > 0
    })
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
    // Return 200 with empty products instead of 500 to prevent page crashes
    return NextResponse.json({ 
      products: [], 
      transportationFee: 150,
      shopNotice: '',
      pickupLocation: 'Pick up Mtaani'
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

