import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { ConsultationSubmission } from '@/app/api/labs/consultation/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Time window for joining: 15 minutes before to 1 hour after scheduled time
const JOIN_WINDOW_BEFORE_MINUTES = 15
const JOIN_WINDOW_AFTER_MINUTES = 60

function getTimeForConsultation(timeStr: string): { startHour: number; startMinute: number; endHour: number; endMinute: number } {
  const timeMap: Record<string, { startHour: number; startMinute: number; endHour: number; endMinute: number }> = {
    morning: { startHour: 9, startMinute: 0, endHour: 12, endMinute: 0 },
    afternoon: { startHour: 12, startMinute: 0, endHour: 16, endMinute: 0 },
    evening: { startHour: 16, startMinute: 0, endHour: 19, endMinute: 0 },
  }
  return timeMap[timeStr] || { startHour: 10, startMinute: 0, endHour: 11, endMinute: 0 }
}

function formatTimeRemaining(targetDate: Date): string {
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()
  
  if (diff <= 0) {
    return 'Your meeting time has passed. Please contact us to reschedule.'
  }
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `Your meeting is in ${days} day${days > 1 ? 's' : ''} and ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `Your meeting is in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`
  } else {
    return `Your meeting is in ${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatTime(timeStr: string): string {
  const timeMap: Record<string, string> = {
    morning: '9:00 AM - 12:00 PM',
    afternoon: '12:00 PM - 4:00 PM',
    evening: '4:00 PM - 7:00 PM',
  }
  return timeMap[timeStr] || timeStr
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultationId')

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Consultation ID is required' },
        { status: 400 }
      )
    }

    // Load consultations
    const consultationsData = await readDataFile<{ consultations: ConsultationSubmission[] }>(
      'labs-consultations.json',
      { consultations: [] }
    )

    // Find the consultation
    const consultation = consultationsData.consultations.find(
      (c) => c.consultationId === consultationId || c.submittedAt === consultationId
    )

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }

    // Only check time for online meetings
    if (consultation.meetingType !== 'online') {
      return NextResponse.json(
        { error: 'This is not an online meeting' },
        { status: 400 }
      )
    }

    // Check if meeting link exists
    if (!consultation.meetLink) {
      return NextResponse.json(
        { 
          error: 'Meeting link not available',
          consultation: {
            consultationId: consultation.consultationId,
            businessName: consultation.businessName,
            contactName: consultation.contactName,
            preferredDate: consultation.preferredDate,
            preferredTime: consultation.preferredTime,
            meetingType: consultation.meetingType,
          },
          canJoin: false,
          message: 'Meeting link is being set up. Please contact us if you need assistance.',
        },
        { status: 200 }
      )
    }

    // Parse the scheduled date and time
    const scheduledDate = new Date(consultation.preferredDate)
    const timeSlot = getTimeForConsultation(consultation.preferredTime)
    
    // Set the start time of the meeting
    const meetingStart = new Date(scheduledDate)
    meetingStart.setHours(timeSlot.startHour, timeSlot.startMinute, 0, 0)
    
    // Set the end time of the meeting
    const meetingEnd = new Date(scheduledDate)
    meetingEnd.setHours(timeSlot.endHour, timeSlot.endMinute, 0, 0)

    // Calculate join window
    const joinWindowStart = new Date(meetingStart)
    joinWindowStart.setMinutes(joinWindowStart.getMinutes() - JOIN_WINDOW_BEFORE_MINUTES)
    
    const joinWindowEnd = new Date(meetingEnd)
    joinWindowEnd.setMinutes(joinWindowEnd.getMinutes() + JOIN_WINDOW_AFTER_MINUTES)

    // Check current time - use server time directly (should be in Nairobi timezone)
    // For accurate timezone handling, we'll compare dates in the same timezone
    const now = new Date()
    
    // Create dates in local timezone (assuming server is set to Nairobi/EAT timezone)
    // If server is in UTC, we need to adjust. For now, assume server timezone matches consultation timezone

    let canJoin = false
    let message = ''
    let timeRemaining = ''
    let meetingHasPassed = false

    // First check if the meeting end time has passed (this is the key check)
    if (now > meetingEnd) {
      // Meeting has already ended
      meetingHasPassed = true
      canJoin = false
      message = `This meeting has already passed. Your scheduled time slot was ${formatDate(consultation.preferredDate)} from ${formatTime(consultation.preferredTime)}. Please contact us if you need to reschedule.`
    } else if (now < joinWindowStart) {
      // Too early
      canJoin = false
      message = `Your meeting is scheduled for ${formatDate(consultation.preferredDate)} at ${formatTime(consultation.preferredTime)}. Please join during your scheduled time.`
      timeRemaining = formatTimeRemaining(joinWindowStart)
    } else if (now > joinWindowEnd) {
      // Too late (past extended window, but this shouldn't happen if meetingEnd check is first)
      canJoin = false
      message = `Your meeting time slot has ended. The meeting window was ${formatDate(consultation.preferredDate)} at ${formatTime(consultation.preferredTime)}. Please contact us if you need to reschedule.`
      meetingHasPassed = true
    } else {
      // Within join window
      canJoin = true
      message = 'You can now join your meeting!'
    }

    return NextResponse.json({
      consultation: {
        consultationId: consultation.consultationId,
        businessName: consultation.businessName,
        contactName: consultation.contactName,
        preferredDate: consultation.preferredDate,
        preferredTime: consultation.preferredTime,
        meetingType: consultation.meetingType,
        meetLink: consultation.meetLink,
      },
      canJoin,
      message,
      timeRemaining,
      meetingHasPassed,
      scheduledTime: `${formatDate(consultation.preferredDate)} at ${formatTime(consultation.preferredTime)}`,
      meetingEndTime: meetingEnd.toISOString(),
    })
  } catch (error: any) {
    console.error('Error checking meeting access:', error)
    return NextResponse.json(
      { error: 'Failed to verify meeting access' },
      { status: 500 }
    )
  }
}

