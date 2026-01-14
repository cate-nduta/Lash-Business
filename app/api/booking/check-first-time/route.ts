export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

// Calendar check removed to prevent timeout errors

interface UnsubscribeRecord {
  email: string
  name?: string
  reason?: string
  token: string
  unsubscribedAt: string
  originallyUnsubscribedAt?: string // Track when they first unsubscribed (permanent)
}

// Calendar API calls removed to prevent timeout errors

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // CRITICAL: Check if email has ever unsubscribed
    // If they've unsubscribed before (even if they resubscribed), they are NOT eligible for first-time discounts
    try {
      const unsubscribeData = await readDataFile<{ unsubscribes: UnsubscribeRecord[] }>(
        'email-unsubscribes.json',
        { unsubscribes: [] }
      )
      
      const hasEverUnsubscribed = unsubscribeData.unsubscribes.some(
        (record) => 
          record.email.toLowerCase() === normalizedEmail &&
          record.originallyUnsubscribedAt // If they've ever unsubscribed, mark them as not first-time
      )

      if (hasEverUnsubscribed) {
        // They've unsubscribed before - NOT eligible for first-time discounts
        return NextResponse.json({ 
          isFirstTime: false,
          email,
          reason: 'Has previously unsubscribed from newsletter'
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        })
      }
    } catch (error) {
      console.warn('Error checking unsubscribe records:', error)
      // Continue with other checks if unsubscribe check fails
    }

    // DISABLED: Calendar check removed to prevent timeouts
    // Always return as first-time client to avoid blocking the booking flow
    // Calendar checks were causing timeout errors and blocking user experience
    // This prevents the "TimeoutError: signal timed out" error
    const isFirstTime = true
    
    // No calendar API calls - removed to prevent timeouts

    return NextResponse.json({ 
      isFirstTime,
      email 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error checking first-time client status:', error)
    // Default to first-time client if there's an error (safer to give discount)
    return NextResponse.json({ 
      isFirstTime: true,
      error: 'Could not verify client status, applying first-time discount'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

