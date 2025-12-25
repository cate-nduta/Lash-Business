import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface BuildProject {
  projectId: string
  consultationId: string
  invoiceId: string
  businessName: string
  contactName: string
  email: string
  phone: string
  tierName: string
  totalAmount: number
  currency: string
  
  // Workflow tracking
  status: 'pending-payment' | 'slot-reserved' | 'timeline-sent' | 'build-started' | 'in-progress' | 'review' | 'ready-for-delivery' | 'delivered' | 'on-hold' | 'cancelled'
  
  // Milestones
  milestones: {
    buildSlotReserved?: {
      date: string
      notes?: string
    }
    intakeFormSent?: {
      date: string
      notes?: string
    }
    buildTimelineSent?: {
      date: string
      notes?: string
    }
    buildStarted?: {
      date: string
      notes?: string
    }
    showcaseEmailSent?: {
      date: string
      notes?: string
    }
    showcaseMeetingScheduled?: {
      date: string
      notes?: string
    }
    milestones?: Array<{
      name: string
      date: string
      completed: boolean
      notes?: string
    }>
  }
  
  // Showcase meeting
  showcaseBookingToken?: string
  showcaseBookingId?: string
  
  // Payment tracking
  paymentStatus: {
    upfrontPaid: boolean
    upfrontPaidDate?: string
    secondPaid: boolean
    secondPaidDate?: string
    totalPaid: number
  }
  
  // Notes and communication
  notes?: string
  nextSteps?: string
  
  // Time blocking for project scheduling
  timeBlock?: {
    startDate: string // When build work begins
    endDate: string // When build work ends
    publishDate?: string // Target publish/go-live date
    blockedDays?: string[] // Specific days allocated (e.g., ['2024-01-15', '2024-01-16'])
    notes?: string
  }
  
  createdAt: string
  updatedAt: string
}

// GET - List all build projects
export async function GET(request: NextRequest) {
  try {
    const projects = await readDataFile<BuildProject[]>('labs-build-projects.json', [])
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const consultationId = searchParams.get('consultationId')
    const invoiceId = searchParams.get('invoiceId')
    
    let filtered = projects
    
    if (status) {
      filtered = filtered.filter(p => p.status === status)
    }
    if (consultationId) {
      filtered = filtered.filter(p => p.consultationId === consultationId)
    }
    if (invoiceId) {
      filtered = filtered.filter(p => p.invoiceId === invoiceId)
    }
    
    // Sort by most recent first
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return NextResponse.json({ projects: sorted, total: sorted.length })
  } catch (error) {
    console.error('Error loading build projects:', error)
    return NextResponse.json(
      { error: 'Failed to load build projects', projects: [], total: 0 },
      { status: 500 }
    )
  }
}

// POST - Create a new build project (typically when invoice is paid)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      consultationId,
      invoiceId,
      businessName,
      contactName,
      email,
      phone,
      tierName,
      totalAmount,
      currency,
    } = body

    if (!consultationId || !invoiceId || !businessName || !email || !tierName) {
      return NextResponse.json(
        { error: 'Missing required fields: consultationId, invoiceId, businessName, email, and tierName are required' },
        { status: 400 }
      )
    }

    // Check if project already exists for this invoice
    const projects = await readDataFile<BuildProject[]>('labs-build-projects.json', [])
    const existingProject = projects.find(p => p.invoiceId === invoiceId)
    
    if (existingProject) {
      return NextResponse.json(
        { error: 'Build project already exists for this invoice', project: existingProject },
        { status: 400 }
      )
    }

    // Determine initial status based on payment
    const invoices = await readDataFile<any[]>('labs-invoices.json', [])
    const invoice = invoices.find(inv => inv.invoiceId === invoiceId)
    
    const isTier3 = tierName.includes('Full Operations Suite')
    const upfrontPaid = invoice?.status === 'paid' || (isTier3 && invoice?.upfrontPaid)
    const initialStatus: BuildProject['status'] = upfrontPaid ? 'slot-reserved' : 'pending-payment'

    const project: BuildProject = {
      projectId: `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      consultationId,
      invoiceId,
      businessName,
      contactName: contactName || '',
      email,
      phone: phone || '',
      tierName,
      totalAmount: totalAmount || 0,
      currency: currency || 'KES',
      status: initialStatus,
      milestones: {},
      paymentStatus: {
        upfrontPaid: upfrontPaid,
        upfrontPaidDate: upfrontPaid ? new Date().toISOString() : undefined,
        secondPaid: false,
        totalPaid: upfrontPaid ? (isTier3 ? Math.round(totalAmount * 0.5) : totalAmount) : 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // If upfront is paid, mark build slot as reserved
    if (upfrontPaid) {
      project.milestones.buildSlotReserved = {
        date: new Date().toISOString(),
        notes: 'Build slot reserved upon payment receipt',
      }
    }

    projects.push(project)
    await writeDataFile('labs-build-projects.json', projects)

    return NextResponse.json({ success: true, project })
  } catch (error: any) {
    console.error('Error creating build project:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create build project' },
      { status: 500 }
    )
  }
}

// Helper function to check for overlapping time blocks
function hasTimeBlockOverlap(
  projects: BuildProject[],
  currentProjectId: string,
  newTimeBlock: { startDate: string; endDate: string }
): { hasOverlap: boolean; conflictingProject?: BuildProject } {
  const newStart = new Date(newTimeBlock.startDate)
  const newEnd = new Date(newTimeBlock.endDate)

  for (const project of projects) {
    // Skip the current project being updated
    if (project.projectId === currentProjectId) continue
    
    // Only check projects that have time blocks and are in active status
    if (!project.timeBlock) continue
    if (project.status === 'cancelled' || project.status === 'delivered') continue
    
    const existingStart = new Date(project.timeBlock.startDate)
    const existingEnd = new Date(project.timeBlock.endDate)
    
    // Check for overlap: new start is before existing end AND new end is after existing start
    if (newStart < existingEnd && newEnd > existingStart) {
      return { hasOverlap: true, conflictingProject: project }
    }
  }
  
  return { hasOverlap: false }
}

// PATCH - Update build project status and milestones
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, status, milestone, notes, nextSteps, timeBlock } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const projects = await readDataFile<BuildProject[]>('labs-build-projects.json', [])
    const projectIndex = projects.findIndex(p => p.projectId === projectId)

    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Build project not found' },
        { status: 404 }
      )
    }

    const project = projects[projectIndex]
    
    // Validate time block if provided
    if (timeBlock) {
      // Only allow time blocking if project is paid (slot-reserved or later)
      if (project.status === 'pending-payment') {
        return NextResponse.json(
          { error: 'Cannot set time block until project is paid and slot is reserved' },
          { status: 400 }
        )
      }
      
      // Validate dates
      if (!timeBlock.startDate || !timeBlock.endDate) {
        return NextResponse.json(
          { error: 'Start date and end date are required for time blocking' },
          { status: 400 }
        )
      }
      
      const startDate = new Date(timeBlock.startDate)
      const endDate = new Date(timeBlock.endDate)
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        )
      }
      
      // Check for overlapping time blocks
      const overlapCheck = hasTimeBlockOverlap(projects, projectId, {
        startDate: timeBlock.startDate,
        endDate: timeBlock.endDate,
      })
      
      if (overlapCheck.hasOverlap && overlapCheck.conflictingProject) {
        return NextResponse.json(
          { 
            error: `Time block overlaps with another project: ${overlapCheck.conflictingProject.businessName} (${overlapCheck.conflictingProject.timeBlock?.startDate} to ${overlapCheck.conflictingProject.timeBlock?.endDate})`,
            conflictingProject: {
              projectId: overlapCheck.conflictingProject.projectId,
              businessName: overlapCheck.conflictingProject.businessName,
              timeBlock: overlapCheck.conflictingProject.timeBlock,
            }
          },
          { status: 400 }
        )
      }
      
      // Set time block
      project.timeBlock = {
        startDate: timeBlock.startDate,
        endDate: timeBlock.endDate,
        publishDate: timeBlock.publishDate,
        blockedDays: timeBlock.blockedDays,
        notes: timeBlock.notes,
      }
    }

    // Update status
    if (status) {
      project.status = status
    }

    // Update milestone
    if (milestone) {
      const { type, date, completed, name, notes: milestoneNotes } = milestone
      
      if (type === 'buildSlotReserved') {
        project.milestones.buildSlotReserved = {
          date: date || new Date().toISOString(),
          notes: milestoneNotes,
        }
      } else if (type === 'intakeFormSent') {
        project.milestones.intakeFormSent = {
          date: date || new Date().toISOString(),
          notes: milestoneNotes,
        }
      } else if (type === 'buildTimelineSent') {
        project.milestones.buildTimelineSent = {
          date: date || new Date().toISOString(),
          notes: milestoneNotes,
        }
      } else if (type === 'buildStarted') {
        project.milestones.buildStarted = {
          date: date || new Date().toISOString(),
          notes: milestoneNotes,
        }
      } else if (type === 'custom' && name) {
        if (!project.milestones.milestones) {
          project.milestones.milestones = []
        }
        const milestoneIndex = project.milestones.milestones.findIndex(m => m.name === name)
        if (milestoneIndex >= 0) {
          project.milestones.milestones[milestoneIndex] = {
            name,
            date: date || new Date().toISOString(),
            completed: completed !== undefined ? completed : true,
            notes: milestoneNotes,
          }
        } else {
          project.milestones.milestones.push({
            name,
            date: date || new Date().toISOString(),
            completed: completed !== undefined ? completed : true,
            notes: milestoneNotes,
          })
        }
      }
    }

    // Update notes
    if (notes !== undefined) {
      project.notes = notes
    }

    // Update next steps
    if (nextSteps !== undefined) {
      project.nextSteps = nextSteps
    }

    // Update payment status if needed
    if (status === 'slot-reserved' && !project.milestones.buildSlotReserved) {
      project.milestones.buildSlotReserved = {
        date: new Date().toISOString(),
        notes: 'Build slot reserved',
      }
    }

    project.updatedAt = new Date().toISOString()
    projects[projectIndex] = project
    await writeDataFile('labs-build-projects.json', projects)

    return NextResponse.json({ 
      success: true, 
      project,
      message: timeBlock ? 'Time block set successfully' : undefined
    })
  } catch (error: any) {
    console.error('Error updating build project:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update build project' },
      { status: 500 }
    )
  }
}

