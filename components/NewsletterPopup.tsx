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
  const [discountEnabled, setDiscountEnabled] = useState(true)

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
        if (typeof data?.discountEnabled === 'boolean') {
          setDiscountEnabled(data.discountEnabled)
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
        setMessage({
          type: 'success',
          text: discountEnabled
            ? 'Welcome! Check your email for your special discount code!'
            : 'Welcome! You are subscribed to LashDiary updates.',
        })
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Popup */}
      <div className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in">
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

        {/* Header */}
        <div className="relative shrink-0 bg-[#733D26] p-5 text-center overflow-hidden sm:p-8 md:p-10">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          </div>
          
          <div className="newsletter-popup-white-text relative z-10 text-white" style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3 drop-shadow-sm" style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
              Welcome to The LashDiary Community
            </h2>
            {discountEnabled ? (
              <p className="text-base sm:text-lg md:text-xl mb-2" style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
                Get <span className="font-bold" style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>{discountPercentage}% OFF</span> your first lash appointment
              </p>
            ) : (
              <p className="text-base sm:text-lg md:text-xl mb-2" style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
                Be first to hear about openings, new services, and LashDiary updates
              </p>
            )}
            <p className="text-sm sm:text-base" style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
              {discountEnabled
                ? 'Join our newsletter and unlock your exclusive discount code'
                : 'Join the newsletter for studio news and client-only announcements'}
            </p>
            {discountEnabled && (
              <p className="mt-3 text-xs sm:text-sm" style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
                Discount codes are only sent to emails that have not been used before on the LashDiary website.
              </p>
            )}
          </div>
        </div>

        {/* Form Section */}
        <div className="overflow-y-auto bg-white p-5 sm:p-6 md:p-8">
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
                  {discountEnabled ? 'Getting your code...' : 'Subscribing...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {discountEnabled ? `Claim My ${discountPercentage}% Off!` : 'Subscribe to Updates'}
                </span>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center">
              {discountEnabled
                ? "We'll send your discount code if this email has not been used before on the LashDiary website. Unsubscribe anytime."
                : 'No spam. Unsubscribe anytime.'}
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

        .newsletter-popup-white-text,
        .newsletter-popup-white-text *,
        .newsletter-popup-white-text h2,
        .newsletter-popup-white-text p,
        .newsletter-popup-white-text span {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  )
}

