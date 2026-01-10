import { readDataFile, writeDataFile } from '@/lib/data-utils'

export type LabsFAQItem = {
  id: string
  question: string
  answer: string
  category?: string
  order?: number
}

export type LabsFAQData = {
  version: number
  updatedAt: string | null
  questions: LabsFAQItem[]
  categories?: string[] // Optional array of category names in display order
}

const DEFAULT_LABS_FAQ: LabsFAQData = {
  version: 1,
  updatedAt: null,
  categories: ['General', 'Pricing', 'Timeline', 'Services'],
  questions: [
    {
      id: 'labs-what-is-labs',
      question: 'What is LashDiary Labs?',
      answer: 'LashDiary Labs is our custom website building service where we help businesses create professional, functional websites tailored to their specific needs. We offer everything from simple business websites to complex e-commerce platforms.',
      category: 'General',
      order: 1,
    },
    {
      id: 'labs-how-long-does-it-take',
      question: 'How long does it take to build my website?',
      answer: 'The timeline depends on the complexity of your project. Standard websites typically take 10-21 days, while urgent projects can be completed faster. We\'ll discuss your timeline during the consultation call.',
      category: 'Timeline',
      order: 1,
    },
  ],
}

function normalizeLabsFAQ(raw: any): LabsFAQData {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_LABS_FAQ
  }

  const normalized: LabsFAQData = {
    version: typeof raw.version === 'number' ? raw.version : DEFAULT_LABS_FAQ.version,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim().length > 0
        ? raw.updatedAt
        : null,
    categories: Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories.filter((c: any) => typeof c === 'string' && c.trim().length > 0)
      : DEFAULT_LABS_FAQ.categories || [],
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
        : `labs-faq-${Date.now()}-${index}`

    const question =
      typeof item.question === 'string' && item.question.trim().length > 0
        ? item.question.trim()
        : ''

    const answer =
      typeof item.answer === 'string' && item.answer.trim().length > 0
        ? item.answer.trim()
        : ''

    const category =
      typeof item.category === 'string' && item.category.trim().length > 0
        ? item.category.trim()
        : 'General' // Default category

    const order = typeof item.order === 'number' ? item.order : index + 1

    if (question && answer) {
      normalized.questions.push({ id, question, answer, category, order })
      
      // Ensure category is in the categories array
      if (!normalized.categories?.includes(category)) {
        normalized.categories = normalized.categories || []
        normalized.categories.push(category)
      }
    }
  })

  // Sort by category, then by order within each category
  normalized.questions.sort((a, b) => {
    const categoryA = a.category || 'General'
    const categoryB = b.category || 'General'
    
    // First sort by category order (based on categories array)
    const categoryOrderA = normalized.categories?.indexOf(categoryA) ?? 999
    const categoryOrderB = normalized.categories?.indexOf(categoryB) ?? 999
    
    if (categoryOrderA !== categoryOrderB) {
      return categoryOrderA - categoryOrderB
    }
    
    // Then sort by order within category
    return (a.order || 0) - (b.order || 0)
  })

  if (normalized.questions.length === 0) {
    normalized.questions = [...DEFAULT_LABS_FAQ.questions]
    normalized.categories = DEFAULT_LABS_FAQ.categories || []
  }

  return normalized
}

export async function loadLabsFAQ(): Promise<LabsFAQData> {
  const raw = await readDataFile<LabsFAQData>('labs-faq.json', DEFAULT_LABS_FAQ)
  const normalized = normalizeLabsFAQ(raw)
  return normalized
}

export async function saveLabsFAQ(faq: LabsFAQData): Promise<LabsFAQData> {
  // Collect all unique categories from questions
  const allCategories = new Set<string>()
  faq.questions.forEach(q => {
    const cat = q.category || 'General'
    allCategories.add(cat)
  })
  
  // Use provided categories array, or generate from questions, or use default
  const categoriesToSave = faq.categories && faq.categories.length > 0
    ? faq.categories
    : Array.from(allCategories).length > 0
    ? Array.from(allCategories)
    : DEFAULT_LABS_FAQ.categories || []

  // Ensure questions have category and order numbers
  const questionsWithOrder = faq.questions.map((q, index) => ({
    ...q,
    category: q.category || 'General',
    order: q.order ?? index + 1,
  }))

  // Sort by category order, then by order within category
  questionsWithOrder.sort((a, b) => {
    const categoryOrderA = categoriesToSave.indexOf(a.category || 'General')
    const categoryOrderB = categoriesToSave.indexOf(b.category || 'General')
    
    if (categoryOrderA !== categoryOrderB) {
      return categoryOrderA - categoryOrderB
    }
    
    return (a.order || 0) - (b.order || 0)
  })

  const dataToSave: LabsFAQData = {
    ...faq,
    updatedAt: new Date().toISOString(),
    version: typeof faq.version === 'number' ? faq.version : DEFAULT_LABS_FAQ.version,
    categories: categoriesToSave,
    questions: questionsWithOrder,
  }

  await writeDataFile('labs-faq.json', dataToSave)
  return dataToSave
}

