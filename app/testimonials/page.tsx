'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function Testimonials() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') || ''
  
  const [formData, setFormData] = useState({
    name: '',
    email: emailParam,
    testimonial: '',
    rating: 5,
    photo: null as File | null,
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB' })
        return
      }
      setFormData({ ...formData, photo: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that at least one field is filled
    if (!formData.testimonial.trim() && !formData.photo) {
      setMessage({ type: 'error', text: 'Please provide either a testimonial text or a photo (or both)!' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('email', formData.email)
      if (formData.testimonial.trim()) {
        formDataToSend.append('testimonial', formData.testimonial)
      } else {
        formDataToSend.append('testimonial', 'Photo testimonial') // Placeholder if only photo
      }
      formDataToSend.append('rating', formData.rating.toString())
      if (formData.photo) {
        formDataToSend.append('photo', formData.photo)
      }

      const response = await fetch('/api/testimonials', {
        method: 'POST',
        body: formDataToSend,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: data.message || 'Thank you for your testimonial! It will be reviewed and published soon.' })
        setFormData({
          name: '',
          email: emailParam,
          testimonial: '',
          rating: 5,
          photo: null,
        })
        setPreviewUrl(null)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit testimonial. Please try again.' })
      }
    } catch (error) {
      console.error('Error submitting testimonial:', error)
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <Link
              href="/testimonials-all"
              className="text-brown-dark hover:text-brown text-sm mb-4 inline-block"
            >
              ← View All Testimonials
            </Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-display text-brown-dark mb-4 text-center">
            Share Your Experience
          </h1>
          <p className="text-lg text-gray-600 mb-8 text-center">
            We'd love to hear about your experience with LashDiary! Your feedback helps us improve and helps others discover our services.
          </p>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border-2 border-green-300'
                  : 'bg-red-50 text-red-700 border-2 border-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-brown-dark mb-2">
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-brown-dark mb-2">
                Your Email *
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="rating" className="block text-sm font-semibold text-brown-dark mb-2">
                Rating *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className={`text-3xl ${
                      star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-pink-light/30 p-4 rounded-lg mb-6 border-2 border-brown-light">
              <p className="text-sm text-brown-dark font-medium mb-2">
                💡 You can submit:
              </p>
              <ul className="text-sm text-brown space-y-1 list-disc list-inside">
                <li>Your testimonial (text only)</li>
                <li>A photo of your lashes</li>
                <li>Or both - it's completely up to you!</li>
              </ul>
            </div>

            <div>
              <label htmlFor="testimonial" className="block text-sm font-semibold text-brown-dark mb-2">
                Your Testimonial {!formData.photo && <span className="text-red-500">*</span>}
              </label>
              <textarea
                id="testimonial"
                required={!formData.photo}
                rows={6}
                value={formData.testimonial}
                onChange={(e) => setFormData({ ...formData, testimonial: e.target.value })}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                placeholder="Tell us about your experience... (Optional if you're uploading a photo)"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.photo ? 'Optional - you can submit just the photo if you prefer!' : 'Required if no photo is uploaded'}
              </p>
            </div>

            <div>
              <label htmlFor="photo" className="block text-sm font-semibold text-brown-dark mb-2">
                Photo {!formData.testimonial.trim() && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                id="photo"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
              {previewUrl && (
                <div className="mt-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-w-md h-64 object-cover rounded-lg border-2 border-brown-light"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, photo: null })
                      setPreviewUrl(null)
                      const fileInput = document.getElementById('photo') as HTMLInputElement
                      if (fileInput) fileInput.value = ''
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove photo
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {formData.testimonial.trim() ? 'Optional - you can submit just the testimonial if you prefer!' : 'Required if no testimonial text is provided'} • Max file size: 5MB
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brown-dark text-white px-6 py-4 rounded-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
            >
              {submitting ? 'Submitting...' : 'Submit Testimonial'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

