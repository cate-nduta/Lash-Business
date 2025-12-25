import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendShowcaseEmailForProject } from '../send-email-utils'
import type { BuildProject } from '@/app/api/admin/labs/build-projects/route'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, invoiceId } = body

    // If projectId is provided, use it
    if (projectId) {
      await sendShowcaseEmailForProject(projectId)
      return NextResponse.json({
        success: true,
        message: 'Showcase email sent successfully',
      })
    }

    // If invoiceId is provided but no projectId, create project from invoice
    if (invoiceId) {
      const invoices = await readDataFile<any[]>('labs-invoices.json', [])
      const invoice = invoices.find(inv => inv.invoiceId === invoiceId)

      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        )
      }

      // Check if project already exists
      const projects = await readDataFile<BuildProject[]>('labs-build-projects.json', [])
      let project = projects.find(p => p.invoiceId === invoiceId)

      // Create project if it doesn't exist
      if (!project) {
        // Get consultation to get tier name
        const consultationsData = await readDataFile<{ consultations: any[] }>(
          'labs-consultations.json',
          { consultations: [] }
        )
        const consultation = consultationsData.consultations.find(
          (c: any) => (c.consultationId || c.submittedAt) === invoice.consultationId
        )

        const tierName = consultation?.selectedTier || consultation?.interestedTier || 'LashDiary Labs System'

        project = {
          projectId: `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          consultationId: invoice.consultationId,
          invoiceId: invoice.invoiceId,
          businessName: invoice.businessName,
          contactName: invoice.contactName,
          email: invoice.email,
          phone: invoice.phone || '',
          tierName,
          totalAmount: invoice.total,
          currency: invoice.currency,
          status: 'ready-for-delivery',
          milestones: {},
          paymentStatus: {
            upfrontPaid: invoice.upfrontPaid || false,
            upfrontPaidDate: invoice.upfrontPaid ? new Date().toISOString() : undefined,
            secondPaid: invoice.secondPaid || false,
            secondPaidDate: invoice.secondPaid ? new Date().toISOString() : undefined,
            totalPaid: invoice.total,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        projects.push(project)
        await writeDataFile('labs-build-projects.json', projects)
      }

      await sendShowcaseEmailForProject(project.projectId)
      return NextResponse.json({
        success: true,
        message: 'Showcase email sent successfully',
      })
    }

    return NextResponse.json(
      { error: 'Either projectId or invoiceId is required' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error sending showcase email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send showcase email' },
      { status: 500 }
    )
  }
}

