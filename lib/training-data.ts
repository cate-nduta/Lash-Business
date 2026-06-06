import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { computeIntakeStatus } from '@/lib/training-utils'
import type {
  TrainingEnrollment,
  TrainingEnrollmentsData,
  TrainingIntake,
  TrainingIntakesData,
  TrainingProgram,
  TrainingProgramsData,
} from '@/types/training'

export async function readTrainingPrograms(): Promise<TrainingProgramsData> {
  return readDataFile<TrainingProgramsData>('training-programs.json', { programs: [] })
}

export async function writeTrainingPrograms(data: TrainingProgramsData): Promise<void> {
  await writeDataFile('training-programs.json', data)
}

export async function readTrainingIntakes(): Promise<TrainingIntakesData> {
  return readDataFile<TrainingIntakesData>('training-intakes.json', { intakes: [] })
}

export async function writeTrainingIntakes(data: TrainingIntakesData): Promise<void> {
  await writeDataFile('training-intakes.json', data)
}

export async function readTrainingEnrollments(): Promise<TrainingEnrollmentsData> {
  return readDataFile<TrainingEnrollmentsData>('training-enrollments.json', {
    enrollments: [],
  })
}

export async function writeTrainingEnrollments(
  data: TrainingEnrollmentsData,
): Promise<void> {
  await writeDataFile('training-enrollments.json', data)
}

export async function getActiveProgram(): Promise<TrainingProgram | null> {
  const { programs } = await readTrainingPrograms()
  return programs.find((p) => p.isActive) ?? programs[0] ?? null
}

export async function getIntakeById(id: string): Promise<TrainingIntake | null> {
  const { intakes } = await readTrainingIntakes()
  return intakes.find((i) => i.id === id) ?? null
}

export async function getOpenIntakes(programId?: string): Promise<TrainingIntake[]> {
  const { intakes } = await readTrainingIntakes()
  const now = new Date()
  return intakes
    .filter((i) => {
      if (programId && i.programId !== programId) return false
      if (i.status === 'closed' || i.status === 'completed') return false
      if (i.enrolledCount >= i.capacity) return false
      const end = new Date(`${i.endDate}T23:59:59+03:00`)
      if (end < now) return false
      return true
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export async function countEnrollmentsForIntake(intakeId: string): Promise<number> {
  const { enrollments } = await readTrainingEnrollments()
  return enrollments.filter(
    (e) =>
      e.intakeId === intakeId &&
      (e.paymentStatus === 'completed' || e.paymentStatus === 'manual'),
  ).length
}

export async function syncIntakeEnrollmentCount(intakeId: string): Promise<void> {
  const count = await countEnrollmentsForIntake(intakeId)
  const data = await readTrainingIntakes()
  const idx = data.intakes.findIndex((i) => i.id === intakeId)
  if (idx === -1) return
  const intake = data.intakes[idx]
  intake.enrolledCount = count
  intake.status = computeIntakeStatus(intake)
  intake.updatedAt = new Date().toISOString()
  data.intakes[idx] = intake
  await writeTrainingIntakes(data)
}

export async function getEnrollmentById(
  id: string,
): Promise<TrainingEnrollment | null> {
  const { enrollments } = await readTrainingEnrollments()
  return enrollments.find((e) => e.id === id) ?? null
}

export async function getEnrollmentByAccessToken(
  accessToken: string,
): Promise<TrainingEnrollment | null> {
  if (!accessToken) return null
  const { enrollments } = await readTrainingEnrollments()
  return enrollments.find((e) => e.accessToken === accessToken) ?? null
}
