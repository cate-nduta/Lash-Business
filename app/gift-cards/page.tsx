'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATE } from '@/lib/currency-utils'
import Link from 'next/link'

// Secret token for private gift card access
// Change this to your own secret token
const GIFT_CARD_SECRET_TOKEN = process.env.NEXT_PUBLIC_GIFT_CARD_SECRET_TOKEN || 'gift-card-secret-2024'

interface GiftCardSettings {
  enabled: boolean
  minAmount: number
  maxAmount: number
  defaultAmounts: number[]
  allowCustomAmount: boolean
  expirationDays: number
}

export default function GiftCards() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currency, formatCurrency } = useCurrency()
  const [settings, setSettings] = useState<GiftCardSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check authorization token on mount
  useEffect(() => {
    const token = searchParams.get('token')
    if (token === GIFT_CARD_SECRET_TOKEN) {
      setIsAuthorized(true)
    }
    setCheckingAuth(false)
  }, [searchParams])
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [purchaserName, setPurchaserName] = useState('')
  const [purchaserEmail, setPurchaserEmail] = useState('')

  // Pre-fill from query params if available
  useEffect(() => {
    const nameParam = searchParams.get('name')
    const emailParam = searchParams.get('email')
    if (nameParam) setPurchaserName(decodeURIComponent(nameParam))
    if (emailParam) setPurchaserEmail(decodeURIComponent(emailParam))
  }, [searchParams])
  const [purchaserPhone, setPurchaserPhone] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientMessage, setRecipientMessage] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [purchasedCard, setPurchasedCard] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | 'later' | null>(null)
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [mpesaStatus, setMpesaStatus] = useState<{ loading: boolean; success: boolean | null; message: string }>({
    loading: false,
    success: null,
    message: '',
  })

  useEffect(() => {
    let mounted = true
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Gift card settings fetch timed out')
        setLoading(false)
      }
    }, 10000) // 10 second timeout

    // Only fetch settings if authorized
    if (!isAuthorized) {
      return
    }

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/gift-cards', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        
        if (!mounted) return

        if (!response.ok) {
          console.error('Failed to fetch gift card settings:', response.status, response.statusText)
          clearTimeout(timeoutId)
          setError(`Failed to load gift card settings. Please try refreshing the page.`)
          setLoading(false)
          return
        }
        
        const data = await response.json()
        
        if (!mounted) return

        if (data.enabled && data.settings) {
          setSettings(data.settings)
        } else {
          // Settings exist but gift cards are disabled, or settings are missing
          console.warn('Gift cards disabled or settings missing:', data)
        }
      } catch (error: any) {
        console.error('Error loading gift card settings:', error)
        if (!mounted) return
        setError(`Error loading gift cards: ${error?.message || 'Unknown error'}. Please try refreshing the page.`)
      } finally {
        clearTimeout(timeoutId)
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    fetchSettings()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [isAuthorized])

  // Scroll to top when gift card is successfully purchased
  useEffect(() => {
    if (purchasedCard) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [purchasedCard])

  const getDisplayAmount = (amount: number) => {
    if (currency === 'USD') {
      const usdAmount = convertCurrency(amount, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
      return formatCurrency(usdAmount)
    }
    return formatCurrency(amount)
  }

  const initiateMpesaPayment = async (phone: string, amount: number) => {
    setMpesaStatus({ loading: true, success: null, message: `Initiating M-Pesa payment for ${getDisplayAmount(amount)}...` })
    
    try {
      const response = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          amount,
          accountReference: `GiftCard-${Date.now()}`,
          transactionDesc: `LashDiary Gift Card - ${getDisplayAmount(amount)}`,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMpesaStatus({
          loading: false,
          success: true,
          message: `M-Pesa prompt sent! Check your phone - you'll be asked to pay exactly ${getDisplayAmount(amount)}. Enter your M-Pesa PIN to complete the payment.`,
        })
        return { success: true, checkoutRequestID: data.checkoutRequestID }
      } else {
        setMpesaStatus({
          loading: false,
          success: false,
          message: data.error || data.details || 'Failed to initiate M-Pesa payment. Please try again.',
        })
        return { success: false, error: data.error || data.details }
      }
    } catch (error: any) {
      setMpesaStatus({
        loading: false,
        success: false,
        message: 'Failed to initiate M-Pesa payment. Please try again.',
      })
      return { success: false, error: error.message }
    }
  }

  const initiateCardPayment = async (amount: number) => {
    setMpesaStatus({ loading: true, success: null, message: `Redirecting to secure payment page...` })
    
    try {
      const nameParts = purchaserName.trim().split(' ')
      const firstName = nameParts[0] || purchaserName
      const lastName = nameParts.slice(1).join(' ') || firstName

      const response = await fetch('/api/pesapal/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: currency,
          phoneNumber: purchaserPhone || '',
          email: purchaserEmail,
          firstName,
          lastName,
          description: `LashDiary Gift Card - ${getDisplayAmount(amount)}`,
          bookingReference: `GiftCard-${Date.now()}`,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success && data.redirectUrl) {
        // Redirect to Pesapal payment page
        window.location.href = data.redirectUrl
        return { success: true, orderTrackingId: data.orderTrackingId }
      } else {
        setMpesaStatus({
          loading: false,
          success: false,
          message: data.error || data.details || 'Failed to initiate card payment. Please try again.',
        })
        return { success: false, error: data.error || data.details }
      }
    } catch (error: any) {
      setMpesaStatus({
        loading: false,
        success: false,
        message: 'Failed to initiate card payment. Please try again.',
      })
      return { success: false, error: error.message }
    }
  }

  const handlePurchase = async () => {
    if (!selectedAmount && (!customAmount || parseFloat(customAmount) <= 0)) {
      setMessage({ type: 'error', text: 'Please select or enter an amount' })
      return
    }

    if (!purchaserName || !purchaserEmail) {
      setMessage({ type: 'error', text: 'Please enter your name and email' })
      return
    }

    // Calculate amount - always work in KES for gift cards
    let amount: number
    if (selectedAmount) {
      amount = selectedAmount
    } else if (customAmount) {
      const customValue = parseFloat(customAmount)
      if (isNaN(customValue) || customValue <= 0) {
        setMessage({ type: 'error', text: 'Please enter a valid amount' })
        return
      }
      // If currency is USD, convert to KES
      if (currency === 'USD') {
        amount = Math.round(customValue / DEFAULT_EXCHANGE_RATE)
      } else {
        amount = customValue
      }
    } else {
      setMessage({ type: 'error', text: 'Please select or enter an amount' })
      return
    }

    if (!settings || amount < settings.minAmount || amount > settings.maxAmount) {
      setMessage({ type: 'error', text: `Amount must be between ${getDisplayAmount(settings!.minAmount)} and ${getDisplayAmount(settings!.maxAmount)}` })
      return
    }

    // If no payment method selected, show error
    if (!paymentMethod) {
      setMessage({ type: 'error', text: 'Please select a payment method' })
      return
    }

    setPurchasing(true)
    setMessage(null)

    try {
      // Process payment first (unless pay later)
      let paymentResult: { success: boolean; checkoutRequestID?: string; orderTrackingId?: string; error?: string } = { success: false }

      if (paymentMethod === 'mpesa') {
        if (!mpesaPhone || mpesaPhone.trim() === '') {
          setMessage({ type: 'error', text: 'Please enter your M-Pesa phone number' })
          setPurchasing(false)
          return
        }
        paymentResult = await initiateMpesaPayment(mpesaPhone.trim(), amount)
        if (!paymentResult.success) {
          setPurchasing(false)
          return
        }
      } else if (paymentMethod === 'card') {
        paymentResult = await initiateCardPayment(amount)
        if (paymentResult.success) {
          // Card payment redirects, so we don't create gift card here
          // Gift card will be created after payment confirmation via callback
          setPurchasing(false)
          return
        } else {
          setPurchasing(false)
          return
        }
      } else if (paymentMethod === 'later') {
        // Pay later - create gift card immediately without payment
        paymentResult = { success: true }
      }

      // Create gift card for M-Pesa (after payment initiated) or Pay Later
      if ((paymentMethod === 'mpesa' && paymentResult.success) || paymentMethod === 'later') {
        try {
          const response = await fetch('/api/gift-cards/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: amount,
              purchaserName,
              purchaserEmail,
              purchaserPhone: purchaserPhone || undefined,
              recipientName: recipientName || undefined,
              recipientEmail: recipientEmail || undefined,
              recipientMessage: recipientMessage || undefined,
              mpesaCheckoutRequestID: paymentMethod === 'mpesa' ? paymentResult.checkoutRequestID : undefined,
              payLater: paymentMethod === 'later',
            }),
          })

          let data: any
          try {
            data = await response.json()
          } catch (jsonError) {
            console.error('Failed to parse response:', jsonError)
            setMessage({ type: 'error', text: 'Invalid response from server. Please try again.' })
            return
          }

          if (!response.ok) {
            setMessage({ type: 'error', text: data.error || `Server error: ${response.status}` })
            return
          }

          if (data.success && data.card) {
            setPurchasedCard(data.card)
            setMessage({ 
              type: 'success', 
              text: paymentMethod === 'later' 
                ? 'Gift card created! You can complete payment later.' 
                : 'Gift card created! Complete your M-Pesa payment to activate it.' 
            })
            // Reset form
            setPurchaserName('')
            setPurchaserEmail('')
            setPurchaserPhone('')
            setRecipientName('')
            setRecipientEmail('')
            setRecipientMessage('')
            setSelectedAmount(null)
            setCustomAmount('')
            setPaymentMethod(null)
            setMpesaPhone('')
          } else {
            setMessage({ type: 'error', text: data.error || 'Failed to create gift card' })
          }
        } catch (fetchError: any) {
          console.error('Fetch error:', fetchError)
          setMessage({ type: 'error', text: fetchError?.message || 'Network error. Please check your connection and try again.' })
        }
      }
    } catch (error: any) {
      console.error('Error purchasing gift card:', error)
      setMessage({ 
        type: 'error', 
        text: error?.message || 'An unexpected error occurred. Please try again.' 
      })
    } finally {
      setPurchasing(false)
    }
  }

  // Check authorization first
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-brown text-lg">Checking access...</div>
        </div>
      </div>
    )
  }

  // Show 404 if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-display text-brown-dark mb-4">404</h1>
          <h2 className="text-2xl font-display text-brown-dark mb-4">🤎 Page Not Found</h2>
          <p className="text-brown mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full px-6 py-3 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors"
            >
              Go Home
            </Link>
            <Link
              href="/services"
              className="block w-full px-6 py-3 bg-brown-light text-brown-dark rounded-lg font-semibold hover:bg-brown-light/80 transition-colors"
            >
              View Services
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-brown text-lg mb-2">Loading gift cards...</div>
          <div className="text-brown/60 text-sm">Please wait</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-display text-brown-dark mb-4">Gift Cards</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              window.location.reload()
            }}
            className="px-6 py-3 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors"
          >
            Refresh Page
          </button>
          <Link href="/" className="block text-brown-dark hover:underline mt-4">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!settings || !settings.enabled) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-display text-brown-dark mb-4">Gift Cards</h1>
          <p className="text-brown">Gift cards are currently unavailable.</p>
          <Link href="/" className="text-brown-dark hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-display text-brown-dark mb-4">🎁 Gift Cards</h1>
          <p className="text-brown text-lg">
            Give the gift of beautiful lashes! Perfect for birthdays, holidays, or just because.
          </p>
        </div>

        {purchasedCard ? (
          <div className="bg-white rounded-3xl shadow-soft border-2 border-brown-light p-8 mb-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-display text-brown-dark mb-4">Gift Card Created!</h2>
              <div className="bg-brown-light/20 rounded-2xl p-6 mb-6">
                <p className="text-sm text-brown/70 mb-2">Gift Card Code</p>
                <p className="text-3xl font-mono font-bold text-brown-dark tracking-wider mb-4">
                  {purchasedCard.code}
                </p>
                <p className="text-lg text-brown-dark font-semibold">
                  Amount: {getDisplayAmount(purchasedCard.amount)}
                </p>
              </div>
              <p className="text-brown mb-6">
                The gift card code has been sent to {purchasedCard.purchasedBy.email}. 
                {purchasedCard.recipient?.email && ` It has also been sent to ${purchasedCard.recipient.email}.`}
              </p>
              <button
                onClick={() => setPurchasedCard(null)}
                className="px-6 py-3 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors"
              >
                Purchase Another
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-soft border border-brown-light/30 p-6 sm:p-10 space-y-8">
            {/* Amount Selection */}
            <div>
              <h2 className="text-2xl font-display text-brown-dark mb-4">Select Amount</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {settings.defaultAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setSelectedAmount(amount)
                      setCustomAmount('')
                    }}
                    className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                      selectedAmount === amount
                        ? 'border-brown-dark bg-brown-dark text-white'
                        : 'border-brown-light text-brown-dark hover:border-brown hover:bg-brown-light/20'
                    }`}
                  >
                    {getDisplayAmount(amount)}
                  </button>
                ))}
              </div>
              {settings.allowCustomAmount && (
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Custom Amount ({currency})
                  </label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value)
                      setSelectedAmount(null)
                    }}
                    min={settings.minAmount}
                    max={settings.maxAmount}
                    placeholder={`Enter amount (${getDisplayAmount(settings.minAmount)} - ${getDisplayAmount(settings.maxAmount)})`}
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
              )}
            </div>

            {/* Purchaser Information */}
            <div>
              <h2 className="text-2xl font-display text-brown-dark mb-4">Your Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={purchaserName}
                    onChange={(e) => setPurchaserName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    value={purchaserEmail}
                    onChange={(e) => setPurchaserEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Your Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={purchaserPhone}
                    onChange={(e) => setPurchaserPhone(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
              </div>
            </div>

            {/* Recipient Information (Optional) */}
            <div>
              <h2 className="text-2xl font-display text-brown-dark mb-4">Recipient (Optional)</h2>
              <p className="text-brown text-sm mb-4">
                Leave blank if this is for yourself. If sending to someone else, we'll email them the gift card code.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={recipientMessage}
                    onChange={(e) => setRecipientMessage(e.target.value)}
                    rows={3}
                    placeholder="Add a personal message..."
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown resize-y"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <h2 className="text-2xl font-display text-brown-dark mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 transition-all hover:bg-brown-light/10"
                  style={{ borderColor: paymentMethod === 'card' ? '#7C4B31' : '#E5D5C8' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'card')}
                    className="h-5 w-5 accent-brown-dark mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-brown-dark">💳 Card Payment</div>
                    <div className="text-sm text-brown-dark/70 mt-1">
                      Pay securely via card. Accepts both KES and USD.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 transition-all hover:bg-brown-light/10"
                  style={{ borderColor: paymentMethod === 'mpesa' ? '#7C4B31' : '#E5D5C8' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mpesa"
                    checked={paymentMethod === 'mpesa'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'mpesa')}
                    disabled={currency === 'USD'}
                    className="h-5 w-5 accent-brown-dark mt-1 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-brown-dark">
                      📱 M-Pesa STK Push
                      {currency === 'USD' && <span className="ml-2 text-xs text-amber-700 font-semibold">⚠️ KES only</span>}
                    </div>
                    <div className="text-sm text-brown-dark/70 mt-1">
                      Pay via M-Pesa. <strong>KES currency only.</strong>
                    </div>
                    {paymentMethod === 'mpesa' && (
                      <input
                        type="tel"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="Enter M-Pesa phone number (e.g., 254712345678)"
                        className="w-full mt-3 px-4 py-2 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                      />
                    )}
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 transition-all hover:bg-brown-light/10"
                  style={{ borderColor: paymentMethod === 'later' ? '#7C4B31' : '#E5D5C8' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="later"
                    checked={paymentMethod === 'later'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'later')}
                    className="h-5 w-5 accent-brown-dark mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-brown-dark">⏰ Pay Later (Testing)</div>
                    <div className="text-sm text-brown-dark/70 mt-1">
                      Create the gift card now and pay later. Perfect for testing the workflow.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {mpesaStatus.message && (
              <div className={`p-4 rounded-lg ${
                mpesaStatus.success === true ? 'bg-green-50 text-green-700' : 
                mpesaStatus.success === false ? 'bg-red-50 text-red-700' : 
                'bg-blue-50 text-blue-700'
              }`}>
                {mpesaStatus.message}
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={purchasing || (!selectedAmount && !customAmount) || !paymentMethod || mpesaStatus.loading}
              className="w-full px-6 py-4 bg-brown-dark text-white rounded-lg font-semibold text-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {purchasing || mpesaStatus.loading ? 'Processing...' : `Purchase Gift Card${selectedAmount || customAmount ? ` - ${getDisplayAmount(selectedAmount || parseFloat(customAmount))}` : ''}`}
            </button>

            <p className="text-sm text-brown/70 text-center">
              After purchase, you'll receive the gift card code via email. The recipient will also receive it if provided.
              Gift cards are valid for {settings.expirationDays} days and can be used for any service.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

