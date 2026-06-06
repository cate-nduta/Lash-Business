import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import {
  readTrainingIntakes,
  writeTrainingIntakes,
  readTrainingPrograms,
  syncIntakeEnrollmentCount,
} from '@/lib/training-data'
import {
  generateTrainingDates,
  generateTrainingId,
  computeIntakeStatus,
  getTrainingDurationDays,
} from '@/lib/training-utils'
import type { TrainingFormat, TrainingIntake } from '@/types/training'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const cleanTimingOptions = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []

const cleanTrainingDates = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []

export async function GET() {
  try {
    await requireAdminAuth()
    const data = await readTrainingIntakes()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to load cohorts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const body = await request.json()
    const action = body.action as string

    if (action === 'save_all') {
      const intakes: TrainingIntake[] = Array.isArray(body.intakes) ? body.intakes : []
      const normalized = intakes.map((intake) => {
        const savedDates = cleanTrainingDates(intake.trainingDates)
        const durationDays = Math.max(
          1,
          Math.floor(Number(intake.durationDays) || savedDates.length || 1),
        )
        const trainingDates = savedDates.length > 0
          ? savedDates
          : generateTrainingDates(intake.format, intake.startDate, durationDays)
        const finalDurationDays = trainingDates.length

        return {
          ...intake,
          format: 'custom' as TrainingFormat,
          durationDays: finalDurationDays,
          trainingDates,
          startDate: trainingDates[0],
          endDate: trainingDates[trainingDates.length - 1],
          priceKES: Math.max(0, Number(intake.priceKES) || 0),
          withoutStarterKitPriceKES:
            Number(intake.withoutStarterKitPriceKES) > 0
              ? Math.max(0, Number(intake.withoutStarterKitPriceKES))
              : undefined,
          originalPriceKES:
            Number(intake.originalPriceKES) > 0
              ? Math.max(0, Number(intake.originalPriceKES))
              : undefined,
          discountEnabled: Boolean(intake.discountEnabled),
          timingOptions: cleanTimingOptions(intake.timingOptions),
        }
      })
      await writeTrainingIntakes({ intakes: normalized })
      for (const intake of normalized) {
        await syncIntakeEnrollmentCount(intake.id)
      }
      const refreshed = await readTrainingIntakes()
      return NextResponse.json({ success: true, intakes: refreshed.intakes })
    }

    if (action === 'create') {
      const {
        programId,
        title,
        format,
        anchorDate,
        trainingDates: customDates,
        durationDays: requestedDurationDays,
        priceKES,
        withoutStarterKitPriceKES,
        originalPriceKES,
        discountEnabled,
        capacity,
        timingOptions,
        location,
        notes,
        status,
      } = body

      const requestedFormat = (format || 'custom') as TrainingFormat
      const customTrainingDates = cleanTrainingDates(customDates)
      const dateAnchor = anchorDate || customTrainingDates[0]

      if (!programId || !dateAnchor) {
        return NextResponse.json(
          { error: 'Program and training dates are required' },
          { status: 400 },
        )
      }

      const programs = await readTrainingPrograms()
      const program = programs.programs.find((p) => p.id === programId)
      if (!program) {
        return NextResponse.json({ error: 'Program not found' }, { status: 404 })
      }

      const durationDays = Math.max(
        1,
        Math.floor(
          Number(requestedDurationDays) ||
            customTrainingDates.length ||
            getTrainingDurationDays(program),
        ),
      )
      const trainingDates: string[] =
        customTrainingDates.length > 0
          ? customTrainingDates
          : generateTrainingDates(requestedFormat, dateAnchor, durationDays)

      if (trainingDates.length !== durationDays) {
        return NextResponse.json(
          { error: `Please provide ${durationDays} training dates` },
          { status: 400 },
        )
      }

      const startDate = trainingDates[0]
      const endDate = trainingDates[trainingDates.length - 1]
      const now = new Date().toISOString()
      const price = priceKES != null ? Number(priceKES) : program.priceKES
      const withoutKitPrice = Math.max(0, Number(withoutStarterKitPriceKES) || 0)
      const oldPrice = Math.max(0, Number(originalPriceKES) || 0)

      const intake: TrainingIntake = {
        id: generateTrainingId('intake'),
        programId,
        title:
          title?.trim() ||
          `${program.title} – Cohort ${startDate}`,
        format: requestedFormat,
        startDate,
        endDate,
        trainingDates,
        durationDays: trainingDates.length || durationDays,
        priceKES: Math.max(0, price),
        withoutStarterKitPriceKES: withoutKitPrice > 0 ? withoutKitPrice : undefined,
        originalPriceKES: oldPrice > 0 ? oldPrice : undefined,
        discountEnabled: Boolean(discountEnabled),
        capacity: Math.max(1, Number(capacity) || 8),
        enrolledCount: 0,
        status: status || 'open',
        timingOptions: cleanTimingOptions(timingOptions),
        location: location || program.location,
        notes: notes || '',
        createdAt: now,
        updatedAt: now,
      }
      intake.status = computeIntakeStatus(intake)

      const data = await readTrainingIntakes()
      data.intakes.push(intake)
      await writeTrainingIntakes(data)
      await recordActivity({
        module: 'training',
        action: 'create',
        performedBy,
        summary: `Created training cohort: ${intake.title}`,
        targetId: intake.id,
        targetType: 'training-intake',
      })
      return NextResponse.json({ success: true, intake })
    }

    if (action === 'delete') {
      const { id } = body
      if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 })
      }
      const data = await readTrainingIntakes()
      data.intakes = data.intakes.filter((i) => i.id !== id)
      await writeTrainingIntakes(data)
      await recordActivity({
        module: 'training',
        action: 'delete',
        performedBy,
        summary: `Deleted training cohort`,
        targetId: id,
        targetType: 'training-intake',
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in training intakes API:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
