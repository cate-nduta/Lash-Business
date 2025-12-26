'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '@/lib/currency-utils'

interface PricingTier {
  id: string
  name: string
  tagline: string
  priceKES: number
  description: string
  features: {
    included: string[]
    excluded?: string[]
  }
}

const PHONE_COUNTRY_CODES = [
  { code: 'KE', dialCode: '+254', label: 'Kenya (+254)' },
  { code: 'US', dialCode: '+1', label: 'United States (+1)' },
  { code: 'CA', dialCode: '+1', label: 'Canada (+1)' },
  { code: 'GB', dialCode: '+44', label: 'United Kingdom (+44)' },
  { code: 'AU', dialCode: '+61', label: 'Australia (+61)' },
  { code: 'ZA', dialCode: '+27', label: 'South Africa (+27)' },
  { code: 'NG', dialCode: '+234', label: 'Nigeria (+234)' },
  { code: 'UG', dialCode: '+256', label: 'Uganda (+256)' },
  { code: 'TZ', dialCode: '+255', label: 'Tanzania (+255)' },
]

export default function LabsCheckout() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currency } = useCurrency()
  const tierId = searchParams.get('tier')

  const [tier, setTier] = useState<PricingTier | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  // Payment method will be selected on payment page, default to card
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | null>('card')
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(PHONE_COUNTRY_CODES[0]?.dialCode || '+254')
  const [phoneLocalNumber, setPhoneLocalNumber] = useState<string>('')
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!tierId) {
      router.push('/labs')
      return
    }

    const loadTier = async () => {
      try {
        const response = await fetch('/api/admin/labs', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          const foundTier = data.tiers?.find((t: PricingTier) => t.id === tierId)
          if (foundTier) {
            setTier(foundTier)
          } else {
            setError('Tier not found')
          }
        }
      } catch (error) {
        console.error('Error loading tier:', error)
        setError('Failed to load tier information')
      } finally {
        setLoading(false)
      }
    }

    loadTier()
  }, [tierId, router])

  const formatPrice = (priceKES: number) => {
    if (currency === 'USD') {
      const priceUSD = convertCurrency(priceKES, 'KES', 'USD', DEFAULT_EXCHANGE_RATES)
      return `$${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
    return `${priceKES.toLocaleString('en-US')} KSH`
  }

  const handleCheckout = async () => {
    if (!tier) return

    // Validation
    // Payment method defaults to 'card' - user can change it if needed
    const finalPaymentMethod = paymentMethod || 'card'

    if (!businessName.trim()) {
      setError('Business name is required')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required')
      return
    }

      // Phone number only required for M-Pesa payments (not for free tiers)
      if (tier.priceKES > 0 && finalPaymentMethod === 'mpesa' && !phoneLocalNumber.trim()) {
        setError('Phone number is required for M-Pesa payment')
        return
      }

    setError(null)
    setProcessing(true)

    try {
      const fullPhone = finalPaymentMethod === 'mpesa' 
        ? `${phoneCountryCode}${phoneLocalNumber.replace(/\D/g, '')}`
        : undefined

      // Ensure paymentMethod is set correctly
      const apiPaymentMethod = tier.priceKES === 0 
        ? 'free' 
        : finalPaymentMethod // Use the final payment method

      const response = await fetch('/api/labs/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: tier.id,
          businessName: businessName.trim(),
          email: email.trim(),
          phone: fullPhone,
          paymentMethod: apiPaymentMethod,
          currency: currency || 'KES',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to process checkout'
        const errorDetails = data.details ? ` (${data.details})` : ''
        throw new Error(`${errorMessage}${errorDetails}`)
      }

      // Handle free tiers - account is created immediately
      if (data.freeTier) {
        setSuccess(true)
        setOrderId(data.orderId)
        
        // Auto-login and redirect for free tiers
        try {
          const loginResponse = await fetch('/api/labs/auth/auto-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderId }),
            credentials: 'include',
          })
          
          if (loginResponse.ok) {
            // Redirect to login page
            setTimeout(() => {
              router.push(`/labs/login?orderId=${data.orderId}`)
            }, 1500)
          } else {
            // If auto-login fails, redirect to login page
            setTimeout(() => {
              router.push(`/labs/login?orderId=${data.orderId}`)
            }, 1500)
          }
        } catch (loginError) {
          // If auto-login fails, redirect to login page
          setTimeout(() => {
            router.push(`/labs/login?orderId=${data.orderId}`)
          }, 1500)
        }
        return
      }

      // If M-Pesa, show waiting message
      if (finalPaymentMethod === 'mpesa' && data.checkoutRequestID) {
        setOrderId(data.orderId)
        // Poll for payment status
        pollPaymentStatus(data.orderId, data.checkoutRequestID)
      } else if (finalPaymentMethod === 'card') {
        // For card payments, redirect to payment gateway or show success
        // For now, we'll assume card payment is handled differently
        setSuccess(true)
        setOrderId(data.orderId)
      }
    } catch (error: any) {
      console.error('Error processing checkout:', error)
      setError(error.message || 'Failed to process checkout. Please try again.')
      setProcessing(false)
    }
  }

  const pollPaymentStatus = async (orderId: string, checkoutRequestID: string) => {
    const maxAttempts = 60 // Poll for up to 5 minutes (60 * 5 seconds)
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/labs/checkout/status?orderId=${orderId}&checkoutRequestID=${checkoutRequestID}`)
        const data = await response.json()

        if (data.status === 'completed') {
          setSuccess(true)
          setProcessing(false)
          
          // Auto-login and redirect
          try {
            const loginResponse = await fetch('/api/labs/auth/auto-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId }),
              credentials: 'include',
            })
            
            if (loginResponse.ok) {
              // Redirect to login page
              setTimeout(() => {
                router.push(`/labs/login?orderId=${orderId}`)
              }, 1500)
            } else {
              // If auto-login fails, redirect to login page
              setTimeout(() => {
                router.push(`/labs/login?orderId=${orderId}`)
              }, 1500)
            }
          } catch (loginError) {
            // If auto-login fails, redirect to login page
            setTimeout(() => {
              router.push(`/labs/login?orderId=${orderId}`)
            }, 1500)
          }
          return
        }

        if (data.status === 'failed') {
          setError('Payment failed. Please try again.')
          setProcessing(false)
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          setError('Payment is taking longer than expected. Please check your M-Pesa and refresh this page.')
          setProcessing(false)
        }
      } catch (error) {
        console.error('Error polling payment status:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setError('Unable to verify payment status. Please contact support.')
          setProcessing(false)
        }
      }
    }

    setTimeout(poll, 5000) // Start polling after 5 seconds
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-[var(--color-text)]">Loading...</div>
      </div>
    )
  }

  if (!tier || error && !processing) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-display text-[var(--color-primary)] mb-4">Checkout Error</h1>
          <p className="text-[var(--color-text)] mb-6">{error || 'Tier not found'}</p>
          <Link
            href="/labs"
            className="inline-block bg-[var(--color-primary)] text-[var(--color-on-primary)] px-6 py-3 rounded-lg font-semibold"
          >
            Back to Labs
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
            <h1 className="text-3xl font-display text-[var(--color-primary)] mb-4">Payment Successful!</h1>
            <p className="text-[var(--color-text)] mb-6">
              Your account is being set up. You'll be redirected to the login page shortly...
            </p>
            {orderId && (
              <p className="text-sm text-[var(--color-text)]/70 mb-6">Order ID: {orderId}</p>
            )}
            <button
              onClick={async () => {
                try {
                  const loginResponse = await fetch('/api/labs/auth/auto-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId }),
                    credentials: 'include',
                  })
                  
                  if (loginResponse.ok) {
                    router.push(`/labs/login?orderId=${orderId}`)
                  } else {
                    router.push(`/labs/login?orderId=${orderId}`)
                  }
                } catch {
                  router.push(`/labs/login?orderId=${orderId}`)
                }
              }}
              className="inline-block bg-[var(--color-primary)] text-[var(--color-on-primary)] px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-display text-[var(--color-primary)] mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-display text-[var(--color-primary)] mb-4">Order Summary</h2>
              <div className="border-b border-[var(--color-primary)]/20 pb-4 mb-4">
                <h3 className="text-xl font-semibold text-[var(--color-text)]">{tier.name}</h3>
                {tier.description && (
                  <p className="text-sm text-[var(--color-text)]/70 italic">{tier.description}</p>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text)]">Total</span>
                <span className="text-3xl font-bold text-[var(--color-primary)]">
                  {formatPrice(tier.priceKES)}
                </span>
              </div>
            </div>

            {/* Business Information */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-display text-[var(--color-primary)] mb-4">Business Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="Your Business Name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="your@email.com"
                    required
                  />
                  <p className="text-xs text-[var(--color-text)]/60 mt-1">
                    This will be used to create your account and send login credentials
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method - Only show for paid tiers */}
            {tier.priceKES > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-display text-[var(--color-primary)] mb-4">Payment Method</h2>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-[var(--color-primary)]/20 rounded-lg hover:border-[var(--color-primary)]/40 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mpesa"
                      checked={paymentMethod === 'mpesa'}
                      onChange={() => setPaymentMethod('mpesa')}
                      className="w-5 h-5 text-[var(--color-primary)]"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-[var(--color-text)]">M-Pesa</span>
                      <p className="text-sm text-[var(--color-text)]/70">Pay via M-Pesa STK Push</p>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'mpesa' && (
                  <div className="ml-8 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="px-3 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                        >
                          {PHONE_COUNTRY_CODES.map((code) => (
                            <option key={code.code} value={code.dialCode}>
                              {code.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={phoneLocalNumber}
                          onChange={(e) => setPhoneLocalNumber(e.target.value)}
                          className="flex-1 px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                          placeholder="712345678"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-[var(--color-primary)]/20 rounded-lg hover:border-[var(--color-primary)]/40 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="w-5 h-5 text-[var(--color-primary)]"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-[var(--color-text)]">Card Payment</span>
                      <p className="text-sm text-[var(--color-text)]/70">Pay with credit or debit card</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            )}

            {/* Free Tier Message */}
            {tier.priceKES === 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-display text-[var(--color-primary)] mb-2">Free Tier</h2>
                <p className="text-[var(--color-text)]">
                  This tier is free! No payment required. Your account will be created immediately after you submit the form.
                </p>
              </div>
            )}
          </div>

          {/* Checkout Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">Summary</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text)]/70">Tier</span>
                  <span className="font-semibold text-[var(--color-text)]">{tier.name}</span>
                </div>
                <div className="border-t border-[var(--color-primary)]/20 pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold text-[var(--color-text)]">Total</span>
                    <span className="font-bold text-[var(--color-primary)] text-xl">
                      {tier.priceKES === 0 ? 'FREE' : formatPrice(tier.priceKES)}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing 
                  ? 'Processing...' 
                  : tier.priceKES === 0 
                    ? 'Activate Free Tier' 
                    : `Pay ${formatPrice(tier.priceKES)}`}
              </button>

              <Link
                href="/labs"
                className="block text-center text-[var(--color-text)]/70 hover:text-[var(--color-text)] mt-4 text-sm"
              >
                ← Back to Labs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

