import { NextResponse } from 'next/server'
import { loadModelApplicationSettings } from '@/lib/model-application-settings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const settings = await loadModelApplicationSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error loading model application settings:', error)
    return NextResponse.json({ error: 'Failed to load model application settings' }, { status: 500 })
  }
}
