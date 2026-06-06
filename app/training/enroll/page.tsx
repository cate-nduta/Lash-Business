'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  formatTrainingDateRange,
} from '@/lib/training-utils'
import type { TrainingIntake, TrainingProgram, TrainingStarterKitOption } from '@/types/training'

function EnrollContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const intakeIdParam = searchParams?.get('intakeId') || ''

  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [intakes, setIntakes] = useState<TrainingIntake[]>([])
  const [intakeId, setIntakeId] = useState(intakeIdParam)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedTiming, setSelectedTiming] = useState('')
  const [selectedStarterKitOption, setSelectedStarterKitOption] =
    useState<TrainingStarterKitOption>('with_starter_kit')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedIntake = intakes.find((i) => i.id === intakeId)
  const timingOptions = selectedIntake?.timingOptions || []
  const withoutStarterKitPriceKES = Number(selectedIntake?.withoutStarterKitPriceKES || 0)
  const withStarterKitPriceKES = Number(selectedIntake?.priceKES || program?.priceKES || 0)
  const selectedTotalKES =
    selectedStarterKitOption === 'without_starter_kit' && withoutStarterKitPriceKES > 0
      ? withoutStarterKitPriceKES
      : withStarterKitPriceKES

  useEffect(() => {
    if (timingOptions.length === 1) {
      setSelectedTiming(timingOptions[0])
    } else if (timingOptions.length > 1 && !timingOptions.includes(selectedTiming)) {
      setSelectedTiming('')
    } else if (timingOptions.length === 0) {
      setSelectedTiming('')
    }
  }, [selectedIntake?.id, timingOptions.join('|')])

  useEffect(() => {
    if (withoutStarterKitPriceKES <= 0 && selectedStarterKitOption === 'without_starter_kit') {
      setSelectedStarterKitOption('with_starter_kit')
    }
  }, [selectedIntake?.id, withoutStarterKitPriceKES, selectedStarterKitOption])

  useEffect(() => {
    fetch('/api/training')
      .then((r) => r.json())
      .then((data) => {
        setProgram(data.program)
        const availableIntakes = (data.intakes || []).filter(
          (intake: TrainingIntake) =>
            intake.status !== 'full' && intake.enrolledCount < intake.capacity,
        )
        setIntakes(availableIntakes)
        if ((!intakeId || !availableIntakes.some((intake: TrainingIntake) => intake.id === intakeId)) && availableIntakes[0]) {
          setIntakeId(availableIntakes[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, [intakeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!intakeId || !name.trim() || !email.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    if (timingOptions.length > 1 && !selectedTiming) {
      setError('Please select your preferred training timing.')
      return
    }
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch('/api/training/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          selectedTiming: selectedTiming || timingOptions[0] || '',
          selectedStarterKitOption,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Enrollment failed')

      if (!data.requiresPayment) {
        router.push(data.redirectUrl || `/masterclass/success?enrollmentId=${data.enrollmentId}`)
        return
      }

      if (!data.authorizationUrl) {
        setError('Payment could not be started. Please contact us.')
        return
      }

      window.location.assign(data.authorizationUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brown">
        Loading...
      </div>
    )
  }

  if (!program || intakes.length === 0) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex flex-col items-center justify-center px-4 text-center text-brown">
        <p className="mb-4">No open cohorts right now.</p>
        <Link href="/masterclass" className="underline">
          Back to masterclass
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/masterclass" className="text-brown text-sm underline mb-6 inline-block">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-brown mb-6">Enroll in masterclass</h1>
        <p className="text-sm text-brown/70 mb-6">
          Full payment is required upfront before your classes begin.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-brown">Select cohort *</span>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={intakeId}
              onChange={(e) => setIntakeId(e.target.value)}
              required
            >
              {intakes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} - With starter kit KES {i.priceKES.toLocaleString()}
                </option>
              ))}
            </select>
          </label>

          {selectedIntake && (
            <div className="text-sm text-brown/80 bg-baby-pink-light/50 p-3 rounded-lg">
              <p>{formatTrainingDateRange(selectedIntake.trainingDates)}</p>
              {timingOptions.length === 1 && (
                <p className="mt-1">Timing: {timingOptions[0]}</p>
              )}
              <p className="mt-2">
                {selectedIntake.discountEnabled &&
                  selectedIntake.originalPriceKES &&
                  selectedIntake.originalPriceKES > selectedIntake.priceKES && (
                    <span className="mr-2 text-brown/50 line-through">
                      KES {selectedIntake.originalPriceKES.toLocaleString()}
                    </span>
                  )}
                <span className="font-semibold">
                  Total: KES {selectedTotalKES.toLocaleString()} (paid in full)
                </span>
              </p>
            </div>
          )}

          {selectedIntake && (
            <div className="rounded-lg border border-brown/15 p-3 text-sm text-brown">
              <p className="mb-2 font-medium">Choose your package *</p>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-baby-pink-light/50">
                <input
                  type="radio"
                  name="starterKitOption"
                  value="with_starter_kit"
                  checked={selectedStarterKitOption === 'with_starter_kit'}
                  onChange={() => setSelectedStarterKitOption('with_starter_kit')}
                />
                <span>
                  <span className="font-semibold">With starter kit</span>
                  <span className="block text-brown/70">
                    KES {withStarterKitPriceKES.toLocaleString()}
                  </span>
                </span>
              </label>
              {withoutStarterKitPriceKES > 0 && (
                <label className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-baby-pink-light/50">
                  <input
                    type="radio"
                    name="starterKitOption"
                    value="without_starter_kit"
                    checked={selectedStarterKitOption === 'without_starter_kit'}
                    onChange={() => setSelectedStarterKitOption('without_starter_kit')}
                  />
                  <span>
                    <span className="font-semibold">Without starter kit</span>
                    <span className="block text-brown/70">
                      KES {withoutStarterKitPriceKES.toLocaleString()}
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}

          {timingOptions.length > 1 && (
            <label className="block">
              <span className="text-sm font-medium text-brown">Preferred training timing *</span>
              <select
                required
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={selectedTiming}
                onChange={(e) => setSelectedTiming(e.target.value)}
              >
                <option value="">Select a timing</option>
                {timingOptions.map((timing) => (
                  <option key={timing} value={timing}>
                    {timing}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-brown">Full name *</span>
            <input
              required
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brown">Email *</span>
            <input
              type="email"
              required
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brown">Phone</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          {error && <p className="text-red-700 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={processing}
            className="w-full py-3 bg-brown text-white rounded-lg font-medium disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Continue to payment'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function TrainingEnrollPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-baby-pink-light p-8">Loading...</div>}>
      <EnrollContent />
    </Suspense>
  )
}
