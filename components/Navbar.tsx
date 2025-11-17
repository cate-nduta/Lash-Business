'use client'

import Link from 'next/link'
import { useState } from 'react'
import Logo from './Logo'
import { useCurrency } from '@/contexts/CurrencyContext'
import { Currency } from '@/lib/currency-utils'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { currency, setCurrency } = useCurrency()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/booking', label: 'Booking' },
    { href: '/contact', label: 'Contact' },
    { href: '/policies', label: 'Policies' },
  ]

  return (
    <nav className="bg-white shadow-soft w-full relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-2 hover:scale-105 transition-transform group relative">
            <Logo imageClassName="h-16 md:h-20 object-contain group-hover:animate-wiggle transition-transform duration-300" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-brown-dark hover:text-brown transition-all duration-300 font-medium hover:scale-110 transform relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--color-primary)] group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
            
            {/* Currency Selector */}
            <div className="flex items-center space-x-2 border-l border-brown-light pl-6 ml-2">
              <button
                onClick={() => setCurrency('KES')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  currency === 'KES'
                    ? 'bg-brown-dark text-white'
                    : currency === 'USD'
                    ? 'bg-gray-200 text-gray-500 opacity-60'
                    : 'text-brown-dark hover:bg-brown-light/30'
                }`}
              >
                KES
              </button>
              <span className="text-brown-dark/40">|</span>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  currency === 'USD'
                    ? 'bg-amber-500 text-white shadow-md brightness-110'
                    : 'text-brown-dark hover:bg-brown-light/30'
                }`}
              >
                USD
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-brown-dark focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-3 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-brown-dark hover:text-brown transition-colors duration-300 font-medium py-2"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Currency Selector */}
            <div className="flex items-center space-x-2 pt-2 border-t border-brown-light mt-2">
              <span className="text-brown-dark font-medium text-sm">Currency:</span>
              <button
                onClick={() => {
                  setCurrency('KES')
                  setIsOpen(false)
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  currency === 'KES'
                    ? 'bg-brown-dark text-white'
                    : currency === 'USD'
                    ? 'bg-gray-200 text-gray-500 opacity-60'
                    : 'text-brown-dark hover:bg-brown-light/30'
                }`}
              >
                KES
              </button>
              <span className="text-brown-dark/40">|</span>
              <button
                onClick={() => {
                  setCurrency('USD')
                  setIsOpen(false)
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  currency === 'USD'
                    ? 'bg-amber-500 text-white shadow-md brightness-110'
                    : 'text-brown-dark hover:bg-brown-light/30'
                }`}
              >
                USD
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

