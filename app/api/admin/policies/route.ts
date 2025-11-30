import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { POLICY_VARIABLE_CONFIG } from '@/lib/policies-constants'
import { loadPolicies, normalizePolicies, savePolicies } from '@/lib/policies-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminAuth()
    const policies = await loadPolicies()
    return NextResponse.json(policies, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading policies for admin:', error)
    return NextResponse.json({ error: 'Failed to load policies' }, { status: 500 })
  }
}

function sanitizePayload(payload: any, existing: Awaited<ReturnType<typeof loadPolicies>>) {
  const merged = {
    version: typeof payload?.version === 'number' ? payload.version : existing.version,
    updatedAt: existing.updatedAt,
    introText: typeof payload?.introText === 'string' ? payload.introText.trim() : existing.introText || '',
    variables: {
      ...existing.variables,
    },
    sections: Array.isArray(payload?.sections) ? payload.sections : existing.sections,
  }

  if (payload?.variables && typeof payload.variables === 'object') {
    for (const { key, readOnly } of POLICY_VARIABLE_CONFIG) {
      if (readOnly) {
        continue
      }
      const value = payload.variables[key]
      if (value !== undefined) {
        merged.variables[key] = Number(value)
      }
    }
  }

  return merged
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const payload = await request.json()
    const existing = await loadPolicies()
    const mergedPayload = sanitizePayload(payload, existing)
    const { policies } = normalizePolicies(mergedPayload)
    policies.version = (existing.version || 1) + 1

    const saved = await savePolicies(policies)

    await recordActivity({
      module: 'settings',
      action: 'update',
      performedBy,
      summary: `Updated client policies (${saved.sections.length} sections)`,
      targetId: 'policies',
      targetType: 'policies',
      details: { policies: saved },
    })

    revalidatePath('/policies')
    revalidatePath('/api/policies')

    return NextResponse.json({ success: true, policies: saved })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving policies:', error)
    return NextResponse.json({ error: 'Failed to save policies' }, { status: 500 })
  }
}

