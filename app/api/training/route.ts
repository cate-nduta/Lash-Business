import { NextResponse } from 'next/server'
import {
  getActiveProgram,
  readTrainingIntakes,
  readTrainingPrograms,
} from '@/lib/training-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    let program = await getActiveProgram()
    if (!program) {
      const { programs } = await readTrainingPrograms()
      program = programs[0] ?? null
    }
    if (!program || !program.isActive) {
      return NextResponse.json({ program: null, intakes: [] })
    }
    const now = new Date()
    const { intakes: allIntakes } = await readTrainingIntakes()
    const intakes = allIntakes
      .filter((intake) => {
        if (intake.programId !== program.id) return false
        if (intake.status === 'closed' || intake.status === 'completed') return false
        const end = new Date(`${intake.endDate}T23:59:59+03:00`)
        return end >= now
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
    return NextResponse.json(
      { program, intakes },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('Error loading public training:', error)
    return NextResponse.json({ error: 'Failed to load training' }, { status: 500 })
  }
}
