import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ClientData } from '@/types/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth()

    const userId = params.id
    const clientDataFile = `client-${userId}.json`
    const clientData = await readDataFile<ClientData>(clientDataFile, undefined)

    if (!clientData) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Ensure all required fields exist with defaults
    if (!clientData.profile) {
      // Create default profile if missing
      clientData.profile = {
        id: userId,
        email: '',
        name: 'Unknown Client',
        phone: '',
        passwordHash: '',
        createdAt: new Date().toISOString(),
        isActive: true,
      }
    }

    // Ensure all arrays exist
    if (!clientData.lashHistory) clientData.lashHistory = []
    if (!clientData.lashMaps) clientData.lashMaps = []
    if (!clientData.preferences) {
      clientData.preferences = {
        preferredCurl: null,
        lengthRange: null,
        densityLevel: null,
        eyeShape: null,
        mappingStyle: null,
        signatureLook: null,
      }
    }
    if (!clientData.allergies) {
      clientData.allergies = {
        hasReaction: false,
      }
    }
    if (!clientData.aftercare) clientData.aftercare = {}
    if (!clientData.retentionCycles) clientData.retentionCycles = []

    return NextResponse.json(clientData)
  } catch (error: any) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load client' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth()

    const userId = params.id
    const body = await request.json()
    const clientDataFile = `client-${userId}.json`
    const clientData = await readDataFile<ClientData>(clientDataFile, undefined)

    if (!clientData) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Update preferences
    if (body.preferences) {
      if (body.preferences.preferredCurl !== undefined) {
        clientData.preferences.preferredCurl = body.preferences.preferredCurl
      }
      if (body.preferences.lengthRange !== undefined) {
        clientData.preferences.lengthRange = body.preferences.lengthRange
      }
      if (body.preferences.densityLevel !== undefined) {
        clientData.preferences.densityLevel = body.preferences.densityLevel
      }
      if (body.preferences.eyeShape !== undefined) {
        clientData.preferences.eyeShape = body.preferences.eyeShape
      }
      if (body.preferences.mappingStyle !== undefined) {
        clientData.preferences.mappingStyle = body.preferences.mappingStyle
      }
      if (body.preferences.signatureLook !== undefined) {
        clientData.preferences.signatureLook = body.preferences.signatureLook
      }
    }

    // Update allergies
    if (body.allergies) {
      if (body.allergies.hasReaction !== undefined) {
        clientData.allergies.hasReaction = body.allergies.hasReaction
      }
      if (body.allergies.reactionDetails !== undefined) {
        clientData.allergies.reactionDetails = body.allergies.reactionDetails
      }
      if (body.allergies.glueSensitivity !== undefined) {
        clientData.allergies.glueSensitivity = body.allergies.glueSensitivity
      }
      if (body.allergies.patchesUsed !== undefined) {
        clientData.allergies.patchesUsed = body.allergies.patchesUsed
      }
      if (body.allergies.avoidNextSession !== undefined) {
        clientData.allergies.avoidNextSession = body.allergies.avoidNextSession
      }
      if (body.allergies.lastReactionDate !== undefined) {
        clientData.allergies.lastReactionDate = body.allergies.lastReactionDate
      }
    }

    // Update birthday
    if (body.birthday !== undefined) {
      clientData.profile.birthday = body.birthday || undefined
    }

    // Update aftercare
    if (body.aftercare) {
      if (body.aftercare.aftercareIssues !== undefined) {
        clientData.aftercare.aftercareIssues = body.aftercare.aftercareIssues
      }
      if (body.aftercare.lashSheddingPattern !== undefined) {
        clientData.aftercare.lashSheddingPattern = body.aftercare.lashSheddingPattern
      }
      if (body.aftercare.sleepPosition !== undefined) {
        clientData.aftercare.sleepPosition = body.aftercare.sleepPosition
      }
      if (body.aftercare.oilUse !== undefined) {
        clientData.aftercare.oilUse = body.aftercare.oilUse
      }
      if (body.aftercare.makeupHabits !== undefined) {
        clientData.aftercare.makeupHabits = body.aftercare.makeupHabits
      }
      if (body.aftercare.notes !== undefined) {
        clientData.aftercare.notes = body.aftercare.notes
      }
    }

    // Add lash history entry
    if (body.lashHistory) {
      clientData.lashHistory.push({
        appointmentId: body.lashHistory.appointmentId || `appt-${Date.now()}`,
        date: body.lashHistory.date,
        service: body.lashHistory.service,
        serviceType: body.lashHistory.serviceType || 'other',
        lashTech: body.lashHistory.lashTech || 'Lash Technician',
        notes: body.lashHistory.notes,
        retentionDays: body.lashHistory.retentionDays,
        retentionNotes: body.lashHistory.retentionNotes,
        retentionScore: body.lashHistory.retentionScore,
        retentionReason: body.lashHistory.retentionReason,
      })

      // Update last appointment date
      const appointmentDate = new Date(body.lashHistory.date)
      if (!clientData.lastAppointmentDate || appointmentDate > new Date(clientData.lastAppointmentDate)) {
        clientData.lastAppointmentDate = body.lashHistory.date
      }
    }

    // Add lash map
    if (body.lashMap) {
      // Ensure lashMaps array exists
      if (!clientData.lashMaps) {
        clientData.lashMaps = []
      }
      
      // Ensure date is in ISO format
      let mapDate = body.lashMap.date
      if (mapDate && !mapDate.includes('T')) {
        // If date is just YYYY-MM-DD, convert to ISO string
        mapDate = new Date(mapDate + 'T00:00:00').toISOString()
      }
      
      // Generate unique ID for this lash map
      const mapId = `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      clientData.lashMaps.push({
        id: mapId,
        appointmentId: body.lashMap.appointmentId || `appt-${Date.now()}`,
        date: mapDate || new Date().toISOString(),
        mapData: body.lashMap.mapData || '',
        imageUrl: body.lashMap.imageUrl,
        notes: body.lashMap.notes,
      })
    }

    // Delete lash map
    if (body.deleteLashMap && typeof body.deleteLashMap === 'string') {
      // Ensure lashMaps array exists
      if (!clientData.lashMaps) {
        clientData.lashMaps = []
      }
      
      // Remove map by id (preferred) or appointmentId (fallback for backward compatibility)
      clientData.lashMaps = clientData.lashMaps.filter(
        (map) => {
          // Try to match by id first (new unique identifier)
          if (map.id) {
            return map.id !== body.deleteLashMap
          }
          // Fallback to appointmentId for older maps without id
          return map.appointmentId !== body.deleteLashMap
        }
      )
    }

    // Update retention score for a specific appointment
    if (body.updateRetentionScore) {
      // Ensure lashHistory array exists
      if (!clientData.lashHistory) {
        clientData.lashHistory = []
      }
      
      const appointmentIndex = clientData.lashHistory.findIndex(
        (entry) => entry.appointmentId === body.updateRetentionScore.appointmentId
      )
      
      if (appointmentIndex !== -1) {
        // Update existing entry
        clientData.lashHistory[appointmentIndex] = {
          ...clientData.lashHistory[appointmentIndex],
          retentionScore: body.updateRetentionScore.retentionScore,
          retentionReason: body.updateRetentionScore.retentionReason,
        }
      }
    }

    // Update entire lash history entry
    if (body.updateLashHistory) {
      // Ensure lashHistory array exists
      if (!clientData.lashHistory) {
        clientData.lashHistory = []
      }
      
      const appointmentIndex = clientData.lashHistory.findIndex(
        (entry) => entry.appointmentId === body.updateLashHistory.appointmentId
      )
      
      if (appointmentIndex !== -1) {
        // Update existing entry with all new data
        clientData.lashHistory[appointmentIndex] = {
          appointmentId: body.updateLashHistory.appointmentId,
          date: body.updateLashHistory.date,
          service: body.updateLashHistory.service,
          serviceType: body.updateLashHistory.serviceType || 'other',
          lashTech: body.updateLashHistory.lashTech || 'Lash Technician',
          notes: body.updateLashHistory.notes,
          retentionDays: body.updateLashHistory.retentionDays,
          retentionNotes: body.updateLashHistory.retentionNotes,
          retentionScore: body.updateLashHistory.retentionScore,
          retentionReason: body.updateLashHistory.retentionReason,
        }

        // Update last appointment date if this is the most recent
        const appointmentDate = new Date(body.updateLashHistory.date)
        if (!clientData.lastAppointmentDate || appointmentDate > new Date(clientData.lastAppointmentDate)) {
          clientData.lastAppointmentDate = body.updateLashHistory.date
        }
      }
    }

    // Delete lash history entry
    if (body.deleteLashHistory && typeof body.deleteLashHistory === 'string') {
      // Ensure lashHistory array exists
      if (!clientData.lashHistory) {
        clientData.lashHistory = []
      }
      
      clientData.lashHistory = clientData.lashHistory.filter(
        (entry) => entry.appointmentId !== body.deleteLashHistory
      )

      // Update last appointment date if we deleted the most recent one
      if (clientData.lashHistory.length > 0) {
        const sortedHistory = [...clientData.lashHistory].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        clientData.lastAppointmentDate = sortedHistory[0].date
      } else {
        clientData.lastAppointmentDate = undefined
      }
    }

    await writeDataFile(clientDataFile, clientData)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update client' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

