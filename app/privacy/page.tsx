import Link from 'next/link'

export const dynamic = 'force-dynamic'

const lastUpdated = '26 May 2026'

const privacySections = [
  {
    title: 'Information We Collect',
    body: [
      'When you use LashDiary, we may collect your name, email address, phone number, appointment details, selected services, appointment notes, allergy or sensitivity notes, model application answers, Instagram handle if provided, consent responses, and communication preferences.',
      'If you create or use an account, we may also keep client history, preferences, lash map information, and appointment records so we can provide a better service.',
    ],
  },
  {
    title: 'How We Use Your Information',
    body: [
      'We use your information to manage bookings, model applications, confirmations, reminders, payments, client care, customer support, marketing where you have opted in, and business record keeping.',
      'We may contact you by email, phone, or WhatsApp about your booking, model application, payment, appointment preparation, aftercare, or service updates.',
    ],
  },
  {
    title: 'Payments Through Paystack',
    body: [
      'Payments are handled securely by Paystack. LashDiary does not store your full card number, card security code, or mobile money PIN.',
      'We may store payment references, payment status, amount paid, currency, and related booking or model application references so we can confirm payments and support you if there is an issue.',
    ],
  },
  {
    title: 'Who We Share Data With',
    body: [
      'We only share information where needed to operate the website and provide services. This may include payment processors such as Paystack, email providers, website hosting providers, analytics or admin tools, and calendar tools used to manage appointments.',
      'We do not sell your personal information.',
    ],
  },
  {
    title: 'Photos, Lash Maps, and Model Content',
    body: [
      'If you provide photos, lash map information, or participate as a model, we use that information for client care, appointment records, portfolio work, training, and marketing only where the relevant consent has been given.',
      'If you want a photo, lash map, or model content removed from public use, contact us and we will review the request.',
    ],
  },
  {
    title: 'Marketing Messages',
    body: [
      'If you subscribe to updates, apply as a model, use a promo, or otherwise opt in, we may send marketing or promotional messages.',
      'You can unsubscribe or ask us to remove you from marketing messages at any time.',
    ],
  },
  {
    title: 'How Long We Keep Information',
    body: [
      'We keep information for as long as reasonably needed to provide services, manage bookings and payments, keep business records, resolve disputes, and comply with legal or accounting obligations.',
      'Some records, such as payment references and appointment history, may be kept for business, tax, fraud prevention, or support reasons.',
    ],
  },
  {
    title: 'Your Choices and Rights',
    body: [
      'You can ask us to access, correct, update, or delete personal information we hold about you, subject to legitimate business, legal, accounting, safety, or dispute-resolution needs.',
      'To make a request, email hello@lashdiary.co.ke with enough details for us to identify your record.',
    ],
  },
  {
    title: 'Security',
    body: [
      'We use reasonable safeguards to protect personal information and restrict admin access to business use. No online system is completely risk-free, but we work to keep client and applicant information protected.',
    ],
  },
  {
    title: 'Updates to This Policy',
    body: [
      'We may update this Privacy Policy as the website, services, payment options, or legal requirements change. The latest version will be posted on this page.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-baby-pink-light py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-brown">LashDiary Nairobi</p>
          <h1 className="text-4xl md:text-5xl font-display text-brown-dark">Privacy Policy</h1>
          <p className="text-base md:text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            This policy explains how LashDiary collects, uses, stores, and protects information from clients,
            model applicants, subscribers, and website visitors.
          </p>
          <p className="text-xs text-gray-500">Last updated {lastUpdated}</p>
        </header>

        <div className="bg-white border-2 border-brown-light rounded-2xl shadow-soft p-6 md:p-8">
          <p className="text-gray-700 leading-relaxed">
            By using this website, booking an appointment, applying as a model, making a payment, or contacting
            LashDiary, you agree to this Privacy Policy. Please also review our{' '}
            <Link href="/policies" className="text-brown-dark font-semibold underline hover:text-brown">
              Booking Policies
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-brown-dark font-semibold underline hover:text-brown">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>

        <div className="space-y-8">
          {privacySections.map((section) => (
            <section
              key={section.title}
              className="bg-white border-2 border-brown-light rounded-2xl shadow-soft p-6 md:p-8 space-y-4"
            >
              <h2 className="text-2xl font-display text-brown-dark">{section.title}</h2>
              <div className="space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="bg-white/70 border border-brown-light/40 rounded-3xl px-6 py-5 text-center">
          <h2 className="text-lg font-semibold text-brown-dark">Privacy questions or data requests?</h2>
          <p className="mt-2 text-sm text-brown">
            Email{' '}
            <a href="mailto:hello@lashdiary.co.ke" className="font-semibold underline hover:text-brown-dark">
              hello@lashdiary.co.ke
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
