/**
 * MODULE 3 EXAMPLE: Simplified Booking Page
 * 
 * This is a simplified version of the booking page that follows
 * the step-by-step approach from Module 3.
 * 
 * Use this as a reference when learning Module 3.
 */

'use client'

import { useState, useEffect } from 'react'

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  category: string
}

export default function SimpleBookingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedService, setSelectedService] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load services
  useEffect(() => {
    async function loadServices() {
      try {
        const response = await fetch('/api/services')
        const data = await response.json()
        // Handle the service catalog structure
        const allServices: Service[] = []
        if (data.categories) {
          data.categories.forEach((category: any) => {
            category.services?.forEach((service: any) => {
              allServices.push({
                id: service.id,
                name: service.name,
                description: service.description || '',
                price: service.price || 0,
                duration: service.duration || 60,
                category: category.name || 'Other'
              })
            })
          })
        }
        setServices(allServices)
      } catch (error) {
        console.error('Error loading services:', error)
      } finally {
        setLoading(false)
      }
    }
    loadServices()
  }, [])

  // Get available dates (next 30 days)
  const getAvailableDates = () => {
    const dates: string[] = []
    const today = new Date()
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dates.push(dateStr)
    }
    
    return dates
  }

  const availableDates = getAvailableDates()

  // Get time slots (simplified - we'll improve this later)
  const timeSlots = [
    '9:00 AM',
    '11:00 AM',
    '1:00 PM',
    '3:00 PM',
    '5:00 PM'
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center mb-8">Book an Appointment</h1>

        {/* Step 1: Select Date */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">1. Select Date</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {availableDates.map((date) => {
              const dateObj = new Date(date)
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
              const dayNum = dateObj.getDate()
              const month = dateObj.toLocaleDateString('en-US', { month: 'short' })
              
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`p-4 border-2 rounded-lg text-center transition ${
                    selectedDate === date
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-sm text-gray-600">{dayName}</div>
                  <div className="text-xl font-bold">{dayNum}</div>
                  <div className="text-xs text-gray-500">{month}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Select Time (only if date selected) */}
        {selectedDate && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">2. Select Time</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`p-4 border-2 rounded-lg text-center transition ${
                    selectedTime === time
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Service (only if time selected) */}
        {selectedTime && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">3. Select Service</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition ${
                    selectedService === service.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{service.name}</h3>
                      <p className="text-gray-600 text-sm">{service.description}</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Duration: {service.duration} minutes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl">KES {service.price.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Booking Form (only if service selected) */}
        {selectedService && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">4. Your Details</h2>
            <BookingForm
              date={selectedDate}
              time={selectedTime}
              serviceId={selectedService}
              services={services}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Booking Form Component
function BookingForm({ date, time, serviceId, services }: {
  date: string
  time: string
  serviceId: string
  services: Service[]
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const selectedService = services.find(s => s.id === serviceId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date,
          timeSlot: time,
          serviceId,
          serviceName: selectedService?.name,
          price: selectedService?.price
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Booking confirmed! Check your email.' })
        setFormData({ name: '', email: '', phone: '', notes: '' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Booking failed. Please try again.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone *
        </label>
        <input
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {selectedService && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Booking Summary</h3>
          <p><strong>Service:</strong> {selectedService.name}</p>
          <p><strong>Date:</strong> {new Date(date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> {time}</p>
          <p><strong>Price:</strong> KES {selectedService.price.toLocaleString()}</p>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {submitting ? 'Booking...' : 'Confirm Booking'}
      </button>
    </form>
  )
}

