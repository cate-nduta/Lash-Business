import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Get a specific invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    const invoice = invoices.find(inv => inv.invoiceId === params.id || inv.invoiceNumber === params.id)

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error loading invoice:', error)
    return NextResponse.json(
      { error: 'Failed to load invoice' },
      { status: 500 }
    )
  }
}

// PATCH - Update invoice (status, items, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    const invoiceIndex = invoices.findIndex(inv => inv.invoiceId === params.id || inv.invoiceNumber === params.id)

    if (invoiceIndex === -1) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoices[invoiceIndex]

    // Update allowed fields
    if (body.status !== undefined) {
      const oldStatus = invoice.status
      invoice.status = body.status
      
      // If invoice is marked as paid, create or update build project
      if (body.status === 'paid' && oldStatus !== 'paid') {
        try {
          // Load consultation to get full details
          const consultationsData = await readDataFile<{ consultations: any[] }>(
            'labs-consultations.json',
            { consultations: [] }
          )
          const consultation = consultationsData.consultations.find(
            (c: any) => c.consultationId === invoice.consultationId || c.submittedAt === invoice.consultationId
          )
          
          if (consultation) {
            // Check if build project already exists
            const projects = await readDataFile<any[]>('labs-build-projects.json', [])
            const existingProject = projects.find(p => p.invoiceId === invoice.invoiceId)
            
            const tierName = consultation.selectedTier || consultation.interestedTier || 'Unknown'
            const isTier3 = tierName.includes('Full Operations Suite')
            
            if (!existingProject) {
              // Create new build project
              const project = {
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
                status: 'slot-reserved' as const,
                milestones: {
                  buildSlotReserved: {
                    date: new Date().toISOString(),
                    notes: 'Build slot reserved upon payment receipt',
                  },
                },
                paymentStatus: {
                  upfrontPaid: true,
                  upfrontPaidDate: new Date().toISOString(),
                  secondPaid: false,
                  totalPaid: isTier3 ? Math.round(invoice.total * 0.5) : invoice.total,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              
              projects.push(project)
              await writeDataFile('labs-build-projects.json', projects)
              console.log('Build project created automatically for paid invoice')
            } else {
              // Update existing project payment status
              const projectIndex = projects.findIndex(p => p.projectId === existingProject.projectId)
              if (projectIndex >= 0) {
                if (isTier3) {
                  projects[projectIndex].paymentStatus.upfrontPaid = true
                  projects[projectIndex].paymentStatus.upfrontPaidDate = new Date().toISOString()
                  projects[projectIndex].paymentStatus.totalPaid = Math.round(invoice.total * 0.5)
                  if (!projects[projectIndex].milestones.buildSlotReserved) {
                    projects[projectIndex].milestones.buildSlotReserved = {
                      date: new Date().toISOString(),
                      notes: 'Build slot reserved upon payment receipt',
                    }
                  }
                  projects[projectIndex].status = 'slot-reserved'
                } else {
                  projects[projectIndex].paymentStatus.upfrontPaid = true
                  projects[projectIndex].paymentStatus.upfrontPaidDate = new Date().toISOString()
                  projects[projectIndex].paymentStatus.totalPaid = invoice.total
                  if (!projects[projectIndex].milestones.buildSlotReserved) {
                    projects[projectIndex].milestones.buildSlotReserved = {
                      date: new Date().toISOString(),
                      notes: 'Build slot reserved upon payment receipt',
                    }
                  }
                  projects[projectIndex].status = 'slot-reserved'
                }
                projects[projectIndex].updatedAt = new Date().toISOString()
                await writeDataFile('labs-build-projects.json', projects)
              }
            }
          }
        } catch (projectError) {
          console.error('Error creating/updating build project:', projectError)
          // Don't fail invoice update if project creation fails
        }
      }
    }
    if (body.items !== undefined) {
      invoice.items = body.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: (item.unitPrice || 0) * (item.quantity || 1),
      }))
      // Recalculate totals
      invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0)
      invoice.tax = invoice.taxRate ? invoice.subtotal * (invoice.taxRate / 100) : undefined
      invoice.total = invoice.subtotal + (invoice.tax || 0)
    }
    if (body.taxRate !== undefined) {
      invoice.taxRate = body.taxRate
      invoice.tax = body.taxRate ? invoice.subtotal * (body.taxRate / 100) : undefined
      invoice.total = invoice.subtotal + (invoice.tax || 0)
    }
    if (body.notes !== undefined) {
      invoice.notes = body.notes
    }
    if (body.dueDate !== undefined) {
      invoice.dueDate = body.dueDate
    }
    if (body.upfrontPaid !== undefined) {
      invoice.upfrontPaid = body.upfrontPaid
    }
    if (body.secondPaid !== undefined) {
      invoice.secondPaid = body.secondPaid
    }

    // Auto-update overall status if both payments are marked as paid
    if (invoice.upfrontPaid && invoice.secondPaid && invoice.status !== 'paid') {
      invoice.status = 'paid'
    } else if (invoice.status === 'paid' && (!invoice.upfrontPaid || !invoice.secondPaid)) {
      // If status is paid but one payment is unmarked, keep status as paid but log it
      // (Admin can manually change if needed)
    }

    invoice.updatedAt = new Date().toISOString()
    invoices[invoiceIndex] = invoice
    await writeDataFile('labs-invoices.json', invoices)

    return NextResponse.json({ success: true, invoice })
  } catch (error: any) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an expired invoice and send build slot release email
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    const invoiceIndex = invoices.findIndex(inv => inv.invoiceId === params.id || inv.invoiceNumber === params.id)

    if (invoiceIndex === -1) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoices[invoiceIndex]

    // Only allow deletion of expired invoices
    if (invoice.status !== 'expired') {
      return NextResponse.json(
        { error: `Cannot delete invoice with status: ${invoice.status}. Only expired invoices can be deleted.` },
        { status: 400 }
      )
    }

    // Send build slot release email before deletion
    try {
      const { sendEmailViaZoho } = await import('@/lib/email/zoho-config')
      const emailResult = await sendBuildSlotReleaseEmail(invoice)
      
      if (!emailResult.success) {
        console.error('Failed to send build slot release email:', emailResult.error)
        // Continue with deletion even if email fails
      }
    } catch (emailError) {
      console.error('Error sending build slot release email:', emailError)
      // Continue with deletion even if email fails
    }

    // Remove invoice from array
    invoices.splice(invoiceIndex, 1)
    await writeDataFile('labs-invoices.json', invoices)

    return NextResponse.json({
      success: true,
      message: 'Expired invoice deleted and build slot release email sent',
    })
  } catch (error: any) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}

async function sendBuildSlotReleaseEmail(invoice: ConsultationInvoice) {
  const { sendEmailViaZoho } = await import('@/lib/email/zoho-config')
  
  function normalizeBaseUrl(): string {
    const raw =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      ''
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const trimmed = raw.trim().replace(/\/+$/, '')
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed
      }
      return `https://${trimmed}`
    }
    return 'https://lashdiary.co.ke'
  }

  const BASE_URL = normalizeBaseUrl()
  const EMAIL_STYLES = {
    background: '#FDF9F4',
    card: '#FFFFFF',
    accent: '#F3E6DC',
    textPrimary: '#3E2A20',
    textSecondary: '#6B4A3B',
    brand: '#7C4B31',
  }
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: ${background};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${background}; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: ${card}; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, ${brand} 0%, #9D6B4F 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin:0; color: #FFFFFF; font-size: 28px; font-weight: bold;">
                Important Update About Your Build Slot
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 32px;">
              <p style="margin:0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${textPrimary};">
                Hi ${invoice.contactName},
              </p>
              
              <p style="margin:0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${textPrimary};">
                This email is to inform you that Invoice <strong>${invoice.invoiceNumber}</strong> for ${invoice.businessName} has expired after 7 days without payment.
              </p>

              <div style="background-color: #fff3cd; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #ffc107;">
                <h2 style="margin:0 0 12px 0; color: #856404; font-size: 18px; font-weight: bold;">
                  ⚠️ Build Slot Released
                </h2>
                <p style="margin:0; font-size: 14px; line-height: 1.6; color: #856404;">
                  As stated in the original invoice, your build slot has been released to ensure we can serve other clients effectively. The invoice expired on ${invoice.expirationDate ? formatDate(invoice.expirationDate) : 'the due date'}.
                </p>
              </div>

              <div style="background-color: ${accent}; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                <h2 style="margin:0 0 16px 0; color: ${brand}; font-size: 20px; font-weight: bold;">
                  Invoice Details
                </h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding: 8px 0; color: ${textSecondary}; font-weight: 600; width: 180px;">Invoice Number:</td>
                    <td style="padding: 8px 0; color: ${textPrimary}; font-weight: 600;">${invoice.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: ${textSecondary}; font-weight: 600;">Total Amount:</td>
                    <td style="padding: 8px 0; color: ${textPrimary}; font-weight: 600;">${invoice.total.toLocaleString()} ${invoice.currency}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: ${textSecondary}; font-weight: 600;">Issue Date:</td>
                    <td style="padding: 8px 0; color: ${textPrimary};">${formatDate(invoice.issueDate)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: ${textSecondary}; font-weight: 600;">Expired:</td>
                    <td style="padding: 8px 0; color: ${textPrimary};">${invoice.expirationDate ? formatDate(invoice.expirationDate) : 'N/A'}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #e3f2fd; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #2196f3;">
                <h2 style="margin:0 0 12px 0; color: #1565c0; font-size: 18px; font-weight: bold;">
                  💡 What This Means
                </h2>
                <p style="margin:0 0 12px 0; font-size: 14px; line-height: 1.6; color: #1565c0;">
                  Your project slot has been released. If you're still interested in moving forward with your system setup, please contact us to discuss next steps.
                </p>
                <p style="margin:0; font-size: 14px; line-height: 1.6; color: #1565c0;">
                  We understand that circumstances can change. If you'd like to proceed, we can discuss creating a new invoice and reserving a new project slot.
                </p>
              </div>

              <p style="margin:24px 0 0 0; font-size: 15px; line-height: 1.6; color: ${textPrimary};">
                If you have any questions or would like to discuss your project further, please reply to this email or contact us at hello@lashdiary.co.ke.
              </p>

              <p style="margin:24px 0 0 0; font-size: 15px; line-height: 1.6; color: ${textPrimary};">
                Best regards,<br>
                <strong style="color: ${brand};">The LashDiary Labs Team</strong>
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 32px; background-color: ${accent}; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin:0; color: ${textSecondary}; font-size: 14px;">
                This is an automated notification. Your build slot has been released as per the invoice terms.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `
Build Slot Released

Hi ${invoice.contactName},

This email is to inform you that Invoice ${invoice.invoiceNumber} for ${invoice.businessName} has expired after 7 days without payment.

BUILD SLOT RELEASED
As stated in the original invoice, your build slot has been released to ensure we can serve other clients effectively. The invoice expired on ${invoice.expirationDate ? formatDate(invoice.expirationDate) : 'the due date'}.

INVOICE DETAILS
- Invoice Number: ${invoice.invoiceNumber}
- Total Amount: ${invoice.total.toLocaleString()} ${invoice.currency}
- Issue Date: ${formatDate(invoice.issueDate)}
- Expired: ${invoice.expirationDate ? formatDate(invoice.expirationDate) : 'N/A'}

WHAT THIS MEANS
Your project slot has been released. If you're still interested in moving forward with your system setup, please contact us to discuss next steps.

We understand that circumstances can change. If you'd like to proceed, we can discuss creating a new invoice and reserving a new project slot.

If you have any questions or would like to discuss your project further, please reply to this email or contact us at hello@lashdiary.co.ke.

Best regards,
The LashDiary Labs Team
  `.trim()

  return await sendEmailViaZoho({
    to: invoice.email,
    subject: `Build Slot Released - Invoice ${invoice.invoiceNumber} Expired`,
    html,
    text,
  })
}

