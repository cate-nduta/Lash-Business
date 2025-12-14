'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-baby-pink-light flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-display text-brown-dark mb-4">🤎 Oops!</h1>
        <p className="text-brown mb-6">
          Something went wrong. Don't worry, we're on it!
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-brown-light text-brown-dark rounded-lg font-semibold hover:bg-brown-light/80 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}





