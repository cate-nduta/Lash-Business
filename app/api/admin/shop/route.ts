import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

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
  orders?: any[]
  pendingPurchases?: any[]
  transportationFee?: number
  shopNotice?: string
  pickupLocation?: string
  pickupDays?: string[]
  updatedAt?: string | null
}

const DEFAULT_PRODUCTS: ProductsPayload = { 
  products: [], 
  transportationFee: 150, 
  shopNotice: '',
  pickupLocation: 'Pick up Mtaani',
  pickupDays: ['Monday', 'Wednesday', 'Friday'],
  updatedAt: null 
}

const MAX_PRODUCT_IMAGES = 3

export async function GET() {
  try {
    await requireAdminAuth()
    const data = await readDataFile<ProductsPayload>('shop-products.json', DEFAULT_PRODUCTS)
    return NextResponse.json(data)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching products:', error)
    return NextResponse.json(DEFAULT_PRODUCTS, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = (await request.json()) as Partial<ProductsPayload>

    // Read existing data to preserve orders and pendingPurchases unless explicitly cleared
    const existingData = await readDataFile<ProductsPayload>('shop-products.json', DEFAULT_PRODUCTS)

    const products = Array.isArray(body.products) ? body.products : []
    const updatedAt = new Date().toISOString()

    const transportationFee = typeof body.transportationFee === 'number' && body.transportationFee >= 0
      ? body.transportationFee
      : 150
    
    const shopNotice = typeof body.shopNotice === 'string' ? body.shopNotice : ''
    const pickupLocation = typeof body.pickupLocation === 'string' && body.pickupLocation.trim().length > 0
      ? body.pickupLocation.trim()
      : 'Pick up Mtaani'
    const pickupDays = Array.isArray(body.pickupDays) && body.pickupDays.length > 0
      ? body.pickupDays.filter((day: any) => typeof day === 'string' && day.trim().length > 0)
      : ['Monday', 'Wednesday', 'Friday']

    // Preserve orders and pendingPurchases unless explicitly set to empty arrays
    const orders = body.orders !== undefined ? body.orders : existingData.orders || []
    const pendingPurchases = body.pendingPurchases !== undefined ? body.pendingPurchases : existingData.pendingPurchases || []

    let normalized
    try {
      normalized = {
        products: products.map(normalizeProduct),
        orders,
        pendingPurchases,
        transportationFee,
        shopNotice,
        pickupLocation,
        pickupDays,
        updatedAt,
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Invalid product provided.' },
        { status: 400 },
      )
    }

    await writeDataFile('shop-products.json', normalized)

    return NextResponse.json({ success: true, updatedAt })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving products:', error)
    return NextResponse.json({ error: 'Failed to save products' }, { status: 500 })
  }
}

function normalizeProduct(product: any): Product {
  if (!product || typeof product !== 'object') {
    throw new Error('Invalid product payload')
  }

  const id = typeof product.id === 'string' && product.id.trim().length > 0 ? product.id.trim() : randomUUID()
  const name = typeof product.name === 'string' ? product.name.trim() : ''
  
  if (!name) {
    throw new Error('Product must include a name')
  }

  const price = typeof product.price === 'number' && product.price >= 0 ? product.price : 0
  const quantity = typeof product.quantity === 'number' && product.quantity >= 0 ? Math.floor(product.quantity) : 0

  const images = Array.isArray(product.images)
    ? product.images
        .filter((url: any) => typeof url === 'string' && url.trim().length > 0)
        .slice(0, MAX_PRODUCT_IMAGES)
        .map((url: string) => url.trim())
    : []

  if (images.length === 0 && typeof product.imageUrl === 'string' && product.imageUrl.trim().length > 0) {
    images.push(product.imageUrl.trim())
  }

  const now = new Date().toISOString()

  return {
    id,
    name,
    description:
      typeof product.description === 'string' && product.description.trim().length > 0
        ? product.description.trim()
        : undefined,
    price,
    quantity,
    imageUrl: images[0],
    images,
    createdAt:
      typeof product.createdAt === 'string' && product.createdAt.trim().length > 0 ? product.createdAt.trim() : now,
    updatedAt: now,
  }
}

