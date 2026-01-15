'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Prize {
  id: string
  label: string
  type: string
  value?: number
  serviceType?: string
  freeServiceId?: string
  discountServiceId?: string
  enabled?: boolean
}

interface SpinWheelSettings {
  enabled: boolean
  noticeText: string
  prizes: Prize[]
}

export default function SpinTheWheelPage() {
  const [settings, setSettings] = useState<SpinWheelSettings | null>(null)
  const [email, setEmail] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{
    prize: Prize
    code: string
    expiresAt: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [showPrizeDetails, setShowPrizeDetails] = useState(false)
  const [wonPrize, setWonPrize] = useState<{
    prize: Prize
    code: string
    expiresAt: string
  } | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/labs/spin-wheel/prizes', {
          cache: 'no-store',
        })
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    loadSettings()
  }, [])

  const handleSpin = async () => {
    // Prevent multiple spins - if already spinning, do nothing
    if (spinning) {
      return
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setError(null)
    setSpinning(true)
    setResult(null)

    try {
      const response = await fetch('/api/labs/spin-wheel/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to spin the wheel'
        setError(errorMessage)
        setSpinning(false)
        // If user has already spun, don't allow them to try again
        if (errorMessage.includes('already spun') || errorMessage.includes('only spin once')) {
          setEmail('') // Clear email to prevent further attempts
        }
        return
      }

      // Calculate rotation to land arrow on the winning prize
      // Arrow is fixed at top (0 degrees), wheel rotates clockwise
      // IMPORTANT: Use enabled prizes array to match what's displayed on the wheel
      const enabledPrizesForRotation = settings?.prizes.filter(p => p.enabled) || []
      const prizeIndex = enabledPrizesForRotation.findIndex(p => p.id === data.prize.id)
      
      // If prize not found in enabled prizes, fallback to 0 (shouldn't happen but safety check)
      if (prizeIndex === -1) {
        console.error('Prize not found in enabled prizes:', data.prize.id)
      }
      
      const finalPrizeIndex = prizeIndex >= 0 ? prizeIndex : 0
      const totalPrizes = enabledPrizesForRotation.length || 8
      const anglePerPrize = totalPrizes > 0 ? 360 / totalPrizes : 360 / 8
      
      // Each slice starts at: -90 + (index * anglePerPrize)
      // Slice center is at: -90 + (index * anglePerPrize) + (anglePerPrize / 2)
      // For example, with 8 prizes: slice 0 center is at -90 + 0 + 22.5 = -67.5 degrees
      const sliceCenterAngle = -90 + (finalPrizeIndex * anglePerPrize) + (anglePerPrize / 2)
      
      // When wheel rotates clockwise by r degrees:
      // A point at angle 'a' moves to: (a + r) % 360
      // We want slice center to end up at 0 degrees (where arrow is)
      // So: (sliceCenterAngle + rotationToPrize) % 360 = 0
      // Therefore: rotationToPrize = (360 - sliceCenterAngle) % 360
      // Normalize sliceCenterAngle first to 0-360 range
      const normalizedSliceAngle = ((sliceCenterAngle % 360) + 360) % 360
      const rotationToPrize = (360 - normalizedSliceAngle) % 360
      
      // Add multiple full spins for visual effect (8 full rotations)
      const spinRotations = 8 * 360
      const finalRotation = spinRotations + rotationToPrize
      
      // Rotation calculation complete
      
      // Set the rotation - this will spin the wheel and stop exactly on the prize
      setRotation(finalRotation)
      setShowPrizeDetails(false) // Reset prize details view
      setWonPrize(null) // Reset won prize

      // Wait for animation to complete (8 seconds for the spin)
      setTimeout(() => {
        setSpinning(false)
        // Keep the wheel at finalRotation - don't reset it!
        // The arrow will be pointing at the prize center
        
        // Wait 3 seconds after wheel stops so they can see what they won on the wheel
        setTimeout(async () => {
          // The wheel has stopped, arrow is pointing at the prize
          // Use the prize directly from the API response (which matches what the arrow points to)
          const wonPrize = enabledPrizesForRotation[finalPrizeIndex]
          
          if (wonPrize) {
            // Update the code record in the database to match the prize the arrow is pointing to
            try {
              await fetch('/api/labs/spin-wheel/update-code-prize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  code: data.code,
                  prizeId: wonPrize.id,
                  prizeLabel: wonPrize.label,
                  prizeType: wonPrize.type,
                  prizeValue: wonPrize.value,
                  prizeServiceType: wonPrize.serviceType,
                  freeServiceId: wonPrize.freeServiceId,
                  discountServiceId: wonPrize.discountServiceId,
                }),
              })
            } catch (error) {
              console.error('Error updating code prize:', error)
              // Continue anyway - the code will still work
            }
            
            // Award the prize that the arrow is pointing to
            setWonPrize({
              prize: wonPrize,
              code: data.code,
              expiresAt: data.expiresAt,
            })
          } else {
            // Fallback to API response
            setWonPrize(data)
          }
          // Don't set result yet - wait for "See Prize" button click
        }, 3000)
      }, 6000)
    } catch (error: any) {
      setError('Failed to spin the wheel. Please try again.')
      setSpinning(false)
    }
  }

  // Filter to only enabled prizes for display
  const enabledPrizes = settings?.prizes.filter(p => p.enabled) || []
  const totalPrizes = enabledPrizes.length
  const anglePerPrize = totalPrizes > 0 ? 360 / totalPrizes : 0

  if (!settings) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!settings.enabled) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brown mb-4">Spin the Wheel</h1>
          <p className="text-brown">The spin the wheel feature is currently disabled.</p>
          <Link href="/labs" className="text-[var(--color-primary)] hover:underline mt-4 inline-block">
            ← Back to Labs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-display text-[var(--color-primary)] mb-4">
            🎡 Spin the Wheel
          </h1>
          <p className="text-xl md:text-2xl font-bold text-[var(--color-text)] mb-3 text-orange-600">
            🎁 FREE Consultations • 💰 HUGE Discounts • 🚀 Free Services!
          </p>
          <p className="text-base md:text-lg text-[var(--color-text)] mb-2 font-semibold">
            Don't miss out on incredible savings! Every spin is a chance to win! ⚡
          </p>
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
            <p className="text-sm md:text-base text-blue-900 font-semibold text-center">
              📧 <strong>Important:</strong> Use the same email address you spin with when checking out or booking a consultation to redeem your prize!
            </p>
          </div>
          <p className="text-lg text-[var(--color-text)] mb-4">
            Enter your email and spin to win exciting prizes!
          </p>
          <p className="text-sm text-[var(--color-text)]/70 mb-8">
            ⚠️ Prizes are valid for one month only. <strong>One spin per email - once you win, you cannot spin again.</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {!result && !wonPrize ? (
            <>
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  disabled={spinning}
                />
              </div>

              {error && (
                <div className={`mb-4 p-4 rounded-lg border-2 ${
                  error.includes('already spun') || error.includes('only spin once')
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-900'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <p className="font-semibold text-center">
                    {error.includes('already spun') || error.includes('only spin once') ? '⚠️ ' : ''}
                    {error}
                  </p>
                  {(error.includes('already spun') || error.includes('only spin once')) && (
                    <p className="text-sm mt-2 text-center">
                      Each email address can only spin the wheel once. If you've already won a prize, please use your code to claim it.
                    </p>
                  )}
                </div>
              )}

              {/* Spin Wheel - Pie Chart Style */}
              <div className="relative w-full max-w-2xl mx-auto mb-8">
                <div 
                  className="relative overflow-hidden rounded-full" 
                  style={{ 
                    paddingBottom: '100%',
                    pointerEvents: spinning ? 'none' : 'auto'
                  }}
                >
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 400 400"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: spinning ? 'transform 8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
                      transformOrigin: 'center center',
                      pointerEvents: spinning ? 'none' : 'auto',
                    }}
                  >
                    <defs>
                      {enabledPrizes.map((_, index) => {
                        return (
                          <filter key={`shadow-${index}`} id={`shadow-${index}`}>
                            <feDropShadow dx="2" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.3)" />
                          </filter>
                        )
                      })}
                    </defs>
                    {enabledPrizes.map((prize, index) => {
                      const colors = [
                        '#A8D5E2', // Light Blue
                        '#FFE5B4', // Light Yellow
                        '#B8B3E6', // Light Purple/Periwinkle
                        '#FFB6C1', // Light Pink
                        '#B8E6B8', // Light Green
                        '#E6D5A8', // Light Beige
                        '#D4A5E6', // Light Lavender
                        '#A5D4E6', // Light Sky Blue
                      ]
                      const color = colors[index % colors.length]
                      const startAngle = index * anglePerPrize - 90 // Start from top
                      const endAngle = (index + 1) * anglePerPrize - 90
                      const centerX = 200
                      const centerY = 200
                      const radius = 195
                      const innerRadius = 0 // Full pie - slices meet at center point
                      
                      // Calculate arc path
                      const startAngleRad = (startAngle * Math.PI) / 180
                      const endAngleRad = (endAngle * Math.PI) / 180
                      
                      const x1 = centerX + radius * Math.cos(startAngleRad)
                      const y1 = centerY + radius * Math.sin(startAngleRad)
                      const x2 = centerX + radius * Math.cos(endAngleRad)
                      const y2 = centerY + radius * Math.sin(endAngleRad)
                      
                      const x3 = centerX + innerRadius * Math.cos(endAngleRad)
                      const y3 = centerY + innerRadius * Math.sin(endAngleRad)
                      const x4 = centerX + innerRadius * Math.cos(startAngleRad)
                      const y4 = centerY + innerRadius * Math.sin(startAngleRad)
                      
                      const largeArcFlag = anglePerPrize > 180 ? 1 : 0
                      
                      // If innerRadius is 0, create a full pie slice (triangle from center)
                      const pathData = innerRadius > 0
                        ? [
                            `M ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            `L ${x3} ${y3}`,
                            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                            'Z'
                          ].join(' ')
                        : [
                            `M ${centerX} ${centerY}`,
                            `L ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            'Z'
                          ].join(' ')
                      
                      // Text position (middle of the slice, closer to outer edge)
                      const textAngle = (startAngle + endAngle) / 2
                      const textAngleRad = (textAngle * Math.PI) / 180
                      const textRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.65 // Position text in outer 65% of slice
                      const textX = centerX + textRadius * Math.cos(textAngleRad)
                      const textY = centerY + textRadius * Math.sin(textAngleRad)
                      
                      // Calculate rotation for text to align with slice direction (radial alignment)
                      // Text should be rotated to point outward along the radial line
                      // For bottom half, flip 180 degrees so text is readable (not upside down)
                      let textRotation = textAngle
                      if (textAngle > 0 && textAngle < 180) {
                        // Bottom half - flip text 180 degrees
                        textRotation = textAngle + 180
                      }
                      
                      return (
                        <g key={prize.id}>
                          <path
                            d={pathData}
                            fill={color}
                            stroke="#fff"
                            strokeWidth="3"
                            filter={`url(#shadow-${index})`}
                            style={{ 
                              cursor: spinning ? 'not-allowed' : 'pointer',
                              pointerEvents: spinning ? 'none' : 'auto'
                            }}
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#1a1a1a"
                            fontSize="8"
                            fontWeight="bold"
                            transform={`rotate(${textRotation} ${textX} ${textY})`}
                            style={{
                              textShadow: '1px 1px 2px rgba(255,255,255,0.9)',
                            }}
                            className="pointer-events-none"
                          >
                            {prize.label.length > 20 ? prize.label.substring(0, 17) + '...' : prize.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                  
                  {/* Center Spin Button - Fixed position, doesn't rotate */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center z-20" 
                    style={{ 
                      transform: 'none',
                      pointerEvents: spinning ? 'none' : 'auto'
                    }}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-2xl flex items-center justify-center border-3 border-[var(--color-primary)]">
                      <button
                        onClick={handleSpin}
                        disabled={spinning || !email}
                        className="w-12 h-12 sm:w-16 sm:h-16 bg-[var(--color-primary)] rounded-full flex items-center justify-center hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        style={{
                          pointerEvents: spinning ? 'none' : 'auto',
                          cursor: spinning ? 'not-allowed' : 'pointer'
                        }}
                        aria-label="Spin the wheel"
                      >
                        <svg
                          className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-1"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Pointer at top */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                    <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[35px] border-l-transparent border-r-transparent border-t-[var(--color-primary)] drop-shadow-lg"></div>
                  </div>
                </div>
              </div>
              
              {!spinning && email && (
                <p className="text-center text-sm text-[var(--color-text)]/70 mb-4">
                  Click the center button to spin!
                </p>
              )}

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-center text-sm sm:text-base text-blue-800 font-semibold">
                  💡 <strong>Tip:</strong> See the full list of all prizes below the wheel for complete details!
                </p>
              </div>

              {/* Prize List - Show all available prizes with full text */}
              <div className="mt-8 pt-8 border-t-2 border-[var(--color-primary)]/30">
                <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-2 text-center">
                  🎁 All Available Prizes
                </h3>
                <p className="text-center text-sm text-[var(--color-text)]/70 mb-6">
                  See all prizes you can win below (full text shown here)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enabledPrizes.map((prize, index) => {
                    const colors = [
                      '#A8D5E2', // Light Blue
                      '#FFE5B4', // Light Yellow
                      '#B8B3E6', // Light Purple/Periwinkle
                      '#FFB6C1', // Light Pink
                      '#B8E6B8', // Light Green
                      '#E6D5A8', // Light Beige
                      '#D4A5E6', // Light Lavender
                      '#A5D4E6', // Light Sky Blue
                    ]
                    const color = colors[index % colors.length]
                    return (
                      <div
                        key={prize.id}
                        className="flex items-start p-4 rounded-lg border-2 border-gray-300 shadow-md"
                        style={{ backgroundColor: `${color}60` }}
                      >
                        <div
                          className="w-5 h-5 rounded-full mr-3 flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: color }}
                        ></div>
                        <span className="text-base sm:text-lg font-bold text-[var(--color-text)] leading-snug">
                          {prize.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </>
          ) : wonPrize && !showPrizeDetails ? (
            // Show what they won first, before revealing full details
            <div className="text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h2 className="text-3xl font-bold text-[var(--color-primary)] mb-4">
                  You Won!
                </h2>
                <div className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 rounded-xl p-6 mb-6">
                  <p className="text-2xl md:text-3xl font-bold text-[var(--color-primary)]">
                    {wonPrize.prize.label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPrizeDetails(true)
                  setResult(wonPrize)
                }}
                className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                See Prize →
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-[var(--color-primary)] mb-2">
                  Congratulations!
                </h2>
                <p className="text-xl text-[var(--color-text)] mb-4">
                  You won: <strong>{result?.prize?.label || 'Unknown Prize'}</strong>
                </p>
              </div>

              <div className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 rounded-xl p-6 mb-6">
                <p className="text-sm text-[var(--color-text)]/70 mb-2">Your Code:</p>
                <p className="text-2xl font-bold text-[var(--color-primary)] mb-2 font-mono">
                  {result?.code || 'N/A'}
                </p>
                <p className="text-sm text-[var(--color-text)]/70">
                  Expires: {result?.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-900 font-semibold text-center mb-2">
                  ⚠️ Important: Use the Same Email!
                </p>
                <p className="text-xs text-yellow-800 text-center">
                  When booking your consultation or checking out, make sure to use the same email address you used to spin the wheel: <strong>{email}</strong>
                </p>
              </div>

              <div className="space-y-4">
                {result?.prize?.type === 'free_consultation' ? (
                  <Link
                    href={`/labs/book-appointment?spinCode=${result.code || ''}`}
                    className="block w-full bg-[var(--color-primary)] text-white py-4 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all"
                  >
                    Book Your Free Consultation →
                  </Link>
                ) : (
                  <Link
                    href={`/labs/custom-website-builds/checkout?spinCode=${result?.code || ''}`}
                    className="block w-full bg-[var(--color-primary)] text-white py-4 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all"
                  >
                    Use Code at Checkout →
                  </Link>
                )}
              </div>

              <p className="text-sm text-[var(--color-text)]/70 mt-6">
                💡 Save this code! You can use it when booking a consultation or at checkout. Remember to use the same email ({email}) when checking out or booking.
              </p>
            </div>
          )}
        </div>

        <div className="text-center">
          <Link href="/labs" className="text-[var(--color-primary)] hover:underline">
            ← Back to Labs
          </Link>
        </div>
      </div>
    </div>
  )
}

