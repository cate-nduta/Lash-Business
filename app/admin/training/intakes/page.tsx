'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import AdminBackButton from '@/components/AdminBackButton'
import {
  formatTrainingDateRange,
  getTrainingDurationDays,
} from '@/lib/training-utils'
import type { TrainingIntake, TrainingProgram } from '@/types/training'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const listToText = (items?: string[]) => (items || []).join('\n')
const textToList = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

const addCalendarDays = (date: string, days: number) => {
  if (!date) return ''
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const resizeDateList = (dates: string[], count: number) => {
  const next = dates.slice(0, count)
  while (next.length < count) {
    const last = next[next.length - 1]
    next.push(last ? addCalendarDays(last, 1) : '')
  }
  return next
}

export default function AdminTrainingIntakesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [intakes, setIntakes] = useState<TrainingIntake[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    durationDays: '',
    trainingDates: [''] as string[],
    priceKES: '',
    withoutStarterKitPriceKES: '',
    originalPriceKES: '',
    discountEnabled: false,
    capacity: '8',
    timings: '9:00 AM - 4:00 PM',
    location: '',
    notes: '',
  })

  const load = async () => {
    const auth = await authorizedFetch('/api/admin/current-user')
    if (!auth.ok) {
      router.replace('/admin/login')
      return
    }
    const [progRes, intRes] = await Promise.all([
      authorizedFetch('/api/admin/training'),
      authorizedFetch('/api/admin/training/intakes'),
    ])
    const progJson = await progRes.json()
    const intJson = await intRes.json()
    const p = progJson.programs?.[0] ?? null
    setProgram(p)
    setIntakes(intJson.intakes || [])
    if (p && !form.priceKES) {
      setForm((f) => ({ ...f, priceKES: String(p.priceKES), location: p.location }))
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [router])

  const selectedDurationDays = Math.max(
    1,
    Number(form.durationDays) || getTrainingDurationDays(program),
  )
  const visibleTrainingDates = resizeDateList(form.trainingDates, selectedDurationDays)
  const previewDates = visibleTrainingDates.filter(Boolean)

  const handleCreate = async () => {
    const trainingDates = visibleTrainingDates.filter(Boolean)
    if (!program || trainingDates.length !== selectedDurationDays) {
      setMessage({ type: 'error', text: `Pick all ${selectedDurationDays} training dates.` })
      return
    }
    setCreating(true)
    try {
      const res = await authorizedFetch('/api/admin/training/intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          programId: program.id,
          format: 'custom',
          anchorDate: trainingDates[0],
          trainingDates,
          title: form.title,
          durationDays: selectedDurationDays,
          priceKES: form.priceKES ? Number(form.priceKES) : program.priceKES,
          withoutStarterKitPriceKES: form.withoutStarterKitPriceKES
            ? Number(form.withoutStarterKitPriceKES)
            : undefined,
          originalPriceKES: form.originalPriceKES ? Number(form.originalPriceKES) : undefined,
          discountEnabled: form.discountEnabled,
          capacity: Number(form.capacity) || 8,
          timingOptions: textToList(form.timings),
          location: form.location || program.location,
          notes: form.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setIntakes((prev) => [...prev, data.intake])
      setMessage({ type: 'success', text: 'Cohort created.' })
      setForm((f) => ({
        ...f,
        title: '',
        withoutStarterKitPriceKES: '',
        originalPriceKES: '',
        discountEnabled: false,
        trainingDates: [''],
        notes: '',
      }))
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Create failed',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleSaveIntake = async (intake: TrainingIntake) => {
    const updated = intakes.map((i) => (i.id === intake.id ? intake : i))
    const res = await authorizedFetch('/api/admin/training/intakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_all', intakes: updated }),
    })
    if (!res.ok) {
      setMessage({ type: 'error', text: 'Failed to save cohort' })
      return
    }
    const data = await res.json()
    setIntakes(data.intakes)
    setMessage({ type: 'success', text: 'Cohort updated.' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cohort?')) return
    const res = await authorizedFetch('/api/admin/training/intakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    if (res.ok) {
      setIntakes((prev) => prev.filter((i) => i.id !== id))
      setMessage({ type: 'success', text: 'Cohort deleted.' })
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
        <h1 className="text-3xl font-bold text-brown mt-4 mb-6">Masterclass Cohorts</h1>

        <div className="bg-white rounded-xl shadow p-6 mb-8 space-y-4">
          <h2 className="font-semibold text-brown">Create cohort</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-brown">Training days</span>
              <input
                type="number"
                min={1}
                max={30}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={form.durationDays}
                placeholder={String(getTrainingDurationDays(program))}
                onChange={(e) => {
                  const durationDays = Math.max(
                    1,
                    Number(e.target.value) || getTrainingDurationDays(program),
                  )
                  setForm({
                    ...form,
                    durationDays: e.target.value,
                    trainingDates: resizeDateList(form.trainingDates, durationDays),
                  })
                }}
              />
              <p className="mt-1 text-xs text-brown/60">
                Example: 3, 5, or 10 days. Leave blank to use the default.
              </p>
            </label>
            <label className="block">
              <span className="text-sm text-brown">With starter kit price (KES)</span>
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={form.priceKES}
                onChange={(e) => setForm({ ...form, priceKES: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm text-brown">Without starter kit price (KES)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={form.withoutStarterKitPriceKES}
                placeholder="Example: 10000"
                onChange={(e) => setForm({ ...form, withoutStarterKitPriceKES: e.target.value })}
              />
              <p className="mt-1 text-xs text-brown/60">
                Leave blank if you only want to offer the starter kit option.
              </p>
            </label>
            <label className="block">
              <span className="text-sm text-brown">Was price / crossed-out price (optional)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={form.originalPriceKES}
                placeholder="Example: 100000"
                onChange={(e) => setForm({ ...form, originalPriceKES: e.target.value })}
              />
              <p className="mt-1 text-xs text-brown/60">
                Use this to show a discount, for example was KES 100,000 now KES 85,000.
              </p>
            </label>
            <label className="flex items-center gap-2 text-sm text-brown">
              <input
                type="checkbox"
                checked={form.discountEnabled}
                onChange={(e) => setForm({ ...form, discountEnabled: e.target.checked })}
              />
              Show discount on website
            </label>
            <label className="block">
              <span className="text-sm text-brown">Capacity</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </label>
            <div className="md:col-span-2">
              <span className="text-sm text-brown">Training dates</span>
              <div className="mt-2 grid sm:grid-cols-2 gap-3">
                {visibleTrainingDates.map((date, index) => (
                  <label key={index} className="block text-sm text-brown/80">
                    Day {index + 1}
                    <input
                      type="date"
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={date}
                      onChange={(e) => {
                        const next = resizeDateList(form.trainingDates, selectedDurationDays)
                        next[index] = e.target.value
                        setForm({ ...form, trainingDates: next })
                      }}
                    />
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-brown/60">
                Pick the exact class days. Example: Friday, Saturday, and Sunday for a 3-day cohort.
              </p>
            </div>
            <label className="block md:col-span-2">
              <span className="text-sm text-brown">Training timings (one option per line)</span>
              <textarea
                rows={3}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={form.timings}
                placeholder={'9:00 AM - 4:00 PM\nEvening: 5:00 PM - 8:00 PM'}
                onChange={(e) => setForm({ ...form, timings: e.target.value })}
              />
              <p className="mt-1 text-xs text-brown/60">
                If you add one timing, students will not need to choose. If you add multiple, they will pick one.
              </p>
            </label>
          </div>
          {previewDates.length > 0 && (
            <p className="text-sm text-brown/80">
              Preview: {formatTrainingDateRange(previewDates)} ({previewDates.length} days)
            </p>
          )}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-2 bg-brown text-white rounded-lg disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Cohort'}
          </button>
        </div>

        <div className="space-y-4">
          {intakes.length === 0 && (
            <p className="text-brown/70">No cohorts yet. Create 2–4 per month as needed.</p>
          )}
          {intakes.map((intake) => (
            <div key={intake.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <h3 className="font-semibold text-brown">{intake.title}</h3>
                  <p className="text-sm">{formatTrainingDateRange(intake.trainingDates)}</p>
                  <p className="text-sm text-brown/70">
                    {intake.durationDays || intake.trainingDates.length} training days
                  </p>
                  <p className="text-sm mt-1">
                    {intake.discountEnabled &&
                      intake.originalPriceKES &&
                      intake.originalPriceKES > intake.priceKES && (
                      <span className="mr-2 text-brown/50 line-through">
                        KES {intake.originalPriceKES.toLocaleString()}
                      </span>
                    )}
                    <span>With kit: KES {intake.priceKES.toLocaleString()}</span>
                    {intake.withoutStarterKitPriceKES && (
                      <span className="ml-2">
                        Without kit: KES {intake.withoutStarterKitPriceKES.toLocaleString()}
                      </span>
                    )}
                    {' '}· {intake.enrolledCount}/
                    {intake.capacity} · {intake.status}
                  </p>
                  {intake.timingOptions && intake.timingOptions.length > 0 && (
                    <p className="text-sm text-brown/70 mt-1">
                      Timing: {intake.timingOptions.join(' / ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/training/enrollments?intakeId=${intake.id}`}
                    className="text-sm text-brown underline"
                  >
                    Roster
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(intake.id)}
                    className="text-sm text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-4 grid md:grid-cols-5 gap-3">
                <label className="block text-sm">
                  Status
                  <select
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={intake.status}
                    onChange={(e) => {
                      const u = {
                        ...intake,
                        status: e.target.value as TrainingIntake['status'],
                      }
                      setIntakes((prev) =>
                        prev.map((i) => (i.id === intake.id ? u : i)),
                      )
                    }}
                  >
                    <option value="open">open</option>
                    <option value="full">full</option>
                    <option value="closed">closed</option>
                    <option value="completed">completed</option>
                  </select>
                </label>
                <label className="block text-sm">
                  Training days
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={intake.durationDays || intake.trainingDates.length || 5}
                    onChange={(e) => {
                      const durationDays = Math.max(1, Number(e.target.value) || 1)
                      const trainingDates = resizeDateList(intake.trainingDates, durationDays)
                      const u = {
                        ...intake,
                        format: 'custom' as const,
                        durationDays,
                        trainingDates,
                        startDate: trainingDates[0],
                        endDate: trainingDates[trainingDates.length - 1],
                      }
                      setIntakes((prev) =>
                        prev.map((i) => (i.id === intake.id ? u : i)),
                      )
                    }}
                  />
                </label>
                <label className="block text-sm">
                  Capacity
                  <input
                    type="number"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={intake.capacity}
                    onChange={(e) => {
                      const u = { ...intake, capacity: Number(e.target.value) || 1 }
                      setIntakes((prev) =>
                        prev.map((i) => (i.id === intake.id ? u : i)),
                      )
                    }}
                  />
                </label>
                <label className="block text-sm">
                  With starter kit KES
                  <input
                    type="number"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={intake.priceKES}
                    onChange={(e) => {
                      const u = { ...intake, priceKES: Number(e.target.value) || 0 }
                      setIntakes((prev) =>
                        prev.map((i) => (i.id === intake.id ? u : i)),
                      )
                    }}
                  />
                </label>
                <label className="block text-sm">
                  Without starter kit KES
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={intake.withoutStarterKitPriceKES || ''}
                    placeholder="Optional"
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0
                      const u = {
                        ...intake,
                        withoutStarterKitPriceKES: value > 0 ? value : undefined,
                      }
                      setIntakes((prev) =>
                        prev.map((i) => (i.id === intake.id ? u : i)),
                      )
                    }}
                  />
                </label>
                <label className="block text-sm">
                  Was price KES
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={intake.originalPriceKES || ''}
                    placeholder="Optional"
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0
                      const u = {
                        ...intake,
                        originalPriceKES: value > 0 ? value : undefined,
                      }
                      setIntakes((prev) =>
                        prev.map((i) => (i.id === intake.id ? u : i)),
                      )
                    }}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-brown">
                  <input
                    type="checkbox"
                    checked={Boolean(intake.discountEnabled)}
                    onChange={(e) => {
                      const u = { ...intake, discountEnabled: e.target.checked }
                      setIntakes((prev) =>
                        prev.map((i) => (i.id === intake.id ? u : i)),
                      )
                    }}
                  />
                  Show discount
                </label>
              </div>
              <div className="mt-3">
                <p className="text-sm text-brown">Training dates</p>
                <div className="mt-2 grid sm:grid-cols-2 gap-3">
                  {resizeDateList(
                    intake.trainingDates,
                    intake.durationDays || intake.trainingDates.length || 1,
                  ).map((date, index) => (
                    <label key={index} className="block text-sm text-brown/80">
                      Day {index + 1}
                      <input
                        type="date"
                        className="mt-1 w-full border rounded px-2 py-1"
                        value={date}
                        onChange={(e) => {
                          const durationDays = intake.durationDays || intake.trainingDates.length || 1
                          const trainingDates = resizeDateList(intake.trainingDates, durationDays)
                          trainingDates[index] = e.target.value
                          const u = {
                            ...intake,
                            format: 'custom' as const,
                            trainingDates,
                            startDate: trainingDates[0],
                            endDate: trainingDates[trainingDates.length - 1],
                          }
                          setIntakes((prev) =>
                            prev.map((i) => (i.id === intake.id ? u : i)),
                          )
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <label className="mt-3 block text-sm">
                Training timings (one option per line)
                <textarea
                  rows={3}
                  className="mt-1 w-full border rounded px-2 py-1"
                  value={listToText(intake.timingOptions)}
                  placeholder={'9:00 AM - 4:00 PM\nEvening: 5:00 PM - 8:00 PM'}
                  onChange={(e) => {
                    const u = { ...intake, timingOptions: textToList(e.target.value) }
                    setIntakes((prev) =>
                      prev.map((i) => (i.id === intake.id ? u : i)),
                    )
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const current = intakes.find((i) => i.id === intake.id)
                  if (current) handleSaveIntake(current)
                }}
                className="mt-3 text-sm px-4 py-2 border border-brown rounded-lg text-brown"
              >
                Save changes
              </button>
            </div>
          ))}
        </div>
      </div>
      {message && (
        <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
      )}
    </div>
  )
}
