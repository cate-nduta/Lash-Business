import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminAuth()
    const courseInfo = await readDataFile('course-info.json', {
      title: 'How to Build a Client-Booking Website',
      subtitle: 'That Accepts Payments (Without a Developer)',
      description: 'A complete step-by-step text-based course that teaches you how to build a professional booking website from scratch. No coding experience required!',
      overview: {
        modules: 10,
        hours: '25-35',
        format: '100% Text-Based (No Videos)',
      },
      introText: '',
      perfectFor: '',
      cta: {
        title: '',
        subtitle: '',
        buttonText: '',
        buttonSubtext: '',
      },
      features: [],
    })

    return NextResponse.json(courseInfo, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading course info:', error)
    return NextResponse.json({ error: 'Failed to load course info' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const courseInfo = await request.json()

    await writeDataFile('course-info.json', courseInfo)

    await recordActivity({
      module: 'courses',
      action: 'update',
      performedBy,
      summary: 'Updated course information',
      targetId: 'course-info',
      targetType: 'course-info',
      details: courseInfo,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving course info:', error)
    return NextResponse.json({ error: 'Failed to save course info' }, { status: 500 })
  }
}

