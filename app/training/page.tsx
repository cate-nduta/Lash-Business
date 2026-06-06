'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  formatTrainingDateRange,
} from '@/lib/training-utils'
import type { TrainingIntake, TrainingProgram } from '@/types/training'

export default function TrainingPage() {
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [intakes, setIntakes] = useState<TrainingIntake[]>([])
  const [loading, setLoading] = useState(true)
  const [waitlistName, setWaitlistName] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  const [waitlistMessage, setWaitlistMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/training')
      .then((r) => r.json())
      .then((data) => {
        setProgram(data.program)
        setIntakes(data.intakes || [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brown">
        Loading...
      </div>
    )
  }

  if (!program) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brown px-4 text-center">
        Masterclass is not available at the moment. Please check back soon.
      </div>
    )
  }
  const featuredIntake =
    intakes.length > 0
      ? [...intakes].sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || a.startDate).getTime()
          const bTime = new Date(b.updatedAt || b.createdAt || b.startDate).getTime()
          return bTime - aTime
        })[0]
      : null
  const displayPriceKES = featuredIntake?.priceKES ?? program.priceKES
  const displayOriginalPriceKES = Number(featuredIntake?.originalPriceKES || 0) > 0
    ? Number(featuredIntake?.originalPriceKES)
    : undefined
  const featuredSpotsLeft = featuredIntake
    ? Math.max(0, featuredIntake.capacity - featuredIntake.enrolledCount)
    : null
  const featuredIntakeIsFull = featuredIntake
    ? featuredIntake.status === 'full' || featuredSpotsLeft === 0
    : false
  const hasFullCohort = intakes.some(
    (intake) => intake.status === 'full' || intake.enrolledCount >= intake.capacity,
  )

  const handleWaitlistSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setWaitlistSubmitting(true)
    setWaitlistMessage(null)

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: waitlistName.trim(),
          email: waitlistEmail.trim(),
          source: 'masterclass_waitlist',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to join waitlist')
      setWaitlistMessage({
        type: 'success',
        text: data.alreadySubscribed
          ? 'You are already on our list. We will let you know when the next cohort opens.'
          : 'You are on the masterclass waitlist. We will email you when the next cohort opens.',
      })
      setWaitlistName('')
      setWaitlistEmail('')
    } catch (error) {
      setWaitlistMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to join waitlist',
      })
    } finally {
      setWaitlistSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-baby-pink-light">
      <section className="relative overflow-hidden bg-brown text-white py-16 px-4">
        {program.heroImageUrl && (
          <div className="absolute inset-0 opacity-35">
            <Image
              src={program.heroImageUrl}
              alt={program.heroImageAlt || program.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-brown via-brown/85 to-brown/70" />
        <div className="relative max-w-4xl mx-auto text-center">
          {program.eyebrow && (
            <p className="uppercase tracking-[0.35em] text-xs mb-4 text-white/80">
              {program.eyebrow}
            </p>
          )}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{program.title}</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">{program.shortDescription || program.description}</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="#intakes"
              className="px-8 py-3 bg-white text-brown rounded-full font-semibold"
            >
              View cohorts
            </Link>
            {program.syllabusPreview?.pdfUrl && (
              <a
                href={program.syllabusPreview.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-8 py-3 border border-white/50 text-white rounded-full font-semibold"
              >
                Preview syllabus
              </a>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-2xl font-semibold">
            {displayOriginalPriceKES && (
              <span className="text-white/60">
                Was:{' '}
                <span className="line-through">
                  KES {displayOriginalPriceKES.toLocaleString()}
                </span>
              </span>
            )}
            <span>
              {displayOriginalPriceKES ? 'Now: ' : ''}
              KES {displayPriceKES.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-white">
            Full payment required before classes begin
          </p>
          {featuredIntake && (
            <div className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-brown shadow">
              {featuredIntakeIsFull
                ? 'This cohort is full'
                : `${featuredSpotsLeft} ${featuredSpotsLeft === 1 ? 'slot' : 'slots'} remaining`}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-brown mb-3">About the program</h2>
          <p className="text-brown/80 leading-relaxed">{program.description}</p>
          <p className="mt-2 text-brown/70">
            <strong>Location:</strong> {program.location}
          </p>
        </section>

        {program.whatYoullLearn && program.whatYoullLearn.filter((item) => item.trim()).length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-brown mb-2">What you&apos;ll learn</h2>
            <ul className="list-disc pl-6 text-brown/80 space-y-1">
              {program.whatYoullLearn.filter((item) => item.trim()).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {program.requirements && program.requirements.filter((item) => item.trim()).length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-brown mb-2">Requirements</h2>
            <ul className="list-disc pl-6 text-brown/80 space-y-1">
              {program.requirements.filter((item) => item.trim()).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {(program.syllabusPreview?.title ||
          program.syllabusPreview?.description ||
          program.syllabusPreview?.previewImageUrl ||
          program.syllabusPreview?.pdfUrl) && (
          <section className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <p className="text-xs uppercase tracking-[0.3em] text-brown/60 mb-3">
                  Syllabus preview
                </p>
                <h2 className="text-2xl font-bold text-brown mb-3">
                  {program.syllabusPreview?.title || 'Preview the syllabus'}
                </h2>
                {program.syllabusPreview?.description && (
                  <p className="text-brown/80 leading-relaxed mb-4">
                    {program.syllabusPreview.description}
                  </p>
                )}
                {program.syllabusPreview?.bullets &&
                  program.syllabusPreview.bullets.filter((item) => item.trim()).length > 0 && (
                  <ul className="list-disc pl-6 text-brown/80 space-y-1 mb-5">
                    {program.syllabusPreview.bullets.filter((item) => item.trim()).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {program.syllabusPreview?.pdfUrl && (
                  <a
                    href={program.syllabusPreview.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit px-6 py-3 bg-brown text-white rounded-lg font-medium"
                  >
                    {program.syllabusPreview.ctaText || 'View syllabus preview'}
                  </a>
                )}
              </div>
              {program.syllabusPreview?.previewImageUrl && (
                <div className="relative min-h-[360px] bg-baby-pink-light">
                  <Image
                    src={program.syllabusPreview.previewImageUrl}
                    alt={program.syllabusPreview.title || 'Training syllabus preview'}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {program.imageSections && program.imageSections.length > 0 && (
          <section className="space-y-6">
            {program.imageSections
              .filter((section) => section.title || section.description || section.imageUrl)
              .map((section, index) => (
                <div
                  key={section.id}
                  className="bg-white rounded-2xl shadow overflow-hidden grid md:grid-cols-2"
                >
                  {section.imageUrl && (
                    <div className={`relative min-h-[320px] ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                      <Image
                        src={section.imageUrl}
                        alt={section.imageAlt || section.title || 'Training image'}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    {section.title && (
                      <h2 className="text-2xl font-bold text-brown mb-3">{section.title}</h2>
                    )}
                    {section.description && (
                      <p className="text-brown/80 leading-relaxed">{section.description}</p>
                    )}
                  </div>
                </div>
              ))}
          </section>
        )}

        {program.galleryImages && program.galleryImages.some((image) => image.imageUrl) && (
          <section>
            <h2 className="text-2xl font-bold text-brown mb-4">Training moments</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {program.galleryImages
                .filter((image) => image.imageUrl)
                .map((image) => (
                  <div key={image.id} className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="relative aspect-square">
                      <Image
                        src={image.imageUrl}
                        alt={image.imageAlt || image.caption || 'Training gallery image'}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    {image.caption && (
                      <p className="p-3 text-sm text-brown/75">{image.caption}</p>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}

        <section id="intakes">
          <h2 className="text-2xl font-bold text-brown mb-4">Upcoming cohorts</h2>
          {intakes.length > 0 && (
            <p className="text-brown/70 mb-6 text-sm">
              Choose an available cohort below. If a cohort is full, join the waitlist and we will let you know when the next cohort opens.
            </p>
          )}
          {intakes.length === 0 ? (
            <p className="text-brown/70">New cohorts coming soon. Contact us to be notified.</p>
          ) : (
            <div className="space-y-4">
              {intakes.map((intake) => {
                const isFull = intake.status === 'full' || intake.enrolledCount >= intake.capacity
                const spotsLeft = Math.max(0, intake.capacity - intake.enrolledCount)
                const wasPriceKES = Number(intake.originalPriceKES || 0) > 0
                  ? Number(intake.originalPriceKES)
                  : undefined
                const withoutStarterKitPriceKES = Number(intake.withoutStarterKitPriceKES || 0)

                return (
                  <div
                    key={intake.id}
                    className="bg-white rounded-xl shadow p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-semibold text-brown">{intake.title}</h3>
                      <p className="text-sm text-brown/80 mt-1">
                        {formatTrainingDateRange(intake.trainingDates)}
                      </p>
                      {intake.timingOptions && intake.timingOptions.length > 0 && (
                        <p className="text-sm text-brown/70 mt-1">
                          Timing: {intake.timingOptions.join(' / ')}
                        </p>
                      )}
                      <p className="text-sm mt-2 flex flex-wrap items-center gap-2">
                        {wasPriceKES && (
                          <span className="text-brown/50">
                            Was:{' '}
                            <span className="line-through">
                              KES {wasPriceKES.toLocaleString()}
                            </span>
                          </span>
                        )}
                        <span className="font-semibold">
                          {wasPriceKES ? 'Now: ' : ''}
                          With starter kit KES {intake.priceKES.toLocaleString()}
                        </span>
                        {withoutStarterKitPriceKES > 0 && (
                          <span className="font-semibold">
                            Without starter kit KES {withoutStarterKitPriceKES.toLocaleString()}
                          </span>
                        )}
                        <span>· {isFull ? 'Cohort is full' : `${spotsLeft} spots left`}</span>
                      </p>
                      {isFull && (
                        <p className="mt-2 text-sm text-brown/70">
                          This cohort is full. Join the waitlist and we will email you when the next cohort opens.
                        </p>
                      )}
                    </div>
                    {isFull ? (
                      <a
                        href="#masterclass-waitlist"
                        className="inline-block text-center px-6 py-3 border border-brown text-brown rounded-lg font-medium shrink-0"
                      >
                        Join waitlist
                      </a>
                    ) : (
                      <Link
                        href={`/masterclass/enroll?intakeId=${intake.id}`}
                        className="inline-block text-center px-6 py-3 bg-brown text-white rounded-lg font-medium shrink-0"
                      >
                        Enroll & pay
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
        {hasFullCohort && (
          <section id="masterclass-waitlist" className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold text-brown mb-2">Join the masterclass waitlist</h2>
            <p className="text-brown/70 mb-5">
              Leave your email and we will let you know when the next cohort is available.
            </p>
            <form onSubmit={handleWaitlistSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input
                className="rounded-lg border px-3 py-2"
                placeholder="Your name"
                value={waitlistName}
                onChange={(event) => setWaitlistName(event.target.value)}
              />
              <input
                required
                type="email"
                className="rounded-lg border px-3 py-2"
                placeholder="Email address"
                value={waitlistEmail}
                onChange={(event) => setWaitlistEmail(event.target.value)}
              />
              <button
                type="submit"
                disabled={waitlistSubmitting}
                className="rounded-lg bg-brown px-5 py-2 font-medium text-white disabled:opacity-50"
              >
                {waitlistSubmitting ? 'Joining...' : 'Join waitlist'}
              </button>
            </form>
            {waitlistMessage && (
              <p className={`mt-3 text-sm ${waitlistMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {waitlistMessage.text}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
