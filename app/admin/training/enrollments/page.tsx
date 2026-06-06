'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminBackButton from '@/components/AdminBackButton'
import Toast from '@/components/Toast'
import type { TrainingEnrollment, TrainingIntake, TrainingStarterKitOption } from '@/types/training'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

function EnrollmentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterIntakeId = searchParams?.get('intakeId') || ''

  const [loading, setLoading] = useState(true)
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([])
  const [intakes, setIntakes] = useState<TrainingIntake[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [manual, setManual] = useState({
    intakeId: filterIntakeId,
    name: '',
    email: '',
    phone: '',
    amountKES: '',
    selectedTiming: '',
    selectedStarterKitOption: 'with_starter_kit' as TrainingStarterKitOption,
    notes: '',
    sendEmail: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const selectedManualIntake = intakes.find((intake) => intake.id === manual.intakeId)
  const manualTimingOptions = selectedManualIntake?.timingOptions || []

  useEffect(() => {
    if (manualTimingOptions.length === 1) {
      setManual((current) => ({ ...current, selectedTiming: manualTimingOptions[0] }))
    } else if (
      manualTimingOptions.length > 1 &&
      !manualTimingOptions.includes(manual.selectedTiming)
    ) {
      setManual((current) => ({ ...current, selectedTiming: '' }))
    } else if (manualTimingOptions.length === 0 && manual.selectedTiming) {
      setManual((current) => ({ ...current, selectedTiming: '' }))
    }
  }, [manual.intakeId, manualTimingOptions.join('|')])

  const load = async () => {
    const auth = await authorizedFetch('/api/admin/current-user')
    if (!auth.ok) {
      router.replace('/admin/login')
      return
    }
    const q = filterIntakeId ? `?intakeId=${filterIntakeId}` : ''
    const [enrRes, intRes] = await Promise.all([
      authorizedFetch(`/api/admin/training/enrollments${q}`),
      authorizedFetch('/api/admin/training/intakes'),
    ])
    setEnrollments((await enrRes.json()).enrollments || [])
    setIntakes((await intRes.json()).intakes || [])
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [router, filterIntakeId])

  const handleManual = async () => {
    if (!manual.intakeId || !manual.name || !manual.email) {
      setMessage({ type: 'error', text: 'Cohort, name, and email required.' })
      return
    }
    if (manualTimingOptions.length > 1 && !manual.selectedTiming) {
      setMessage({ type: 'error', text: 'Please select a training timing.' })
      return
    }
    setSubmitting(true)
    try {
      const res = await authorizedFetch('/api/admin/training/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_enroll',
          ...manual,
          amountKES: manual.amountKES ? Number(manual.amountKES) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setEnrollments((prev) => [data.enrollment, ...prev])
      setManual((m) => ({
        ...m,
        name: '',
        email: '',
        phone: '',
        selectedTiming: '',
        selectedStarterKitOption: 'with_starter_kit',
        notes: '',
      }))
      setMessage({ type: 'success', text: 'Student added.' })
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Failed',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this enrollment?')) return
    const res = await authorizedFetch('/api/admin/training/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    if (res.ok) {
      setEnrollments((prev) => prev.filter((e) => e.id !== id))
      setMessage({ type: 'success', text: 'Removed.' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center text-brown">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <AdminBackButton href="/admin/training" />
        <h1 className="text-3xl font-bold text-brown mt-4 mb-6">Masterclass Enrollments</h1>

        <div className="bg-white rounded-xl shadow p-6 mb-8 space-y-3">
          <h2 className="font-semibold text-brown">Manual enrollment (paid offline)</h2>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={manual.intakeId}
            onChange={(e) => setManual({ ...manual, intakeId: e.target.value, selectedTiming: '' })}
          >
            <option value="">Select cohort</option>
            {intakes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title} ({i.enrolledCount}/{i.capacity})
              </option>
            ))}
          </select>
          {manualTimingOptions.length === 1 && (
            <p className="rounded-lg bg-baby-pink-light/60 px-3 py-2 text-sm text-brown">
              Timing: {manualTimingOptions[0]}
            </p>
          )}
          {manualTimingOptions.length > 1 && (
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={manual.selectedTiming}
              onChange={(e) => setManual({ ...manual, selectedTiming: e.target.value })}
            >
              <option value="">Select training timing</option>
              {manualTimingOptions.map((timing) => (
                <option key={timing} value={timing}>
                  {timing}
                </option>
              ))}
            </select>
          )}
          {selectedManualIntake && (
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={manual.selectedStarterKitOption}
              onChange={(e) =>
                setManual({
                  ...manual,
                  selectedStarterKitOption: e.target.value as TrainingStarterKitOption,
                })
              }
            >
              <option value="with_starter_kit">
                With starter kit - KES {selectedManualIntake.priceKES.toLocaleString()}
              </option>
              {selectedManualIntake.withoutStarterKitPriceKES && (
                <option value="without_starter_kit">
                  Without starter kit - KES {selectedManualIntake.withoutStarterKitPriceKES.toLocaleString()}
                </option>
              )}
            </select>
          )}
          <input
            placeholder="Full name"
            className="w-full border rounded-lg px-3 py-2"
            value={manual.name}
            onChange={(e) => setManual({ ...manual, name: e.target.value })}
          />
          <input
            placeholder="Email"
            type="email"
            className="w-full border rounded-lg px-3 py-2"
            value={manual.email}
            onChange={(e) => setManual({ ...manual, email: e.target.value })}
          />
          <input
            placeholder="Phone"
            className="w-full border rounded-lg px-3 py-2"
            value={manual.phone}
            onChange={(e) => setManual({ ...manual, phone: e.target.value })}
          />
          <input
            placeholder="Amount KES (optional)"
            type="number"
            className="w-full border rounded-lg px-3 py-2"
            value={manual.amountKES}
            onChange={(e) => setManual({ ...manual, amountKES: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-brown">
            <input
              type="checkbox"
              checked={manual.sendEmail}
              onChange={(e) => setManual({ ...manual, sendEmail: e.target.checked })}
            />
            Send confirmation email
          </label>
          <button
            onClick={handleManual}
            disabled={submitting}
            className="px-6 py-2 bg-brown text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add student'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-brown/10 text-brown">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Timing</th>
                <th className="p-3">Package</th>
                <th className="p-3">Status</th>
                <th className="p-3">Amount</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className="border-t border-brown/10">
                  <td className="p-3">{e.name}</td>
                  <td className="p-3">{e.email}</td>
                  <td className="p-3">{e.selectedTiming || '-'}</td>
                  <td className="p-3">
                    {e.selectedStarterKitOption === 'without_starter_kit'
                      ? 'Without starter kit'
                      : 'With starter kit'}
                  </td>
                  <td className="p-3">{e.paymentStatus}</td>
                  <td className="p-3">KES {e.amountKES.toLocaleString()}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id)}
                      className="text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {enrollments.length === 0 && (
            <p className="p-6 text-brown/70 text-center">No enrollments yet.</p>
          )}
        </div>
      </div>
      {message && (
        <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
      )}
    </div>
  )
}

export default function AdminTrainingEnrollmentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-baby-pink-light p-8">Loading...</div>}>
      <EnrollmentsContent />
    </Suspense>
  )
}
