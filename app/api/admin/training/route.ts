import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import {
  readTrainingPrograms,
  writeTrainingPrograms,
} from '@/lib/training-data'
import { getDefaultProgram } from '@/lib/training-utils'
import type { TrainingProgram, TrainingProgramsData } from '@/types/training'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const cleanList = (items?: string[]) =>
  Array.isArray(items)
    ? items.map((item) => String(item).trim()).filter(Boolean)
    : []

export async function GET() {
  try {
    await requireAdminAuth()
    let data = await readTrainingPrograms()
    if (!data.programs.length) {
      data = { programs: [getDefaultProgram()] }
      await writeTrainingPrograms(data)
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading training programs:', error)
    return NextResponse.json({ error: 'Failed to load programs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const payload = await request.json()
    const programs = Array.isArray(payload.programs)
      ? (payload.programs as TrainingProgram[])
      : []

    if (!programs.length) {
      return NextResponse.json({ error: 'At least one program is required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const normalized: TrainingProgram[] = programs.map((p) => ({
      ...p,
      currency: 'KES' as const,
      priceKES: Math.max(0, Number(p.priceKES) || 0),
      durationDays: Math.max(1, Math.floor(Number(p.durationDays) || 5)),
      courseMaterialType: p.courseMaterialType === 'interactive' ? 'interactive' : 'pdf',
      coursePdfUrl: p.coursePdfUrl || p.syllabusPreview?.pdfUrl || '',
      requirements: cleanList(p.requirements),
      whatYoullLearn: cleanList(p.whatYoullLearn),
      syllabusPreview: p.syllabusPreview
        ? {
            ...p.syllabusPreview,
            bullets: cleanList(p.syllabusPreview.bullets),
          }
        : undefined,
      updatedAt: now,
      createdAt: p.createdAt || now,
    }))

    const data: TrainingProgramsData = { programs: normalized }
    await writeTrainingPrograms(data)

    await recordActivity({
      module: 'training',
      action: 'update',
      performedBy,
      summary: `Updated training program (${normalized.length} program(s))`,
      targetType: 'training-program',
    })

    return NextResponse.json({ success: true, programs: normalized })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving training programs:', error)
    return NextResponse.json({ error: 'Failed to save programs' }, { status: 500 })
  }
}
