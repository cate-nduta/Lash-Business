import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const availability = await readDataFile('labs-consultation-availability.json', {
      availableDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      timeSlots: {
        weekdays: [],
      },
      blockedDates: [],
    })
    return NextResponse.json(availability)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching labs consultation availability:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const availability = await request.json()
    
    await writeDataFile('labs-consultation-availability.json', availability)
    revalidatePath('/api/labs/consultation/availability')
    revalidatePath('/labs/book-appointment')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving labs consultation availability:', error)
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
  }
}

