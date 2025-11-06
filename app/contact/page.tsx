'use client'

import { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

interface ContactData {
  phone: string
  email: string
  instagram: string
  instagramUrl: string
  location: string
  mobileServiceNote: string
}

export default function Contact() {
  const [contactData, setContactData] = useState<ContactData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/contact')
      .then((res) => res.json())
      .then((data) => {
        setContactData(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error loading contact data:', error)
        setLoading(false)
      })
  }, [])

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  // Fallback data if API fails
  const contact = contactData || {
    phone: '+254 712 345 678',
    email: 'catherinenkuria@gmail.com',
    instagram: '@lashdiary',
    instagramUrl: 'https://instagram.com/lashdiary',
    location: 'Nairobi environs',
    mobileServiceNote: 'Mobile service available within Nairobi environs • We come to you at no extra cost',
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div 
          ref={ref}
          className={`text-center mb-16 ${
            inView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <h1 className="text-5xl md:text-6xl font-display text-brown mb-6">
            Get In Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're a mobile service! We come to you within Nairobi environs. Get in touch to book your appointment!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Contact Information Card */}
          <div className="bg-white rounded-xl shadow-soft-lg border-2 border-brown-light p-8 hover:shadow-soft-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="mb-6 pb-4 border-b-2 border-brown-light">
              <h2 className="text-2xl font-display text-brown font-bold">
                Contact Information
              </h2>
            </div>
            
            <div className="space-y-5">
              <div className="bg-pink-light/40 border-2 border-brown-light rounded-lg p-4">
                <p className="text-brown-dark font-bold text-sm mb-1">
                  🚗 Mobile Service Available
                </p>
                <p className="text-gray-700 text-xs">
                  We come to you! Available within Nairobi environs. No transport fees.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-pink-light/20 transition-colors">
                <div className="text-brown text-xl">📞</div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1 text-sm">Phone</h3>
                  <a 
                    href={`tel:${contact.phone.replace(/\s/g, '')}`}
                    className="text-brown hover:text-brown-dark hover:underline font-medium"
                  >
                    {contact.phone}
                  </a>
                </div>
              </div>

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
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-pink-light/20 transition-colors">
                <div className="text-brown text-xl">📱</div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1 text-sm">Instagram</h3>
                  <a 
                    href={contact.instagramUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-brown hover:text-brown-dark hover:underline font-medium"
                  >
                    {contact.instagram}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Business Hours Card */}
          <div className="bg-white rounded-xl shadow-soft-lg border-2 border-brown-light p-8 hover:shadow-soft-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="mb-6 pb-4 border-b-2 border-brown-light">
              <h2 className="text-2xl font-display text-brown font-bold">
                Business Hours
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-pink-light/20 rounded-lg">
                <span className="font-semibold text-gray-800">Monday - Friday</span>
                <span className="text-brown font-bold">9:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-pink-light/20 rounded-lg">
                <span className="font-semibold text-gray-800">Sunday</span>
                <span className="text-brown font-bold">12:00 PM - 5:00 PM</span>
              </div>
              <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-300">
                <p className="text-sm text-gray-600 text-center italic">
                  Closed on Saturdays
                </p>
              </div>
            </div>
          </div>

          {/* Social Media & Booking Card */}
          <div className="space-y-6 md:col-span-2 lg:col-span-1">
            {/* Social Media */}
            <div className="bg-gradient-to-br from-pink to-pink-dark rounded-xl shadow-soft-lg border-2 border-brown-light p-8 text-center hover:shadow-soft-xl transition-all duration-300 hover:scale-[1.02]">
              <h2 className="text-2xl font-display text-white mb-3 font-bold">
                Follow Us
              </h2>
              <p className="text-white/95 mb-6 text-sm">
                Stay connected and see our latest work on social media
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

            {/* Booking CTA */}
            <div className="bg-white rounded-xl shadow-soft-lg border-2 border-brown p-8 text-center hover:shadow-soft-xl transition-all duration-300 hover:scale-[1.02]">
              <h2 className="text-2xl font-display text-brown-dark mb-3 font-bold">
                Ready to Book?
              </h2>
              <p className="text-gray-700 mb-6 text-sm">
                Book your mobile lash service appointment today! We come to you within Nairobi environs.
              </p>
              <a
                href="/booking"
                className="inline-block bg-brown-dark text-white font-bold px-8 py-3 rounded-full hover:bg-brown transition-all duration-300 hover:scale-105 shadow-md"
              >
                Book Appointment
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

