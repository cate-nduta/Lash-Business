import { readDataFile, writeDataFile } from '@/lib/data-utils'

export type FAQItem = {
  id: string
  question: string
  answer: string
}

export type FAQData = {
  version: number
  updatedAt: string | null
  questions: FAQItem[]
}

const DEFAULT_FAQ: FAQData = {
  version: 1,
  updatedAt: null,
  questions: [
    {
      id: 'how-long-do-lashes-last',
      question: 'How long do lash extensions last?',
      answer: 'With proper care, lash extensions typically last 2-4 weeks. Regular fills every 2-3 weeks help maintain fullness and keep your lashes looking perfect.',
    },
    {
      id: 'what-is-the-difference-between-classic-and-volume',
      question: "What's the difference between Classic and Volume lashes?",
      answer: 'Classic lashes involve one extension applied to each natural lash for a natural, everyday look. Volume lashes use multiple ultra-fine extensions to create a fuller, more dramatic appearance.',
    },
  ],
}

function normalizeFAQ(raw: any): FAQData {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_FAQ
  }

  const normalized: FAQData = {
    version: typeof raw.version === 'number' ? raw.version : DEFAULT_FAQ.version,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim().length > 0
        ? raw.updatedAt
        : null,
    questions: [],
  }

  const rawQuestions: any[] = Array.isArray(raw.questions) ? raw.questions : []

  rawQuestions.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      return
    }

    const id =
      typeof item.id === 'string' && item.id.trim().length > 0
        ? item.id.trim()
        : `faq-${index + 1}`

    const question =
      typeof item.question === 'string' && item.question.trim().length > 0
        ? item.question.trim()
        : ''

    const answer =
      typeof item.answer === 'string' && item.answer.trim().length > 0
        ? item.answer.trim()
        : ''

    if (question && answer) {
      normalized.questions.push({ id, question, answer })
    }
  })

  if (normalized.questions.length === 0) {
    normalized.questions = [...DEFAULT_FAQ.questions]
  }

  return normalized
}

export async function loadFAQ(): Promise<FAQData> {
  const raw = await readDataFile<FAQData>('faq.json', DEFAULT_FAQ)
  const normalized = normalizeFAQ(raw)
  return normalized
}

export async function saveFAQ(faq: FAQData): Promise<FAQData> {
  const dataToSave: FAQData = {
    ...faq,
    updatedAt: new Date().toISOString(),
    version: typeof faq.version === 'number' ? faq.version : DEFAULT_FAQ.version,
    questions: [...faq.questions],
  }

  await writeDataFile('faq.json', dataToSave)
  return dataToSave
}

