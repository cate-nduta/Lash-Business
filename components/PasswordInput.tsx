'use client'

import { useState } from 'react'

interface PasswordInputProps {
  id?: string
  name?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  minLength?: number
  className?: string
  autoComplete?: string
}

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  minLength,
  className = '',
  autoComplete,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`w-full px-4 py-3 pr-12 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50 ${className}`}
      />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowPassword(!showPassword)
        }}
        className="text-brown/60 focus:outline-none"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        style={{ 
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          margin: 0,
          padding: 0,
          border: 'none',
          background: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'none'
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ 
            width: '20px',
            height: '20px',
            display: 'block',
            flexShrink: 0
          }}
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
          {!showPassword && (
            <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2.5" />
          )}
        </svg>
      </button>
    </div>
  )
}

