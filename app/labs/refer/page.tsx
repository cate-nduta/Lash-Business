'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'

export default function ReferralPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const [code, setCode] = useState('')
  const [codeInfo, setCodeInfo] = useState<{ valid: boolean; referrerEmail?: string; error?: string } | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam) {
      setCode(codeParam.toUpperCase())
      checkCode(codeParam.toUpperCase())
    }
  }, [searchParams])

  const checkCode = async (codeToCheck: string) => {
    if (!codeToCheck.trim()) return

    setChecking(true)
    try {
      const response = await fetch(`/api/labs/referrals?code=${encodeURIComponent(codeToCheck.toUpperCase())}`)
      const data = await response.json()
      setCodeInfo(data)
    } catch (error) {
      setCodeInfo({ valid: false, error: 'Failed to check referral code' })
    } finally {
      setChecking(false)
    }
  }

  const handleCheckCode = () => {
    if (!code.trim()) {
      setCodeInfo({ valid: false, error: 'Please enter a referral code' })
      return
    }
    checkCode(code)
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-display text-brown-dark mb-4">
              Referral Program
            </h1>
            <p className="text-brown text-lg max-w-2xl mx-auto">
              Have a referral code? Use it during checkout to get a discount on your web services!
            </p>
          </div>

          <div className="bg-brown-light/20 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Enter Referral Code</h2>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  setCodeInfo(null)
                }}
                placeholder="LABS-XXXX"
                className="flex-1 rounded-lg border-2 border-brown-light bg-white px-4 py-3 text-lg font-mono text-brown-dark focus:border-brown-dark focus:outline-none"
              />
              <button
                onClick={handleCheckCode}
                disabled={checking || !code.trim()}
                className="px-6 py-3 bg-brown-dark hover:bg-brown text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checking ? 'Checking...' : 'Check Code'}
              </button>
            </div>

            {codeInfo && (
              <div className={`p-4 rounded-lg ${codeInfo.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {codeInfo.valid ? (
                  <div>
                    <p className="text-green-800 font-semibold mb-2">✓ Valid Referral Code!</p>
                    <p className="text-green-700 text-sm">
                      This code is valid. You can use it during checkout to receive a discount on your order.
                    </p>
                  </div>
                ) : (
                  <p className="text-red-800">{codeInfo.error || 'Invalid referral code'}</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-brown-dark mb-3">How It Works</h2>
            <ol className="space-y-3 text-brown-dark">
              <li className="flex items-start">
                <span className="mr-3 font-bold text-brown-dark">1.</span>
                <span>Enter your referral code above to verify it's valid</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold text-brown-dark">2.</span>
                <span>Browse our services on the <Link href="/labs/custom-website-builds" className="text-brown-dark underline font-semibold">Custom Website Builds</Link> page</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold text-brown-dark">3.</span>
                <span>Add services to your cart and proceed to checkout</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold text-brown-dark">4.</span>
                <span>Enter your referral code in the discount code field during checkout</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold text-brown-dark">5.</span>
                <span>Enjoy your discount!</span>
              </li>
            </ol>
          </div>

          <div className="text-center space-y-4">
            <Link
              href="/labs/custom-website-builds"
              className="inline-block bg-brown-dark hover:bg-brown text-white font-semibold px-8 py-4 rounded-lg transition-colors"
            >
              Browse Services
            </Link>
            <div>
              <Link
                href="/labs"
                className="text-brown-dark/70 hover:text-brown-dark text-sm underline"
              >
                ← Back to Labs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

