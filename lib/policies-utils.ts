import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { PolicyData, PolicySection, PolicyVariables } from '@/lib/policies-types'
import { DEFAULT_POLICIES } from '@/lib/policies-constants'

const VARIABLE_KEYS = Object.keys(DEFAULT_POLICIES.variables) as (keyof PolicyVariables)[]

function cloneDefaultPolicies(): PolicyData {
  return JSON.parse(JSON.stringify(DEFAULT_POLICIES)) as PolicyData
}

function slugify(value: string, fallback: string) {
  if (!value || typeof value !== 'string') {
    return fallback
  }
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback
}

function coerceNumber(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return numeric
  }
  return fallback
}

function formatVariableToken(key: string, value: string | number) {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'number') {
    if (key.toLowerCase().includes('hours')) {
      return Math.round(value).toString()
    }
    if (key.toLowerCase().includes('percent')) {
      return value % 1 === 0 ? value.toFixed(0) : value.toString()
    }
    return value.toString()
  }
  return value
}

async function getDiscountDepositPercentage(): Promise<number | null> {
  try {
    const discounts = await readDataFile<{ depositPercentage?: number }>('discounts.json', {})
    const value = Number(discounts?.depositPercentage)
    if (Number.isFinite(value)) {
      return value
    }
  } catch (error) {
    console.warn('Unable to load deposit percentage from discounts settings:', error)
  }
  return null
}

async function overrideDepositFromDiscounts(policies: PolicyData): Promise<boolean> {
  const override = await getDiscountDepositPercentage()
  if (override !== null && override !== policies.variables.depositPercentage) {
    policies.variables.depositPercentage = override
    return true
  }
  return false
}

export function applyPolicyVariables(text: string, variables: PolicyVariables) {
  if (!text || typeof text !== 'string') return text
  return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    if (!(key in variables)) {
      return match
    }
    const formatted = formatVariableToken(key, variables[key as keyof PolicyVariables])
    return formatted || match
  })
}

export function normalizePolicies(raw: any): { policies: PolicyData; changed: boolean } {
  let changed = false
  const defaultPolicies = cloneDefaultPolicies()

  if (!raw || typeof raw !== 'object') {
    return { policies: defaultPolicies, changed: true }
  }

  const normalized: PolicyData = {
    version: typeof raw.version === 'number' ? raw.version : defaultPolicies.version,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim().length > 0
        ? raw.updatedAt
        : defaultPolicies.updatedAt,
    introText:
      typeof raw.introText === 'string' && raw.introText.trim().length > 0
        ? raw.introText.trim()
        : defaultPolicies.introText || '',
    variables: { ...defaultPolicies.variables },
    sections: [],
  }

  if (raw.variables && typeof raw.variables === 'object') {
    for (const key of VARIABLE_KEYS) {
      const coerced = coerceNumber(raw.variables[key], defaultPolicies.variables[key])
      if (coerced !== raw.variables[key]) {
        changed = true
      }
      normalized.variables[key] = coerced
    }
  } else {
    changed = true
  }

  const rawSections: any[] = Array.isArray(raw.sections) ? raw.sections : defaultPolicies.sections
  const sections: PolicySection[] = []

  rawSections.forEach((section, index) => {
    if (!section || typeof section !== 'object') {
      changed = true
      return
    }

    const title =
      typeof section.title === 'string' && section.title.trim().length > 0
        ? section.title.trim()
        : defaultPolicies.sections[index]?.title || `Section ${index + 1}`

    const id =
      typeof section.id === 'string' && section.id.trim().length > 0
        ? section.id
        : slugify(title, `section-${index + 1}`)

    const description = typeof section.description === 'string' ? section.description.trim() : ''

    const itemsArray: string[] = Array.isArray(section.items) ? section.items : []
    const items = itemsArray
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)

    if (items.length === 0) {
      const fallbackItems = defaultPolicies.sections.find((s) => s.id === id)?.items
      if (fallbackItems && fallbackItems.length > 0) {
        items.push(...fallbackItems)
        changed = true
      }
    }

    sections.push({
      id,
      title,
      description,
      items,
    })
  })

  if (sections.length === 0) {
    sections.push(...defaultPolicies.sections)
    changed = true
  }

  normalized.sections = sections

  return { policies: normalized, changed }
}

export async function loadPolicies(): Promise<PolicyData> {
  const raw = await readDataFile<PolicyData>('policies.json', cloneDefaultPolicies())
  const { policies, changed: normalizedChanged } = normalizePolicies(raw)
  let changed = normalizedChanged

  if (await overrideDepositFromDiscounts(policies)) {
    changed = true
  }

  if (changed) {
    await writeDataFile('policies.json', policies)
  }
  return policies
}

export async function savePolicies(policies: PolicyData) {
  const dataToSave: PolicyData = {
    ...policies,
    updatedAt: new Date().toISOString(),
    version: typeof policies.version === 'number' ? policies.version : DEFAULT_POLICIES.version,
    variables: { ...policies.variables },
    sections: [...policies.sections],
  }

  await overrideDepositFromDiscounts(dataToSave)

  await writeDataFile('policies.json', dataToSave)
  return dataToSave
}

