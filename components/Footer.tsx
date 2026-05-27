'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import type { PagesSettings } from '@/app/api/pages-settings/route'

interface HomepageData {
  modelSignup?: {
    enabled?: boolean
  }
}

const readStoredPagesSettings = (): PagesSettings | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('pages-settings')
    return raw ? (JSON.parse(raw) as PagesSettings) : null
  } catch {
    return null
  }
}

export default function Footer() {
  const [modelSignupEnabled, setModelSignupEnabled] = useState(false)
  const [pagesSettings, setPagesSettings] = useState<PagesSettings | null>(() => readStoredPagesSettings())

  useEffect(() => {
    const checkModelSignup = async () => {
      try {
        const response = await fetch('/api/homepage')
        if (response.ok) {
          const data: HomepageData = await response.json()
          setModelSignupEnabled(data.modelSignup?.enabled || false)
        }
      } catch (error) {
        console.error('Error checking model signup status:', error)
      }
    }
    checkModelSignup()
  }, [])

  useEffect(() => {
    const loadPagesSettings = () => {
      fetch(`/api/pages-settings?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return
          setPagesSettings(data)
          try {
            window.localStorage.setItem('pages-settings', JSON.stringify(data))
          } catch {
            /* ignore storage failures */
          }
        })
        .catch(() => {})
    }
    loadPagesSettings()
    const onPagesSettingsChanged = () => loadPagesSettings()
    window.addEventListener('pages-settings-changed', onPagesSettingsChanged)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pages-settings-changed') loadPagesSettings()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('pages-settings-changed', onPagesSettingsChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const footerLinks = pagesSettings
    ? Object.entries(pagesSettings.pages)
        .filter(([, p]) => p.footer)
        .map(([, p]) => ({ href: p.href, label: p.label }))
    : []

  // Normalize label for footer display (some pages use different labels)
  const getFooterLabel = (href: string, label: string) => {
    if (href === '/booking') return 'Book Appointment'
    if (href === '/policies') return 'Booking Policies'
    if (href === '/privacy') return 'Privacy Policy'
    if (href === '/terms') return 'Terms & Conditions'
    if (href === '/contact') return 'Contact Us'
    return label
  }
  return (
    <footer className="bg-pink-light border-t border-brown-light mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="mb-4">
              <Logo
                className="text-2xl font-display text-brown font-bold"
                imageClassName="h-12 object-contain"
              />
            </div>
            <p className="text-gray-600 text-sm">
              Premium lash extensions and beauty services. 
              Experience luxury in every detail.
            </p>
          </div>

          <div>
            <h4 className="font-display text-gray-800 font-semibold mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-600 hover:text-brown transition-all duration-300 text-sm hover:translate-x-1 inline-block group"
                  >
                    {getFooterLabel(link.href, link.label)}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-gray-800 font-semibold mb-4">
              Connect
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-brown transition-colors"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a href="mailto:hello@lashdiary.co.ke" className="hover:text-brown transition-colors">
                  hello@lashdiary.co.ke
                </a>
              </li>
              {modelSignupEnabled && (
                <li>
                  <Link href="/modelsignup" className="hover:text-brown transition-colors">
                    Sign up as a model
                  </Link>
                </li>
              )}
            </ul>
          </div>

        </div>

        <div className="mt-8 pt-8 border-t border-brown-light text-center">
          <div className="flex items-center justify-center gap-1 mb-2 text-sm text-gray-600">
            <span>&copy; {new Date().getFullYear()}</span>
            <Logo
              className="inline text-base font-display text-brown font-bold"
              imageClassName="h-8 object-contain"
            />
            <span>. All rights reserved.</span>
          </div>
          <p className="text-xs text-gray-500">
            This website and its content are protected by copyright law. Unauthorized copying, reproduction, or distribution is strictly prohibited.
          </p>
        </div>
      </div>
    </footer>
  )
}
