'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface WaitlistStatus {
  enabled: boolean
  isOpen: boolean
  openDate: string | null
  closeDate: string | null
  countdownTargetDate: string | null
  discountPercentage: number
  totalSignups: number
}

interface CountdownTime {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface LabsSettings {
  waitlistPageEnabled?: boolean
}

export default function WaitlistPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<WaitlistStatus | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [discountCode, setDiscountCode] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [countdown, setCountdown] = useState<CountdownTime | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchStatus = async () => {
      try {
        // Check if waitlist page is enabled in labs settings
        const labsResponse = await fetch('/api/labs/settings', {
          cache: 'no-store',
        })
        if (labsResponse.ok) {
          const labsData: LabsSettings = await labsResponse.json()
          // Only redirect if explicitly disabled (false)
          // Don't redirect if undefined/null - treat as enabled by default for backwards compatibility
          if (labsData.waitlistPageEnabled === false) {
            // Page is disabled, redirect to labs page
            if (isMounted) {
              router.replace('/labs')
            }
            return
          }
        }

        // Fetch waitlist status only if page is enabled
        if (isMounted) {
          const response = await fetch('/api/labs/waitlist', {
            cache: 'no-store',
          })
          if (response.ok) {
            const data = await response.json()
            if (isMounted) {
              setStatus(data)
            }
          } else {
            // If API fails, set default status to prevent infinite loading
            console.error('Failed to fetch waitlist status:', response.status)
            if (isMounted) {
              setStatus({
                enabled: false,
                isOpen: false,
                openDate: null,
                closeDate: null,
                countdownTargetDate: null,
                discountPercentage: 0,
                totalSignups: 0,
              })
            }
          }
        }
      } catch (error) {
        console.error('Error fetching waitlist status:', error)
        // Set default status on error to prevent infinite loading
        if (isMounted) {
          setStatus({
            enabled: false,
            isOpen: false,
            openDate: null,
            closeDate: null,
            countdownTargetDate: null,
            discountPercentage: 0,
            totalSignups: 0,
          })
        }
      } finally {
        if (isMounted) {
          setLoadingStatus(false)
        }
      }
    }

    fetchStatus()

    return () => {
      isMounted = false
    }
  }, [router])

  // Countdown timer effect - countdown to close date
  useEffect(() => {
    // Use closeDate for countdown, fallback to countdownTargetDate if closeDate not available
    const targetDateStr = status?.closeDate || status?.countdownTargetDate
    if (!targetDateStr) {
      setCountdown(null)
      return
    }

    const targetDate = new Date(targetDateStr).getTime()
    
    const updateCountdown = () => {
      const now = new Date().getTime()
      const distance = targetDate - now

      if (distance < 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [status?.closeDate, status?.countdownTargetDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    setLoading(true)
    setMessage(null)
    setDiscountCode(null)

    try {
      const response = await fetch('/api/labs/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ 
          type: 'success', 
          text: data.message || 'Successfully added to waitlist! Check your email for your discount code.' 
        })
        // Don't display discount code in UI - it's sent via email only
        setDiscountCode(null)
        setEmail('')
        // Refresh status to update total signups
        const statusResponse = await fetch('/api/labs/waitlist')
        const statusData = await statusResponse.json()
        setStatus(statusData)
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error || 'Failed to join waitlist. Please try again.' 
        })
      }
    } catch (error) {
      console.error('Error joining waitlist:', error)
      setMessage({ 
        type: 'error', 
        text: 'Something went wrong. Please try again later.' 
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingStatus) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C4B31] mx-auto"></div>
          <p className="mt-4 text-[#6B4A3B]">Loading...</p>
        </div>
      </div>
    )
  }

  // If waitlist is not enabled or not open, show closed message
  if (!status?.enabled || !status?.isOpen) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] px-4 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 sm:p-12 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-[#F3E6DC] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#7C4B31]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#7C4B31] mb-4">
                Waitlist Currently Closed
              </h1>
              <p className="text-lg text-[#6B4A3B] mb-4">
                The LashDiary Labs waitlist is not currently open for signups.
              </p>
              {status?.openDate && (
                <p className="text-sm text-[#6B4A3B]">
                  {new Date(status.openDate) > new Date()
                    ? `Waitlist opens on ${new Date(status.openDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}`
                    : status?.closeDate
                    ? `Waitlist closed on ${new Date(status.closeDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}`
                    : null}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF9F4] px-4 py-12 sm:py-16">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#7C4B31] mb-4">
            Join the Waitlist
          </h1>
          <p className="text-lg sm:text-xl text-[#6B4A3B] mb-4">
            LashDiary Labs Officially Opens in:
          </p>
          
          {/* Live Countdown Timer */}
          {countdown !== null && (status?.closeDate || status?.countdownTargetDate) && (
            <div className="mb-6">
              <div className="flex justify-center gap-3 sm:gap-6">
                <div className="bg-white rounded-lg shadow-lg border-2 border-[#7C4B31] p-4 sm:p-6 min-w-[70px] sm:min-w-[90px]">
                  <div className="text-3xl sm:text-4xl font-bold text-[#7C4B31] mb-1">
                    {countdown.days}
                  </div>
                  <div className="text-xs sm:text-sm text-[#6B4A3B] font-semibold uppercase">
                    {countdown.days === 1 ? 'Day' : 'Days'}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-lg border-2 border-[#7C4B31] p-4 sm:p-6 min-w-[70px] sm:min-w-[90px]">
                  <div className="text-3xl sm:text-4xl font-bold text-[#7C4B31] mb-1">
                    {countdown.hours}
                  </div>
                  <div className="text-xs sm:text-sm text-[#6B4A3B] font-semibold uppercase">
                    {countdown.hours === 1 ? 'Hour' : 'Hours'}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-lg border-2 border-[#7C4B31] p-4 sm:p-6 min-w-[70px] sm:min-w-[90px]">
                  <div className="text-3xl sm:text-4xl font-bold text-[#7C4B31] mb-1">
                    {countdown.minutes}
                  </div>
                  <div className="text-xs sm:text-sm text-[#6B4A3B] font-semibold uppercase">
                    {countdown.minutes === 1 ? 'Minute' : 'Minutes'}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-lg border-2 border-[#7C4B31] p-4 sm:p-6 min-w-[70px] sm:min-w-[90px]">
                  <div className="text-3xl sm:text-4xl font-bold text-[#7C4B31] mb-1">
                    {countdown.seconds}
                  </div>
                  <div className="text-xs sm:text-sm text-[#6B4A3B] font-semibold uppercase">
                    {countdown.seconds === 1 ? 'Second' : 'Seconds'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {status?.discountPercentage > 0 && (
            <p className="text-base text-[#7C4B31] font-semibold">
              🎉 Exclusive {status.discountPercentage}% discount for early signups!
            </p>
          )}
        </div>

        {/* Waitlist Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 sm:p-12">
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <p className="font-medium">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#7C4B31] mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 text-base border-2 border-[#D4A574] rounded-lg bg-white text-[#3E2A20] focus:ring-2 focus:ring-[#7C4B31] focus:border-[#7C4B31] transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#7C4B31] text-white rounded-lg font-semibold text-lg hover:bg-[#6B3E26] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining Waitlist...
                </span>
              ) : (
                'Join Waitlist'
              )}
            </button>
          </form>

          {/* Info Section */}
          <div className="mt-8 pt-8 border-t border-[#E8D5C4]">
            <h3 className="text-lg font-semibold text-[#7C4B31] mb-4">What happens next?</h3>
            <ul className="space-y-3 text-[#6B4A3B]">
              <li className="flex items-start">
                <span className="mr-3 text-[#7C4B31]">✓</span>
                <span>Check your email for your discount code</span>
              </li>
              {status?.discountPercentage > 0 && (
                <li className="flex items-start">
                  <span className="mr-3 text-[#7C4B31]">✓</span>
                  <span>Book your consultation now and use your code to get {status.discountPercentage}% off</span>
                </li>
              )}
              <li className="flex items-start">
                <span className="mr-3 text-[#7C4B31]">✓</span>
                <span>Get early access to book consultations before we launch</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-[#7C4B31]">✓</span>
                <span>Discuss your business needs and choose the perfect system for you</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}

