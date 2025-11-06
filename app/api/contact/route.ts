import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    const contact = readDataFile('contact.json')
    return NextResponse.json(contact)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load contact info' }, { status: 500 })
  }
}

