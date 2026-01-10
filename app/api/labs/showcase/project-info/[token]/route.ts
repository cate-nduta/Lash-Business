import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { BuildProject } from '@/app/api/admin/labs/build-projects/route'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token

    // First, try to find in build projects (direct match works for both new readable format and old hex format)
    const projects = await readDataFile<BuildProject[]>('labs-build-projects.json', [])
    const project = projects.find(p => p.showcaseBookingToken === token)

    if (project) {
      return NextResponse.json({ 
        project: {
          ...project,
          type: 'build-project'
        }
      })
    }

    // If not found, try to find in web services orders (direct match works for both new readable format and old hex format)
    const orders = await readDataFile<any[]>('labs-web-services-orders.json', [])
    const order = orders.find(o => o.showcaseBookingToken === token)

    if (order) {
      // Convert order to project-like format for showcase booking
      return NextResponse.json({ 
        project: {
          projectId: order.id,
          consultationId: '',
          invoiceId: '',
          businessName: order.businessName || order.name || order.email.split('@')[0],
          contactName: order.name || order.email.split('@')[0],
          email: order.email,
          phone: order.phoneNumber || '',
          tierName: 'Web Services',
          totalAmount: order.total || 0,
          currency: 'KES',
          showcaseBookingToken: order.showcaseBookingToken,
          type: 'web-service-order'
        }
      })
    }

    return NextResponse.json(
      { error: 'Project or order not found or invalid token' },
      { status: 404 }
    )
  } catch (error: any) {
    console.error('Error fetching project info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project info' },
      { status: 500 }
    )
  }
}

