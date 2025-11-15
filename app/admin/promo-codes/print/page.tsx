'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface PromoCode {
  code: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minPurchase?: number
  maxDiscount?: number | null
  validFrom: string
  validUntil: string
  usageLimit?: number | null
  allowFirstTimeClient?: boolean
}

interface LogoSettings {
  logoType: 'text' | 'image'
  logoUrl: string
  logoText: string
  logoColor: string
}

export default function PrintPromoCard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [promoCode, setPromoCode] = useState<PromoCode | null>(null)
  const [logoSettings, setLogoSettings] = useState<LogoSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const code = searchParams.get('code')

  useEffect(() => {
    const loadData = async () => {
      if (!code) {
        setLoading(false)
        return
      }

      try {
        // Load promo code and settings in parallel
        const [promoResponse, settingsResponse] = await Promise.all([
          fetch('/api/admin/promo-codes', { credentials: 'include' }),
          fetch('/api/settings', { cache: 'no-store' }),
        ])

        if (!promoResponse.ok) {
          throw new Error('Failed to load promo codes')
        }

        const promoData = await promoResponse.json()
        const promo = (promoData.promoCodes || []).find(
          (p: PromoCode) => p.code.toUpperCase() === code.toUpperCase(),
        )

        if (promo) {
          setPromoCode(promo)
        }

        // Load logo settings
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          const business = settingsData?.business ?? {}
          setLogoSettings({
            logoType: business.logoType === 'image' ? 'image' : 'text',
            logoUrl: business.logoUrl || '',
            logoText: typeof business.logoText === 'string' ? business.logoText : 'LashDiary',
            logoColor: business.logoColor || '#733D26',
          })
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [code])

  useEffect(() => {
    // Auto-print when page loads
    if (promoCode && !loading) {
      window.print()
    }
  }, [promoCode, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-brown-dark">Loading promo code...</div>
      </div>
    )
  }

  if (!promoCode || !code) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-brown-dark mb-4">Promo code not found</p>
          <button
            onClick={() => router.back()}
            className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const discountText =
    promoCode.discountType === 'percentage'
      ? `${promoCode.discountValue}% OFF`
      : `KSH ${promoCode.discountValue.toLocaleString()} OFF`

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0">
      {/* Print-specific styles */}
      <style jsx>{`
        @media print {
          @page {
            size: 3.5in 2in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .card-container {
            width: 3.5in;
            height: 2in;
            margin: 0;
            padding: 0.2in;
            box-shadow: none;
            border-radius: 0.1in;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        @media screen {
          .card-container {
            width: 3.5in;
            height: 2in;
            margin: 0 auto;
          }
        }
      `}</style>

      {/* Print instructions */}
      <div className="no-print mb-6 text-center max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h2 className="text-2xl font-display text-brown-dark mb-4">Printable Promo Card</h2>
          <p className="text-brown mb-4">
            The card will automatically print when ready. If it doesn't, use Ctrl+P (Windows) or Cmd+P (Mac) to print.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.print()}
              className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors"
            >
              Print Now
            </button>
            <button
              onClick={() => router.back()}
              className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>

      {/* Promo Card - Business Card Size (3.5" x 2") */}
      <div className="card-container bg-white rounded-lg shadow-xl mx-auto overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        <div className="flex h-full">
          {/* Left side - Logo and branding */}
          <div className="flex flex-col justify-between p-2 flex-shrink-0" style={{ width: '35%', background: 'linear-gradient(135deg, #733D26 0%, #5A2F1D 100%)' }}>
            <div>
              {logoSettings && (
                <div className="mb-1">
                  {logoSettings.logoType === 'image' && logoSettings.logoUrl ? (
                    <img
                      src={logoSettings.logoUrl}
                      alt={logoSettings.logoText || 'Logo'}
                      className="h-6 object-contain"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  ) : (
                    <h1
                      className="text-xs font-display font-bold text-white leading-tight"
                      style={{ color: '#FFFFFF' }}
                    >
                      {logoSettings.logoText || 'LashDiary'}
                    </h1>
                  )}
                </div>
              )}
            </div>
            <div className="text-white">
              <p className="text-[7px] leading-tight opacity-90">lashdiary.co.ke</p>
            </div>
          </div>

          {/* Right side - Promo code and details */}
          <div className="flex-1 flex flex-col justify-between p-2">
            {/* Top section - Discount and code */}
            <div>
              <div className="text-right mb-1">
                <div className="inline-block bg-[#733D26] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  {discountText}
                </div>
              </div>
              <div className="text-center">
                <p className="text-[8px] text-gray-500 mb-0.5 uppercase tracking-wide">Promo Code</p>
                <p className="text-2xl font-bold text-[#733D26] tracking-wider font-mono">{promoCode.code}</p>
              </div>
            </div>

            {/* Bottom section - Info and restrictions */}
            <div className="space-y-0.5">
              {promoCode.description && (
                <p className="text-[7px] text-gray-700 line-clamp-1">{promoCode.description}</p>
              )}
              <div className="flex justify-between text-[6px] text-gray-600">
                <span>Valid: {new Date(promoCode.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                {promoCode.allowFirstTimeClient === false && (
                  <span className="text-red-600 font-semibold">*Returning clients only</span>
                )}
              </div>
              <p className="text-[6px] text-gray-500 text-center mt-1">Use at checkout • lashdiary.co.ke</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

