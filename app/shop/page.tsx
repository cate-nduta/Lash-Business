'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATES, type ExchangeRates } from '@/lib/currency-utils'

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

const MAX_PRODUCT_IMAGES = 3

export default function Shop() {
  const { currency, formatCurrency } = useCurrency()
  const [products, setProducts] = useState<Product[]>([])
  const [transportationFee, setTransportationFee] = useState(150)
  const [shopNotice, setShopNotice] = useState('')
  const [pickupLocation, setPickupLocation] = useState('Pick up Mtaani')
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
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
    const fetchProducts = async () => {
      try {
        const response = await fetch(`/api/shop/products?t=${Date.now()}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        const data = await response.json()
        setProducts(data.products || [])
        setTransportationFee(data.transportationFee || 150)
        setShopNotice(data.shopNotice || '')
        setPickupLocation(data.pickupLocation || 'Pick up Mtaani')
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const getDisplayPrice = (price: number) => {
    if (currency === 'USD') {
      const usdPrice = convertCurrency(price, 'KES', 'USD', exchangeRates)
      return formatCurrency(usdPrice)
    }
    return formatCurrency(price)
  }

  // Get unique categories from products
  const categories = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter((cat): cat is string => !!cat && cat.trim().length > 0)
    )
  ).sort()

  // Filter products by selected category
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products

  // Separate digital and physical products for better organization
  const digitalProducts = filteredProducts.filter((p) => p.type === 'digital')
  const physicalProducts = filteredProducts.filter((p) => p.type !== 'digital')

  function renderProductCard(product: Product) {
    const isOutOfStock = product.quantity <= 0 && product.type !== 'digital'
    const productImages =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.imageUrl
        ? [product.imageUrl]
        : []
    const primaryImage = productImages[0]

    return (
      <Link
        key={product.id}
        href={`/shop/${product.id}`}
        className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 block cursor-pointer group relative h-full flex flex-col"
      >
        <div className="cartoon-sticker top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity duration-300 z-10">
          <div className="sticker-sparkle"></div>
        </div>
        
        {/* Category Badge */}
        {product.category && (
          <div className="absolute top-2 left-2 z-10">
            <span className="px-2 py-1 bg-brown-dark/90 text-white rounded-full text-xs font-semibold backdrop-blur-sm">
              {product.category}
            </span>
          </div>
        )}

        {/* Digital Product Badge */}
        {product.type === 'digital' && (
          <div className="absolute top-2 right-2 z-10">
            <span className="px-2 py-1 bg-blue-600/90 text-white rounded-full text-xs font-semibold backdrop-blur-sm flex items-center gap-1">
              <span>📥</span>
              <span>Digital</span>
            </span>
          </div>
        )}
        
        <div className="aspect-square w-full bg-brown-light/20 overflow-hidden flex-shrink-0">
          {primaryImage ? (
            <img src={primaryImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 shop-product-image" />
          ) : (
            <div className="flex h-full items-center justify-center text-brown-dark/50 text-sm">
              {product.type === 'digital' ? '📄 Digital Product' : 'No image available'}
            </div>
          )}
        </div>
        {productImages.length > 1 && (
          <div className="px-4 pt-2 flex-shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {productImages.slice(1, MAX_PRODUCT_IMAGES).map((imageUrl, index) => (
                <div
                  key={`${product.id}-thumb-${index}`}
                  className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-brown-light bg-brown-light/10"
                >
                  <img src={imageUrl} alt={`${product.name} alternate view ${index + 2}`} className="h-full w-full object-cover shop-product-image" />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-lg font-display text-brown-dark mb-3 group-hover:text-brown transition-colors line-clamp-2 min-h-[3.5rem]">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <span className="text-xl font-bold text-brown-dark">{getDisplayPrice(product.price)}</span>
            {isOutOfStock && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                Out of Stock
              </span>
            )}
          </div>
          <div 
            className={`w-full py-2.5 rounded-lg font-semibold text-sm text-center transition-all duration-300 mt-auto ${
              isOutOfStock
                ? 'bg-gray-300 text-gray-500'
                : 'bg-brown-dark group-hover:bg-brown'
            }`}
          >
            <span 
              className={isOutOfStock ? 'text-gray-500' : ''}
              style={!isOutOfStock ? { 
                color: '#FFFFFF', 
                display: 'block',
                fontWeight: '600'
              } : { color: '#6B7280' }}
            >
              {isOutOfStock ? 'Out of Stock' : 'View Details'}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown text-xl">Loading products...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4 relative overflow-hidden">
      {/* Floating Decorative Stickers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="cartoon-sticker top-20 left-10 animate-float-sticker opacity-40 hidden md:block" style={{ animationDelay: '0s' }}>
          <div className="sticker-lash"></div>
        </div>
        <div className="cartoon-sticker top-32 right-16 animate-float-sticker opacity-35 hidden lg:block" style={{ animationDelay: '1.2s' }}>
          <div className="sticker-star"></div>
        </div>
        <div className="cartoon-sticker bottom-40 left-20 animate-float-sticker opacity-30 hidden md:block" style={{ animationDelay: '2.3s' }}>
          <div className="sticker-heart"></div>
        </div>
        <div className="cartoon-sticker top-1/2 right-12 animate-float-sticker opacity-35 hidden xl:block" style={{ animationDelay: '0.8s' }}>
          <div className="sticker-sparkle animate-rotate-slow"></div>
        </div>
        <div className="cartoon-sticker bottom-20 right-20 animate-float-sticker opacity-30 hidden lg:block" style={{ animationDelay: '1.8s' }}>
          <div className="sticker-star"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12 relative">
          <div className="cartoon-sticker top-0 left-1/2 -translate-x-1/2 opacity-30 hidden md:block">
            <div className="sticker-heart animate-float-sticker"></div>
          </div>
          <h1 className="text-5xl font-display text-brown-dark mb-4">Shop</h1>
          <p className="text-brown text-lg mb-4">Premium lash products and accessories</p>
          
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center mt-6 mb-8">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${
                  selectedCategory === null
                    ? 'bg-brown-dark text-white shadow-lg'
                    : 'bg-white text-brown-dark border-2 border-brown-light hover:border-brown-dark'
                }`}
              >
                All Products
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-brown-dark text-white shadow-lg'
                      : 'bg-white text-brown-dark border-2 border-brown-light hover:border-brown-dark'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
          
          {/* Shop Notice */}
          {shopNotice && shopNotice.trim().length > 0 ? (
            <div className="max-w-3xl mx-auto mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg relative">
              <div className="cartoon-sticker top-2 right-2 opacity-20 hidden sm:block">
                <div className="sticker-sparkle"></div>
              </div>
              <p className="text-brown-dark text-sm whitespace-pre-line">{shopNotice}</p>
            </div>
          ) : null}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 relative">
            <div className="cartoon-sticker top-10 left-1/2 -translate-x-1/2 opacity-30">
              <div className="sticker-heart animate-float-sticker"></div>
            </div>
            <p className="text-brown text-xl">
              {selectedCategory ? `No products found in "${selectedCategory}" category.` : 'No products available at the moment.'}
            </p>
            <p className="text-brown-dark/70 mt-2">
              {selectedCategory ? (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-brown-dark underline hover:text-brown"
                >
                  View all products
                </button>
              ) : (
                'Check back soon for new arrivals!'
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Digital Products Section */}
            {digitalProducts.length > 0 && (
              <div className="mb-12">
                <h2 className="text-3xl font-display text-brown-dark mb-6 flex items-center gap-3">
                  <span>📥</span>
                  <span>Digital Products</span>
                  {selectedCategory && (
                    <span className="text-lg font-normal text-brown">({selectedCategory})</span>
                  )}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {digitalProducts.map((product) => {
                    return renderProductCard(product)
                  })}
                </div>
              </div>
            )}

            {/* Physical Products Section */}
            {physicalProducts.length > 0 && (
              <div>
                {digitalProducts.length > 0 && (
                  <h2 className="text-3xl font-display text-brown-dark mb-6 flex items-center gap-3">
                    <span>📦</span>
                    <span>Physical Products</span>
                    {selectedCategory && (
                      <span className="text-lg font-normal text-brown">({selectedCategory})</span>
                    )}
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {physicalProducts.map((product) => {
                    return renderProductCard(product)
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
