'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  meetArtist?: {
    enabled: boolean
    title: string
    name: string
    bio: string
    photo?: string
    credentials?: string
  }
  ourStudio?: {
    enabled: boolean
    title: string
    description: string
    images: string[]
  }
  cta: {
    title: string
    description: string
    buttonText: string
  }
  showFridayBooking?: boolean
  fridayBookingMessage?: string
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
    const timestamp = Date.now()
    const fetchOptions: RequestInit = { 
      cache: 'no-store' as RequestCache,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    }

    // Fetch all data in parallel for faster loading
    Promise.all([
      fetch(`/api/homepage?t=${timestamp}`, fetchOptions).then((res) => res.json()),
      fetch(`/api/testimonials?t=${timestamp}`, fetchOptions).then((res) => res.json()),
      fetch(`/api/availability?t=${timestamp}`, fetchOptions).then((res) => res.json()),
    ])
      .then(([homepageData, testimonialsData, availabilityData]) => {
        setHomepageData(homepageData)
        setTestimonials(testimonialsData.testimonials || [])
        
        // Friday slots are activated if friday time slots exist and have at least one slot
        const fridaySlots = availabilityData?.timeSlots?.friday
        const isActivated = Array.isArray(fridaySlots) && fridaySlots.length > 0
        setFridaySlotsActivated(isActivated)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error loading homepage data:', error)
        setLoading(false)
        setFridaySlotsActivated(false)
      })
  }, [])

  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })


  // Use only backend data, no hardcoded fallbacks
  const heroHighlight = homepageData?.hero?.highlight ?? homepageData?.hero?.mobileServiceNote ?? ''
  const heroBadge = homepageData?.hero?.badge ?? homepageData?.hero?.mobileServiceNote ?? ''

  const hero = homepageData?.hero
    ? { ...homepageData.hero, highlight: heroHighlight, badge: heroBadge }
    : {
        title: '',
        subtitle: '',
        highlight: '',
        badge: '',
      }


  // Memoize computed values for performance
  const features = useMemo(() => homepageData?.features || [], [homepageData?.features])

  const meetArtist = useMemo(() => homepageData?.meetArtist || {
    enabled: false,
    title: 'Meet Your Lash Artist',
    name: '',
    bio: '',
    photo: '',
    credentials: '',
  }, [homepageData?.meetArtist])

  const ourStudio = useMemo(() => homepageData?.ourStudio || {
    enabled: false,
    title: 'Our Studio',
    description: '',
    images: [],
  }, [homepageData?.ourStudio])

  const cta = useMemo(() => homepageData?.cta || {
    title: '',
    description: '',
    buttonText: '',
  }, [homepageData?.cta])

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
          
          {/* Cartoon Stickers */}
          <div className="cartoon-sticker top-20 left-10 animate-float-sticker opacity-60 hidden md:block" style={{ animationDelay: '0s' }}>
            <div className="sticker-lash"></div>
          </div>
          <div className="cartoon-sticker top-32 right-16 animate-float-sticker opacity-50 hidden lg:block" style={{ animationDelay: '1s' }}>
            <div className="sticker-star"></div>
          </div>
          <div className="cartoon-sticker bottom-40 left-20 animate-float-sticker opacity-40 hidden md:block" style={{ animationDelay: '2s' }}>
            <div className="sticker-heart"></div>
          </div>
          <div className="cartoon-sticker top-1/2 right-12 animate-float-sticker opacity-50 hidden xl:block" style={{ animationDelay: '1.5s' }}>
            <div className="sticker-sparkle animate-rotate-slow"></div>
          </div>
        </div>

        <div
          className={`relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto ${
            heroInView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          {hero.badge && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 backdrop-blur-md text-sm font-medium text-[var(--color-text)] mb-6">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-primary)]" />
              {hero.badge}
            </div>
          )}
          {hero.title && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-[var(--color-text)] mb-4 drop-shadow-lg animate-title">
              {hero.title}
            </h1>
          )}
          {hero.subtitle && (
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[var(--color-text)]/80 mb-6 drop-shadow-md px-2">
              {hero.subtitle}
            </p>
          )}
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
              className="btn-fun btn-cute hover-lift inline-flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-[var(--color-on-primary)] font-semibold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-full shadow-xl border border-[var(--color-primary)]/20 w-full sm:w-auto touch-manipulation relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Book Now
                <span aria-hidden className="group-hover:translate-x-1 transition-transform duration-300 text-bounce">→</span>
              </span>
            </Link>
            <Link
              href="/gallery"
              className="btn-fun hover-lift hover-sparkle inline-flex items-center justify-center gap-2 bg-[var(--color-surface)]/70 hover:bg-[var(--color-surface)] text-[var(--color-text)] font-semibold text-sm sm:text-base px-6 py-3 sm:py-4 rounded-full shadow-lg border border-[var(--color-primary)]/25 w-full sm:w-auto touch-manipulation relative"
            >
              <span className="relative z-10">View Gallery</span>
            </Link>
          </div>
          {fridaySlotsActivated && (homepageData?.showFridayBooking !== false) && (
            <div className="mt-6 px-4">
              <p className="text-sm md:text-base text-[var(--color-text)]/75 inline-flex items-center gap-2 bg-[var(--color-surface)]/40 backdrop-blur-sm border border-[var(--color-primary)]/20 rounded-full px-4 py-2">
                <span>🌙</span>
                <span>{homepageData?.fridayBookingMessage ?? 'Friday Night Bookings Available'}</span>
              </p>
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-gentle-bounce cursor-pointer group">
          <div className="relative">
            <svg
              className="w-6 h-6 text-[var(--color-text)]/70 group-hover:text-[var(--color-primary)] transition-colors duration-300"
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
        </div>
      </section>

      {/* Meet Your Lash Artist Section */}
      {meetArtist.enabled && (meetArtist.name || meetArtist.bio) && (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[var(--color-surface)] via-[color-mix(in srgb,var(--color-surface) 90%,var(--color-background) 10%)] to-[var(--color-background)]">
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 60%)',
            backgroundSize: '40% 40%',
            backgroundPosition: 'center'
          }} />
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-sm font-semibold tracking-[0.3em] uppercase text-[var(--color-text)]/70 mb-4">
                Personal Touch
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display text-[var(--color-text)] mb-6 px-2">
                {meetArtist.title || 'Meet Your Lash Artist'}
              </h2>
            </div>
            <div className="interactive-card hover-lift group relative rounded-3xl shadow-xl" style={{
              background: 'color-mix(in srgb, var(--color-surface) 85%, var(--color-primary) 15%)',
            }}>
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)'
              }} />
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 p-8 md:p-10 lg:p-12">
                {meetArtist.photo && (
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 blur-xl" />
                    <div className="relative rounded-2xl overflow-hidden border-4 border-[var(--color-primary)]/30 shadow-xl w-64 h-64 md:w-80 md:h-80 lg:w-72 lg:h-72">
                      <Image
                        src={meetArtist.photo}
                        alt={meetArtist.name}
                        fill
                        className="object-cover"
                        loading="lazy"
                        sizes="(max-width: 768px) 256px, (max-width: 1024px) 320px, 288px"
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-col justify-center text-center lg:text-left flex-1">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-display text-[var(--color-text)] mb-3 flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                    <span className="text-xl sm:text-2xl md:text-3xl animate-pulse-fun">⭐</span>
                    <span className="text-lg sm:text-xl md:text-2xl animate-pulse-fun" style={{ animationDelay: '0.2s' }}>✨</span>
                    <span className="relative">
                      {meetArtist.name}
                      <span className="absolute -top-2 -left-3 text-sm sm:text-base md:text-lg animate-pulse-fun" style={{ animationDelay: '0.1s' }}>✨</span>
                      <span className="absolute -bottom-2 -right-3 text-sm sm:text-base md:text-lg animate-pulse-fun" style={{ animationDelay: '0.4s' }}>✨</span>
                    </span>
                    <span className="text-lg sm:text-xl md:text-2xl animate-pulse-fun" style={{ animationDelay: '0.3s' }}>✨</span>
                    <span className="text-xl sm:text-2xl md:text-3xl animate-pulse-fun" style={{ animationDelay: '0.5s' }}>⭐</span>
                  </h3>
                  {meetArtist.credentials && (
                    <p className="text-sm md:text-base font-semibold text-[var(--color-primary)] mb-4 uppercase tracking-wide">
                      {meetArtist.credentials}
                    </p>
                  )}
                  <div className="text-base md:text-lg leading-relaxed text-[var(--color-text)]/85 whitespace-pre-line">
                    {meetArtist.bio}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {features.length > 0 && (
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
                className="card-interactive hover-lift group relative p-8 rounded-3xl bg-[color-mix(in srgb,var(--color-surface) 88%,var(--color-background) 12%)] shadow-xl border border-[var(--color-primary)]/20 animate-slide-in-up hover-glow-fun"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)'
                }} />
                <div className="cartoon-sticker top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="sticker-sparkle"></div>
                </div>
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-lg shadow-[var(--color-primary)]/30 mb-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 hover-bounce">
                    <span className="text-lg font-semibold">0{index + 1}</span>
                  </div>
                  <h3 className="text-2xl font-display text-[var(--color-text)] mb-3 group-hover:text-[var(--color-primary)] transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--color-text)]/80 leading-relaxed group-hover:text-[var(--color-text)] transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Our Studio Section */}
      {ourStudio.enabled && (ourStudio.description || (ourStudio.images && ourStudio.images.length > 0)) && (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[var(--color-surface)] via-[color-mix(in srgb,var(--color-surface) 90%,var(--color-background) 10%)] to-[var(--color-background)]">
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 60%)',
            backgroundSize: '40% 40%',
            backgroundPosition: 'center'
          }} />
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-sm font-semibold tracking-[0.3em] uppercase text-[var(--color-text)]/70 mb-4">
                Visit Us
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display text-[var(--color-text)] mb-6 px-2">
                {ourStudio.title || 'Our Studio'}
              </h2>
            </div>
            <div className="interactive-card hover-lift group relative rounded-3xl shadow-xl" style={{
              background: 'color-mix(in srgb, var(--color-surface) 85%, var(--color-primary) 15%)',
            }}>
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)'
              }} />
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 p-8 md:p-10 lg:p-12">
                {ourStudio.images && ourStudio.images.length > 0 && (
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 blur-xl" />
                    <div className="relative grid grid-cols-2 gap-3 w-64 h-64 md:w-80 md:h-80 lg:w-72 lg:h-72">
                      {ourStudio.images.slice(0, 4).map((imageUrl, index) => (
                        <div
                          key={index}
                          className="relative rounded-xl overflow-hidden border-2 border-[var(--color-primary)]/30 shadow-lg group/photo aspect-square"
                        >
                          <Image
                            src={imageUrl}
                            alt={`Studio photo ${index + 1}`}
                            fill
                            className="object-cover transition-transform duration-300 group-hover/photo:scale-110"
                            loading="lazy"
                            sizes="(max-width: 768px) 128px, 160px"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ourStudio.description && (
                  <div className="flex flex-col justify-center text-center lg:text-left flex-1">
                  <div className="text-base md:text-lg leading-relaxed text-[var(--color-text)]/85 whitespace-pre-line">
                    {ourStudio.description}
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

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
              {testimonials.slice(0, 3).map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className="card-interactive hover-lift relative rounded-3xl bg-[color-mix(in srgb,var(--color-surface) 88%,var(--color-background) 12%)] shadow-2xl border border-[var(--color-text)]/10 overflow-hidden animate-scale-in group hover-glow-fun"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="absolute inset-x-10 -top-10 h-20 bg-[var(--color-primary)]/20 blur-3xl group-hover:bg-[var(--color-primary)]/30 transition-colors duration-300" />
                  <div className="relative p-8 z-10">
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
      {(cta.title || cta.description || cta.buttonText) && (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] via-[color-mix(in srgb,var(--color-primary) 70%,var(--color-background) 30%)] to-[var(--color-primary-dark)]" />
          <div className="relative max-w-4xl mx-auto text-center text-[var(--color-on-primary)]">
            <div className="flex flex-col items-center gap-4">
              <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/15 border border-white/30 text-xs uppercase tracking-[0.4em] text-[var(--color-on-primary)]/80">
                Confidence Awaits
              </span>
              {cta.title && (
                <h2 className="text-4xl md:text-5xl font-display leading-tight">
                  {cta.title}
                </h2>
              )}
              {cta.description && (
                <p className="text-base md:text-lg text-[var(--color-on-primary)]/85 max-w-3xl">
                  {cta.description}
                </p>
              )}
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link
                href="/booking"
                className="btn-fun btn-cute hover-lift inline-flex items-center gap-2 bg-white text-[var(--color-primary)] font-semibold px-10 py-4 rounded-full shadow-xl group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {cta.buttonText}
                  <span aria-hidden className="group-hover:translate-x-1 transition-transform duration-300 text-bounce">→</span>
                </span>
              </Link>
              <Link
                href="/services"
                className="btn-fun hover-lift hover-sparkle inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-[var(--color-on-primary)] font-semibold px-8 py-4 rounded-full border border-white/30 relative"
              >
                <span className="relative z-10">Browse Services</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  )
}

