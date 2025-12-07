import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const data = await readDataFile<{ applications: any[] }>('model-applications.json', { applications: [] })
    return NextResponse.json(data)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading model applications:', error)
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { action, applicationId, status } = body

    if (action === 'updateStatus') {
      const data = await readDataFile<{ applications: any[] }>('model-applications.json', { applications: [] })
      const application = data.applications.find((app: any) => app.id === applicationId)
      if (application) {
        application.status = status
        await writeDataFile('model-applications.json', data)
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating model application:', error)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}

