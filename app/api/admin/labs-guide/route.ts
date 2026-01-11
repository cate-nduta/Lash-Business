import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { loadLabsGuide, saveLabsGuide, normalizeLabsGuide, type LabsGuideData, type GuideScenario } from '@/lib/labs-guide-utils'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

// GET: Fetch guide scenarios
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const guide = await loadLabsGuide()
    return NextResponse.json(guide)
  } catch (error: any) {
    console.error('Error fetching labs guide:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guide', details: error.message },
      { status: 500 }
    )
  }
}

// POST: Save guide scenarios
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const normalized = normalizeLabsGuide(body)
    
    await saveLabsGuide(normalized)
    
    // Revalidate guide pages
    revalidatePath('/labs/custom-website-builds/guide')
    revalidatePath('/api/labs/guide')
    
    return NextResponse.json({ success: true, guide: normalized })
  } catch (error: any) {
    console.error('Error saving labs guide:', error)
    return NextResponse.json(
      { error: 'Failed to save guide', details: error.message },
      { status: 500 }
    )
  }
}

