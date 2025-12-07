import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const availability = await readDataFile('availability.json', {})
    return NextResponse.json(availability)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching availability:', error)
    return NextResponse.json({ availability: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const availability = await request.json()
    
    // Ensure bookingWindow structure is preserved even if current/next are empty
    if (availability.bookingWindow) {
      if (!availability.bookingWindow.current || Object.keys(availability.bookingWindow.current).length === 0) {
        availability.bookingWindow.current = {}
      }
      if (!availability.bookingWindow.next || Object.keys(availability.bookingWindow.next).length === 0) {
        availability.bookingWindow.next = {}
      }
    }
    
    await writeDataFile('availability.json', availability)
    revalidatePath('/api/availability')
    revalidatePath('/api/calendar/available-slots')
    revalidatePath('/booking')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving availability:', error)
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
  }
}

