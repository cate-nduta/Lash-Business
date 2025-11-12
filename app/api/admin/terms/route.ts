import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { loadTerms, saveTerms, TermsDocument, TermsSection } from '@/lib/terms-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function sanitizeSections(sections: unknown): TermsSection[] {
  if (!Array.isArray(sections)) {
    return []
  }

  return sections
    .map((section, index) => {
      const title = typeof section?.title === 'string' ? section.title.trim() : ''
      const body = typeof section?.body === 'string' ? section.body.trim() : ''
      if (!title || !body) {
        return null
      }

      const id =
        typeof section?.id === 'string' && section.id.trim().length > 0
          ? section.id.trim()
          : `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`

      return {
        id,
        title,
        body,
      }
    })
    .filter((section): section is TermsSection => Boolean(section))
}

export async function GET() {
  try {
    await requireAdminAuth()
    const terms = await loadTerms()
    return NextResponse.json(terms, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading terms for admin:', error)
    return NextResponse.json({ error: 'Failed to load terms' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const payload = await request.json()
    const existing = await loadTerms()

    const sections = sanitizeSections(payload?.sections) || existing.sections
    const version =
      typeof payload?.version === 'number' && payload.version > existing.version
        ? payload.version
        : (existing.version || 1) + 1

    const termsToSave: TermsDocument = {
      version,
      updatedAt: existing.updatedAt,
      sections: sections.length > 0 ? sections : existing.sections,
    }

    const saved = await saveTerms(termsToSave)

    await recordActivity({
      module: 'settings',
      action: 'update',
      performedBy,
      summary: `Updated terms & conditions (${saved.sections.length} sections)`,
      targetId: 'terms',
      targetType: 'terms',
      details: { terms: saved },
    })

    revalidatePath('/terms')
    revalidatePath('/api/terms')

    return NextResponse.json({ success: true, terms: saved })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving terms:', error)
    return NextResponse.json({ error: 'Failed to save terms' }, { status: 500 })
  }
}


