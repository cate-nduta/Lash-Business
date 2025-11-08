'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const palette =
    type === 'success'
      ? {
          background: 'color-mix(in srgb, #ffffff 85%, var(--color-primary) 15%)',
          border: 'color-mix(in srgb, var(--color-primary) 70%, #ffffff 30%)',
          accent: 'color-mix(in srgb, var(--color-primary) 85%, #000000 15%)',
          text: 'color-mix(in srgb, #111111 70%, var(--color-text) 30%)',
        }
      : {
          background: 'color-mix(in srgb, #ffffff 80%, var(--color-accent) 20%)',
          border: 'color-mix(in srgb, var(--color-accent) 70%, #ffffff 30%)',
          accent: 'color-mix(in srgb, var(--color-accent) 85%, #000000 15%)',
          text: 'color-mix(in srgb, #111111 70%, var(--color-text) 30%)',
        }

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-fade-in-up">
      <div
        className="rounded-lg shadow-2xl p-4 pr-12 min-w-[300px] max-w-md border-2 relative"
        style={{
          backgroundColor: palette.background,
          borderColor: palette.border,
          color: palette.text,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl" style={{ color: palette.accent }}>
            {type === 'success' ? '✓' : '✗'}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: palette.accent }}>
              {type === 'success' ? 'Success!' : 'Error!'}
            </p>
            <p className="text-sm mt-1">{message}</p>
          </div>
        </div>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/70 rounded-b-lg overflow-hidden">
          <div
            className="h-full"
            style={{
              backgroundColor: palette.accent,
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  )
}

