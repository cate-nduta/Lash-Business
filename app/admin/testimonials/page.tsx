'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          loadTestimonials()
        }
      })
  }, [router])

  const loadTestimonials = async () => {
    try {
      const response = await fetch('/api/admin/testimonials')
      if (response.ok) {
        const data = await response.json()
        setTestimonials(data.testimonials || [])
      }
    } catch (error) {
      console.error('Error loading testimonials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', testimonialId: id }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Testimonial approved!' })
        loadTestimonials()
      } else {
        setMessage({ type: 'error', text: 'Failed to approve testimonial' })
      }
    } catch (error) {
      console.error('Error approving testimonial:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this testimonial? It will be permanently deleted.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', testimonialId: id }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Testimonial rejected and removed' })
        loadTestimonials()
      } else {
        setMessage({ type: 'error', text: 'Failed to reject testimonial' })
      }
    } catch (error) {
      console.error('Error rejecting testimonial:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', testimonialId: id }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Testimonial deleted' })
        loadTestimonials()
      } else {
        setMessage({ type: 'error', text: 'Failed to delete testimonial' })
      }
    } catch (error) {
      console.error('Error deleting testimonial:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const pendingTestimonials = testimonials.filter(t => !t.approved)
  const approvedTestimonials = testimonials.filter(t => t.approved)

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Testimonials Management</h1>
          
          {/* Pending Testimonials */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">
              Pending Approval ({pendingTestimonials.length})
            </h2>
            {pendingTestimonials.length === 0 ? (
              <p className="text-brown">No pending testimonials.</p>
            ) : (
              <div className="space-y-6">
                {pendingTestimonials.map((testimonial) => (
                  <div key={testimonial.id} className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                    <div className="flex flex-col md:flex-row gap-6">
                      {testimonial.photo && (
                        <div className="flex-shrink-0">
                          <img
                            src={testimonial.photo}
                            alt={testimonial.name}
                            className="w-32 h-32 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-brown-dark">{testimonial.name}</h3>
                            <p className="text-sm text-brown">{testimonial.email}</p>
                            {testimonial.rating && (
                              <div className="flex gap-1 mt-1">
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
                          </div>
                          <div className="text-sm text-gray-600">{formatDate(testimonial.date)}</div>
                        </div>
                        <p className="text-brown mb-4 leading-relaxed">{testimonial.testimonial}</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(testimonial.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(testimonial.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved Testimonials */}
          <div>
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">
              Approved Testimonials ({approvedTestimonials.length})
            </h2>
            {approvedTestimonials.length === 0 ? (
              <p className="text-brown">No approved testimonials yet.</p>
            ) : (
              <div className="space-y-6">
                {approvedTestimonials.map((testimonial) => (
                  <div key={testimonial.id} className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                    <div className="flex flex-col md:flex-row gap-6">
                      {testimonial.photo && (
                        <div className="flex-shrink-0">
                          <img
                            src={testimonial.photo}
                            alt={testimonial.name}
                            className="w-32 h-32 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-brown-dark">{testimonial.name}</h3>
                            <p className="text-sm text-brown">{testimonial.email}</p>
                            {testimonial.rating && (
                              <div className="flex gap-1 mt-1">
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
                          </div>
                          <div className="text-sm text-gray-600">{formatDate(testimonial.date)}</div>
                        </div>
                        <p className="text-brown mb-4 leading-relaxed">{testimonial.testimonial}</p>
                        <button
                          onClick={() => handleDelete(testimonial.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

