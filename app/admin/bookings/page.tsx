'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Booking {
  id: string
  name: string
  email: string
  phone: string
  service: string
  date: string
  timeSlot: string
  location: string
  originalPrice: number
  discount: number
  finalPrice: number
  deposit: number
  discountType?: string
  promoCode?: string
  mpesaCheckoutRequestID?: string
  createdAt: string
  testimonialRequested?: boolean
  testimonialRequestedAt?: string
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [sendingPayment, setSendingPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          loadBookings()
        }
      })
  }, [router])

  const loadBookings = async () => {
    try {
      const response = await fetch('/api/admin/bookings')
      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendTestimonialRequest = async (booking: Booking) => {
    setSendingRequest(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/send-testimonial-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          email: booking.email,
          name: booking.name,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: `Testimonial request sent to ${booking.email}` })
        loadBookings()
        // Update selected booking if it's the same one
        if (selectedBooking?.id === booking.id) {
          setSelectedBooking({ ...booking, testimonialRequested: true, testimonialRequestedAt: new Date().toISOString() })
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send testimonial request' })
      }
    } catch (error) {
      console.error('Error sending testimonial request:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSendingRequest(false)
    }
  }

  const handleMarkAsPaid = async (booking: Booking, amount: number) => {
    setMarkingPaid(true)
    setMessage(null)

    const balance = booking.finalPrice - booking.deposit

    if (amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      setMarkingPaid(false)
      return
    }

    if (amount > balance) {
      setMessage({ type: 'error', text: `Amount cannot exceed balance due (KSH ${balance.toLocaleString()})` })
      setMarkingPaid(false)
      return
    }

    try {
      const response = await fetch('/api/admin/bookings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: amount,
          paymentMethod: 'cash',
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: `Cash payment of KSH ${amount.toLocaleString()} recorded successfully` })
        loadBookings()
        // Update selected booking
        const updatedBalance = booking.finalPrice - booking.deposit - amount
        setSelectedBooking({
          ...booking,
          deposit: booking.deposit + amount,
        })
        setCashAmount('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to record payment' })
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setMarkingPaid(false)
    }
  }

  const sendBalancePayment = async (booking: Booking, phone: string) => {
    setSendingPayment(true)
    setMessage(null)

    const balance = booking.finalPrice - booking.deposit

    if (balance <= 0) {
      setMessage({ type: 'error', text: 'No balance due for this booking' })
      setSendingPayment(false)
      return
    }

    if (!phone || phone.trim() === '') {
      setMessage({ type: 'error', text: 'Please enter a phone number' })
      setSendingPayment(false)
      return
    }

    try {
      const response = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          amount: balance,
          accountReference: `Balance-${booking.id}`,
          transactionDesc: `LashDiary Balance Payment - ${booking.service}`,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Save the checkout request ID to the booking for tracking
        try {
          await fetch('/api/admin/bookings/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: booking.id,
              amount: 0, // Will be updated when callback is received
              paymentMethod: 'mpesa',
              mpesaCheckoutRequestID: data.checkoutRequestID,
            }),
          })
        } catch (err) {
          console.error('Error saving checkout request ID:', err)
        }

        setMessage({ type: 'success', text: `M-Pesa prompt sent to ${phone.trim()} for KSH ${balance.toLocaleString()}` })
        setMpesaPhone('')
        // Reload bookings to get updated data
        loadBookings()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send M-Pesa prompt' })
      }
    } catch (error) {
      console.error('Error sending balance payment:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSendingPayment(false)
    }
  }

  // Update M-Pesa phone when booking changes
  useEffect(() => {
    if (selectedBooking) {
      setMpesaPhone(selectedBooking.phone)
      const balance = selectedBooking.finalPrice - selectedBooking.deposit
      setCashAmount(balance > 0 ? balance.toString() : '')
    }
  }, [selectedBooking])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  const balance = selectedBooking ? selectedBooking.finalPrice - selectedBooking.deposit : 0

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

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Bookings Management</h1>
          
          {bookings.length === 0 ? (
            <div className="text-center text-brown py-8">
              No bookings yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-brown-light">
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Client Name</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Service</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Date & Time</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Final Price</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Deposit</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Balance</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const balance = booking.finalPrice - booking.deposit
                    return (
                    <tr 
                      key={booking.id} 
                      className="border-b border-brown-light/30 hover:bg-pink-light/20 cursor-pointer transition-colors"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="py-3 px-4 text-brown font-medium">{booking.name}</td>
                      <td className="py-3 px-4 text-brown">{booking.service || 'N/A'}</td>
                      <td className="py-3 px-4 text-brown">
                        <div className="font-medium">{formatDate(booking.date)}</div>
                        <div className="text-sm text-gray-600">{formatTime(booking.timeSlot)}</div>
                      </td>
                      <td className="py-3 px-4 text-brown">
                        <span className="font-semibold">KSH {booking.finalPrice.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-brown">
                        <span className="text-green-600 font-semibold">KSH {booking.deposit.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-brown">
                        <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          KSH {balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {booking.testimonialRequested ? (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                            Testimonial Requested
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedBooking(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full mx-4 p-8 border-2 border-brown-light max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-display text-brown-dark">Booking Details</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Client Information */}
              <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                <h3 className="text-xl font-semibold text-brown-dark mb-4">Client Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="text-brown-dark font-semibold">{selectedBooking.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-brown-dark font-semibold">{selectedBooking.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-brown-dark font-semibold">{selectedBooking.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="text-brown-dark font-semibold">{selectedBooking.location || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                <h3 className="text-xl font-semibold text-brown-dark mb-4">Appointment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="text-brown-dark font-semibold">{selectedBooking.service || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="text-brown-dark font-semibold">{formatDate(selectedBooking.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="text-brown-dark font-semibold">{formatTime(selectedBooking.timeSlot)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking Created</p>
                    <p className="text-brown-dark font-semibold">{formatDateTime(selectedBooking.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Details */}
              <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                <h3 className="text-xl font-semibold text-brown-dark mb-4">Pricing Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Original Price:</span>
                    <span className="text-brown-dark font-semibold">KSH {selectedBooking.originalPrice.toLocaleString()}</span>
                  </div>
                  {selectedBooking.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        Discount
                        {selectedBooking.discountType === 'first-time' && <span className="text-xs text-gray-500 ml-1">(First-time)</span>}
                        {selectedBooking.discountType === 'promo' && selectedBooking.promoCode && (
                          <span className="text-xs text-gray-500 ml-1">({selectedBooking.promoCode})</span>
                        )}:
                      </span>
                      <span className="text-green-600 font-semibold">-KSH {selectedBooking.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-brown-light/30">
                    <span className="text-gray-600 font-semibold">Final Price:</span>
                    <span className="text-brown-dark font-bold text-lg">KSH {selectedBooking.finalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Deposit Paid:</span>
                    <span className="text-green-600 font-semibold">KSH {selectedBooking.deposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-brown-light">
                    <span className="text-gray-600 font-bold">Balance Due:</span>
                    <span className={`font-bold text-xl ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      KSH {balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              {selectedBooking.mpesaCheckoutRequestID && (
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <p className="text-sm text-gray-600">M-Pesa Checkout ID</p>
                  <p className="text-brown-dark font-semibold text-sm">{selectedBooking.mpesaCheckoutRequestID}</p>
                </div>
              )}

              {/* Payment Section */}
              {balance > 0 && (
                <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                  <h3 className="text-xl font-semibold text-brown-dark mb-4">Record Payment</h3>
                  
                  {/* Payment Method Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-brown-dark mb-2">
                      Payment Method
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cash"
                          checked={paymentMethod === 'cash'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'mpesa')}
                          className="mr-2"
                        />
                        <span className="text-brown-dark">Cash</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="mpesa"
                          checked={paymentMethod === 'mpesa'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'mpesa')}
                          className="mr-2"
                        />
                        <span className="text-brown-dark">M-Pesa</span>
                      </label>
                    </div>
                  </div>

                  {/* Cash Payment */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-2">
                          Amount Paid (KSH)
                        </label>
                        <input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder={`Balance: KSH ${balance.toLocaleString()}`}
                          min="0"
                          max={balance}
                          className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Balance due: KSH {balance.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleMarkAsPaid(selectedBooking, parseFloat(cashAmount) || 0)}
                        disabled={markingPaid || !cashAmount || parseFloat(cashAmount) <= 0}
                        className="w-full px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {markingPaid ? 'Recording...' : 'Mark as Paid'}
                      </button>
                    </div>
                  )}

                  {/* M-Pesa Payment */}
                  {paymentMethod === 'mpesa' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-2">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)}
                          placeholder="254712345678"
                          className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Default: {selectedBooking.phone} • You can change this if needed
                        </p>
                      </div>
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Amount:</strong> KSH {balance.toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          An M-Pesa STK push will be sent to the phone number above
                        </p>
                      </div>
                      <button
                        onClick={() => sendBalancePayment(selectedBooking, mpesaPhone)}
                        disabled={sendingPayment || !mpesaPhone.trim()}
                        className="w-full px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingPayment ? 'Sending M-Pesa Prompt...' : `Send M-Pesa Prompt (KSH ${balance.toLocaleString()})`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {balance <= 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                  <p className="text-green-700 font-semibold text-lg">✓ Fully Paid</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t-2 border-brown-light">
                <button
                  onClick={() => sendTestimonialRequest(selectedBooking)}
                  disabled={sendingRequest || selectedBooking.testimonialRequested}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                    selectedBooking.testimonialRequested
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-brown-dark text-white hover:bg-brown'
                  } disabled:opacity-50`}
                >
                  {sendingRequest
                    ? 'Sending...'
                    : selectedBooking.testimonialRequested
                    ? '✓ Testimonial Request Sent'
                    : 'Request Testimonial'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
