'use client'

import { useState, useEffect } from 'react'

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [discountPercentage, setDiscountPercentage] = useState(5) // Default to 5%
  const [enabled, setEnabled] = useState(true) // Default to enabled

  useEffect(() => {
    // Load discount percentage and enabled status from public API
    // Add timestamp to prevent caching - ensures fresh data every time
    const timestamp = Date.now()
    fetch(`/api/newsletter/discount?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    })
      .then(res => res.json())
      .then(data => {
        if (typeof data?.discountPercentage === 'number') {
          setDiscountPercentage(Math.max(0, Math.min(100, data.discountPercentage)))
        }
        if (typeof data?.enabled === 'boolean') {
          setEnabled(data.enabled)
        }
      })
      .catch(() => {
        // If error, keep defaults
        console.warn('Could not load newsletter settings, using defaults')
      })
  }, [])

  useEffect(() => {
    // Only show popup if enabled in settings
    if (!enabled) {
      return
    }
    
    // Check if popup has been shown before
    const hasSeenPopup = localStorage.getItem('newsletter-popup-shown')
    if (!hasSeenPopup) {
      // Show popup after a short delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500) // 1.5 second delay

      return () => clearTimeout(timer)
    }
  }, [enabled])

  const handleClose = () => {
    setIsOpen(false)
    // Mark as shown so it doesn't appear again
    localStorage.setItem('newsletter-popup-shown', 'true')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          name: name.trim(),
          source: 'popup' // Track that it came from popup
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe')
      }

      // Check if already subscribed
      if (data.alreadySubscribed) {
        setMessage({ 
          type: 'success', 
          text: 'You\'re already subscribed! Thank you for being part of our community! 💕' 
        })
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        // New subscriber - success!
        setMessage({ type: 'success', text: 'Welcome! Check your email for your special discount code! 🎉' })
        setTimeout(() => {
          handleClose()
        }, 2000)
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to subscribe. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Don't render if disabled or not open
  if (!enabled || !isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Popup */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 transition-colors shadow-lg"
          aria-label="Close popup"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)] to-[var(--color-primary-dark)] p-8 sm:p-10 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">
              Welcome to The LashDiary Community
            </h2>
            <p className="text-lg sm:text-xl text-white/95 mb-2">
              Get <span className="font-bold text-white">{discountPercentage}% OFF</span> your first lash appointment
            </p>
            <p className="text-sm sm:text-base text-white/85">
              Join our newsletter and unlock your exclusive discount code
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-6 sm:p-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="popup-name" className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name (Optional)
              </label>
              <input
                id="popup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-gray-900 placeholder-gray-400 transition-all"
              />
            </div>
            <div>
              <label htmlFor="popup-email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                id="popup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-gray-900 placeholder-gray-400 transition-all"
              />
            </div>
            {message && (
              <div
                className={`p-4 rounded-xl text-sm font-medium ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 border-2 border-green-200'
                    : 'bg-red-50 text-red-700 border-2 border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full px-6 py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Getting your code...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Claim My {discountPercentage}% Off!
                </span>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center">
              We'll send you your discount code via email. Unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

