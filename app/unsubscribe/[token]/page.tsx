'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function UnsubscribePage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<'loading' | 'unsubscribed' | 'resubscribed' | 'error'>('loading')
  const [error, setError] = useState('')
  const [subscriber, setSubscriber] = useState<{ email: string; name?: string } | null>(null)
  const [showResubscribe, setShowResubscribe] = useState(false)

  useEffect(() => {
    const fetchSubscriber = async () => {
      try {
        const response = await fetch(`/api/email/unsubscribe?token=${params.token}`)
        if (!response.ok) {
          throw new Error('Unable to find subscriber information')
        }
        const data = await response.json()
        setSubscriber({ email: data.email, name: data.name })
        setShowResubscribe(Boolean(data.unsubscribedAt))
        setStatus('loading')
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
        setStatus('error')
      }
    }

    fetchSubscriber()
  }, [params.token])

  const handleUnsubscribe = async () => {
    try {
      const response = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, action: 'unsubscribe' }),
      })

      if (!response.ok) {
        throw new Error('Unable to unsubscribe at this time.')
      }

      setStatus('unsubscribed')
      setShowResubscribe(true)
    } catch (err: any) {
      setError(err.message || 'Unable to unsubscribe at this time.')
      setStatus('error')
    }
  }

  const handleResubscribe = async () => {
    try {
      const response = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, action: 'resubscribe' }),
      })

      if (!response.ok) {
        throw new Error('Unable to resubscribe at this time.')
      }

      setStatus('resubscribed')
      setShowResubscribe(false)
    } catch (err: any) {
      setError(err.message || 'Unable to resubscribe at this time.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-baby-pink-light flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-pink-light/50">
        <h1 className="text-3xl font-display text-brown-dark mb-4">Manage Your Email Preferences</h1>
        {subscriber && (
          <p className="text-brown mb-6">
            Email: <span className="font-semibold">{subscriber.email}</span>
          </p>
        )}

        {status === 'loading' && !error && (
          <p className="text-brown">Preparing your unsubscribe options...</p>
        )}

        {status === 'unsubscribed' && (
          <div className="space-y-4">
            <p className="text-brown font-semibold">You have been unsubscribed from future emails.</p>
            <button
              onClick={handleResubscribe}
              className="px-5 py-3 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              Resubscribe
            </button>
          </div>
        )}

        {status === 'resubscribed' && (
          <div className="space-y-4">
            <p className="text-brown font-semibold">Welcome back! You'll continue to receive our beautiful updates.</p>
            <button
              onClick={handleUnsubscribe}
              className="px-5 py-3 bg-pink text-brown-dark rounded-lg hover:bg-pink-light transition-colors font-semibold"
            >
              Unsubscribe Again
            </button>
          </div>
        )}

        {status === 'error' && (
          <p className="text-red-600">{error}</p>
        )}

        {status === 'loading' && !showResubscribe && !error && (
          <div className="space-y-4">
            <p className="text-brown">
              We respect your inbox. Click below if you no longer want to receive emails from us.
            </p>
            <button
              onClick={handleUnsubscribe}
              className="px-5 py-3 bg-pink text-brown-dark rounded-lg hover:bg-pink-light transition-colors font-semibold"
            >
              Unsubscribe Me
            </button>
          </div>
        )}

        {showResubscribe && status !== 'resubscribed' && (
          <div className="space-y-4 mt-6">
            <p className="text-brown">
              Changed your mind? You can rejoin our beauty community anytime.
            </p>
            <button
              onClick={handleResubscribe}
              className="px-5 py-3 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              Resubscribe
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-8">
          Need assistance? <Link href="/contact" className="text-brown-dark underline">Contact us</Link> and we'll help right away.
        </p>
      </div>
    </div>
  )
}

