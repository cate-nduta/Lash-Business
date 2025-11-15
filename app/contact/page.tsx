'use client'

import { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

interface ContactData {
  phone: string
  email: string
  instagram: string
  instagramUrl: string
  location: string
  showPhone?: boolean
  showEmail?: boolean
  showInstagram?: boolean
  showLocation?: boolean
  headerTitle?: string
  headerSubtitle?: string
  businessHoursTitle?: string
  socialMediaTitle?: string
  socialMediaDescription?: string
  bookingTitle?: string
  bookingDescription?: string
  bookingButtonText?: string
}

interface AvailabilityData {
  businessHours?: {
    [key: string]: {
      open: string
      close: string
      enabled: boolean
    }
  }
}

export default function Contact() {
  const [contactData, setContactData] = useState<ContactData | null>(null)
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadContactAndAvailability = async () => {
    try {
      const timestamp = Date.now()
      const [contactRes, availabilityRes] = await Promise.all([
        fetch(`/api/contact?t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
        }),
        fetch('/api/availability', { cache: 'no-store' }),
      ])

      if (contactRes.ok) {
        const contactJson = await contactRes.json()
        console.log('Loaded contact data:', contactJson)
        setContactData(contactJson)
      } else {
        console.error('Failed to load contact data:', contactRes.status)
      }

      if (availabilityRes.ok) {
        const availabilityJson = await availabilityRes.json()
        setAvailabilityData(availabilityJson)
      }
    } catch (error) {
      console.error('Error loading contact/availability data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContactAndAvailability()
    
    // Refresh data when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadContactAndAvailability()
      }
    }
    
    // Refresh data when window gains focus
    const handleFocus = () => {
      loadContactAndAvailability()
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const dayOrder = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ] as const

  const defaultHours: Record<
    (typeof dayOrder)[number]['key'],
    { enabled: boolean; open: string; close: string }
  > = {
    monday: { enabled: true, open: '09:00', close: '18:00' },
    tuesday: { enabled: true, open: '09:00', close: '18:00' },
    wednesday: { enabled: true, open: '09:00', close: '18:00' },
    thursday: { enabled: true, open: '09:00', close: '18:00' },
    friday: { enabled: true, open: '09:00', close: '18:00' },
    saturday: { enabled: false, open: '09:00', close: '18:00' },
    sunday: { enabled: true, open: '12:00', close: '17:00' },
  }

  const businessHours = dayOrder.map(({ key, label }) => {
    const config = availabilityData?.businessHours?.[key]
    const resolved =
      typeof config?.enabled === 'boolean'
        ? { ...defaultHours[key], ...config }
        : defaultHours[key]

    if (resolved.enabled) {
      return {
        label,
        status: `${formatTime(resolved.open)} - ${formatTime(resolved.close)}`,
        open: true,
      }
    }

    return { label, status: 'Closed', open: false }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-20 flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  const contact = contactData || {
    phone: '',
    email: '',
    instagram: '',
    instagramUrl: '',
    location: '',
    headerTitle: 'Get In Touch',
    headerSubtitle: 'Visit us at our studio or reach out with any questions. We can\'t wait to welcome you and curate a stunning lash look.',
    businessHoursTitle: 'Business Hours',
    socialMediaTitle: 'Follow Us',
    socialMediaDescription: 'Stay connected and see our latest work on social media',
    bookingTitle: 'Ready to Book?',
    bookingDescription: 'Reserve your studio appointment today and let us pamper you with a luxury lash experience.',
    bookingButtonText: 'Book Appointment',
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 sm:py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div 
          ref={ref}
          className={`text-center mb-8 sm:mb-12 md:mb-16 ${
            inView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display text-brown mb-4 sm:mb-6">
            {contact.headerTitle || 'Get In Touch'}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            {contact.headerSubtitle || 'Visit us at our studio or reach out with any questions. We can\'t wait to welcome you and curate a stunning lash look.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Contact Information Card */}
          <div className="bg-white rounded-xl shadow-soft-lg border-2 border-brown-light p-4 sm:p-6 md:p-8 hover:shadow-soft-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="mb-6 pb-4 border-b-2 border-brown-light">
              <h2 className="text-2xl font-display text-brown font-bold">
                Contact Information
              </h2>
            </div>
            
            <div className="space-y-5">
              {contact.showLocation && contact.location ? (
                <div className="bg-pink-light/40 border-2 border-brown-light rounded-lg p-4">
                  <p className="text-brown-dark font-bold text-sm mb-1">
                    📍 Studio Location
                  </p>
                  <p className="text-gray-700 text-xs">
                    {contact.location}
                  </p>
                </div>
              ) : null}

              {contact.showPhone && contact.phone ? (
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-pink-light/20 transition-colors">
                  <div className="text-brown text-xl">📞</div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1 text-sm">Phone</h3>
                    <a 
                      href={`tel:${contact.phone.replace(/\s/g, '')}`}
                      className="text-brown hover:text-brown-dark hover:underline font-medium text-sm break-all"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>
              ) : null}

              {contact.showEmail && contact.email ? (
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-pink-light/20 transition-colors">
                  <div className="text-brown text-xl">✉️</div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1 text-sm">Email</h3>
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-brown hover:text-brown-dark hover:underline font-medium text-sm break-all"
                    >
                      {contact.email}
                    </a>
                    <p className="text-xs text-gray-500 mt-1">
                      Emails are replied to in less than 6 hours.
                    </p>
                  </div>
                </div>
              ) : null}

              {contact.showInstagram && (contact.instagram || contact.instagramUrl) ? (
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-pink-light/20 transition-colors">
                  <div className="text-brown text-xl">📱</div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1 text-sm">Instagram</h3>
                    <a 
                      href={contact.instagramUrl || `https://instagram.com/${contact.instagram?.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-brown hover:text-brown-dark hover:underline font-medium"
                    >
                      {contact.instagram || 'Follow Us'}
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Business Hours Card */}
          <div className="bg-white rounded-xl shadow-soft-lg border-2 border-brown-light p-8 hover:shadow-soft-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="mb-6 pb-4 border-b-2 border-brown-light">
              <h2 className="text-2xl font-display text-brown font-bold">
                {contact.businessHoursTitle || 'Business Hours'}
              </h2>
            </div>
            <div className="space-y-3">
              {businessHours.map(({ label, status, open }) => (
                <div
                  key={label}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    open ? 'bg-pink-light/20' : 'bg-gray-100'
                  }`}
                >
                  <span className="font-semibold text-gray-800 text-sm">{label}</span>
                  <span className={`font-bold text-sm ${open ? 'text-brown' : 'text-gray-500 italic'}`}>
                    {open ? status : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Social Media & Booking Card */}
          <div className="space-y-6 md:col-span-2 lg:col-span-1">
            {/* Social Media */}
            {contact.showInstagram && contact.instagramUrl ? (
              <div className="bg-gradient-to-br from-pink to-pink-dark rounded-xl shadow-soft-lg border-2 border-brown-light p-8 text-center hover:shadow-soft-xl transition-all duration-300 hover:scale-[1.02]">
                <h2 className="text-2xl font-display text-white mb-3 font-bold">
                  {contact.socialMediaTitle || 'Follow Us'}
                </h2>
                <p className="text-white/95 mb-6 text-sm">
                  {contact.socialMediaDescription || 'Stay connected and see our latest work on social media'}
                </p>
                <a
                  href={contact.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-brown-dark font-bold px-6 py-3 rounded-full hover:bg-pink-light transition-all duration-300 hover:scale-105 shadow-md"
                >
                  Visit Our Instagram
                </a>
              </div>
            ) : null}

            {/* Booking CTA */}
            <div className="bg-white rounded-xl shadow-soft-lg border-2 border-brown p-8 text-center hover:shadow-soft-xl transition-all duration-300 hover:scale-[1.02]">
              <h2 className="text-2xl font-display text-brown-dark mb-3 font-bold">
                {contact.bookingTitle || 'Ready to Book?'}
              </h2>
              <p className="text-gray-700 mb-6 text-sm">
                {contact.bookingDescription || 'Reserve your studio appointment today and let us pamper you with a luxury lash experience.'}
              </p>
              <a
                href="/booking"
                className="inline-block bg-brown-dark text-white font-bold px-8 py-3 rounded-full hover:bg-brown transition-all duration-300 hover:scale-105 shadow-md"
              >
                {contact.bookingButtonText || 'Book Appointment'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(time: string) {
  if (!time) return ''
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number(hourStr)
  const minutes = Number(minuteStr)
  if (Number.isNaN(hour) || Number.isNaN(minutes)) return time
  const date = new Date()
  date.setHours(hour, minutes, 0, 0)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
