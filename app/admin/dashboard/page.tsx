'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string>('admin')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Array<{
    id: string
    title: string
    description: string
    panel: string
    panelHref: string
    location: string
    category: string
  }>>([])
  const [searching, setSearching] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Unauthorized')
        }

        const data = await response.json()
        if (!isMounted) return

        if (data.authenticated) {
          setAuthenticated(true)
          setUserRole(data.role || 'admin')
        } else {
          setAuthenticated(false)
          router.replace('/admin/login')
        }
      } catch (error) {
        if (!isMounted) return
        setAuthenticated(false)
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  // Search within panel content - MUST be before early returns
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const searchTimeout = setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/admin/search/index?q=${encodeURIComponent(searchQuery)}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.results || [])
        }
      } catch (error) {
        console.error('Error searching:', error)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300) // Debounce search

    return () => clearTimeout(searchTimeout)
  }, [searchQuery])

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  const allMenuItems = [
    {
      title: 'Analytics & Reports',
      description: 'View revenue, services, and performance metrics (Owner Only)',
      href: '/admin/analytics',
      icon: '📊',
      ownerOnly: true,
    },
    {
      title: 'Availability & Hours',
      description: 'Manage business hours and time slots',
      href: '/admin/availability',
      icon: '📅',
      ownerOnly: false,
    },
    {
      title: 'Blog',
      description: 'Create and manage blog posts',
      href: '/admin/blog',
      icon: '📝',
      ownerOnly: false,
    },
    {
      title: 'Bookings',
      description: 'View bookings and send testimonial requests',
      href: '/admin/bookings',
      icon: '📋',
      ownerOnly: false,
    },
    {
      title: 'Calendar',
      description: 'View bookings synchronized with your calendar',
      href: '/admin/calendar',
      icon: '📅',
      ownerOnly: false,
    },
    {
      title: 'Client Policies',
      description: 'Edit cancellation, deposit, and referral policies',
      href: '/admin/policies',
      icon: '📜',
      ownerOnly: false,
    },
    {
      title: 'Contact Information',
      description: 'Update phone, email, Instagram, and location',
      href: '/admin/contact',
      icon: '📞',
      ownerOnly: false,
    },
    {
      title: 'Discounts',
      description: 'Manage discounts and special offers',
      href: '/admin/discounts',
      icon: '🎁',
      ownerOnly: false,
    },
    {
      title: 'Email Marketing',
      description: 'Send emails to customers and track engagement',
      href: '/admin/email-marketing',
      icon: '📧',
      ownerOnly: false,
    },
    {
      title: 'Expenses',
      description: 'Track and manage business expenses',
      href: '/admin/expenses',
      icon: '💸',
      ownerOnly: false,
    },
    {
      title: 'FAQ',
      description: 'Manage frequently asked questions on the policies page',
      href: '/admin/faq',
      icon: '❓',
      ownerOnly: false,
    },
    {
      title: 'Gallery Management',
      description: 'Add, edit, or remove gallery images',
      href: '/admin/gallery',
      icon: '🖼️',
      ownerOnly: false,
    },
    {
      title: 'Gift Cards',
      description: 'Manage gift card settings, view purchases, and track redemptions',
      href: '/admin/gift-cards',
      icon: '🎁',
      ownerOnly: false,
    },
    {
      title: 'Homepage Content',
      description: 'Edit homepage text and content',
      href: '/admin/homepage',
      icon: '🏠',
      ownerOnly: false,
    },
    {
      title: 'Manage Admins',
      description: 'Add or remove admin users (max 3) (Owner Only)',
      href: '/admin/manage-admins',
      icon: '👥',
      ownerOnly: true,
    },
    {
      title: 'Newsletters',
      description: 'Upload and send PDF newsletters from Canva',
      href: '/admin/newsletters',
      icon: '📰',
      ownerOnly: false,
    },
    {
      title: 'Partner Onboarding',
      description: 'Send agreements to salons, beauticians, and influencers',
      href: '/admin/partner-onboarding',
      icon: '📝',
      ownerOnly: false,
    },
    {
      title: 'Partner Referral Emails',
      description: 'Customize partner-specific email copy and referral settings',
      href: '/admin/partner-referral-emails',
      icon: '✉️',
      ownerOnly: false,
    },
    {
      title: 'Pre-Appointment Guidelines',
      description: 'Edit the DO\'s and DON\'Ts clients see before appointments',
      href: '/admin/pre-appointment-guidelines',
      icon: '📋',
      ownerOnly: false,
    },
    {
      title: 'Promo Codes',
      description: 'Create and manage promotional codes',
      href: '/admin/promo-codes',
      icon: '🎫',
      ownerOnly: false,
    },
    {
      title: 'Referrals Tracking',
      description: 'Review partner referral bookings and commission payouts',
      href: '/admin/referrals-tracking',
      icon: '💄',
      ownerOnly: false,
    },
    {
      title: 'Seasonal Themes',
      description: 'Change website colors for different seasons',
      href: '/admin/theme',
      icon: '🎨',
      ownerOnly: false,
    },
    {
      title: 'Service Prices',
      description: 'Update service prices and durations',
      href: '/admin/services',
      icon: '💰',
      ownerOnly: false,
    },
    {
      title: 'Settings',
      description: 'Manage business info, social links, and password',
      href: '/admin/settings',
      icon: '⚙️',
      ownerOnly: false,
    },
    {
      title: 'Shop',
      description: 'Manage products, prices, and inventory for your online shop',
      href: '/admin/shop',
      icon: '🛍️',
      ownerOnly: false,
    },
    {
      title: 'Social Media Calendar',
      description: 'Schedule and manage Instagram and TikTok posts',
      href: '/admin/social-media-calendar',
      icon: '📱',
      ownerOnly: false,
    },
    {
      title: 'Terms & Conditions',
      description: 'Manage the client agreement shown before deposits',
      href: '/admin/terms',
      icon: '✅',
      ownerOnly: false,
    },
    {
      title: 'Testimonials',
      description: 'Review and approve client testimonials',
      href: '/admin/testimonials',
      icon: '⭐',
      ownerOnly: false,
    },
    {
      title: 'Workflows & Help',
      description: 'Step-by-step guides for all admin panels and workflows',
      href: '/admin/workflows',
      icon: '📖',
      ownerOnly: false,
    },
  ]

  // Filter menu items based on user role
  const baseMenuItems = userRole === 'owner' 
    ? allMenuItems 
    : allMenuItems.filter(item => !item.ownerOnly)

  // Filter menu items based on search query
  const menuItems = searchQuery.trim() === ''
    ? baseMenuItems
    : baseMenuItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )

  const handleLogout = async () => {
    const response = await fetch('/api/admin/logout', { method: 'POST' })
    if (response.ok) {
      router.push('/admin/login')
    }
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-display text-brown-dark mb-2">Admin Dashboard</h1>
              <p className="text-brown">Manage your LashDiary website</p>
            </div>
            <div className="flex items-center gap-3">
              {userRole === 'owner' && (
                <Link
                  href="/admin/activity"
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-brown-dark px-4 py-2 text-brown-dark hover:bg-brown-dark hover:text-white transition-colors"
                >
                  <span>Recent Activity</span>
                  <span aria-hidden>→</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="bg-brown-light text-brown-dark px-4 py-2 rounded-lg hover:bg-brown hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-brown-light"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search admin panels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark focus:ring-2 focus:ring-brown-light text-brown-dark placeholder-brown-light"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-brown-light hover:text-brown-dark transition-colors"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-brown">
                {searching ? 'Searching...' : (
                  <>
                    {menuItems.length > 0 && `Found ${menuItems.length} panel${menuItems.length !== 1 ? 's' : ''}`}
                    {searchResults.length > 0 && (
                      <span className={menuItems.length > 0 ? ' ml-2' : ''}>
                        {menuItems.length > 0 ? 'and ' : ''}{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} within panels
                      </span>
                    )}
                    {menuItems.length === 0 && searchResults.length === 0 && 'No results found'}
                  </>
                )}
              </p>
            )}
          </div>

          {/* Search Results from Panel Content */}
          {searchQuery && searchResults.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-display text-brown-dark mb-4">Found in Panels</h2>
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <Link
                    key={result.id}
                    href={result.panelHref}
                    className="block bg-white rounded-lg p-4 border-2 border-brown-light hover:border-brown-dark hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-brown-dark mb-1">{result.title}</h3>
                        <p className="text-brown text-sm mb-2">{result.description}</p>
                        <div className="flex items-center gap-4 text-xs text-brown-dark/70">
                          <span className="font-semibold">Panel: {result.panel}</span>
                          <span>📍 {result.location}</span>
                        </div>
                      </div>
                      <span className="ml-4 px-2 py-1 bg-brown-light text-brown-dark rounded text-xs font-semibold">
                        {result.category}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Admin Panels */}
          <div>
            {searchQuery && menuItems.length > 0 && (
              <h2 className="text-2xl font-display text-brown-dark mb-4">Admin Panels</h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="bg-pink-light rounded-lg p-6 hover:bg-pink hover:shadow-lg transition-all border-2 border-transparent hover:border-brown-light"
                >
                  <div className="text-4xl mb-4" aria-hidden>
                    {item.icon}
                  </div>
                  <h2 className="text-xl font-semibold text-brown-dark mb-2">{item.title}</h2>
                  <p className="text-brown text-sm">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

