import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFilePreferRemote, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const contact = await readDataFilePreferRemote('contact.json', {})
    return NextResponse.json(contact)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading contact details:', error)
    return NextResponse.json({ contact: null }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const contact = await request.json()

    await writeDataFile('contact.json', contact)

    const saved = await readDataFilePreferRemote('contact.json', {})

    revalidatePath('/contact')
    revalidatePath('/api/contact')
    
    return NextResponse.json({ success: true, saved: saved })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving contact details:', error)
    return NextResponse.json({ error: 'Failed to save contact details' }, { status: 500 })
  }
}

