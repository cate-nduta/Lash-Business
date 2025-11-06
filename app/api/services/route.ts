import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    const services = readDataFile('services.json')
    return NextResponse.json(services)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load services' }, { status: 500 })
  }
}

