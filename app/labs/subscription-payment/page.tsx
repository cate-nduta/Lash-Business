'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PaystackInlinePayment from '@/components/PaystackInlinePayment'
import { useCurrency } from '@/contexts/CurrencyContext'

function SubscriptionPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currency, formatCurrency } = useCurrency()
  const [subscriber, setSubscriber] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState<{
    publicKey: string
    email: string
    amount: number
    currency: string
    reference: string
    customerName?: string
    phone?: string
    metadata?: Record<string, any>
  } | null>(null)

  const subscriberId = searchParams.get('subscriberId')
  const reference = searchParams.get('reference')
  const amount = searchParams.get('amount')

  useEffect(() => {
    if (!subscriberId) {
      setError('Invalid payment link')
      setLoading(false)
      return
    }

    // Fetch subscriber details
    const fetchSubscriber = async () => {
      try {
        const response = await fetch('/api/labs/web-services/subscribers')
        if (response.ok) {
          const data = await response.json()
          const found = data.subscribers?.find((s: any) => s.id === subscriberId)
          if (found) {
            setSubscriber(found)
          } else {
            setError('Subscriber not found')
          }
        } else {
          setError('Failed to load subscription details')
        }
      } catch (err) {
        console.error('Error fetching subscriber:', err)
        setError('Failed to load subscription details')
      } finally {
        setLoading(false)
      }
    }

    fetchSubscriber()
  }, [subscriberId])

  const handlePayment = async () => {
    if (!subscriber || !amount || !subscriberId) return

    try {
      // Get Paystack public key
      const response = await fetch('/api/paystack/config')
      if (!response.ok) {
        throw new Error('Failed to get payment configuration')
      }
      const config = await response.json()

      if (!config.publicKey || typeof config.publicKey !== 'string') {
        throw new Error('Invalid payment configuration')
      }

      if (!subscriber.email || typeof subscriber.email !== 'string') {
        throw new Error('Subscriber email is required')
      }

      const paymentAmountValue = parseFloat(amount)
      if (isNaN(paymentAmountValue) || paymentAmountValue <= 0) {
        throw new Error('Invalid payment amount')
      }

      const paymentReference = reference || `yearly-renewal-${subscriberId}-${Date.now()}`

      setPaymentData({
        publicKey: config.publicKey,
        email: subscriber.email,
        amount: paymentAmountValue,
        currency: 'KES',
        reference: paymentReference,
        customerName: subscriber.name || subscriber.email.split('@')[0],
        phone: subscriber.phoneNumber || undefined,
        metadata: {
          subscriberId: subscriber.id,
          subscriptionType: 'yearly_renewal',
        },
      })

      setShowPaymentModal(true)
    } catch (err: any) {
      console.error('Error initiating payment:', err)
      setError(err.message || 'Failed to initiate payment')
    }
  }

  const getDisplayPrice = (price: number) => {
    if (currency === 'USD') {
      const exchangeRate = 130 // Default, should come from settings
      const usdPrice = price / exchangeRate
      return `$${usdPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `KSH ${Math.round(price).toLocaleString('en-KE')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <p className="text-brown-dark/70">Loading...</p>
      </div>
    )
  }

  if (error || !subscriber) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="bg-white/70 rounded-2xl shadow-soft p-8 max-w-md text-center">
          <h1 className="text-2xl font-display text-brown-dark mb-4">Error</h1>
          <p className="text-brown-dark/70 mb-6">{error || 'Subscriber not found'}</p>
          <button
            onClick={() => router.push('/labs')}
            className="px-6 py-3 bg-brown-dark text-white rounded-xl font-semibold hover:bg-brown transition-colors"
          >
            Go to Labs
          </button>
        </div>
      </div>
    )
  }

  const paymentAmount = parseFloat(amount || '0')

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/70 rounded-2xl shadow-soft p-8">
          <h1 className="text-3xl font-display text-brown-dark mb-6 text-center">
            Annual Subscription Renewal
          </h1>

          <div className="space-y-6 mb-8">
            <div>
              <p className="text-brown-dark/70 mb-2">Customer Name:</p>
              <p className="text-brown-dark font-semibold">{subscriber.name}</p>
            </div>

            <div>
              <p className="text-brown-dark/70 mb-2">Email:</p>
              <p className="text-brown-dark font-semibold">{subscriber.email}</p>
            </div>

            <div className="border-t border-brown-light pt-6">
              <h2 className="text-xl font-semibold text-brown-dark mb-4">Your Annual Subscriptions</h2>
              <div className="space-y-2 mb-4">
                {subscriber.yearlyItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-brown-light/50">
                    <div>
                      <p className="text-brown-dark font-medium">{item.productName}</p>
                      <p className="text-sm text-brown-dark/60">
                        {item.quantity}x - {getDisplayPrice(item.annualPrice)}/year
                      </p>
                    </div>
                    <p className="text-brown-dark font-semibold">
                      {getDisplayPrice(item.annualPrice * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-brown-dark">
                <p className="text-lg font-semibold text-brown-dark">Total Annual Amount:</p>
                <p className="text-2xl font-bold text-brown-dark">
                  {getDisplayPrice(subscriber.totalAnnualAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handlePayment}
              className="px-8 py-4 bg-brown-dark text-white rounded-xl font-semibold text-lg hover:bg-brown transition-colors"
            >
              Pay {getDisplayPrice(paymentAmount)}
            </button>
          </div>
        </div>
      </div>

      {showPaymentModal && paymentData && paymentData.publicKey && paymentData.email && paymentData.reference && (
        <PaystackInlinePayment
          publicKey={paymentData.publicKey}
          email={paymentData.email}
          amount={paymentData.amount}
          currency={paymentData.currency}
          reference={paymentData.reference}
          customerName={paymentData.customerName}
          phone={paymentData.phone}
          metadata={paymentData.metadata || {}}
          onSuccess={() => {
            setShowPaymentModal(false)
            router.push(`/labs/subscription-payment/success?amount=${paymentAmount}&reference=${paymentData.reference}`)
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  )
}

export default function SubscriptionPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <p className="text-brown-dark/70">Loading...</p>
      </div>
    }>
      <SubscriptionPaymentContent />
    </Suspense>
  )
}

