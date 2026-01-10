import { NextRequest, NextResponse } from 'next/server'
import { getClientUserId } from '@/lib/client-auth'
import { readDataFile } from '@/lib/data-utils'
import type { ClientData } from '@/types/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null
    try {
      userId = await getClientUserId()
    } catch (authError: any) {
      // If auth check fails, treat as not authenticated (401)
      console.warn('[Client Auth Me] Auth check failed, returning 401:', authError?.message)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Load client data
    const clientDataFile = `client-${userId}.json`
    let clientData: ClientData | undefined
    try {
      clientData = await readDataFile<ClientData>(clientDataFile, undefined)
    } catch (readError: any) {
      console.error('[Client Auth Me] Error reading client data:', readError)
      return NextResponse.json(
        { error: 'Failed to load user data' },
        { status: 500 }
      )
    }

    if (!clientData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    // Ensure profile exists
    if (!clientData.profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Calculate recommended refill date (3 weeks from last appointment)
    let recommendedRefillDate: string | undefined
    if (clientData.lastAppointmentDate) {
      const lastAppt = new Date(clientData.lastAppointmentDate)
      const refillDate = new Date(lastAppt)
      refillDate.setDate(refillDate.getDate() + 21) // 3 weeks
      recommendedRefillDate = refillDate.toISOString().split('T')[0]
    }

    // Check if user is new and hasn't booked within 7 days
    // The banner will disappear once they book their first appointment
    const now = new Date()
    const createdAt = new Date(clientData.profile.createdAt)
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const hasBookings = clientData.lashHistory && clientData.lashHistory.length > 0
    // Show warning only if: no bookings AND account is less than 7 days old
    // Once they book, hasBookings becomes true, so show7DayWarning becomes false (banner disappears)
    const show7DayWarning = !hasBookings && daysSinceCreation < 7
    const daysRemaining = show7DayWarning ? 7 - daysSinceCreation : null

    // Calculate retention score statistics
    const lashHistory = clientData.lashHistory || []
    const lashHistoryWithScores = lashHistory.filter(h => h.retentionScore !== undefined)
    const retentionScores = lashHistoryWithScores.map(h => h.retentionScore!).filter(score => score >= 1 && score <= 3)
    const averageRetentionScore = retentionScores.length > 0
      ? retentionScores.reduce((sum, score) => sum + score, 0) / retentionScores.length
      : null
    const excellentCount = retentionScores.filter(s => s === 3).length
    const goodCount = retentionScores.filter(s => s === 2).length
    const poorCount = retentionScores.filter(s => s === 1).length

    // Return user data (without password hash)
    const response = NextResponse.json({
      user: {
        id: clientData.profile.id,
        email: clientData.profile.email,
        name: clientData.profile.name,
        phone: clientData.profile.phone,
        birthday: clientData.profile.birthday,
        createdAt: clientData.profile.createdAt,
      },
      lastAppointmentDate: clientData.lastAppointmentDate,
      recommendedRefillDate,
      preferences: clientData.preferences,
      allergies: clientData.allergies,
      aftercare: clientData.aftercare,
      lashHistory: lashHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      lashHistoryCount: lashHistory.length,
      lashMapsCount: (clientData.lashMaps || []).length,
      show7DayWarning,
      daysRemaining,
      retentionStats: {
        averageScore: averageRetentionScore,
        totalScored: retentionScores.length,
        excellentCount,
        goodCount,
        poorCount,
      },
    })

    // Add cache-control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error: any) {
    console.error('[Client Auth Me] Unexpected error:', error)
    console.error('[Client Auth Me] Error stack:', error?.stack)
    // If it's an auth-related error, return 401 instead of 500
    if (error?.message?.includes('authenticated') || error?.message?.includes('auth')) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to load user data' },
      { status: 500 }
    )
  }
}

