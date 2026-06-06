'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  formatTrainingDateRange,
} from '@/lib/training-utils'
import type { TrainingIntake, TrainingProgram } from '@/types/training'

function SuccessContent() {
  const searchParams = useSearchParams()
  const enrollmentId = searchParams?.get('enrollmentId') || ''
  const reference = searchParams?.get('reference') || ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'pending' | 'error'>('loading')
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [intake, setIntake] = useState<TrainingIntake | null>(null)
  const [selectedTiming, setSelectedTiming] = useState('')
  const [selectedStarterKitOption, setSelectedStarterKitOption] = useState('')
  const [courseUrl, setCourseUrl] = useState<string | null>(null)
  const [courseMaterialReady, setCourseMaterialReady] = useState(false)

  useEffect(() => {
    if (!enrollmentId) {
      setStatus('error')
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const loadStatus = async (attempt = 0) => {
      try {
        if (attempt === 0 && reference) {
          await fetch('/api/paystack/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference,
              paymentType: 'training_enrollment',
            }),
          })
        }

        const response = await fetch(`/api/training/enrollment-status?id=${enrollmentId}`)
        const data = await response.json()
        if (cancelled) return

        if (data.paymentStatus === 'completed' || data.paymentStatus === 'manual') {
          setStatus('ok')
          setProgram(data.program)
          setIntake(data.intake)
          setSelectedTiming(data.enrollment?.selectedTiming || '')
          setSelectedStarterKitOption(data.enrollment?.selectedStarterKitOption || 'with_starter_kit')
          setCourseMaterialReady(Boolean(data.courseMaterialReady))
          setCourseUrl(data.courseUrl || null)
        } else if (data.paymentStatus === 'pending') {
          if (attempt < 3) {
            timeoutId = setTimeout(() => loadStatus(attempt + 1), 2000)
          } else {
            setStatus('pending')
          }
        } else {
          setStatus('error')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    loadStatus()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [enrollmentId, reference])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-brown">
        Confirming enrollment...
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-baby-pink-light flex flex-col items-center justify-center px-4 text-center text-brown">
        <h1 className="text-2xl font-bold mb-2">Payment processing</h1>
        <p className="mb-6 max-w-md">
          We&apos;re waiting for payment confirmation. Refresh this page in a moment or check
          your email.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-brown text-white rounded-lg"
        >
          Refresh
        </button>
      </div>
    )
  }

  if (status === 'error' || !program) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex flex-col items-center justify-center px-4 text-center text-brown">
        <p className="mb-4">We couldn&apos;t confirm your enrollment yet.</p>
        <Link href="/masterclass" className="underline">
          Back to masterclass
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-16 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-8 text-center text-brown">
        <h1 className="text-3xl font-bold mb-2">Payment successful!</h1>
        <p className="text-brown/80 mb-6">
          You have successfully enrolled in <strong>{program.title}</strong>. Please check your
          email for your cohort details and next steps.
        </p>
        {intake && (
          <div className="text-left text-sm bg-baby-pink-light/50 p-4 rounded-lg mb-6">
            <p>
              <strong>Cohort:</strong> {intake.title}
            </p>
            <p>
              <strong>Dates:</strong> {formatTrainingDateRange(intake.trainingDates)}
            </p>
            {selectedTiming && (
              <p>
                <strong>Timing:</strong> {selectedTiming}
              </p>
            )}
            <p>
              <strong>Package:</strong>{' '}
              {selectedStarterKitOption === 'without_starter_kit'
                ? 'Without starter kit'
                : 'With starter kit'}
            </p>
            <p>
              <strong>Location:</strong> {intake.location || program.location}
            </p>
          </div>
        )}
        {courseUrl && (
          <Link
            href={courseUrl}
            className="mb-4 inline-flex w-full items-center justify-center rounded-lg bg-brown px-6 py-3 font-semibold text-white"
          >
            Open your course page
          </Link>
        )}
        {!courseMaterialReady && (
          <div className="mb-4 rounded-lg bg-amber-50 p-4 text-left text-sm text-amber-800">
            Your enrollment is confirmed. The course resources are still being prepared and
            will be shared with you as soon as they are ready.
          </div>
        )}
        <Link href="/masterclass" className="text-brown underline">
          Back to masterclass page
        </Link>
      </div>
    </div>
  )
}

export default function TrainingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-baby-pink-light p-8">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
