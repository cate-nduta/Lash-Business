'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Logo from './Logo'

interface HomepageData {
  modelSignup?: {
    enabled?: boolean
  }
}

export default function Footer() {
  const [modelSignupEnabled, setModelSignupEnabled] = useState(false)

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
              <li>
                <Link href="/services" className="text-gray-600 hover:text-brown transition-all duration-300 text-sm hover:translate-x-1 inline-block group">
                  Services
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="text-gray-600 hover:text-brown transition-all duration-300 text-sm hover:translate-x-1 inline-block group">
                  Gallery
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-600 hover:text-brown transition-all duration-300 text-sm hover:translate-x-1 inline-block group">
                  Blog
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </Link>
              </li>
              <li>
                <Link href="/booking" className="text-gray-600 hover:text-brown transition-all duration-300 text-sm hover:translate-x-1 inline-block group">
                  Book Appointment
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </Link>
              </li>
              <li>
                <Link href="/before-your-appointment" className="text-gray-600 hover:text-brown transition-all duration-300 text-sm hover:translate-x-1 inline-block group">
                  Pre-Appointment Guidelines
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </Link>
              </li>
              <li>
                <Link href="/policies" className="text-gray-600 hover:text-brown transition-all duration-300 text-sm hover:translate-x-1 inline-block group">
                  Booking Policies
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-brown transition-all duration-300 text-sm hover:translate-x-1 inline-block group">
                  Terms &amp; Conditions
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-brown transition-all duration-300 text-sm hover:translate-x-1 inline-block group">
                  Contact Us
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </Link>
              </li>
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
