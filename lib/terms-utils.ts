import { readDataFile, writeDataFile } from '@/lib/data-utils'

export type TermsSection = {
  id: string
  title: string
  body: string
}

export type TermsDocument = {
  version: number
  updatedAt: string | null
  sections: TermsSection[]
}

const DEFAULT_TERMS: TermsDocument = {
  version: 1,
  updatedAt: null,
  sections: [
    {
      id: 'bookings',
      title: 'Bookings',
      body:
        'Appointments are confirmed once your booking request has been reviewed and accepted. Please arrive 10 minutes before your scheduled time so we can start promptly and provide the full Lash Diary experience.',
    },
    {
      id: 'deposits',
      title: 'Deposits',
      body:
        'A non-refundable deposit is required to secure every appointment. The deposit is applied toward your final balance at checkout and cannot be transferred to another person unless a formal transfer request has been approved by Lash Diary.',
    },
    {
      id: 'cancellations',
      title: 'Cancellations & Rescheduling',
      body:
        'We kindly require a minimum of 72 hours notice to cancel or reschedule. Late cancellations or no-shows will result in the forfeiture of your deposit and may require full pre-payment for future bookings.',
    },
    {
      id: 'loyalty',
      title: 'Loyalty Discounts',
      body:
        'Returning clients may qualify for loyalty discounts based on their visit history. Eligibility, discount tiers, and the timing between appointments are subject to change without notice. Discounts cannot be combined unless explicitly stated.',
    },
    {
      id: 'referrals',
      title: 'Referral Rewards',
      body:
        'Share your Lash Diary experience! When a new guest books and keeps an appointment using your referral details, both guests receive the current referral reward. Referral rewards may change at any time and have no cash value.',
    },
    {
      id: 'children',
      title: 'Studio Etiquette',
      body:
        'For safety and to maintain a tranquil environment, children or additional guests are not permitted during appointments. Please arrange childcare prior to your visit.',
    },
  ],
}

function normalizeSections(sections: TermsSection[] | undefined | null): TermsSection[] {
  if (!Array.isArray(sections) || sections.length === 0) {
    return DEFAULT_TERMS.sections
  }

  return sections
    .map((section, index) => {
      const title = typeof section?.title === 'string' ? section.title.trim() : ''
      const body = typeof section?.body === 'string' ? section.body.trim() : ''
      if (!title || !body) {
        return null
      }
      const id =
        typeof section?.id === 'string' && section.id.trim().length > 0
          ? section.id.trim()
          : `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`

      return {
        id,
        title,
        body,
      }
    })
    .filter((section): section is TermsSection => Boolean(section))
}

export async function loadTerms(): Promise<TermsDocument> {
  const stored = await readDataFile<TermsDocument>('terms.json', DEFAULT_TERMS)
  const sections = normalizeSections(stored?.sections)

  return {
    version: typeof stored?.version === 'number' ? stored.version : DEFAULT_TERMS.version,
    updatedAt: stored?.updatedAt ?? null,
    sections,
  }
}

export async function saveTerms(input: TermsDocument): Promise<TermsDocument> {
  const sections = normalizeSections(input.sections)
  const version = typeof input.version === 'number' ? input.version : 1
  const payload: TermsDocument = {
    version,
    updatedAt: new Date().toISOString(),
    sections,
  }

  await writeDataFile('terms.json', payload)
  return payload
}


