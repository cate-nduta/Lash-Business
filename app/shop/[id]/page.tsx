'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useCart } from '@/contexts/CartContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATES, type ExchangeRates } from '@/lib/currency-utils'
import Link from 'next/link'

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

const MAX_PRODUCT_IMAGES = 3

export default function ProductDetail() {
  const params = useParams()
  const router = useRouter()
  const { currency, formatCurrency } = useCurrency()
  const { addToCart } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [addedToCart, setAddedToCart] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES)

  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        const response = await fetch('/api/exchange-rates', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setExchangeRates(data)
        }
      } catch (error) {
        console.error('Error loading exchange rates:', error)
        // Keep default rates on error
      }
    }
    loadExchangeRates()
  }, [])

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/shop/products?t=${Date.now()}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        const data = await response.json()
        const foundProduct = (data.products || []).find(
          (p: Product) => p.id === params.id
        )
        if (foundProduct) {
          setProduct(foundProduct)
        } else {
          router.push('/shop')
        }
      } catch (error) {
        console.error('Error fetching product:', error)
        router.push('/shop')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id, router])

  const getDisplayPrice = (price: number) => {
    if (currency === 'USD') {
      const usdPrice = convertCurrency(price, 'KES', 'USD', exchangeRates)
      return formatCurrency(usdPrice)
    }
    return formatCurrency(price)
  }

  const handleAddToCart = () => {
    if (!product) return
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      images: product.images,
    })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown text-xl">Loading product...</div>
      </div>
    )
  }

  if (!product) {
    return null
  }

  const isOutOfStock = product.quantity <= 0
  const isLowStock = product.quantity > 0 && product.quantity <= 5
  const displayImages = product.images && product.images.length > 0 
    ? product.images 
    : product.imageUrl 
    ? [product.imageUrl] 
    : []
  const mainImage = displayImages[selectedImageIndex] || displayImages[0]

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/shop"
          className="inline-flex items-center px-4 py-2.5 bg-white border-2 border-brown-light rounded-lg text-brown-dark hover:text-brown hover:border-brown mb-6 transition-all duration-300 font-semibold shadow-sm hover:shadow-md"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back to Shop
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square w-full bg-brown-light/20 rounded-lg overflow-hidden">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="w-full h-full object-cover shop-product-image"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brown-dark/60">
                    No image available
                  </div>
                )}
              </div>
              
              {displayImages.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {displayImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? 'border-brown-dark'
                          : 'border-transparent hover:border-brown-light'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover shop-product-image"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col justify-center space-y-6">
              <div>
                <h1 className="text-4xl font-display text-brown-dark mb-4">
                  {product.name}
                </h1>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-bold text-brown-dark">
                    {getDisplayPrice(product.price)}
                  </span>
                  {isOutOfStock && (
                    <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                      Out of Stock
                    </span>
                  )}
                </div>
                {isLowStock && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 text-sm font-semibold flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Low Stock - Limited availability!
                    </p>
                  </div>
                )}
              </div>

              {product.description && (
                <div>
                  <h2 className="text-xl font-semibold text-brown-dark mb-2">
                    Description
                  </h2>
                  <p className="text-brown-dark/80 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || addedToCart}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-300 ${
                    isOutOfStock
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : addedToCart
                      ? 'bg-green-500 text-white'
                      : 'bg-brown-dark hover:bg-brown text-white hover:scale-105 transform'
                  }`}
                >
                  {addedToCart
                    ? '✓ Added to Cart!'
                    : isOutOfStock
                    ? 'Out of Stock'
                    : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

