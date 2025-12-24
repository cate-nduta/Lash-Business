'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function ContractSignedPage() {
  const params = useParams()
  const token = params.token as string

  return (
    <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#7C4B31] mb-2">Contract Signed Successfully!</h1>
          <p className="text-[#6B4A3B]">
            Your contract has been signed and submitted.
          </p>
        </div>

        <div className="bg-[#F3E6DC] rounded-lg p-6 mb-6 text-left">
          <h2 className="font-semibold text-[#7C4B31] mb-3">What Happens Next?</h2>
          <ul className="space-y-2 text-sm text-[#3E2A20]">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>You'll receive a confirmation email shortly</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>An invoice for the upfront payment (80%) will be sent to your email</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Work begins only after payment is received</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>The invoice expires in 7 days - please pay promptly to secure your project slot</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full py-3 bg-[#7C4B31] text-white rounded-lg font-semibold hover:bg-[#6B3E26] transition"
          >
            Return Home
          </Link>
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

