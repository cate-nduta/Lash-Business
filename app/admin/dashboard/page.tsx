'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string>('admin')
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
      title: 'Gallery Management',
      description: 'Add, edit, or remove gallery images',
      href: '/admin/gallery',
      icon: '🖼️',
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
      title: 'Availability & Hours',
      description: 'Manage business hours and time slots',
      href: '/admin/availability',
      icon: '📅',
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
      title: 'Homepage Content',
      description: 'Edit homepage text and content',
      href: '/admin/homepage',
      icon: '🏠',
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
      title: 'Discounts',
      description: 'Manage discounts and special offers',
      href: '/admin/discounts',
      icon: '🎁',
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
      title: 'Testimonials',
      description: 'Review and approve client testimonials',
      href: '/admin/testimonials',
      icon: '⭐',
      ownerOnly: false,
    },
    {
      title: 'Analytics & Reports',
      description: 'View revenue, services, and performance metrics (Owner Only)',
      href: '/admin/analytics',
      icon: '📊',
      ownerOnly: true,
    },
    {
      title: 'Expenses',
      description: 'Track and manage business expenses',
      href: '/admin/expenses',
      icon: '💸',
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
      title: 'Settings',
      description: 'Manage business info, social links, and password',
      href: '/admin/settings',
      icon: '⚙️',
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
      title: 'Image Library',
      description: 'Manage eye shape references and guidance used in bookings',
      href: '/admin/image-library',
      icon: '🖼️',
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
      title: 'Terms & Conditions',
      description: 'Manage the client agreement shown before deposits',
      href: '/admin/terms',
      icon: '✅',
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
      title: 'Manage Admins',
      description: 'Add or remove admin users (max 3) (Owner Only)',
      href: '/admin/manage-admins',
      icon: '👥',
      ownerOnly: true,
    },
    {
      title: 'Referrals Tracking',
      description: 'Review partner referral bookings and commission payouts',
      href: '/admin/referrals-tracking',
      icon: '💄',
      ownerOnly: false,
    },
  ]

  // Filter menu items based on user role
  const menuItems = userRole === 'owner' 
    ? allMenuItems 
    : allMenuItems.filter(item => !item.ownerOnly)

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
  )
}

