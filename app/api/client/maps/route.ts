import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { getClientUserId } from '@/lib/client-auth'
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
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({
      lashMaps: clientData.lashMaps || [],
    })
  } catch (error: any) {
    console.error('Get lash maps error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load lash maps' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getClientUserId()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { appointmentId } = body

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    const clientDataFile = `client-${userId}.json`
    const clientData = await readDataFile<ClientData>(clientDataFile, undefined)

    if (!clientData) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Ensure lashMaps array exists
    if (!clientData.lashMaps) {
      clientData.lashMaps = []
    }

    // Remove map by appointmentId
    const initialLength = clientData.lashMaps.length
    clientData.lashMaps = clientData.lashMaps.filter(
      (map) => map.appointmentId !== appointmentId
    )

    if (clientData.lashMaps.length === initialLength) {
      return NextResponse.json(
        { error: 'Lash map not found' },
        { status: 404 }
      )
    }

    await writeDataFile(clientDataFile, clientData)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete lash map error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete lash map' },
      { status: 500 }
    )
  }
}
