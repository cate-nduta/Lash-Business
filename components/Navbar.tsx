'use client'

import Link from 'next/link'
import { useState } from 'react'
import Logo from './Logo'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useCart } from '@/contexts/CartContext'
import { Currency } from '@/lib/currency-utils'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { currency, setCurrency } = useCurrency()
  const { getTotalItems } = useCart()
  const cartItemCount = getTotalItems()

  // Main navigation links - keep essential ones visible
  const mainNavLinks = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
  ]
  
  // Secondary links - can be moved to footer or dropdown if needed
  const secondaryNavLinks = [
    { href: '/gallery', label: 'Gallery' },
    { href: '/booking', label: 'Booking' },
    { href: '/policies', label: 'Policies' },
  ]
  
  // Use mainNavLinks for the header
  const navLinks = mainNavLinks

  return (
    <nav className="bg-white shadow-soft w-full relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-2 hover:scale-105 transition-transform group relative">
            <Logo imageClassName="h-16 md:h-20 object-contain group-hover:animate-wiggle transition-transform duration-300" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-brown-dark hover:text-brown transition-all duration-300 font-medium hover:scale-105 transform relative group text-wiggle whitespace-nowrap"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--color-primary)] group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
            
            {/* Shop Button */}
            <Link
              href="/shop"
              className="btn-fun bg-brown-dark hover:bg-brown text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 whitespace-nowrap flex-shrink-0"
            >
              Shop
            </Link>
            
            {/* Cart Icon */}
            <Link
              href="/cart"
              className="relative p-2 text-brown-dark hover:text-brown transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Shopping cart"
            >
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ maxWidth: '24px', maxHeight: '24px', width: '24px', height: '24px' }}
              >
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center z-10 min-w-[20px]">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>
            
            {/* Currency Selector */}
            <div className="flex items-center space-x-2 border-l border-brown-light pl-4 ml-2 flex-shrink-0">
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
            
            {/* Secondary links in mobile menu */}
            {secondaryNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-brown-dark hover:text-brown transition-colors duration-300 font-medium py-2 text-sm"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Shop Button */}
            <Link
              href="/shop"
              className="block bg-brown-dark hover:bg-brown text-white font-semibold px-4 py-2 rounded-lg shadow-md text-center animate-bounce-subtle"
              onClick={() => setIsOpen(false)}
            >
              Shop
            </Link>
            
            {/* Mobile Cart Link */}
            <Link
              href="/cart"
              className="flex items-center justify-between py-2 text-brown-dark hover:text-brown transition-colors border-t border-brown-light mt-2 pt-2"
              onClick={() => setIsOpen(false)}
            >
              <span className="font-medium">Cart</span>
              {cartItemCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>
            
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

