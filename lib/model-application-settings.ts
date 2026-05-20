import { readDataFile } from './data-utils'

export type ModelQuestionType = 'single' | 'multiple' | 'text'

export interface ModelApplicationQuestion {
  id: string
  label: string
  type: ModelQuestionType
  required: boolean
  options: string[]
}

export interface ModelApplicationSettings {
  questions: ModelApplicationQuestion[]
}

export const DEFAULT_MODEL_APPLICATION_QUESTIONS: ModelApplicationQuestion[] = [
  {
    id: 'availability',
    label: 'Availability (Afternoon)',
    type: 'multiple',
    required: true,
    options: ['Monday (afternoon)', 'Tuesday (afternoon)', 'Wednesday (afternoon)', 'Thursday (afternoon)', 'Friday (afternoon)'],
  },
  {
    id: 'hasLashExtensions',
    label: 'Have you had lash extensions before?',
    type: 'single',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'hasAppointmentBefore',
    label: 'Have you been a client at LashDiary before?',
    type: 'single',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'allergies',
    label: 'Do you have any known allergies, sensitivities or eye conditions?',
    type: 'text',
    required: false,
    options: [],
  },
  {
    id: 'comfortableLongSessions',
    label: 'Are you comfortable with long sessions? (3-4 hours)',
    type: 'single',
    required: true,
    options: ['Yes', 'No'],
  },
]

export function normalizeModelApplicationQuestions(value: unknown): ModelApplicationQuestion[] {
  const rawQuestions = Array.isArray(value) ? value : []
  const questions = rawQuestions
    .map((question: any, index) => {
      const type: ModelQuestionType =
        question?.type === 'multiple' || question?.type === 'text' ? question.type : 'single'
      const label = typeof question?.label === 'string' ? question.label.trim() : ''
      const id =
        typeof question?.id === 'string' && question.id.trim()
          ? question.id.trim()
          : `question-${Date.now()}-${index}`
      const options = Array.isArray(question?.options)
        ? question.options.map((option: unknown) => String(option).trim()).filter(Boolean)
        : []

      if (!label) return null

      return {
        id,
        label,
        type,
        required: question?.required !== false,
        options: type === 'text' ? [] : options,
      }
    })
    .filter(Boolean) as ModelApplicationQuestion[]

  return questions.length > 0 ? questions : DEFAULT_MODEL_APPLICATION_QUESTIONS
}

export async function loadModelApplicationSettings(): Promise<ModelApplicationSettings> {
  const settings = await readDataFile<ModelApplicationSettings>('model-application-settings.json', {
    questions: DEFAULT_MODEL_APPLICATION_QUESTIONS,
  })

  return {
    questions: normalizeModelApplicationQuestions(settings?.questions),
  }
}
