import Link from 'next/link'
import { readDataFile } from '@/lib/data-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

interface PreAppointmentGuidelines {
  version: number
  updatedAt: string
  introText: string
  fineAmount: number
  doItems: string[]
  dontItems: string[]
}

const DEFAULT_GUIDELINES: PreAppointmentGuidelines = {
  version: 1,
  updatedAt: '',
  introText: "Follow these guidelines to ensure the best results and a smooth, comfortable experience. Your lashes will thank you! 🤎",
  fineAmount: 500,
  doItems: [],
  dontItems: [],
}

export default async function BeforeYourAppointmentPage() {
  const guidelines = await readDataFile<PreAppointmentGuidelines>(
    'pre-appointment-guidelines.json',
    DEFAULT_GUIDELINES
  )
  return (
    <div className="min-h-screen bg-baby-pink-light py-14 px-4 relative overflow-hidden">
      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="cartoon-sticker top-20 left-10 animate-float-sticker opacity-40 hidden md:block" style={{ animationDelay: '0s' }}>
          <div className="sticker-lash"></div>
        </div>
        <div className="cartoon-sticker top-32 right-16 animate-float-sticker opacity-30 hidden lg:block" style={{ animationDelay: '1.5s' }}>
          <div className="sticker-star"></div>
        </div>
        <div className="cartoon-sticker bottom-40 left-20 animate-float-sticker opacity-35 hidden md:block" style={{ animationDelay: '2.5s' }}>
          <div className="sticker-heart"></div>
        </div>
        <div className="cartoon-sticker top-1/2 right-12 animate-float-sticker opacity-30 hidden xl:block" style={{ animationDelay: '1s' }}>
          <div className="sticker-sparkle animate-rotate-slow"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="space-y-3 relative">
          <p className="text-sm uppercase tracking-[0.3em] text-brown">LashDiary</p>
          <h1 className="text-4xl sm:text-5xl font-display text-brown-dark relative inline-block">
            Before Your Appointment
            <span className="absolute -top-2 -right-6 text-2xl opacity-50 hidden lg:inline-block">✨</span>
          </h1>
          <p className="text-brown text-lg leading-relaxed">
            {guidelines.introText || "Follow these guidelines to ensure the best results and a smooth, comfortable experience. Your lashes will thank you! 🤎"}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-soft border border-brown-light/30 p-6 sm:p-10 space-y-8 relative overflow-hidden">
          <div className="cartoon-sticker top-4 right-4 opacity-20 hidden sm:block">
            <div className="sticker-sparkle"></div>
          </div>

          {/* DO THIS Section */}
          <section className="space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display text-brown-dark">DO THIS BEFORE YOUR LASH APPOINTMENT</h2>
            </div>
            <ul className="space-y-3 text-brown text-base leading-relaxed list-none pl-0">
              {guidelines.doItems.length > 0 ? (
                guidelines.doItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold mt-1 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 italic">No guidelines available.</li>
              )}
            </ul>
          </section>

          <div className="border-t border-brown-light/30 my-8"></div>

          {/* DON'T DO THIS Section */}
          <section className="space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">❌</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display text-brown-dark">DON'T DO THIS BEFORE YOUR LASH APPOINTMENT</h2>
            </div>
            <ul className="space-y-3 text-brown text-base leading-relaxed list-none pl-0">
              {guidelines.dontItems.length > 0 ? (
                guidelines.dontItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-rose-600 font-bold mt-1 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 italic">No guidelines available.</li>
              )}
            </ul>
          </section>
        </div>

        <div className="bg-white/70 border border-brown-light/40 rounded-3xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative overflow-hidden hover-lift">
          <div className="cartoon-sticker top-2 left-2 opacity-25 hidden sm:block">
            <div className="sticker-heart animate-float-sticker"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brown-dark">Ready to book? 📅</h3>
            <p className="text-brown text-sm">
              Follow these guidelines and you'll be all set for an amazing lash experience.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/booking" 
              className="px-6 py-3 rounded-full bg-brown-dark text-white hover:bg-brown transition-colors relative group font-semibold text-base whitespace-nowrap"
            >
              <span className="relative z-10">Book Your Appointment</span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">💌</span>
            </Link>
          </div>
        </div>

        <div className="text-sm text-brown text-center space-y-2">
          <p>
            Have questions? Check out our{' '}
            <Link href="/policies" className="text-brown-dark font-semibold hover:underline">
              booking policies
            </Link>
            {' '}or{' '}
            <Link href="/contact" className="text-brown-dark font-semibold hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

