'use client'

import { useState, useMemo, useCallback, KeyboardEvent } from 'react'

type StarRatingBaseProps = {
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  inactiveColorClassName?: string
  activeColorClassName?: string
}

type StarRatingInputProps = StarRatingBaseProps & {
  value: number
  onChange: (value: number) => void
  readOnly?: false
  ariaLabelPrefix?: string
  id?: string
  allowReset?: boolean
}

type StarRatingDisplayProps = StarRatingBaseProps & {
  rating: number
  showBackground?: boolean
  backgroundColorClassName?: string
  ariaLabel?: string
}

const sizeToClassName: Record<NonNullable<StarRatingBaseProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function StarRatingInput({
  value,
  onChange,
  max = 5,
  size = 'md',
  className = '',
  inactiveColorClassName = 'text-gray-300',
  activeColorClassName = 'text-yellow-400',
  ariaLabelPrefix = '',
  id,
  allowReset = true,
}: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const stars = useMemo(() => Array.from({ length: Math.max(1, max) }, (_, index) => index + 1), [max])
  const displayValue = hovered ?? value
  const sizeClass = sizeToClassName[size] ?? sizeToClassName.md

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, starValue: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onChange(starValue)
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault()
        const next = starValue === max ? max : starValue + 1
        onChange(next)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault()
        const prev = starValue === 1 ? (allowReset ? 0 : 1) : starValue - 1
        onChange(prev)
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        if (allowReset) {
          event.preventDefault()
          onChange(0)
        }
      }
    },
    [allowReset, max, onChange],
  )

  return (
    <div
      id={id}
      className={`flex items-center gap-2 ${className}`}
      role="radiogroup"
      aria-label="Star rating selector"
    >
      {stars.map((star) => {
        const isActive = star <= displayValue
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${ariaLabelPrefix}${star} star${star === 1 ? '' : 's'}`}
            className={`${sizeClass} transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-dark focus-visible:ring-offset-2 rounded-full ${
              isActive ? activeColorClassName : inactiveColorClassName
            }`}
            onClick={() => onChange(star === value && allowReset ? 0 : star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
            onKeyDown={(event) => handleKeyDown(event, star)}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

export function StarRatingDisplay({
  rating,
  max = 5,
  size = 'md',
  className = '',
  inactiveColorClassName = 'text-gray-300',
  activeColorClassName = 'text-yellow-400',
  backgroundColorClassName = 'text-gray-200',
  showBackground = false,
  ariaLabel,
}: StarRatingDisplayProps) {
  const safeRating = clamp(Number.isFinite(rating) ? rating : 0, 0, max)
  const stars = useMemo(() => Array.from({ length: Math.max(1, max) }, (_, index) => index + 1), [max])
  const sizeClass = sizeToClassName[size] ?? sizeToClassName.md

  return (
    <div className={`flex items-center gap-1 leading-none ${className}`} aria-label={ariaLabel}>
      {stars.map((index) => {
        const fillAmount = clamp(safeRating - (index - 1), 0, 1)
        return (
          <span
            key={index}
            className={`relative inline-block ${sizeClass} ${inactiveColorClassName}`}
            aria-hidden="true"
          >
            {showBackground && (
              <span className={`absolute inset-0 ${backgroundColorClassName}`}>
                ★
              </span>
            )}
            <span>★</span>
            <span
              className={`absolute inset-0 overflow-hidden ${activeColorClassName}`}
              style={{ width: `${fillAmount * 100}%` }}
            >
              ★
            </span>
          </span>
        )
      })}
    </div>
  )
}

export function formatAverageRating(value: number | null | undefined, digits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }
  return value.toFixed(digits)
}

export type AverageRatingSummary = {
  average: number | null
  count: number
}

export async function fetchAverageRatingSummary(): Promise<AverageRatingSummary> {
  const response = await fetch('/api/testimonials', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch testimonials: ${response.status}`)
  }
  const data = await response.json()
  const testimonials = Array.isArray(data?.testimonials) ? data.testimonials : []
  const valid = testimonials.filter((item: any) => typeof item?.rating === 'number' && item.rating > 0)
  const count = valid.length
  const sum = valid.reduce((acc: number, item: any) => acc + Number(item.rating || 0), 0)

  return {
    average: count > 0 ? sum / count : null,
    count,
  }
}

