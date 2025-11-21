import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  imageUrl?: string
  createdAt?: string
  updatedAt?: string
}

interface ProductsPayload {
  products: Product[]
  updatedAt?: string | null
}

const DEFAULT_PRODUCTS: ProductsPayload = { products: [], updatedAt: null }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId } = body

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const data = await readDataFile<ProductsPayload>('shop-products.json', DEFAULT_PRODUCTS)
    const products = data.products || []

    const productIndex = products.findIndex((p) => p.id === productId)

    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = products[productIndex]

    if (product.quantity <= 0) {
      return NextResponse.json({ error: 'Product is out of stock' }, { status: 400 })
    }

    // Reduce quantity by 1
    products[productIndex] = {
      ...product,
      quantity: product.quantity - 1,
      updatedAt: new Date().toISOString(),
    }

    const updatedData = {
      products,
      updatedAt: new Date().toISOString(),
    }

    await writeDataFile('shop-products.json', updatedData)

    return NextResponse.json({
      success: true,
      product: products[productIndex],
      message: 'Purchase successful',
    })
  } catch (error: any) {
    console.error('Error processing purchase:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process purchase' },
      { status: 500 },
    )
  }
}

