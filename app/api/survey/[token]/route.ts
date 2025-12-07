import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

// Force dynamic rendering - always fetch fresh survey data
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SurveyResponse {
  id: string
  token: string
  email: string
  responses: Record<string, any>
  submittedAt: string
  quarter: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const { token } = resolvedParams
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Get survey questions - ALWAYS fetch fresh (no caching)
    const surveyData = await readDataFile<{
      questions: any[]
      settings: any
    }>('surveys.json', {
      questions: [],
      settings: {},
    })

    // Log to verify we're getting the latest questions
    console.log(`[Survey ${token.substring(0, 20)}...] Loading survey with ${surveyData.questions.length} questions`)
    
    if (surveyData.questions.length === 0) {
      console.warn('WARNING: No questions found in survey!')
    }

    // Verify token
    const tokens = await readDataFile<Record<string, { token: string; email: string; sentAt: string; quarter: string }>>(
      'survey-tokens.json',
      {}
    )

    // Tokens are stored as { email: { token, email, ... } }
    // So we need to iterate through entries to find the matching token
    let tokenEntry: { token: string; email: string; sentAt: string; quarter: string } | null = null
    
    for (const [email, entry] of Object.entries(tokens)) {
      if (typeof entry === 'object' && entry !== null && 'token' in entry) {
        if (entry.token === token) {
          tokenEntry = { ...entry, email: entry.email || email }
          break
        }
      }
    }

    if (!tokenEntry) {
      console.error('Token not found:', token.substring(0, 20) + '...')
      console.error('Total tokens in file:', Object.keys(tokens).length)
      if (Object.keys(tokens).length > 0) {
        console.error('Sample token entry structure:', JSON.stringify(Object.entries(tokens)[0], null, 2))
        console.error('Looking for token in entries...')
        // Debug: log all tokens
        for (const [email, entry] of Object.entries(tokens)) {
          if (typeof entry === 'object' && entry !== null && 'token' in entry) {
            console.error(`Entry for ${email}: token starts with ${entry.token?.substring(0, 20)}...`)
          }
        }
      } else {
        console.error('WARNING: survey-tokens.json is empty! Tokens may not have been saved.')
      }
      return NextResponse.json({ error: 'Invalid survey token. Please use the link from your email.' }, { status: 404 })
    }

    // Check if already submitted
    const responses = await readDataFile<{ responses: SurveyResponse[] }>('survey-responses.json', { responses: [] })
    const existingResponse = responses.responses.find((r) => r.token === token)

    return NextResponse.json({
      questions: surveyData.questions.sort((a, b) => a.order - b.order),
      email: tokenEntry.email,
      alreadySubmitted: !!existingResponse,
      existingResponse: existingResponse || null,
    })
  } catch (error) {
    console.error('Error fetching survey:', error)
    return NextResponse.json({ error: 'Failed to fetch survey' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const { token } = resolvedParams
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }
    const body = await request.json()
    const { responses: responseData } = body

    // Verify token
    const tokens = await readDataFile<Record<string, { token: string; email: string; sentAt: string; quarter: string }>>(
      'survey-tokens.json',
      {}
    )

    // Handle both object structure formats
    let tokenEntry: { token: string; email: string; sentAt: string; quarter: string } | null = null
    
    tokenEntry = Object.values(tokens).find((t) => {
      if (typeof t === 'object' && t !== null && 'token' in t) {
        return t.token === token
      }
      return false
    }) as { token: string; email: string; sentAt: string; quarter: string } | undefined || null

    if (!tokenEntry) {
      for (const [email, entry] of Object.entries(tokens)) {
        if (typeof entry === 'object' && entry !== null && 'token' in entry && entry.token === token) {
          tokenEntry = { ...entry, email }
          break
        }
      }
    }

    if (!tokenEntry) {
      console.error('Token not found in POST:', token)
      return NextResponse.json({ error: 'Invalid survey token' }, { status: 404 })
    }

    // Check if already submitted
    const allResponses = await readDataFile<{ responses: SurveyResponse[] }>('survey-responses.json', { responses: [] })
    const existingResponse = allResponses.responses.find((r) => r.token === token)
    if (existingResponse) {
      return NextResponse.json({ error: 'Survey already submitted' }, { status: 400 })
    }

    // Get survey questions to validate
    const surveyData = await readDataFile<{
      questions: any[]
    }>('surveys.json', {
      questions: [],
    })

    // Validate required questions
    for (const question of surveyData.questions) {
      if (question.required && (!responseData[question.id] || responseData[question.id] === '')) {
        return NextResponse.json(
          { error: `Question "${question.question}" is required` },
          { status: 400 }
        )
      }
    }

    // Save response
    const newResponse: SurveyResponse = {
      id: `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      token,
      email: tokenEntry.email,
      responses: responseData,
      submittedAt: new Date().toISOString(),
      quarter: tokenEntry.quarter,
    }

    allResponses.responses.push(newResponse)
    await writeDataFile('survey-responses.json', allResponses)

    return NextResponse.json({ success: true, response: newResponse })
  } catch (error) {
    console.error('Error submitting survey:', error)
    return NextResponse.json({ error: 'Failed to submit survey' }, { status: 500 })
  }
}

