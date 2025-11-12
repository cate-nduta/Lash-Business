import { loadTerms } from '@/lib/terms-utils'

export const dynamic = 'force-dynamic'

function formatDate(dateString: string | null) {
  if (!dateString) {
    return null
  }
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function TermsPage() {
  const terms = await loadTerms()
  const formattedDate = formatDate(terms.updatedAt)

  return (
    <div className="min-h-screen bg-baby-pink-light py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-brown">
            Lash Diary Nairobi
          </p>
          <h1 className="text-4xl md:text-5xl font-display text-brown-dark">
            Terms &amp; Conditions
          </h1>
          <p className="text-base md:text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            These Terms &amp; Conditions outline the policies that keep every Lash Diary appointment
            timely, safe, and indulgent. Please review them carefully before booking or paying a
            deposit.
          </p>
          {formattedDate && (
            <p className="text-xs text-gray-500">Last updated {formattedDate}</p>
          )}
        </header>

        <div className="space-y-8">
          {terms.sections.map((section) => (
            <section
              key={section.id}
              className="bg-white border-2 border-brown-light rounded-2xl shadow-soft p-6 md:p-8 space-y-4"
            >
              <h2 className="text-2xl font-display text-brown-dark">{section.title}</h2>
              <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}


