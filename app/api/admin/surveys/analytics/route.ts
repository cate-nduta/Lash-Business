import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

interface SurveyResponse {
  id: string
  token: string
  email: string
  responses: Record<string, any>
  submittedAt: string
  quarter: string
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const { searchParams } = new URL(request.url)
    const quarter = searchParams.get('quarter')

    // Get all responses
    const allResponses = await readDataFile<{ responses: SurveyResponse[] }>('survey-responses.json', {
      responses: [],
    })

    // Get survey questions
    const surveyData = await readDataFile<{
      questions: any[]
    }>('surveys.json', {
      questions: [],
    })

    // Filter by quarter if specified
    let responses = allResponses.responses
    if (quarter) {
      responses = responses.filter((r) => r.quarter === quarter)
    }

    // Calculate statistics
    const totalResponses = responses.length
    const responseRate = totalResponses // Will be calculated based on sent surveys

    // Group responses by question
    const questionStats: Record<
      string,
      {
        question: string
        type: string
        total: number
        answers: any[]
        average?: number
        distribution?: Record<string, number>
      }
    > = {}

    for (const question of surveyData.questions) {
      questionStats[question.id] = {
        question: question.question,
        type: question.type,
        total: 0,
        answers: [],
      }
    }

    for (const response of responses) {
      for (const [questionId, answer] of Object.entries(response.responses)) {
        if (questionStats[questionId]) {
          questionStats[questionId].answers.push(answer)
          questionStats[questionId].total++
        }
      }
    }

    // Calculate statistics for each question
    for (const [questionId, stats] of Object.entries(questionStats)) {
      const question = surveyData.questions.find((q) => q.id === questionId)
      if (!question) continue

      if (question.type === 'rating') {
        const ratings = stats.answers.filter((a) => typeof a === 'number')
        if (ratings.length > 0) {
          stats.average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        }
      } else if (question.type === 'multiple-choice' || question.type === 'yes-no') {
        const distribution: Record<string, number> = {}
        for (const answer of stats.answers) {
          distribution[answer] = (distribution[answer] || 0) + 1
        }
        stats.distribution = distribution
      }
    }

    // Get unique quarters
    const quarters = Array.from(new Set(allResponses.responses.map((r) => r.quarter))).sort()

    return NextResponse.json({
      totalResponses,
      responseRate,
      questionStats,
      quarters,
      responses: responses.map((r) => ({
        id: r.id,
        email: r.email,
        quarter: r.quarter,
        submittedAt: r.submittedAt,
        responses: r.responses,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

