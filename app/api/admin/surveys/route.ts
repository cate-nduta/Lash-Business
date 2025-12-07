import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

// Force dynamic rendering - always fetch fresh survey data
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SurveyQuestion {
  id: string
  type: 'text' | 'textarea' | 'rating' | 'multiple-choice' | 'yes-no'
  question: string
  required: boolean
  options?: string[] // For multiple-choice
  order: number
}

interface SurveyData {
  questions: SurveyQuestion[]
  settings: {
    enabled: boolean
    quarterlySchedule: boolean
    lastSentQuarter: string | null
    emailSubject: string
    emailMessage: string
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const surveyData = await readDataFile<SurveyData>('surveys.json', {
      questions: [],
      settings: {
        enabled: true,
        quarterlySchedule: true,
        lastSentQuarter: null,
        emailSubject: "We'd Love Your Feedback!",
        emailMessage: "Thank you for being a valued client! We'd love to hear about your experience with us.",
      },
    })

    return NextResponse.json(surveyData)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching surveys:', error)
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const { questions, settings } = body

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Questions array is required' }, { status: 400 })
    }

    // Validate questions
    for (const question of questions) {
      if (!question.id || !question.type || !question.question) {
        return NextResponse.json({ error: 'Invalid question format' }, { status: 400 })
      }
      if (question.type === 'multiple-choice' && (!question.options || question.options.length === 0)) {
        return NextResponse.json({ error: 'Multiple choice questions require options' }, { status: 400 })
      }
    }

    const surveyData: SurveyData = {
      questions: questions.sort((a: SurveyQuestion, b: SurveyQuestion) => a.order - b.order),
      settings: settings || {
        enabled: true,
        quarterlySchedule: true,
        lastSentQuarter: null,
        emailSubject: "We'd Love Your Feedback!",
        emailMessage: "Thank you for being a valued client! We'd love to hear about your experience with us.",
      },
    }

    await writeDataFile('surveys.json', surveyData)

    return NextResponse.json({ success: true, survey: surveyData })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving surveys:', error)
    return NextResponse.json({ error: 'Failed to save surveys' }, { status: 500 })
  }
}

