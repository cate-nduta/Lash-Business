'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import CalendarPicker from '@/components/CalendarPicker'
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  formatAssistedExpiryLabel,
  formatAssistedSlotLabel,
} from '@/lib/assisted-booking-utils'

type Service = {
  id: string
  name: string
  price: number
  duration: number
  categoryName: string
}

type ServiceCategory = {
  id: string
  name: string
  services: Service[]
}

type Slot = {
  value: string
  label: string
}

type AvailableDate = {
  value: string
  label: string
}

type RawService = {
  id?: unknown
  name?: unknown
  price?: unknown
  duration?: unknown
}

type RawServiceCategory = {
  id?: unknown
  name?: unknown
  services?: RawService[]
}

type AssistedBookingResponse = {
  error?: string
  paymentUrl?: string
  clientName?: string
  clientPhone?: string
  clientEmail?: string
  serviceNames?: string
  dateTimeLabel?: string
  deposit?: number
  finalPrice?: number
  depositPercentage?: number
  expiresAt?: string
  emailSent?: boolean
  emailError?: string
  settings?: {
    reservationExpiryMinutes?: number
    reservationExpiryHours?: number
  }
}

const countryCodes = [
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+255', label: 'Tanzania (+255)' },
  { code: '+256', label: 'Uganda (+256)' },
  { code: '+250', label: 'Rwanda (+250)' },
  { code: '+257', label: 'Burundi (+257)' },
  { code: '+1', label: 'US/Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
]

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

function formatCurrency(amount: number) {
  return `KES ${Math.max(Number(amount) || 0, 0).toLocaleString()}`
}

function buildPhoneWithCountryCode(countryCode: string, phone: string) {
  const trimmedPhone = phone.trim()
  if (!trimmedPhone) return ''
  if (trimmedPhone.startsWith('+')) return trimmedPhone
  if (trimmedPhone.startsWith('00')) return `+${trimmedPhone.slice(2)}`
  return `${countryCode}${trimmedPhone.replace(/^0+/, '')}`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function AdminAssistedBookingPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [servicesError, setServicesError] = useState('')
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([])
  const [minimumBookingDate, setMinimumBookingDate] = useState<string | undefined>(undefined)
  const [loadingDates, setLoadingDates] = useState(false)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [depositPercentage, setDepositPercentage] = useState(40)
  const [reservationExpiryMinutes, setReservationExpiryMinutes] = useState(120)
  const [savingSettings, setSavingSettings] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<{
    paymentUrl: string
    clientName: string
    clientPhone: string
    clientEmail: string
    serviceNames: string
    dateTimeLabel: string
    deposit: number
    finalPrice: number
    depositPercentage: number
    expiresAt: string
    emailSent: boolean
  } | null>(null)
  const [whatsappDraft, setWhatsappDraft] = useState('')
  const [whatsappCopied, setWhatsappCopied] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneCountryCode: '+254',
    phone: '',
    date: '',
    timeSlot: '',
    serviceIds: [] as string[],
    notes: '',
    appointmentPreference: '',
    location: '',
  })

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const authResponse = await authorizedFetch('/api/admin/current-user')
        if (!authResponse.ok) throw new Error('Unauthorized')
        const auth = await authResponse.json()
        if (!auth.authenticated) {
          router.replace('/admin/login')
          return
        }
        if (!mounted) return
        setAuthenticated(true)

        const [servicesResponse, settingsResponse] = await Promise.all([
          authorizedFetch('/api/services'),
          authorizedFetch('/api/admin/assisted-booking'),
        ])

        if (servicesResponse.ok) {
          const data = await servicesResponse.json() as { categories?: RawServiceCategory[] }
          const categories = (data.categories || []).map((category) => ({
            id: String(category.id || category.name || 'category'),
            name: String(category.name || 'Services'),
            services: (category.services || []).map((service) => ({
              id: String(service.id || service.name || 'service'),
              name: String(service.name || 'Service'),
              price: Number(service.price || 0),
              duration: Number(service.duration || 60),
              categoryName: String(category.name || 'Services'),
            })),
          })).filter((category: ServiceCategory) => category.services.length > 0)
          setServiceCategories(categories)
          setServicesError(categories.length === 0 ? 'No services are currently set up. Add services in Admin Services first.' : '')
        } else {
          setServicesError('Services could not be loaded. Please refresh or check Admin Services.')
        }
        setLoadingServices(false)

        if (settingsResponse.ok) {
          const data = await settingsResponse.json() as AssistedBookingResponse
          setDepositPercentage(Number(data.depositPercentage || 40))
          setReservationExpiryMinutes(Number(data.settings?.reservationExpiryMinutes || 120))
        }
      } catch {
        if (mounted) {
          setLoadingServices(false)
          setServicesError('Services could not be loaded. Please refresh or check Admin Services.')
        }
        if (mounted) router.replace('/admin/login')
      }
    }
    const loadAvailableDates = async () => {
      setLoadingDates(true)
      try {
        const response = await fetch('/api/calendar/available-slots', { cache: 'no-store' })
        const data = await response.json()
        if (!mounted) return
        const dates = Array.isArray(data.dates)
            ? data.dates.map((date: { value?: unknown; label?: unknown }) => ({
              value: String(date.value || ''),
              label: String(date.label || date.value || ''),
            })).filter((date: AvailableDate) => date.value)
          : []
        setAvailableDates(dates)
        setFullyBookedDates(Array.isArray(data.fullyBookedDates) ? data.fullyBookedDates.map(String) : [])
        setMinimumBookingDate(typeof data.minimumBookingDate === 'string' ? data.minimumBookingDate : undefined)
      } catch {
        if (mounted) {
          setAvailableDates([])
          setFullyBookedDates([])
          setMinimumBookingDate(undefined)
        }
      } finally {
        if (mounted) setLoadingDates(false)
      }
    }

    load()
    loadAvailableDates()
    return () => {
      mounted = false
    }
  }, [router])

  useEffect(() => {
    if (!form.date) {
      setSlots([])
      return
    }

    let mounted = true
    const loadSlots = async () => {
      setLoadingSlots(true)
      try {
        const response = await fetch(`/api/calendar/available-slots?date=${encodeURIComponent(form.date)}`, {
          cache: 'no-store',
        })
        const data = await response.json()
        if (!mounted) return
        const nextSlots = Array.isArray(data.slots)
          ? data.slots.map((slot: { value?: unknown; label?: unknown }) => ({
              value: String(slot.value || ''),
              label: String(slot.label || slot.value || ''),
            })).filter((slot: Slot) => slot.value)
          : []
        setSlots(nextSlots)
      } catch {
        if (mounted) setSlots([])
      } finally {
        if (mounted) setLoadingSlots(false)
      }
    }
    loadSlots()
    return () => {
      mounted = false
    }
  }, [form.date])

  const services = useMemo(
    () => serviceCategories.flatMap((category) => category.services),
    [serviceCategories]
  )
  const availableDateStrings = useMemo(
    () => availableDates.map((date) => date.value),
    [availableDates]
  )
  const selectedServices = useMemo(
    () => services.filter((service) => form.serviceIds.includes(service.id)),
    [services, form.serviceIds]
  )
  const finalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0)
  const deposit = finalPrice > 0 ? Math.max(1, Math.round(finalPrice * (depositPercentage / 100))) : 0
  const durationMinutes = selectedServices.reduce((sum, service) => sum + service.duration, 0)

  const toggleService = (id: string) => {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter((serviceId) => serviceId !== id)
        : [...prev.serviceIds, id],
    }))
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const response = await authorizedFetch('/api/admin/assisted-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateSettings', reservationExpiryMinutes }),
      })
      const data = await response.json().catch(() => ({})) as AssistedBookingResponse
      if (!response.ok) throw new Error(data.error || 'Failed to save settings')
      setReservationExpiryMinutes(Number(data.settings?.reservationExpiryMinutes || reservationExpiryMinutes))
      setMessage({ type: 'success', text: 'Reservation timing saved.' })
    } catch (error: unknown) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to save settings') })
    } finally {
      setSavingSettings(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setLastResult(null)
    setWhatsappDraft('')
    setWhatsappCopied(false)
    try {
      const clientPhone = buildPhoneWithCountryCode(form.phoneCountryCode, form.phone)
      const response = await authorizedFetch('/api/admin/assisted-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...form, phone: clientPhone }),
      })
      const data = await response.json().catch(() => ({})) as AssistedBookingResponse
      if (!response.ok) throw new Error(data.error || 'Failed to create assisted booking')
      const url = data.paymentUrl || ''
      const result = {
        paymentUrl: url,
        clientName: data.clientName || form.name,
        clientPhone: data.clientPhone || clientPhone,
        clientEmail: data.clientEmail || form.email,
        serviceNames: data.serviceNames || selectedServices.map((s) => s.name).join(' + '),
        dateTimeLabel: data.dateTimeLabel || (form.timeSlot ? formatAssistedSlotLabel(form.timeSlot) : ''),
        deposit: Number(data.deposit || deposit),
        finalPrice: Number(data.finalPrice || finalPrice),
        depositPercentage: Number(data.depositPercentage || depositPercentage),
        expiresAt: data.expiresAt || '',
        emailSent: Boolean(data.emailSent),
      }
      setLastResult(result)
      setWhatsappDraft(buildWhatsAppMessage({
        clientName: result.clientName,
        serviceNames: result.serviceNames,
        dateTimeLabel: result.dateTimeLabel,
        totalKes: result.finalPrice,
        depositKes: result.deposit,
        expiryLabel: result.expiresAt ? formatAssistedExpiryLabel(result.expiresAt) : 'the reserved time',
        paymentUrl: result.paymentUrl,
      }))
      setMessage({
        type: data.emailSent ? 'success' : 'error',
        text: data.emailSent
          ? `Deposit link sent to ${data.clientEmail || form.email}. Use the WhatsApp button below to send it there too.`
          : `Booking reserved and payment link created, but email failed: ${data.emailError || 'Unknown email error'}. Use the WhatsApp button below.`,
      })
    } catch (error: unknown) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to create assisted booking') })
    } finally {
      setSubmitting(false)
    }
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            Back to Dashboard
          </Link>
        </div>

        {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-8">
          <div>
            <h1 className="text-4xl font-display text-brown-dark">Admin Assisted Booking</h1>
            <p className="mt-2 text-brown/70">
              Reserve a client slot, send a Paystack deposit link, and let the normal booking confirmation email send after payment.
            </p>
            <Link
              href="/admin/assisted-booking/awaiting"
              className="mt-4 inline-flex rounded-lg bg-brown-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brown"
            >
              Awaiting appointments
            </Link>
          </div>

          <div className="rounded-xl border border-brown-light bg-pink-light/30 p-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Temporary reservation timing
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={reservationExpiryMinutes}
                    onChange={(event) => setReservationExpiryMinutes(Math.max(Math.round(Number(event.target.value) || 1), 1))}
                    className="w-32 rounded-lg border-2 border-brown-light px-3 py-2"
                  />
                  <span className="text-sm text-brown/80">
                    minutes before unpaid reservation expires and the slot is released
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={saveSettings}
                disabled={savingSettings}
                className="rounded-lg bg-brown-dark px-4 py-2 font-semibold text-white hover:bg-brown disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Timing'}
              </button>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                required
                placeholder="Client name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border-2 border-brown-light px-4 py-3"
              />
              <input
                required
                type="email"
                placeholder="Client email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="rounded-lg border-2 border-brown-light px-4 py-3"
              />
              <div className="grid grid-cols-[8.5rem_1fr] gap-2">
                <select
                  value={form.phoneCountryCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, phoneCountryCode: event.target.value }))}
                  className="rounded-lg border-2 border-brown-light px-3 py-3"
                  aria-label="WhatsApp country code"
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
                <input
                  required
                  inputMode="tel"
                  placeholder="Key in WhatsApp phone number"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="rounded-lg border-2 border-brown-light px-4 py-3"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-brown-dark mb-2">Available date</label>
                <CalendarPicker
                  selectedDate={form.date}
                  onDateSelect={(date) => setForm((prev) => ({ ...prev, date, timeSlot: '' }))}
                  availableDates={availableDateStrings}
                  fullyBookedDates={fullyBookedDates}
                  loading={loadingDates}
                  minimumBookingDate={minimumBookingDate}
                />
                {form.date && (
                  <p className="mt-2 text-sm font-semibold text-brown-dark">
                    Selected date: {availableDates.find((date) => date.value === form.date)?.label || form.date}
                  </p>
                )}
                {!loadingDates && availableDates.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">No available booking dates are currently open.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">Available time</label>
                <select
                  required
                  value={form.timeSlot}
                  onChange={(event) => setForm((prev) => ({ ...prev, timeSlot: event.target.value }))}
                  disabled={!form.date || loadingSlots}
                  className="w-full rounded-lg border-2 border-brown-light px-4 py-3 disabled:opacity-50"
                >
                  <option value="">{loadingSlots ? 'Loading slots...' : 'Choose time'}</option>
                  {slots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-brown-dark">Services</p>
              <div className="space-y-5">
                {loadingServices && (
                  <div className="rounded-xl border border-brown-light bg-pink-light/20 p-4 text-sm text-brown/80">
                    Loading services...
                  </div>
                )}
                {!loadingServices && serviceCategories.length === 0 && (
                  <div className="rounded-xl border border-dashed border-brown-light bg-pink-light/20 p-4 text-sm text-brown/80">
                    <p>{servicesError || 'No services are currently available.'}</p>
                    <Link href="/admin/services" className="mt-2 inline-block font-semibold text-brown-dark underline">
                      Open Admin Services
                    </Link>
                  </div>
                )}
                {serviceCategories.map((category) => (
                  <section key={category.id} className="rounded-xl border border-brown-light bg-pink-light/20 p-4">
                    <h3 className="mb-3 font-display text-xl text-brown-dark">{category.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.services.map((service) => (
                        <label key={service.id} className="flex items-start gap-3 rounded-lg border border-brown-light bg-white p-3">
                          <input
                            type="checkbox"
                            checked={form.serviceIds.includes(service.id)}
                            onChange={() => toggleService(service.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-semibold text-brown-dark">{service.name}</span>
                            <span className="text-sm text-brown/70">
                              {formatCurrency(service.price)} · {service.duration} mins
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                placeholder="Notes for the booking"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
                className="rounded-lg border-2 border-brown-light px-4 py-3"
              />
              <textarea
                placeholder="Appointment preference or extra details"
                value={form.appointmentPreference}
                onChange={(event) => setForm((prev) => ({ ...prev, appointmentPreference: event.target.value }))}
                rows={3}
                className="rounded-lg border-2 border-brown-light px-4 py-3"
              />
            </div>

            <div className="rounded-xl border border-brown-light bg-white p-4">
              <p className="font-semibold text-brown-dark">Payment summary</p>
              <p className="text-sm text-brown/80">Total: {formatCurrency(finalPrice)}</p>
              <p className="text-sm text-brown/80">
                Required deposit ({depositPercentage}%): {formatCurrency(deposit)}
              </p>
              <p className="text-sm text-brown/80">Duration: {durationMinutes || 0} minutes</p>
            </div>

            <button
              type="submit"
              disabled={submitting || loadingServices || selectedServices.length === 0 || !form.date || !form.timeSlot}
              className="w-full rounded-lg bg-brown-dark px-6 py-3 font-semibold text-white hover:bg-brown disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Reserve Slot & Send Deposit Link'}
            </button>
          </form>

          {lastResult && (() => {
            const whatsappHref = buildWhatsAppUrl(lastResult.clientPhone, whatsappDraft)
            return (
              <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <div>
                  <p className="font-semibold text-green-900">Payment link ready</p>
                  <p className="mt-1 text-sm text-green-800">
                    Sent to <strong>{lastResult.clientEmail}</strong>
                    {lastResult.emailSent ? ' by email' : ' (email not sent — use WhatsApp below)'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-1">Paystack link</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      readOnly
                      value={lastResult.paymentUrl}
                      className="flex-1 rounded-lg border border-brown-light bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(lastResult.paymentUrl)
                        setMessage({ type: 'success', text: 'Payment link copied.' })
                      }}
                      className="rounded-lg border border-brown-light bg-white px-4 py-2 text-sm font-semibold text-brown-dark hover:bg-pink-light/40"
                    >
                      Copy link
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-green-200 bg-white p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-green-900">Send deposit link on WhatsApp</p>
                      <p className="text-xs text-green-800">Review the message below, then open WhatsApp to send it.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {whatsappHref ? (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                        >
                          Send via WhatsApp
                        </a>
                      ) : (
                        <p className="text-xs text-amber-800 self-center">
                          Add a valid WhatsApp phone number to open WhatsApp directly.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(lastResult.paymentUrl)
                          setMessage({ type: 'success', text: 'Payment link copied.' })
                        }}
                        className="rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-900 hover:bg-green-50"
                      >
                        Copy payment link
                      </button>
                    </div>
                  </div>
                  <label className="mt-3 block text-sm font-semibold text-brown-dark mb-1">WhatsApp message</label>
                  <textarea
                    rows={10}
                    value={whatsappDraft}
                    onChange={(event) => {
                      setWhatsappDraft(event.target.value)
                      setWhatsappCopied(false)
                    }}
                    className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-brown-dark"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(whatsappDraft)
                        setWhatsappCopied(true)
                        setMessage({ type: 'success', text: 'WhatsApp message copied.' })
                      }}
                      className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      {whatsappCopied ? 'Copied' : 'Copy WhatsApp message'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
