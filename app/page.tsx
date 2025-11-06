'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useInView } from 'react-intersection-observer'

interface HomepageData {
  hero: {
    title: string
    subtitle: string
    mobileServiceNote: string
  }
  intro: {
    title: string
    paragraph1: string
    paragraph2: string
    features: string
  }
  features: Array<{
    title: string
    description: string
  }>
  cta: {
    title: string
    description: string
    buttonText: string
  }
}

interface Testimonial {
  id: string
  name: string
  email: string
  photo?: string
  testimonial: string
  rating?: number
  date: string
  approved: boolean
  service?: string
}

export default function Home() {
  const [homepageData, setHomepageData] = useState<HomepageData | null>(null)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/homepage')
      .then((res) => res.json())
      .then((data) => {
        setHomepageData(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error loading homepage data:', error)
        setLoading(false)
      })

    // Load testimonials
    fetch('/api/testimonials')
      .then((res) => res.json())
      .then((data) => {
        setTestimonials(data.testimonials || [])
      })
      .catch((error) => {
        console.error('Error loading testimonials:', error)
      })
  }, [])

  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [introRef, introInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  // Fallback data if API fails
  const hero = homepageData?.hero || {
    title: 'LashDiary',
    subtitle: 'Luxury Lash Extensions & Beauty Services',
    mobileServiceNote: 'Mobile service available within Nairobi environs • We come to you at no extra cost',
  }

  const intro = homepageData?.intro || {
    title: 'Welcome to LashDiary',
    paragraph1: 'Experience the artistry of premium lash extensions in the comfort of your own home! Our mobile service brings expert technicians directly to you within Nairobi environs. No need to worry about transport fees - we\'ve got you covered!',
    paragraph2: 'From classic to mega volume, we offer a full range of lash services tailored to your unique style. Book your appointment today and let\'s make your lashes absolutely gorgeous!',
    features: '🏠 Mobile Service | 📍 Nairobi Environs | 💰 No Transport Fees',
  }

  const features = homepageData?.features || [
    {
      title: 'Expert Technicians',
      description: 'Certified professionals with years of experience in lash artistry! We love what we do!',
    },
    {
      title: 'Premium Products',
      description: 'Only the finest quality lash extensions and beauty products. The best for the best!',
    },
    {
      title: 'Mobile Service',
      description: 'We come to you! Enjoy professional lash services in the comfort of your home. Available within Nairobi environs with no transport fees.',
    },
  ]

  const cta = homepageData?.cta || {
    title: 'Ready to Transform Your Look?',
    description: 'Book your appointment today and experience luxury lash services in the comfort of your home!',
    buttonText: 'Book Now!',
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-baby-pink-light"
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-pink-light/30"></div>

        {/* Hero Content */}
        <div 
          className={`relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto ${
            heroInView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <h1 className="text-5xl md:text-7xl font-display font-bold text-brown mb-4 drop-shadow-lg">
            {hero.title}
          </h1>
          <p className="text-xl md:text-2xl text-brown mb-6 drop-shadow-md font-light">
            {hero.subtitle}
          </p>
          <div className="mb-8 inline-block bg-white/80 backdrop-blur-sm border-2 border-brown-light rounded-full px-6 py-2 shadow-md">
            <p className="text-base md:text-lg text-brown-dark font-medium">
              {hero.mobileServiceNote}
            </p>
          </div>
          <Link
            href="/booking"
            className="inline-block bg-pink hover:bg-pink-dark text-white font-semibold px-8 py-4 rounded-full shadow-soft-lg transition-all duration-300 transform hover:scale-110 hover:shadow-soft hover:rotate-1 text-lg"
          >
            Book Now
          </Link>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-brown"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Intro Section */}
      <section 
        ref={introRef}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-baby-pink-light"
      >
        <div 
          className={`max-w-4xl mx-auto text-center ${
            introInView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-display text-brown mb-6">
            {intro.title}
          </h2>
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
            {intro.paragraph1}
          </p>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-4">
            {intro.paragraph2}
          </p>
          <p className="text-base md:text-lg text-brown-dark font-semibold">
            {intro.features}
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-display text-center text-brown mb-16">
            Why Choose LashDiary?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-8 bg-pink-light rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 transform hover:scale-105 hover:-rotate-1 border-2 border-brown-light"
              >
                <h3 className="text-2xl font-display text-brown mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-700 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-baby-pink-light">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-display text-center text-brown mb-16">
              What Our Clients Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {testimonials.slice(0, 3).map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-white rounded-2xl shadow-soft p-6 hover:shadow-soft-lg transition-all duration-300 border-2 border-brown-light"
                >
                  {testimonial.photo && (
                    <div className="mb-4">
                      <img
                        src={testimonial.photo}
                        alt={testimonial.name}
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  {testimonial.rating && (
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-lg ${
                            star <= testimonial.rating! ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-700 mb-4 leading-relaxed italic">
                    "{testimonial.testimonial}"
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-brown-dark">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(testimonial.date).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {testimonials.length > 3 && (
              <div className="text-center">
                <Link
                  href="/testimonials-all"
                  className="inline-block bg-brown-dark hover:bg-brown text-white font-semibold px-8 py-3 rounded-full shadow-soft-lg transition-all duration-300 transform hover:scale-110 text-lg"
                >
                  View More Testimonials
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-pink">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-display text-brown mb-6">
            {cta.title}
          </h2>
          <p className="text-xl text-brown mb-8">
            {cta.description}
          </p>
          <Link
            href="/booking"
            className="inline-block bg-brown-dark hover:bg-brown text-white font-semibold px-10 py-5 rounded-full shadow-soft-lg transition-all duration-300 transform hover:scale-110 hover:rotate-1 text-lg"
          >
            {cta.buttonText}
          </Link>
        </div>
      </section>
    </div>
  )
}

