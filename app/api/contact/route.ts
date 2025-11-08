import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET(request: NextRequest) {
  try {
    const contact = await readDataFile('contact.json', {})
    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error loading contact info:', error)
    return NextResponse.json({ contact: null }, { status: 500 })
  }
}

