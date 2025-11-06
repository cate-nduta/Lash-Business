'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

export default function TestimonialsAll() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/testimonials')
      .then((res) => res.json())
      .then((data) => {
        setTestimonials(data.testimonials || [])
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error loading testimonials:', error)
        setLoading(false)
      })
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading testimonials...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-display text-brown mb-6">
            Client Testimonials
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See what our clients have to say about their LashDiary experience!
          </p>
        </div>

        {testimonials.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-brown text-lg mb-8">No testimonials yet. Be the first to share your experience!</p>
            <Link
              href="/testimonials"
              className="inline-block bg-brown-dark hover:bg-brown text-white font-semibold px-8 py-3 rounded-full shadow-soft-lg transition-all duration-300 transform hover:scale-110 text-lg"
            >
              Share Your Experience
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-white rounded-2xl shadow-soft p-6 hover:shadow-soft-lg transition-all duration-300 border-2 border-brown-light"
                >
                  {testimonial.photo && (
                    <div className="mb-4">
                      <img
                        src={testimonial.photo}
                        alt={testimonial.name}
                        className="w-full h-64 object-cover rounded-lg"
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
                          className={`text-xl ${
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
                  <div className="border-t border-brown-light pt-4">
                    <p className="font-semibold text-brown-dark">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{formatDate(testimonial.date)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link
                href="/testimonials"
                className="inline-block bg-brown-dark hover:bg-brown text-white font-semibold px-8 py-3 rounded-full shadow-soft-lg transition-all duration-300 transform hover:scale-110 text-lg"
              >
                Share Your Experience
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

