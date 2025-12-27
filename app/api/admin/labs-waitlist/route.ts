import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { WaitlistSettings, WaitlistEntry, WaitlistData } from '@/app/api/labs/waitlist/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_WAITLIST_SETTINGS: WaitlistSettings = {
  enabled: false,
  openDate: null,
  closeDate: null,
  countdownTargetDate: null,
  discountPercentage: 0,
  discountCodePrefix: 'WAITLIST',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const DEFAULT_WAITLIST_DATA: WaitlistData = {
  entries: [],
  updatedAt: new Date().toISOString(),
}

// GET - Fetch waitlist settings and data
export async function GET(request: NextRequest) {
  try {
    const settings = await readDataFile<WaitlistSettings>(
      'labs-waitlist-settings.json',
      DEFAULT_WAITLIST_SETTINGS
    )
    
    const waitlistData = await readDataFile<WaitlistData>(
      'labs-waitlist.json',
      DEFAULT_WAITLIST_DATA
    )
    
    return NextResponse.json({
      settings,
      entries: waitlistData.entries,
      totalSignups: waitlistData.entries.length,
      updatedAt: waitlistData.updatedAt,
    })
  } catch (error: any) {
    console.error('Error fetching waitlist admin data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist data' },
      { status: 500 }
    )
  }
}

// POST - Update waitlist settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      enabled,
      openDate,
      closeDate,
      countdownTargetDate,
      discountPercentage,
      discountCodePrefix,
    } = body
    
    // Validate discount percentage
    const discount = typeof discountPercentage === 'number' 
      ? Math.max(0, Math.min(100, discountPercentage))
      : 0
    
    // Validate dates
    let validatedOpenDate: string | null = null
    let validatedCloseDate: string | null = null
    
    if (openDate && typeof openDate === 'string' && openDate.trim()) {
      const open = new Date(openDate)
      if (!isNaN(open.getTime())) {
        validatedOpenDate = open.toISOString()
      }
    }
    
    if (closeDate && typeof closeDate === 'string' && closeDate.trim()) {
      const close = new Date(closeDate)
      if (!isNaN(close.getTime())) {
        validatedCloseDate = close.toISOString()
      }
    }
    
    // Validate countdown target date
    let validatedCountdownDate: string | null = null
    if (countdownTargetDate && typeof countdownTargetDate === 'string' && countdownTargetDate.trim()) {
      const countdown = new Date(countdownTargetDate)
      if (!isNaN(countdown.getTime())) {
        validatedCountdownDate = countdown.toISOString()
      }
    }
    
    // Validate that close date is after open date
    if (validatedOpenDate && validatedCloseDate) {
      const open = new Date(validatedOpenDate)
      const close = new Date(validatedCloseDate)
      if (close <= open) {
        return NextResponse.json(
          { error: 'Close date must be after open date' },
          { status: 400 }
        )
      }
    }
    
    // Load existing settings
    const existingSettings = await readDataFile<WaitlistSettings>(
      'labs-waitlist-settings.json',
      DEFAULT_WAITLIST_SETTINGS
    )
    
    // Update settings
    const updatedSettings: WaitlistSettings = {
      ...existingSettings,
      enabled: enabled === true,
      openDate: validatedOpenDate,
      closeDate: validatedCloseDate,
      countdownTargetDate: validatedCountdownDate,
      discountPercentage: discount,
      discountCodePrefix: typeof discountCodePrefix === 'string' && discountCodePrefix.trim()
        ? discountCodePrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
        : 'WAITLIST',
      updatedAt: new Date().toISOString(),
    }
    
    await writeDataFile('labs-waitlist-settings.json', updatedSettings)
    
    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    })
  } catch (error: any) {
    console.error('Error updating waitlist settings:', error)
    return NextResponse.json(
      { error: 'Failed to update waitlist settings' },
      { status: 500 }
    )
  }
}

// DELETE - Delete waitlist entry or clear all entries
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const clearAll = searchParams.get('clearAll') === 'true'
    
    const waitlistData = await readDataFile<WaitlistData>(
      'labs-waitlist.json',
      DEFAULT_WAITLIST_DATA
    )
    
    if (clearAll) {
      // Clear all entries
      waitlistData.entries = []
      waitlistData.updatedAt = new Date().toISOString()
      await writeDataFile('labs-waitlist.json', waitlistData)
      
      return NextResponse.json({
        success: true,
        message: 'All waitlist entries cleared',
      })
    }
    
    if (email) {
      // Remove specific entry
      const initialLength = waitlistData.entries.length
      waitlistData.entries = waitlistData.entries.filter(
        (entry) => entry.email.toLowerCase() !== email.toLowerCase()
      )
      
      if (waitlistData.entries.length < initialLength) {
        waitlistData.updatedAt = new Date().toISOString()
        await writeDataFile('labs-waitlist.json', waitlistData)
        
        return NextResponse.json({
          success: true,
          message: 'Entry removed from waitlist',
        })
      } else {
        return NextResponse.json(
          { error: 'Entry not found' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Email parameter or clearAll flag required' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error deleting waitlist entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete waitlist entry' },
      { status: 500 }
    )
  }
}

