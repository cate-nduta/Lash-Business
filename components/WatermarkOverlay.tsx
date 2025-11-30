'use client'

import { useEffect, useState } from 'react'

export default function WatermarkOverlay() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const watermarkText = '© LashDiary - Protected Content'
  const websiteUrl = typeof window !== 'undefined' ? window.location.hostname : 'lashdiary.co.ke'

  return (
    <>
      {/* Main watermark overlay - appears in screenshots */}
      <div
        className="fixed inset-0 pointer-events-none z-[9999]"
        style={{
          opacity: 0.15,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 150px,
            rgba(115, 61, 38, 0.08) 150px,
            rgba(115, 61, 38, 0.08) 300px
          )`,
        }}
        aria-hidden="true"
      >
        {/* Tiny repeating text watermark - almost invisible but embedded */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 8px,
              rgba(115, 61, 38, 0.008) 8px,
              rgba(115, 61, 38, 0.008) 16px
            )`,
            backgroundSize: '100% 16px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '3px',
            color: 'rgba(115, 61, 38, 0.015)',
            lineHeight: '8px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
          aria-hidden="true"
        >
          {Array.from({ length: 5000 }).map((_, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontSize: '3px',
                color: 'rgba(115, 61, 38, 0.012)',
                letterSpacing: '0.5px',
                marginRight: '12px',
                opacity: 0.3,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              the lashdiary kenya
            </span>
          ))}
        </div>
        
        {/* Diagonal watermark text pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 200px,
              rgba(115, 61, 38, 0.15) 200px,
              rgba(115, 61, 38, 0.15) 400px
            )`,
          }}
        />
        
        {/* Watermark text overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 150px,
              rgba(115, 61, 38, 0.08) 150px,
              rgba(115, 61, 38, 0.08) 300px
            )`,
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: 'rotate(-45deg)',
              fontSize: 'clamp(20px, 3vw, 36px)',
              fontWeight: 700,
              color: 'rgba(115, 61, 38, 0.12)',
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-playfair), serif',
            }}
          >
            {watermarkText}
          </div>
        </div>

        {/* Website URL watermark */}
        <div
          className="absolute bottom-4 left-4 right-4 text-center"
          style={{
            fontSize: 'clamp(10px, 1.2vw, 14px)',
            fontWeight: 600,
            color: 'rgba(115, 61, 38, 0.15)',
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-inter), sans-serif',
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.5)',
          }}
        >
          {websiteUrl}
        </div>

        {/* Corner watermarks */}
        <div
          className="absolute top-8 left-8"
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'rgba(115, 61, 38, 0.12)',
            transform: 'rotate(-45deg)',
            fontFamily: 'var(--font-playfair), serif',
          }}
        >
          © {new Date().getFullYear()} LashDiary
        </div>
        <div
          className="absolute top-8 right-8"
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'rgba(115, 61, 38, 0.12)',
            transform: 'rotate(45deg)',
            fontFamily: 'var(--font-playfair), serif',
          }}
        >
          All Rights Reserved
        </div>
        <div
          className="absolute bottom-8 left-8"
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'rgba(115, 61, 38, 0.12)',
            transform: 'rotate(45deg)',
            fontFamily: 'var(--font-playfair), serif',
          }}
        >
          Protected Content
        </div>
        <div
          className="absolute bottom-8 right-8"
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'rgba(115, 61, 38, 0.12)',
            transform: 'rotate(-45deg)',
            fontFamily: 'var(--font-playfair), serif',
          }}
        >
          Do Not Copy
        </div>
      </div>

      {/* Invisible watermark for detection - tiny text pattern */}
      <div
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{
          opacity: 0.02,
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 60px,
            rgba(115, 61, 38, 0.01) 60px,
            rgba(115, 61, 38, 0.01) 120px
          )`,
          fontFamily: 'Arial, sans-serif',
          fontSize: '2px',
          color: 'rgba(115, 61, 38, 0.008)',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {Array.from({ length: 10000 }).map((_, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontSize: '2px',
              color: 'rgba(115, 61, 38, 0.006)',
              letterSpacing: '0.3px',
              marginRight: '8px',
              opacity: 0.2,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            the lashdiary kenya
          </span>
        ))}
      </div>
    </>
  )
}

