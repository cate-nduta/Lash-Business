import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'
import { sendModelRejectionEmail } from '@/lib/email/model-rejection-email'

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
    const { action, applicationId, status, personalNote } = body

    if (action === 'updateStatus') {
      const data = await readDataFile<{ applications: any[] }>('model-applications.json', { applications: [] })
      const application = data.applications.find((app: any) => app.id === applicationId)
      if (application) {
        const previousStatus = application.status
        application.status = status
        await writeDataFile('model-applications.json', data)
        
        // Send rejection email if status changed to 'rejected'
        if (status === 'rejected' && previousStatus !== 'rejected') {
          try {
            const emailResult = await sendModelRejectionEmail({
              email: application.email,
              firstName: application.firstName || 'there',
              personalNote: body.personalNote,
            })
            
            if (emailResult.success) {
              console.log(`Rejection email sent to ${application.email}`)
              return NextResponse.json({ 
                success: true, 
                emailSent: true,
                message: 'Status updated and rejection email sent successfully' 
              })
            } else {
              console.error(`Failed to send rejection email to ${application.email}:`, emailResult.error)
              // Still return success for status update, but note email failure
              return NextResponse.json({ 
                success: true, 
                emailSent: false,
                emailError: emailResult.error,
                message: 'Status updated, but failed to send rejection email' 
              })
            }
          } catch (emailError: any) {
            console.error('Error sending rejection email:', emailError)
            // Status update succeeded, but email failed - still return success
            return NextResponse.json({ 
              success: true, 
              emailSent: false,
              emailError: emailError?.message || String(emailError),
              message: 'Status updated, but failed to send rejection email' 
            })
          }
        }
        
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

