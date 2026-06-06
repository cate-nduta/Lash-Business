import { NextRequest, NextResponse } from 'next/server'
import {
  getEnrollmentById,
  getIntakeById,
  getActiveProgram,
  syncIntakeEnrollmentCount,
} from '@/lib/training-data'
import { hasTrainingCourseMaterial } from '@/lib/training-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const enrollment = await getEnrollmentById(id)
    if (!enrollment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (enrollment.paymentStatus === 'completed' || enrollment.paymentStatus === 'manual') {
      await syncIntakeEnrollmentCount(enrollment.intakeId)
    }

    const [intake, program] = await Promise.all([
      getIntakeById(enrollment.intakeId),
      getActiveProgram(),
    ])

    const courseMaterialReady = hasTrainingCourseMaterial(program)

    return NextResponse.json({
      paymentStatus: enrollment.paymentStatus,
      courseMaterialReady,
      courseUrl: enrollment.accessToken && courseMaterialReady ? `/masterclass/course/${enrollment.accessToken}` : null,
      enrollment,
      intake,
      program,
    })
  } catch (error) {
    console.error('Enrollment status error:', error)
    return NextResponse.json({ error: 'Failed to load status' }, { status: 500 })
  }
}
