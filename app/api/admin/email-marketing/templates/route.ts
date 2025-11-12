export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const data = await readDataFile('email-templates.json', { templates: [] })
    return NextResponse.json(data)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching templates:', error)
    return NextResponse.json({ templates: [] }, { status: 200 })
  }
}

