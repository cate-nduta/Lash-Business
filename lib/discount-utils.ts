import { loadPolicies } from '@/lib/policies-utils'

interface SalonCommissionSettings {
  earlyPercentage: number
  finalPercentage: number
  totalPercentage: number
}

export async function getSalonCommissionSettings(): Promise<SalonCommissionSettings> {
  try {
    const policies = await loadPolicies()
    const variables = policies.variables || {}
    const totalVariable = Number(variables.salonCommissionTotalPercent ?? 0)
    const total = totalVariable > 0 ? totalVariable : 0

    return {
      earlyPercentage: 0,
      finalPercentage: total,
      totalPercentage: total,
    }
  } catch (error) {
    console.error('Failed to load salon commission settings from policies:', error)
    return {
      earlyPercentage: 0,
      finalPercentage: 3.5,
      totalPercentage: 3.5,
    }
  }
}

