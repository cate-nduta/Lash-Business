'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import type { PagesSettings, PageVisibility } from '@/app/api/pages-settings/route'

const PAGE_ORDER = [
  'home',
  'services',
  'booking',
  'blog',
  'labs',
  'contact',
  'gallery',
  'policies',
  'shop',
  'beforeAppointment',
  'terms',
]

export default function AdminPages() {
  const [settings, setSettings] = useState<PagesSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/pages-settings', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        return data
      }
      setMessage({ type: 'error', text: 'Failed to load page settings' })
      return null
    } catch (error) {
      console.error('Error loading page settings:', error)
      setMessage({ type: 'error', text: 'Failed to load page settings' })
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', {
          credentials: 'include',
        })
        if (!response.ok) throw new Error('Unauthorized')
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        fetchSettings()
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    checkAuth()
    return () => { isMounted = false }
  }, [router])

  const updatePage = (pageId: string, updates: Partial<PageVisibility>) => {
    if (!settings) return
    setSettings({
      ...settings,
      pages: {
        ...settings.pages,
        [pageId]: { ...settings.pages[pageId], ...updates },
      },
    })
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/pages-settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (response.ok) {
        setMessage({ type: 'success', text: 'Page settings saved successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const err = await response.json()
        setMessage({ type: 'error', text: err?.error || 'Failed to save' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save page settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  const orderedPages = PAGE_ORDER
    .filter((id) => settings.pages[id])
    .map((id) => ({ id, ...settings.pages[id] }))

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/admin/dashboard"
              className="text-brown hover:text-brown-dark text-sm font-medium mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-display text-brown-dark">Pages</h1>
            <p className="text-brown mt-1">
              Enable or disable pages in the navbar header, footer, and login/register icon.
            </p>
          </div>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* Special toggles */}
          <div className="border-b border-brown-light pb-6">
            <h2 className="text-lg font-semibold text-brown-dark mb-4">Header Icons</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-brown-dark font-medium">Login / Register icon</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.loginRegisterIcon}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      loginRegisterIcon: !settings.loginRegisterIcon,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brown-light focus:ring-offset-2 ${
                    settings.loginRegisterIcon ? 'bg-brown-dark' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                      settings.loginRegisterIcon ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-brown-dark font-medium">Shop button</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.shopButton}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      shopButton: !settings.shopButton,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brown-light focus:ring-offset-2 ${
                    settings.shopButton ? 'bg-brown-dark' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                      settings.shopButton ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-brown-dark font-medium">Cart icon</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.cartIcon !== false}
                  onClick={() => setSettings({ ...settings, cartIcon: settings.cartIcon === false })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brown-light focus:ring-offset-2 ${
                    settings.cartIcon !== false ? 'bg-brown-dark' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${settings.cartIcon !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-brown-dark font-medium">Currency selector (KES | USD)</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.currencySelector !== false}
                  onClick={() => setSettings({ ...settings, currencySelector: settings.currencySelector === false })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brown-light focus:ring-offset-2 ${
                    settings.currencySelector !== false ? 'bg-brown-dark' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${settings.currencySelector !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-brown-dark font-medium">WhatsApp button</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.whatsappButton !== false}
                  onClick={() => setSettings({ ...settings, whatsappButton: settings.whatsappButton === false })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brown-light focus:ring-offset-2 ${
                    settings.whatsappButton !== false ? 'bg-brown-dark' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${settings.whatsappButton !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </label>
            </div>
          </div>

          {/* Page toggles */}
          <div>
            <h2 className="text-lg font-semibold text-brown-dark mb-4">Page Links</h2>
            <p className="text-brown text-sm mb-4">
              Navbar Main = main navigation (desktop + mobile). Navbar Secondary = extra links in mobile menu only.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brown-light">
                    <th className="text-left py-3 font-semibold text-brown-dark">Page</th>
                    <th className="text-center py-3 font-semibold text-brown-dark">Navbar (main)</th>
                    <th className="text-center py-3 font-semibold text-brown-dark">Navbar (secondary)</th>
                    <th className="text-center py-3 font-semibold text-brown-dark">Footer</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedPages.map(({ id, href, label, navbar, navbarSecondary, footer }) => (
                    <tr key={id} className="border-b border-brown-light/50 hover:bg-pink-light/30">
                      <td className="py-3">
                        <span className="font-medium text-brown-dark">{label}</span>
                        <span className="text-brown-light text-xs ml-2">{href}</span>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={navbar}
                          onClick={() => updatePage(id, { navbar: !navbar })}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            navbar ? 'bg-brown-dark' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              navbar ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={navbarSecondary}
                          onClick={() => updatePage(id, { navbarSecondary: !navbarSecondary })}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            navbarSecondary ? 'bg-brown-dark' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              navbarSecondary ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={footer}
                          onClick={() => updatePage(id, { footer: !footer })}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            footer ? 'bg-brown-dark' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              footer ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto px-6 py-3 bg-brown-dark text-white font-semibold rounded-lg hover:bg-brown disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
