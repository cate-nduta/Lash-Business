import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'

interface SurveyResponse {
  id: string
  token: string
  email: string
  responses: Record<string, any>
  submittedAt: string
  quarter: string
}

// AI-powered insights generation
async function generateAIInsights(responses: SurveyResponse[], questionStats: any, questions: any[]) {
  const insights: string[] = []
  const recommendations: string[] = []
  const trends: string[] = []

  // Analyze response rate
  const totalResponses = responses.length
  if (totalResponses === 0) {
    return {
      insights: ['No responses yet. Consider sending reminders to increase participation.'],
      recommendations: ['Send follow-up emails to clients who haven\'t responded yet.'],
      trends: [],
      sentiment: 'neutral',
      overallScore: null,
    }
  }

  // Analyze ratings
  const ratingQuestions = questions.filter((q) => q.type === 'rating')
  let totalRating = 0
  let ratingCount = 0

  for (const question of ratingQuestions) {
    const stats = questionStats[question.id]
    if (stats?.average) {
      totalRating += stats.average
      ratingCount++
    }
  }

  const overallScore = ratingCount > 0 ? totalRating / ratingCount : null

  if (overallScore !== null) {
    if (overallScore >= 4.5) {
      insights.push('Excellent overall satisfaction! Clients are very happy with your services.')
      trends.push('High satisfaction scores indicate strong client relationships.')
    } else if (overallScore >= 3.5) {
      insights.push('Good overall satisfaction, but there\'s room for improvement.')
      trends.push('Moderate satisfaction suggests some areas need attention.')
    } else {
      insights.push('Satisfaction scores are below average. Immediate action may be needed.')
      trends.push('Lower scores indicate areas requiring urgent attention.')
    }
  }

  // Analyze text responses for common themes
  const textQuestions = questions.filter((q) => q.type === 'textarea' || q.type === 'text')
  const allTextResponses: string[] = []

  for (const response of responses) {
    for (const question of textQuestions) {
      const answer = response.responses[question.id]
      if (answer && typeof answer === 'string' && answer.trim().length > 0) {
        allTextResponses.push(answer.toLowerCase())
      }
    }
  }

  // Simple keyword analysis
  const positiveKeywords = ['great', 'excellent', 'amazing', 'love', 'wonderful', 'perfect', 'happy', 'satisfied']
  const negativeKeywords = ['disappointed', 'poor', 'bad', 'terrible', 'unhappy', 'dissatisfied', 'issue', 'problem']
  const improvementKeywords = ['improve', 'better', 'suggest', 'recommend', 'wish', 'hope']

  let positiveCount = 0
  let negativeCount = 0
  let improvementCount = 0

  for (const text of allTextResponses) {
    for (const keyword of positiveKeywords) {
      if (text.includes(keyword)) positiveCount++
    }
    for (const keyword of negativeKeywords) {
      if (text.includes(keyword)) negativeCount++
    }
    for (const keyword of improvementKeywords) {
      if (text.includes(keyword)) improvementCount++
    }
  }

  if (positiveCount > negativeCount * 2) {
    insights.push('Strong positive sentiment in client feedback. Clients are expressing satisfaction.')
  } else if (negativeCount > positiveCount) {
    insights.push('Negative sentiment detected. Review feedback carefully to identify issues.')
    recommendations.push('Address negative feedback promptly and follow up with affected clients.')
  }

  if (improvementCount > 0) {
    insights.push('Clients are providing constructive feedback and suggestions for improvement.')
    recommendations.push('Review improvement suggestions and prioritize actionable items.')
  }

  // Analyze multiple choice and yes/no questions
  for (const question of questions) {
    if (question.type === 'multiple-choice' || question.type === 'yes-no') {
      const stats = questionStats[question.id]
      if (stats?.distribution) {
        const entries = Object.entries(stats.distribution as Record<string, number>).sort((a, b) => b[1] - a[1])
        if (entries.length > 0) {
          const [topAnswer, count] = entries[0]
          const percentage = (count / stats.total) * 100
          if (percentage > 70) {
            insights.push(
              `${Math.round(percentage)}% of clients selected "${topAnswer}" for "${question.question}". This is a strong trend.`
            )
          }
        }
      }
    }
  }

  // Generate recommendations based on data
  if (overallScore !== null && overallScore < 4.0) {
    recommendations.push('Focus on improving service quality based on lower-rated areas.')
  }

  if (totalResponses < 10) {
    recommendations.push('Low response rate. Consider sending reminder emails or offering incentives.')
  }

  // Determine overall sentiment
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  if (overallScore !== null) {
    if (overallScore >= 4.5) sentiment = 'positive'
    else if (overallScore < 3.0) sentiment = 'negative'
  } else if (positiveCount > negativeCount * 2) {
    sentiment = 'positive'
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative'
  }

  return {
    insights: insights.length > 0 ? insights : ['Analyzing responses...'],
    recommendations: recommendations.length > 0 ? recommendations : ['Continue monitoring client feedback.'],
    trends: trends.length > 0 ? trends : ['Gathering trend data...'],
    sentiment,
    overallScore: overallScore ? Math.round(overallScore * 10) / 10 : null,
    totalResponses,
    responseRate: null, // Will be calculated on frontend
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    let body: { quarter?: string | null } = {}
    try {
      body = await request.json()
    } catch (parseError) {
      // If body is empty or invalid, use defaults
      body = {}
    }
    const { quarter } = body

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

    // Calculate question stats (similar to analytics route)
    const questionStats: Record<string, any> = {}
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
        const ratings = stats.answers.filter((a: any) => typeof a === 'number') as number[]
        if (ratings.length > 0) {
          stats.average = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
        }
      } else if (question.type === 'multiple-choice' || question.type === 'yes-no') {
        const distribution: Record<string, number> = {}
        for (const answer of stats.answers) {
          distribution[answer] = (distribution[answer] || 0) + 1
        }
        stats.distribution = distribution
      }
    }

    // Generate AI insights
    try {
      const aiInsights = await generateAIInsights(responses, questionStats, surveyData.questions)
      return NextResponse.json(aiInsights)
    } catch (insightError: any) {
      console.error('Error in generateAIInsights:', insightError)
      // Return default insights even if generation fails
      return NextResponse.json({
        insights: ['Unable to generate insights at this time. Please try again later.'],
        recommendations: ['Review survey responses manually.'],
        trends: [],
        sentiment: 'neutral',
        overallScore: null,
        totalResponses: responses.length,
        responseRate: null,
      })
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error generating AI insights:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate insights',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

