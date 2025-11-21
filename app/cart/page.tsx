'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATE } from '@/lib/currency-utils'
import Link from 'next/link'

export default function Cart() {
  const router = useRouter()
  const { items, removeFromCart, updateQuantity, clearCart, getTotalPrice } = useCart()
  const { currency, formatCurrency } = useCurrency()
  const [transportationFee, setTransportationFee] = useState(150)
  const [pickupLocation, setPickupLocation] = useState('Pick up Mtaani')
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery' | 'lash_suite'>('lash_suite')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [orderDetails, setOrderDetails] = useState<any>(null)

  // Load shop settings
  useEffect(() => {
    fetch('/api/shop/products')
      .then((res) => res.json())
      .then((data) => {
        setTransportationFee(data.transportationFee || 150)
        setPickupLocation(data.pickupLocation || 'Pick up Mtaani')
      })
      .catch(console.error)
  }, [])

  const getDisplayPrice = (price: number) => {
    if (currency === 'USD') {
      const usdPrice = convertCurrency(price, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
      return formatCurrency(usdPrice)
    }
    return formatCurrency(price)
  }

  const calculateSubtotal = () => {
    return getTotalPrice()
  }

  const calculateTransportCost = () => {
    if (deliveryOption === 'lash_suite') return 0
    if (deliveryOption === 'pickup') return transportationFee
    return 0 // delivery option would have its own fee logic
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTransportCost()
  }

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert('Your cart is empty')
      return
    }

    if (!paymentMethod) {
      alert('Please select a payment method')
      return
    }

    if (paymentMethod === 'mpesa' && !phoneNumber.trim()) {
      alert('Please enter your phone number for M-Pesa payment')
      return
    }

    if (paymentMethod === 'card' && !email.trim() && !phoneNumber.trim()) {
      alert('Please enter your email or phone number so we can notify you when your order is ready')
      return
    }

    if (deliveryOption === 'delivery' && !deliveryAddress.trim()) {
      alert('Please enter a delivery address')
      return
    }

    setProcessing(true)

    try {
      const response = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod,
          phoneNumber: phoneNumber.trim() || undefined,
          email: email.trim() || undefined,
          deliveryOption,
          deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress.trim() : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to process checkout')
        return
      }

      if (paymentMethod === 'mpesa') {
        setSuccessMessage(
          'M-Pesa payment prompt sent! Please complete payment on your phone. Once payment is confirmed, we\'ll send you an email with pickup details.'
        )
        setOrderDetails({
          items: items.map((item) => item.name),
          email: email || undefined,
        })
      } else {
        setSuccessMessage(
          'Payment processed successfully! We\'ve sent you an email with all the pickup information.'
        )
        setOrderDetails({
          items: items.map((item) => item.name),
          orderId: data.orderId,
          email: email || undefined,
        })
      }

      setShowSuccessModal(true)
      clearCart()
      setPaymentMethod(null)
      setPhoneNumber('')
      setEmail('')
      setDeliveryOption('lash_suite')
      setDeliveryAddress('')
    } catch (error) {
      console.error('Error processing checkout:', error)
      alert('Failed to process checkout. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (items.length === 0) {
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
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="cartoon-sticker top-10 left-1/2 -translate-x-1/2 opacity-30">
            <div className="sticker-heart animate-float-sticker"></div>
          </div>
          <h1 className="text-4xl font-display text-brown-dark mb-4">Your Cart</h1>
          <p className="text-brown-dark/70 text-lg mb-8">Your cart is empty</p>
          <Link
            href="/shop"
            className="inline-block bg-brown-dark hover:bg-brown text-white font-semibold px-6 py-3 rounded-lg transition-colors relative group"
          >
            <div className="cartoon-sticker top-0 right-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300">
              <div className="sticker-sparkle"></div>
            </div>
            Continue Shopping
          </Link>
        </div>
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
        <h1 className="text-4xl font-display text-brown-dark mb-8 relative">
          <div className="cartoon-sticker -top-2 -right-8 opacity-30 hidden lg:block">
            <div className="sticker-heart animate-float-sticker"></div>
          </div>
          Your Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="bg-white rounded-lg shadow-lg p-6 flex flex-col sm:flex-row gap-4 relative group"
              >
                <div className="cartoon-sticker top-3 right-3 opacity-0 group-hover:opacity-20 transition-opacity duration-300 hidden sm:block">
                  <div className="sticker-star"></div>
                </div>
                <div className="w-full sm:w-32 h-32 flex-shrink-0 bg-brown-light/20 rounded-lg overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-brown-dark/50 text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-brown-dark mb-2">{item.name}</h3>
                    <p className="text-lg font-bold text-brown-dark">{getDisplayPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-brown-light rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="px-3 py-2 text-brown-dark hover:bg-brown-light/30"
                      >
                        −
                      </button>
                      <span className="px-4 py-2 text-brown-dark font-semibold min-w-[3rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="px-3 py-2 text-brown-dark hover:bg-brown-light/30"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-red-600 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-24 relative">
              <div className="cartoon-sticker top-4 right-4 opacity-20 hidden sm:block">
                <div className="sticker-sparkle"></div>
              </div>
              <h2 className="text-2xl font-semibold text-brown-dark mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-brown-dark/70">Subtotal</span>
                  <span className="font-semibold text-brown-dark">{getDisplayPrice(calculateSubtotal())}</span>
                </div>

                {/* Delivery Option */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-brown-dark">Delivery Option</label>
                  <select
                    value={deliveryOption}
                    onChange={(e) => setDeliveryOption(e.target.value as 'pickup' | 'delivery' | 'lash_suite')}
                    className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  >
                    <option value="lash_suite">At the Lash Suite (No extra fee)</option>
                    <option value="pickup">Pick up in Town (+{transportationFee} KES)</option>
                    <option value="delivery">Deliver to Home</option>
                  </select>
                </div>

                {deliveryOption === 'delivery' && (
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Delivery Address
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      placeholder="Enter your delivery address"
                    />
                  </div>
                )}

                {calculateTransportCost() > 0 && (
                  <div className="flex justify-between">
                    <span className="text-brown-dark/70">
                      {deliveryOption === 'pickup' ? 'Pickup Fee' : 'Delivery Fee'}
                    </span>
                    <span className="font-semibold text-brown-dark">
                      {getDisplayPrice(calculateTransportCost())}
                    </span>
                  </div>
                )}

                <div className="border-t border-brown-light pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold text-brown-dark">Total</span>
                    <span className="font-bold text-brown-dark text-xl">
                      {getDisplayPrice(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3 mb-6">
                <label className="block text-sm font-medium text-brown-dark">Payment Method</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mpesa"
                      checked={paymentMethod === 'mpesa'}
                      onChange={() => setPaymentMethod('mpesa')}
                      className="w-4 h-4 text-brown-dark"
                    />
                    <span className="text-brown-dark">M-Pesa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="w-4 h-4 text-brown-dark"
                    />
                    <span className="text-brown-dark">Card Payment</span>
                  </label>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                {paymentMethod === 'mpesa' && (
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="254712345678"
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    />
                  </div>
                )}

                {(paymentMethod === 'card' || paymentMethod === 'mpesa') && (
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Email {paymentMethod === 'card' && '*'}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-brown-dark hover:bg-brown text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Proceed to Checkout'}
              </button>

              <Link
                href="/shop"
                className="block text-center text-brown-dark/70 hover:text-brown-dark mt-4 text-sm"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <div className="cartoon-sticker top-4 right-4 opacity-30">
              <div className="sticker-sparkle animate-rotate-slow"></div>
            </div>
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 relative">
                <div className="cartoon-sticker -top-2 -right-2 opacity-40">
                  <div className="sticker-heart animate-float-sticker"></div>
                </div>
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-display text-brown-dark mb-3">Order Confirmed!</h3>
              <p className="text-brown-dark/80 mb-4">{successMessage}</p>
              
              {orderDetails?.email && (
                <div className="bg-brown-light/20 rounded-lg p-4 mb-4 text-left">
                  <p className="text-sm text-brown-dark mb-2">
                    <strong>Please check your email:</strong> {orderDetails.email}
                  </p>
                  <p className="text-xs text-brown-dark/70">
                    We've sent you a confirmation email with all your order details. If you don't see it in your inbox, please check your spam or junk folder.
                  </p>
                </div>
              )}
              
              {!orderDetails?.email && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-left">
                  <p className="text-sm text-brown-dark">
                    <strong>Please check your email</strong> for order confirmation and pickup details.
                  </p>
                  <p className="text-xs text-brown-dark/70 mt-2">
                    If you don't see the email in your inbox, please check your spam or junk folder.
                  </p>
                </div>
              )}

              {orderDetails?.orderId && (
                <div className="bg-brown-light/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-brown-dark/70">
                    Order ID: <strong>{orderDetails.orderId}</strong>
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                setShowSuccessModal(false)
                router.push('/shop')
              }}
              className="w-full bg-brown-dark hover:bg-brown text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

