import Link from 'next/link'
import { loadPolicies, applyPolicyVariables } from '@/lib/policies-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function PoliciesPage() {
  const policies = await loadPolicies()
  const { variables, sections, updatedAt } = policies
  const formattedUpdatedAt =
    typeof updatedAt === 'string' && updatedAt
      ? new Date(updatedAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null

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
            Our Policies
            <span className="absolute -top-2 -right-6 text-2xl opacity-50 hidden lg:inline-block">📋</span>
          </h1>
          <p className="text-brown text-lg leading-relaxed">
            These guidelines keep appointments running smoothly and ensure every client—and partner—enjoys the signature
            LashDiary experience. Reach out if you have any questions or need clarification.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-soft border border-brown-light/30 p-6 sm:p-10 space-y-8 relative overflow-hidden">
          <div className="cartoon-sticker top-4 right-4 opacity-20 hidden sm:block">
            <div className="sticker-sparkle"></div>
          </div>
          {sections.map((section, index) => (
            <section key={section.id || section.title} className="space-y-3 relative">
              <div className="cartoon-sticker top-0 right-0 opacity-0 hover:opacity-30 transition-opacity duration-300 hidden md:block">
                <div className="sticker-heart animate-float-sticker" style={{ animationDelay: `${index * 0.3}s` }}></div>
              </div>
              <div>
                <h2 className="text-2xl font-display text-brown-dark">{section.title}</h2>
                {section.description && section.description.trim().length > 0 && (
                  <p className="text-brown/80 leading-relaxed">{applyPolicyVariables(section.description, variables)}</p>
                )}
              </div>
              <ul className="space-y-2 text-brown text-base leading-relaxed list-disc list-inside">
                {section.items.map((item, idx) => (
                  <li key={idx} className="pl-1">
                    {applyPolicyVariables(item, variables)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="bg-white/70 border border-brown-light/40 rounded-3xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative overflow-hidden hover-lift">
          <div className="cartoon-sticker top-2 left-2 opacity-25 hidden sm:block">
            <div className="sticker-heart animate-float-sticker"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brown-dark">Need personal assistance? 💬</h3>
            <p className="text-brown text-sm">
              Email us and we'll be happy to walk you through bookings or special requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a className="px-4 py-2 rounded-full border border-brown-light text-brown-dark hover:bg-brown-dark hover:text-white transition-colors relative group" href="mailto:hello@lashdiary.co.ke">
              <span className="relative z-10">hello@lashdiary.co.ke</span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">💌</span>
            </a>
          </div>
        </div>

        <div className="text-sm text-brown text-center">
          Looking for appointment availability?{' '}
          <Link href="/booking" className="text-brown-dark font-semibold hover:underline">
            Head to the booking page.
          </Link>
          {formattedUpdatedAt && (
            <span className="block mt-2 text-xs text-brown/70">
              Last updated {formattedUpdatedAt}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

