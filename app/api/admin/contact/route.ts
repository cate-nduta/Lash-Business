import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const contact = await readDataFile('contact.json', {})
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
    
    // Log what we're saving for debugging
    console.log('Saving contact data:', JSON.stringify(contact, null, 2))
    
    await writeDataFile('contact.json', contact)
    
    // Verify it was saved
    const saved = await readDataFile('contact.json', {})
    console.log('Verified saved data:', JSON.stringify(saved, null, 2))
    
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

