'use client'

import { useState, useEffect } from 'react'

interface DiscountCountdownProps {
  expiryDate: string | Date // ISO string or Date object
  className?: string
  showLabel?: boolean
}

export default function DiscountCountdown({ 
  expiryDate, 
  className = '',
  showLabel = true 
}: DiscountCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number
    minutes: number
    seconds: number
    expired: boolean
  }>({ hours: 0, minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const target = new Date(expiryDate).getTime()
      const now = new Date().getTime()
      const difference = target - now

      if (difference <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeRemaining({ hours, minutes, seconds, expired: false })
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [expiryDate])

  if (timeRemaining.expired) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        Offer expired
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showLabel && (
        <span className="text-xs font-semibold text-red-600">
          ⏰
        </span>
      )}
      <span className="text-xs font-bold text-red-600">
        {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
      </span>
      {showLabel && (
        <span className="text-xs text-red-600 font-semibold">
          left at this price!
        </span>
      )}
    </div>
  )
}









