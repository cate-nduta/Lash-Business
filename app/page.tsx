'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useInView } from 'react-intersection-observer'

export const dynamic = 'force-dynamic'

interface HomepageData {
  hero: {
    title: string
    subtitle: string
    highlight?: string
    badge?: string
    mobileServiceNote?: string
  }
  intro: {
    title: string
    paragraph1: string
    paragraph2: string
    features: string
  }
  features: Array<{
    title: string
    description: string
  }>
  cta: {
    title: string
    description: string
    buttonText: string
  }
}

interface Testimonial {
  id: string
  name: string
  email: string
  photo?: string
  testimonial: string
  rating?: number
  date: string
  approved: boolean
  service?: string
  status?: 'pending' | 'approved' | 'rejected'
}

export default function Home() {
  const [homepageData, setHomepageData] = useState<HomepageData | null>(null)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [fridaySlotsActivated, setFridaySlotsActivated] = useState(false)

  useEffect(() => {
    fetch('/api/homepage', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setHomepageData(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error loading homepage data:', error)
        setLoading(false)
      })

    // Load testimonials
    fetch('/api/testimonials', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setTestimonials(data.testimonials || [])
      })
      .catch((error) => {
        console.error('Error loading testimonials:', error)
      })

    // Check if Friday night slots are activated
    fetch('/api/availability', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        // Friday slots are activated if friday time slots exist and have at least one slot
        const fridaySlots = data?.timeSlots?.friday
        const isActivated = Array.isArray(fridaySlots) && fridaySlots.length > 0
        setFridaySlotsActivated(isActivated)
      })
      .catch((error) => {
        console.error('Error checking Friday slots:', error)
        setFridaySlotsActivated(false)
      })
  }, [])

  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [introRef, introInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  // Fallback data if API fails
  const heroHighlight =
    homepageData?.hero?.highlight ??
    homepageData?.hero?.mobileServiceNote ??
    'Visit our Nairobi studio for a bespoke lash experience.'

  const heroBadge =
    homepageData?.hero?.badge ??
    homepageData?.hero?.mobileServiceNote ??
    'Nairobi Studio Experience'

  const hero = homepageData?.hero
    ? { ...homepageData.hero, highlight: heroHighlight, badge: heroBadge }
    : {
        title: 'LashDiary',
        subtitle: 'Luxury Lash Extensions & Beauty Services',
        highlight: heroHighlight,
        badge: heroBadge,
      }

  const intro = homepageData?.intro || {
    title: 'Welcome to LashDiary',
    paragraph1: 'Experience the artistry of premium lash extensions at our Nairobi studio. Settle into a serene space designed to pamper you while we craft a look that suits your lifestyle.',
    paragraph2: 'From classic to mega volume, we offer a full range of lash services tailored to your unique style. Book your appointment today and let\'s make your lashes absolutely gorgeous!',
    features: '🏢 Nairobi Studio | 🕒 Flexible Scheduling | 💖 Personalized Aftercare',
  }

  const features = homepageData?.features || [
    {
      title: 'Expert Technicians',
      description: 'Certified professionals with years of experience in lash artistry! We love what we do!',
    },
    {
      title: 'Premium Products',
      description: 'Only the finest quality lash extensions and beauty products. The best for the best!',
    },
    {
      title: 'Relaxing Studio Experience',
      description: 'Visit our beautifully appointed studio in Nairobi for a calm, hygienic environment and personalized attention from start to finish.',
    },
  ]

  const cta = homepageData?.cta || {
    title: 'Ready to Transform Your Look?',
    description: 'Book your appointment today and enjoy luxury lash services at our Nairobi studio!',
    buttonText: 'Book Now!',
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--color-background)] via-[color-mix(in srgb,var(--color-background) 70%,var(--color-surface) 30%)] to-[var(--color-surface)]"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(60% 60% at 20% 30%, rgba(255,255,255,0.35) 0%, transparent 65%), radial-gradient(70% 70% at 80% 20%, rgba(255,255,255,0.18) 0%, transparent 60%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[color-mix(in srgb,var(--color-background) 90%, transparent 10%)] to-transparent" />
        </div>

        <div
          className={`relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto ${
            heroInView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 backdrop-blur-md text-sm font-medium text-[var(--color-text)] mb-6">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            {hero.badge}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-[var(--color-text)] mb-4 drop-shadow-lg">
            {hero.title}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[var(--color-text)]/80 mb-6 drop-shadow-md px-2">
            {hero.subtitle}
          </p>
          {hero.highlight && (
            <div className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 bg-[var(--color-surface)]/60 backdrop-blur-lg border border-[var(--color-primary)]/30 rounded-full px-6 py-3 shadow-lg">
              <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-[var(--color-text)]/85">
                {hero.highlight}
              </span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <Link
              href="/booking"
              className="hover-soft inline-flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-[var(--color-on-primary)] font-semibold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-full shadow-xl border border-[var(--color-primary)]/20 w-full sm:w-auto touch-manipulation"
            >
              Book Now
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/gallery"
              className="hover-soft inline-flex items-center justify-center gap-2 bg-[var(--color-surface)]/70 hover:bg-[var(--color-surface)] text-[var(--color-text)] font-semibold text-sm sm:text-base px-6 py-3 sm:py-4 rounded-full shadow-lg border border-[var(--color-primary)]/25 w-full sm:w-auto touch-manipulation"
            >
              View Gallery
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-[var(--color-text)]/70"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Friday Night Slots Banner */}
      {fridaySlotsActivated && (
        <section className="relative py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[var(--color-background)] to-[var(--color-surface)]">
          <div className="max-w-4xl mx-auto">
            <div className="max-w-3xl mx-auto animate-fade-in-up">
              <div className="relative rounded-3xl overflow-hidden p-8 md:p-10 shadow-2xl border-4 border-[var(--color-primary)]/40 transform hover:scale-[1.02] transition-all duration-300" style={{
                background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.15) 0%, rgba(115, 61, 38, 0.25) 50%, rgba(139, 69, 19, 0.15) 100%)',
                boxShadow: '0 20px 60px rgba(139, 69, 19, 0.3), 0 0 40px rgba(139, 69, 19, 0.2), inset 0 0 30px rgba(255, 255, 255, 0.1)',
              }}>
                {/* Animated background glow */}
                <div className="absolute inset-0 opacity-30 animate-pulse" style={{
                  background: 'radial-gradient(circle at 30% 50%, rgba(139, 69, 19, 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(115, 61, 38, 0.4) 0%, transparent 50%)',
                }} />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <div className="absolute -inset-10 -top-10 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform rotate-12 animate-shimmer" />
                </div>

                <div className="relative z-10 text-center">
                  {/* Header with moon icon */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="text-5xl animate-bounce" style={{ animationDuration: '2s' }}>
                      🌙
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)]/20 border-2 border-[var(--color-primary)]/50 backdrop-blur-sm">
                        <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                        <span className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-[var(--color-primary)] drop-shadow-lg">
                          Friday Night Bookings
                        </span>
                      </div>
                    </div>
                    <div className="text-5xl animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>
                      ✨
                    </div>
                  </div>

                  {/* Main headline */}
                  <h3 className="text-2xl md:text-3xl font-display font-bold text-[var(--color-text)] mb-3 drop-shadow-md">
                    Weekdays Too Hectic?
                  </h3>
                  <h3 className="text-2xl md:text-3xl font-display font-bold text-[var(--color-primary)] mb-4 drop-shadow-md">
                    Your Weekends Are Packed?
                  </h3>

                  {/* Description */}
                  <div className="bg-white/40 backdrop-blur-md rounded-2xl p-5 md:p-6 mb-6 border-2 border-white/50 shadow-lg">
                    <p className="text-base md:text-lg text-[var(--color-text)]/95 font-semibold leading-relaxed mb-2">
                      Friday Night Appointments Available
                    </p>
                    <p className="text-sm md:text-base text-[var(--color-text)]/85 leading-relaxed">
                      Designed for busy professionals who can't make weekday appointments and whose weekends are already committed. 
                      Book your <span className="font-bold text-[var(--color-primary)]">Friday evening slot</span> and end your week with a premium lash experience.
                    </p>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href="/booking"
                    className="group inline-flex items-center gap-3 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-dark)] to-[var(--color-primary)] text-white font-bold text-lg px-8 py-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(139,69,19,0.6)] border-2 border-white/30"
                    style={{
                      boxShadow: '0 10px 30px rgba(139, 69, 19, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <span className="text-2xl group-hover:rotate-12 transition-transform">🌙</span>
                    <span>Book Friday Night Slot</span>
                    <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                  </Link>

                  {/* Small note */}
                  <p className="mt-4 text-xs text-[var(--color-text)]/60 italic">
                    For those who need flexibility beyond traditional hours
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Intro Section */}
      <section
        ref={introRef}
        className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[var(--color-background)] via-[color-mix(in srgb,var(--color-background) 85%,var(--color-surface) 15%)] to-[var(--color-surface)]"
      >
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 60%)',
          backgroundSize: '40% 40%',
          backgroundPosition: 'center'
        }} />
        <div
          className={`relative max-w-5xl mx-auto text-center ${
            introInView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <span className="inline-block text-sm font-semibold tracking-[0.3em] uppercase text-[var(--color-text)]/70 mb-4">
            Discover Elegance
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display text-[var(--color-text)] mb-6 px-2">
            {intro.title}
          </h2>
          <div className="grid gap-4 sm:gap-6 text-left md:grid-cols-2">
            <div className="p-6 rounded-2xl bg-[var(--color-surface)] shadow-lg border border-[var(--color-text)]/10">
              <p className="text-base md:text-lg leading-relaxed text-[var(--color-text)]/85">
                {intro.paragraph1}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[var(--color-surface)] shadow-lg border border-[var(--color-text)]/10">
              <p className="text-base md:text-lg leading-relaxed text-[var(--color-text)]/85">
                {intro.paragraph2}
              </p>
              <div className="mt-4 px-4 py-3 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-text)] font-semibold">
                {intro.features}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb,var(--color-secondary) 20%, var(--color-surface) 80%) 0%, color-mix(in srgb,var(--color-background) 15%, var(--color-surface) 85%) 100%)',
          }}
        />
        <div className="absolute inset-3 -z-10 rounded-3xl bg-[color-mix(in srgb,var(--color-surface) 92%, var(--color-background) 8%)]" />
        <div className="relative max-w-7xl mx-auto">
          <h2 className="text-4xl font-display text-center text-[var(--color-text)] mb-14">
            Why Choose LashDiary?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((feature, index) => (
              <div
                key={index}
                className="interactive-card group relative p-8 rounded-3xl bg-[color-mix(in srgb,var(--color-surface) 88%,var(--color-background) 12%)] shadow-xl border border-[var(--color-primary)]/20"
              >
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)'
                }} />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-lg shadow-[var(--color-primary)]/30 mb-5">
                    <span className="text-lg font-semibold">0{index + 1}</span>
                  </div>
                  <h3 className="text-2xl font-display text-[var(--color-text)] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--color-text)]/80 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-[color-mix(in srgb,var(--color-surface) 82%,var(--color-primary) 18%)]" />
          <div className="absolute inset-12 -z-10 rounded-[60px] bg-[color-mix(in srgb,var(--color-surface) 70%,var(--color-accent) 30%)]" />
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 45%), linear-gradient(315deg, rgba(255,255,255,0.1) 0%, transparent 40%)'
          }} />
          <div className="relative max-w-7xl mx-auto">
            <h2 className="text-4xl font-display text-center text-[var(--color-text)] mb-16">
              What Our Clients Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {testimonials.slice(0, 3).map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="interactive-card relative rounded-3xl bg-[color-mix(in srgb,var(--color-surface) 88%,var(--color-background) 12%)] shadow-2xl border border-[var(--color-text)]/10 overflow-hidden"
                >
                  <div className="absolute inset-x-10 -top-10 h-20 bg-[var(--color-primary)]/20 blur-3xl" />
                  <div className="relative p-8">
                    {testimonial.rating && (
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-lg ${
                              star <= testimonial.rating!
                                ? 'text-[var(--color-accent)] drop-shadow-[0_0_6px_color-mix(in_srgb,var(--color-accent)_65%,transparent)]'
                                : 'text-[var(--color-text)]/25'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[var(--color-text)]/80 mb-6 leading-relaxed italic">
                      {testimonial.status === 'approved' && (
                        <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#15803d] border border-[#22c55e]/40 shadow-[0_0_6px_rgba(34,197,94,0.2)]">
                          <svg className="h-2.5 w-2.5 text-[#16a34a]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 011.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Verified</span>
                        </span>
                      )}
                      “{testimonial.testimonial}”
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[var(--color-text)]">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-[var(--color-text)]/60">
                          {(() => {
                            const dateString = (testimonial as any).createdAt ?? (testimonial as any).date
                            if (!dateString) return ''
                            const parsed = new Date(dateString)
                            if (Number.isNaN(parsed.getTime())) return ''
                            return parsed.toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {testimonials.length > 3 && (
              <div className="text-center">
                <Link
                  href="/testimonials-all"
                  className="hover-soft inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-[var(--color-on-primary)] font-semibold px-8 py-3 rounded-full shadow-xl"
                >
                  View More Testimonials
                  <span aria-hidden>→</span>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] via-[color-mix(in srgb,var(--color-primary) 70%,var(--color-background) 30%)] to-[var(--color-primary-dark)]" />
        <div className="relative max-w-4xl mx-auto text-center text-[var(--color-on-primary)]">
          <div className="flex flex-col items-center gap-4">
            <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/15 border border-white/30 text-xs uppercase tracking-[0.4em] text-[var(--color-on-primary)]/80">
              Confidence Awaits
            </span>
            <h2 className="text-4xl md:text-5xl font-display leading-tight">
              {cta.title}
            </h2>
            <p className="text-base md:text-lg text-[var(--color-on-primary)]/85 max-w-3xl">
              {cta.description}
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link
                href="/booking"
                className="hover-soft inline-flex items-center gap-2 bg-white text-[var(--color-primary)] font-semibold px-10 py-4 rounded-full shadow-xl"
              >
                {cta.buttonText}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/services"
                className="hover-soft inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-[var(--color-on-primary)] font-semibold px-8 py-4 rounded-full border border-white/30"
              >
                Browse Services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

