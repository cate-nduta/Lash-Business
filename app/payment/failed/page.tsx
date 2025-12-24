'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function PaymentFailedPage() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference')
  const error = searchParams.get('error')
  const status = searchParams.get('status')

  return (
    <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#7C4B31] mb-2">Payment Failed</h1>
          <p className="text-[#6B4A3B]">
            We were unable to process your payment.
          </p>
        </div>

        {/* Only show reference if available, hide technical error messages */}
        {reference && (
          <div className="bg-red-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-[#6B4A3B]">
              <strong>Reference:</strong> {reference}
            </p>
          </div>
        )}

        <div className="bg-[#F3E6DC] rounded-lg p-6 mb-6 text-left">
          <h2 className="font-semibold text-[#7C4B31] mb-3">What Can You Do?</h2>
          <ul className="space-y-2 text-sm text-[#3E2A20]">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Check that your payment method has sufficient funds</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Verify your card details are correct</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Try using a different payment method</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Contact your bank if the issue persists</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full py-3 bg-[#7C4B31] text-white rounded-lg font-semibold hover:bg-[#6B3E26] transition"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="block w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Return Home
          </Link>
          <p className="text-sm text-[#6B4A3B]">
            Need help? Contact us at{' '}
            <a href="mailto:hello@lashdiary.co.ke" className="text-[#7C4B31] hover:underline">
              hello@lashdiary.co.ke
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

