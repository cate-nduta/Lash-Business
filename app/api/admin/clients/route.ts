import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile } from '@/lib/data-utils'
import type { ClientData, ClientUsersData } from '@/types/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const { searchParams } = new URL(request.url)
    const needsRefill = searchParams.get('needsRefill') === 'true'

    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
    const clients: Array<{
      profile: any
      lastAppointmentDate?: string
      recommendedRefillDate?: string
      daysSinceLastAppointment?: number
      needsRefill: boolean
    }> = []

    for (const user of usersData.users) {
      if (!user.isActive) continue

      try {
        const clientDataFile = `client-${user.id}.json`
        const clientData = await readDataFile<ClientData>(clientDataFile, undefined)

        if (!clientData) continue

        const lastAppt = clientData.lastAppointmentDate
        let daysSinceLastAppointment: number | undefined
        let recommendedRefillDate: string | undefined
        let needsRefill = false

        if (lastAppt) {
          const lastApptDate = new Date(lastAppt)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          lastApptDate.setHours(0, 0, 0, 0)
          
          const diffTime = today.getTime() - lastApptDate.getTime()
          daysSinceLastAppointment = Math.floor(diffTime / (1000 * 60 * 60 * 24))

          // Calculate recommended refill date (3 weeks = 21 days)
          const refillDate = new Date(lastApptDate)
          refillDate.setDate(refillDate.getDate() + 21)
          recommendedRefillDate = refillDate.toISOString().split('T')[0]

          // Needs refill if 21+ days since last appointment
          needsRefill = daysSinceLastAppointment >= 21
        }

        // Filter if needsRefill param is set
        if (needsRefill && !needsRefill) {
          continue
        }

        clients.push({
          profile: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            birthday: user.birthday,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          },
          lastAppointmentDate: lastAppt,
          recommendedRefillDate,
          daysSinceLastAppointment,
          needsRefill,
        })
      } catch (error) {
        console.error(`Error loading client data for ${user.id}:`, error)
        continue
      }
    }

    // Sort by days since last appointment (most urgent first)
    clients.sort((a, b) => {
      if (!a.daysSinceLastAppointment && !b.daysSinceLastAppointment) return 0
      if (!a.daysSinceLastAppointment) return 1
      if (!b.daysSinceLastAppointment) return -1
      return b.daysSinceLastAppointment - a.daysSinceLastAppointment
    })

    return NextResponse.json({ clients })
  } catch (error: any) {
    console.error('Get clients error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load clients' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

