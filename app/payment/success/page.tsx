'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const reference = searchParams.get('reference')
  const amount = searchParams.get('amount')
  const currency = searchParams.get('currency') || 'KES'
  const paymentType = searchParams.get('payment_type') || 'unknown'

  useEffect(() => {
    if (!reference) {
      setError('No payment reference provided')
      setVerifying(false)
      return
    }

    // Verify the transaction
    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/paystack/verify?reference=${reference}`)
        const data = await response.json()

        if (data.success && data.transaction?.status === 'success') {
          setVerified(true)
        } else {
          setError(data.error || 'Payment verification failed')
        }
      } catch (err: any) {
        setError('Failed to verify payment')
        console.error('Payment verification error:', err)
      } finally {
        setVerifying(false)
      }
    }

    verifyPayment()
  }, [reference])

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C4B31] mx-auto"></div>
          <p className="mt-4 text-[#6B4A3B]">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  if (error || !verified) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#7C4B31] mb-2">Payment Verification Failed</h1>
            <p className="text-[#6B4A3B]">{error || 'Unable to verify your payment'}</p>
          </div>
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full py-3 bg-[#7C4B31] text-white rounded-lg font-semibold hover:bg-[#6B3E26] transition"
            >
              Return Home
            </Link>
            <p className="text-sm text-[#6B4A3B]">
              If you believe this is an error, please contact us at{' '}
              <a href="mailto:hello@lashdiary.co.ke" className="text-[#7C4B31] hover:underline">
                hello@lashdiary.co.ke
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#7C4B31] mb-2">
            {paymentType === 'consultation' ? 'Payment Successful & Appointment Booked!' : 'Payment Successful!'}
          </h1>
          <p className="text-[#6B4A3B]">
            {paymentType === 'consultation' 
              ? 'Your payment was successful and your consultation appointment has been booked.' 
              : 'Your payment has been processed successfully.'}
          </p>
        </div>

        {amount && (
          <div className="bg-[#F3E6DC] rounded-lg p-4 mb-6">
            <p className="text-sm text-[#6B4A3B] mb-1">
              {paymentType === 'consultation' ? 'You paid' : 'Amount Paid'}
            </p>
            <p className="text-2xl font-bold text-[#7C4B31]">
              {currency} {parseFloat(amount).toLocaleString()}
            </p>
            {paymentType === 'consultation' && (
              <p className="text-sm text-[#6B4A3B] mt-2">to LASHDIARY LABS</p>
            )}
            {reference && (
              <p className="text-xs text-[#6B4A3B] mt-2">Reference: {reference}</p>
            )}
            <p className="text-xs text-[#6B4A3B] mt-1 text-center">Secured by Paystack</p>
          </div>
        )}

        <div className="bg-[#F3E6DC] rounded-lg p-6 mb-6 text-left">
          <h2 className="font-semibold text-[#7C4B31] mb-3">What Happens Next?</h2>
          {paymentType === 'consultation' ? (
            <ul className="space-y-2 text-sm text-[#3E2A20]">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>You'll receive a confirmation email with your consultation details shortly</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Your consultation appointment has been confirmed</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>We'll contact you soon to finalize the details and schedule your session</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-[#3E2A20]">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>You'll receive a confirmation email shortly</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Your order will be processed</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Access will be granted (if applicable)</span>
              </li>
            </ul>
          )}
        </div>

        <div className="space-y-3">
          {emailSent ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 text-sm font-medium">
                  ✓ Consultation confirmed! Emails have been sent to you and our team. The time slot has been reserved.
                </p>
              </div>
              <Link
                href="/"
                className="block w-full py-3 bg-[#7C4B31] text-white rounded-lg font-semibold hover:bg-[#6B3E26] transition"
              >
                Return Home
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={async () => {
                  if (!reference) return
                  
                  setSendingEmail(true)
                  setEmailError(null)
                  
                  try {
                    const response = await fetch('/api/consultations/send-confirmation', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reference }),
                    })
                    
                    const data = await response.json()
                    
                    if (response.ok && data.success) {
                      setEmailSent(true)
                    } else {
                      setEmailError(data.error || 'Failed to send emails. Please contact support.')
                    }
                  } catch (err: any) {
                    setEmailError('Failed to send emails. Please contact support.')
                    console.error('Error sending confirmation:', err)
                  } finally {
                    setSendingEmail(false)
                  }
                }}
                disabled={sendingEmail}
                className="block w-full py-3 bg-[#7C4B31] text-white rounded-lg font-semibold hover:bg-[#6B3E26] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Emails...
                  </span>
                ) : (
                  'Send Email & Confirm Booking'
                )}
              </button>
              {emailError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{emailError}</p>
                </div>
              )}
              <Link
                href="/"
                className="block w-full py-2 text-center text-[#7C4B31] hover:underline text-sm"
              >
                Return Home
              </Link>
            </>
          )}
          <p className="text-sm text-[#6B4A3B]">
            If you have any questions, please contact us at{' '}
            <a href="mailto:hello@lashdiary.co.ke" className="text-[#7C4B31] hover:underline">
              hello@lashdiary.co.ke
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

