import { NextRequest, NextResponse } from 'next/server'
import { getClientUserId } from '@/lib/client-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ClientData } from '@/types/client'

export async function GET(request: NextRequest) {
  try {
    const userId = await getClientUserId()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const clientDataFile = `client-${userId}.json`
    const clientData = await readDataFile<ClientData>(clientDataFile, undefined)

    if (!clientData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(clientData)
  } catch (error: any) {
    console.error('Get client data error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load client data' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getClientUserId()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const clientDataFile = `client-${userId}.json`
    const clientData = await readDataFile<ClientData>(clientDataFile, undefined)

    if (!clientData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    // Ensure profile exists
    if (!clientData.profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Update allowed fields
    if (body.birthday !== undefined) {
      clientData.profile.birthday = body.birthday || undefined
    }

    await writeDataFile(clientDataFile, clientData)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update client data error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update client data' },
      { status: 500 }
    )
  }
}

