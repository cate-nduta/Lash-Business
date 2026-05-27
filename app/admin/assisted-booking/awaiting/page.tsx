'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

type AssistedPaymentLink = {
  bookingReference: string
  clientName: string
  clientEmail: string
  clientPhone: string
  serviceNames: string
  dateTimeLabel: string
  sentAt: string
  sentAtLabel: string
  expiresAt: string
  expiresAtLabel: string
  paymentUrl: string
  paymentReference: string
  emailSent: boolean
  status: 'pending' | 'expired' | 'paid'
  bookingId?: string
}

type AssistedPaidBooking = {
  bookingReference: string
  bookingId: string
  clientName: string
  clientEmail: string
  serviceNames: string
  dateTimeLabel: string
  paidAt: string
  paidAtLabel: string
  deposit: number
}

type AssistedTrackerResponse = {
  error?: string
  paymentLinks?: AssistedPaymentLink[]
  recentPaidBookings?: AssistedPaidBooking[]
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

function formatCurrency(amount: number) {
  return `KES ${Math.max(Number(amount) || 0, 0).toLocaleString()}`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function AwaitingAssistedAppointmentsPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [paymentLinks, setPaymentLinks] = useState<AssistedPaymentLink[]>([])
  const [recentPaidBookings, setRecentPaidBookings] = useState<AssistedPaidBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [releasingReference, setReleasingReference] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const applyTrackerData = (data: AssistedTrackerResponse) => {
    setPaymentLinks(Array.isArray(data.paymentLinks) ? data.paymentLinks : [])
    setRecentPaidBookings(Array.isArray(data.recentPaidBookings) ? data.recentPaidBookings : [])
  }

  const loadTracker = async () => {
    setLoading(true)
    try {
      const authResponse = await authorizedFetch('/api/admin/current-user')
      if (!authResponse.ok) throw new Error('Unauthorized')
      const auth = await authResponse.json()
      if (!auth.authenticated) {
        router.replace('/admin/login')
        return
      }
      setAuthenticated(true)

      const response = await authorizedFetch('/api/admin/assisted-booking')
      const data = await response.json().catch(() => ({})) as AssistedTrackerResponse
      if (!response.ok) throw new Error(data.error || 'Failed to load awaiting appointments')
      applyTrackerData(data)
    } catch (error: unknown) {
      if (getErrorMessage(error, '') === 'Unauthorized') {
        router.replace('/admin/login')
      } else {
        setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to load awaiting appointments') })
      }
    } finally {
      setLoading(false)
    }
  }

  const releasePaymentLink = async (bookingReference: string) => {
    setReleasingReference(bookingReference)
    try {
      const response = await authorizedFetch('/api/admin/assisted-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release', bookingReference }),
      })
      const data = await response.json().catch(() => ({})) as AssistedTrackerResponse
      if (!response.ok) throw new Error(data.error || 'Failed to release appointment')
      applyTrackerData(data)
      setMessage({ type: 'success', text: 'Appointment hold released. The slot can be booked again.' })
    } catch (error: unknown) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to release appointment') })
    } finally {
      setReleasingReference('')
    }
  }

  useEffect(() => {
    loadTracker()
  }, [])

  if (authenticated === null && loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link href="/admin/assisted-booking" className="text-brown hover:text-brown-dark">
            Back to Assisted Booking
          </Link>
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            Back to Dashboard
          </Link>
        </div>

        {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-4xl font-display text-brown-dark">Awaiting Appointments</h1>
              <p className="mt-2 text-brown/70">
                Clients who have been sent assisted booking deposit links. Release unpaid holds from here.
              </p>
            </div>
            <button
              type="button"
              onClick={loadTracker}
              disabled={loading}
              className="rounded-lg border border-brown-light bg-white px-4 py-2 text-sm font-semibold text-brown-dark hover:bg-pink-light/40 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <section className="space-y-3">
            <h2 className="text-2xl font-display text-brown-dark">Payment links sent</h2>
            {paymentLinks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-brown-light bg-pink-light/20 p-4 text-sm text-brown/70">
                No awaiting assisted appointments yet.
              </p>
            ) : (
              paymentLinks.map((link) => (
                <div key={link.bookingReference} className="rounded-xl border border-brown-light bg-pink-light/10 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-brown-dark">{link.clientName}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            link.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : link.status === 'expired'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {link.status === 'paid' ? 'Paid' : link.status === 'expired' ? 'Expired' : 'Awaiting deposit'}
                        </span>
                      </div>
                      <p className="text-sm text-brown/70">{link.serviceNames}</p>
                      <p className="text-sm text-brown/70">{link.dateTimeLabel}</p>
                      <p className="mt-2 text-xs text-brown/60">
                        Link sent: {link.sentAtLabel || link.sentAt} · Expires: {link.expiresAtLabel || link.expiresAt}
                      </p>
                      <p className="text-xs text-brown/60">
                        {link.clientEmail} · {link.clientPhone}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {link.paymentUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(link.paymentUrl)
                            setMessage({ type: 'success', text: 'Payment link copied.' })
                          }}
                          className="rounded-lg border border-brown-light bg-white px-3 py-2 text-xs font-semibold text-brown-dark hover:bg-pink-light/40"
                        >
                          Copy link
                        </button>
                      )}
                      {link.status === 'paid' ? (
                        <Link
                          href="/admin/bookings"
                          className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
                        >
                          View in bookings
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => releasePaymentLink(link.bookingReference)}
                          disabled={releasingReference === link.bookingReference}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {releasingReference === link.bookingReference ? 'Releasing...' : 'Release appointment'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          {recentPaidBookings.length > 0 && (
            <section className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-green-900">Recently paid assisted bookings</h2>
                  <p className="text-xs text-green-800">
                    These are now confirmed and visible on the normal bookings page.
                  </p>
                </div>
                <Link href="/admin/bookings" className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800">
                  Open bookings
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {recentPaidBookings.map((booking) => (
                  <div key={booking.bookingReference || booking.bookingId} className="rounded-lg bg-white p-3 text-sm text-green-950">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-semibold">{booking.clientName}</span>
                      <span>{formatCurrency(booking.deposit)} deposit paid</span>
                    </div>
                    <p className="text-xs text-green-800">
                      {booking.serviceNames} · {booking.dateTimeLabel} · Paid {booking.paidAtLabel || booking.paidAt}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
