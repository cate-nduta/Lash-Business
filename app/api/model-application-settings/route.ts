import { NextResponse } from 'next/server'
import {
  hasAppointmentConflict,
  loadBookingBusyIntervals,
  loadModelApplicationSettings,
  loadModelApplicationBusyIntervals,
  loadReservedModelAvailabilityOptions,
  MODEL_APPOINTMENT_DURATION_MINUTES,
  parseModelAvailabilitySlot,
} from '@/lib/model-application-settings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const [settings, bookingBusyIntervals, modelBusyIntervals, reservedAvailabilityOptions] = await Promise.all([
      loadModelApplicationSettings(),
      loadBookingBusyIntervals(),
      loadModelApplicationBusyIntervals(),
      loadReservedModelAvailabilityOptions(),
    ])
    const busyIntervals = [...bookingBusyIntervals, ...modelBusyIntervals]
    const now = new Date()

    return NextResponse.json({
      ...settings,
      questions: settings.questions.map((question) => {
        if (question.id !== 'availability') return question

        return {
          ...question,
          options: question.options.filter((option) => {
            const slotStart = parseModelAvailabilitySlot(option)
            if (!slotStart || slotStart <= now) return false
            return !hasAppointmentConflict(slotStart, MODEL_APPOINTMENT_DURATION_MINUTES, busyIntervals)
          }),
        }
      }),
      reservedAvailabilityOptions,
    })
  } catch (error) {
    console.error('Error loading model application settings:', error)
    return NextResponse.json({ error: 'Failed to load model application settings' }, { status: 500 })
  }
}
