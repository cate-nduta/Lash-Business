'use client'

import { useState } from 'react'

export default function EmailSubscribe() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe')
      }

      setMessage({ type: 'success', text: data.message || 'Successfully subscribed!' })
      setEmail('')
      setName('')
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to subscribe. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="subscribe-name" className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Name (Optional)
          </label>
          <input
            id="subscribe-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/30 rounded-lg bg-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="subscribe-email" className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Email Address *
          </label>
          <input
            id="subscribe-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/30 rounded-lg bg-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-[var(--color-text)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-semibold rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Subscribing...' : 'Subscribe to Updates'}
        </button>
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
        <p className="text-xs text-[var(--color-text)]/70 text-center">
          Get notified about new services, special offers, and updates. Unsubscribe anytime.
        </p>
      </form>
    </div>
  )
}

