'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StarRatingDisplay } from '@/components/StarRating'

interface Testimonial {
  id: string
  name: string
  email?: string
  photoUrl?: string | null
  testimonial: string
  rating?: number
  createdAt?: string
  status?: 'pending' | 'approved' | 'rejected'
}

export default function TestimonialsAll() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/testimonials', { cache: 'no-store' })
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

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return ''
    }
    const parsed = new Date(dateString)
    if (Number.isNaN(parsed.getTime())) {
      return ''
    }
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
                  {testimonial.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 px-3 py-1 text-xs font-semibold text-[#16a34a] border border-[#22c55e]/40 shadow-[0_0_10px_rgba(34,197,94,0.25)] mb-3">
                      <svg className="h-3.5 w-3.5 text-[#16a34a]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 011.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Verified Client</span>
                    </span>
                  )}
                  {(() => {
                    const photoSrc = testimonial.photoUrl || (testimonial as any).photo
                    if (!photoSrc) return null
                    return (
                    <div className="mb-4">
                      <img
                        src={photoSrc}
                        alt={testimonial.name}
                        className="w-full h-64 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                    )
                  })()}
                  {typeof testimonial.rating === 'number' && testimonial.rating > 0 && (
                    <StarRatingDisplay rating={testimonial.rating} size="md" className="mb-3" />
                  )}
                  <p className="text-gray-700 mb-4 leading-relaxed italic">
                    "{testimonial.testimonial}"
                  </p>
                  <div className="border-t border-brown-light pt-4">
                    <p className="font-semibold text-brown-dark">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(testimonial.createdAt)}
                    </p>
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

