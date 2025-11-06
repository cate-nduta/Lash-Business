'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthenticated(true)
        } else {
          router.push('/admin/login')
        }
      })
      .catch(() => {
        router.push('/admin/login')
      })
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

  const menuItems = [
    {
      title: 'Gallery Management',
      description: 'Add, edit, or remove gallery images',
      href: '/admin/gallery',
      icon: '🖼️',
    },
    {
      title: 'Service Prices',
      description: 'Update service prices and durations',
      href: '/admin/services',
      icon: '💰',
    },
    {
      title: 'Availability & Hours',
      description: 'Manage business hours and time slots',
      href: '/admin/availability',
      icon: '📅',
    },
    {
      title: 'Contact Information',
      description: 'Update phone, email, Instagram, and location',
      href: '/admin/contact',
      icon: '📞',
    },
    {
      title: 'Homepage Content',
      description: 'Edit homepage text and content',
      href: '/admin/homepage',
      icon: '🏠',
    },
    {
      title: 'Promo Codes',
      description: 'Create and manage promotional codes',
      href: '/admin/promo-codes',
      icon: '🎫',
    },
    {
      title: 'Discounts',
      description: 'Manage discounts and special offers',
      href: '/admin/discounts',
      icon: '🎁',
    },
    {
      title: 'Bookings',
      description: 'View bookings and send testimonial requests',
      href: '/admin/bookings',
      icon: '📋',
    },
        {
          title: 'Testimonials',
          description: 'Review and approve client testimonials',
          href: '/admin/testimonials',
          icon: '⭐',
        },
        {
          title: 'Analytics & Reports',
          description: 'View revenue, services, and performance metrics',
          href: '/admin/analytics',
          icon: '📊',
        },
        {
          title: 'Expenses',
          description: 'Track and manage business expenses',
          href: '/admin/expenses',
          icon: '💸',
        },
        {
          title: 'Email Marketing',
          description: 'Send emails to customers and track engagement',
          href: '/admin/email-marketing',
          icon: '📧',
        },
      ]

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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-display text-brown-dark mb-2">Admin Dashboard</h1>
              <p className="text-brown">Manage your LashDiary website</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-brown-light text-brown-dark px-4 py-2 rounded-lg hover:bg-brown hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-pink-light rounded-lg p-6 hover:bg-pink hover:shadow-lg transition-all border-2 border-transparent hover:border-brown-light"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
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

