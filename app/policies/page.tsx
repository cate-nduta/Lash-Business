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
    <div className="min-h-screen bg-baby-pink-light py-14 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-brown">LashDiary</p>
          <h1 className="text-4xl sm:text-5xl font-display text-brown-dark">Our Policies</h1>
          <p className="text-brown text-lg leading-relaxed">
            These guidelines keep appointments running smoothly and ensure every client—and partner—enjoys the signature
            LashDiary experience. Reach out if you have any questions or need clarification.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-soft border border-brown-light/30 p-6 sm:p-10 space-y-8">
          {sections.map((section) => (
            <section key={section.id || section.title} className="space-y-3">
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

        <div className="bg-white/70 border border-brown-light/40 rounded-3xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-brown-dark">Need personal assistance?</h3>
            <p className="text-brown text-sm">
              Email us and we’ll be happy to walk you through bookings or special requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a className="px-4 py-2 rounded-full border border-brown-light text-brown-dark" href="mailto:hello@lashdiary.co.ke">
              hello@lashdiary.co.ke
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

