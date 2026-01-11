export interface GuideScenario {
  id: string
  name: string
  description: string
  mustHaveServiceIds: string[] // Service IDs that are required
  recommendedServiceIds: string[] // Service IDs that are recommended
  order: number
  createdAt: string
  updatedAt: string
}

export interface LabsGuideData {
  version: string
  updatedAt: string
  scenarios: GuideScenario[]
}

const DEFAULT_GUIDE_DATA: LabsGuideData = {
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  scenarios: [],
}

export function normalizeGuideScenario(raw: any): GuideScenario {
  return {
    id: typeof raw.id === 'string' ? raw.id : `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: typeof raw.name === 'string' ? raw.name.trim() : 'Untitled Scenario',
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    mustHaveServiceIds: Array.isArray(raw.mustHaveServiceIds) ? raw.mustHaveServiceIds.filter((id: any) => typeof id === 'string') : [],
    recommendedServiceIds: Array.isArray(raw.recommendedServiceIds) ? raw.recommendedServiceIds.filter((id: any) => typeof id === 'string') : [],
    order: typeof raw.order === 'number' ? raw.order : 0,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

export function normalizeLabsGuide(data: any): LabsGuideData {
  if (!data || typeof data !== 'object') {
    return DEFAULT_GUIDE_DATA
  }

  const scenarios: GuideScenario[] = Array.isArray(data.scenarios)
    ? data.scenarios.map((scenario: any, index: number) => {
        const normalized = normalizeGuideScenario(scenario)
        // Ensure order is set based on array position if not provided
        if (normalized.order === 0 && index > 0) {
          normalized.order = index
        }
        return normalized
      })
    : []

  // Sort scenarios by order
  scenarios.sort((a, b) => a.order - b.order)

  return {
    version: typeof data.version === 'string' ? data.version : DEFAULT_GUIDE_DATA.version,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
    scenarios,
  }
}

export async function loadLabsGuide(): Promise<LabsGuideData> {
  const { readDataFile } = await import('@/lib/data-utils')
  try {
    const data = await readDataFile<any>('labs-guide.json', DEFAULT_GUIDE_DATA)
    return normalizeLabsGuide(data)
  } catch (error) {
    console.error('Error loading labs guide:', error)
    return DEFAULT_GUIDE_DATA
  }
}

export async function saveLabsGuide(data: LabsGuideData): Promise<void> {
  const { writeDataFile } = await import('@/lib/data-utils')
  
  // Ensure all scenarios have proper order values
  const scenariosWithOrder = data.scenarios.map((scenario, index) => ({
    ...scenario,
    order: scenario.order || index,
    updatedAt: new Date().toISOString(),
  }))
  
  const guideData: LabsGuideData = {
    ...data,
    scenarios: scenariosWithOrder,
    updatedAt: new Date().toISOString(),
  }
  
  await writeDataFile('labs-guide.json', guideData)
}

