import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho } from '@/lib/email/zoho-config'
import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`
}

function getTierInfo(tierName: string) {
  const tierMap: Record<string, { name: string; paymentStructure: string; upfrontPercent: number; secondPercent?: number }> = {
    'Starter System': {
      name: 'Starter System',
      paymentStructure: '100% upfront',
      upfrontPercent: 100,
    },
    'Business System': {
      name: 'Business System',
      paymentStructure: '100% upfront',
      upfrontPercent: 100,
    },
    'Full Operations Suite': {
      name: 'Full Operations Suite',
      paymentStructure: '50% to begin · 50% before delivery',
      upfrontPercent: 50,
      secondPercent: 50,
    },
  }
  return tierMap[tierName] || tierMap['Starter System']
}

function createBuildEmailTemplate(
  consultation: any,
  invoice: ConsultationInvoice,
  tierName: string
): string {
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const tierInfo = getTierInfo(tierName)
  const pdfUrl = `${BASE_URL}/api/admin/labs/invoices/${invoice.invoiceId}/pdf`
  
  // Calculate expiration date (7 days from issue date)
  const expirationDate = new Date(invoice.issueDate)
  expirationDate.setDate(expirationDate.getDate() + 7)
  const expirationDateStr = formatDate(expirationDate.toISOString().split('T')[0])

  // Determine payment structure text
  const isSplitPayment = tierInfo.upfrontPercent < 100
  const upfrontAmount = isSplitPayment 
    ? Math.round(invoice.total * (tierInfo.upfrontPercent / 100))
    : invoice.total
  const secondAmount = isSplitPayment 
    ? Math.round(invoice.total * ((tierInfo.secondPercent || 0) / 100))
    : 0

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Proposal - ${tierName}</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: ${background};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${background}; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: ${card}; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, ${brand} 0%, #9D6B4F 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin:0; color: #FFFFFF; font-size: 28px; font-weight: bold;">
                🚀 Ready to Get Started: ${tierName}
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 32px;">
              <p style="margin:0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${textPrimary};">
                Hi ${consultation.contactName},
              </p>
              
              <p style="margin:0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${textPrimary};">
                Following our consultation, I'm pleased to move forward with setting up your system. Based on our discussion, we've selected the <strong>${tierName}</strong> for ${consultation.businessName}.
              </p>

              <div style="background-color: ${accent}; padding: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid ${brand};">
                <h2 style="margin:0 0 16px 0; color: ${brand}; font-size: 20px; font-weight: bold;">
                  📋 Project Summary
                </h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding: 8px 0; color: ${textSecondary}; font-weight: 600; width: 180px;">Tier Selected:</td>
                    <td style="padding: 8px 0; color: ${textPrimary}; font-weight: 600; font-size: 18px;">${tierName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: ${textSecondary}; font-weight: 600;">Total Cost:</td>
                    <td style="padding: 8px 0; color: ${textPrimary}; font-weight: 600; font-size: 18px;">${formatCurrency(invoice.total, invoice.currency)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: ${textSecondary}; font-weight: 600;">Payment Structure:</td>
                    <td style="padding: 8px 0; color: ${textPrimary}; font-weight: 600;">${tierInfo.paymentStructure}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #f0f7ff; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #7C4B31;">
                <h2 style="margin:0 0 16px 0; color: ${brand}; font-size: 20px; font-weight: bold;">
                  💳 Payment Structure
                </h2>
                <p style="margin:0 0 16px 0; font-size: 15px; line-height: 1.6; color: ${textPrimary};">
                  To reserve your project slot and ensure focused delivery, payment is structured as follows:
                </p>
                ${isSplitPayment ? `
                <div style="margin-bottom: 16px;">
                  <p style="margin:0 0 8px 0; font-size: 15px; color: ${textPrimary}; font-weight: 600;">
                    First Payment (${tierInfo.upfrontPercent}%): ${formatCurrency(upfrontAmount, invoice.currency)}
                  </p>
                  <p style="margin:0 0 0 0; font-size: 14px; color: ${textSecondary}; padding-left: 16px;">
                    • Reserves your project slot<br>
                    • Unlocks planning phase<br>
                    • Setup begins immediately upon receipt
                  </p>
                </div>
                <div>
                  <p style="margin:0 0 8px 0; font-size: 15px; color: ${textPrimary}; font-weight: 600;">
                    Second Payment (${tierInfo.secondPercent}%): ${formatCurrency(secondAmount, invoice.currency)}
                  </p>
                  <p style="margin:0 0 0 0; font-size: 14px; color: ${textSecondary}; padding-left: 16px;">
                    • Required before final handover<br>
                    • Required before live deployment<br>
                    • Required before domain connection<br>
                    <strong style="color: ${brand};">Until the second payment clears:</strong><br>
                    &nbsp;&nbsp;• Site remains in staging<br>
                    &nbsp;&nbsp;• Access remains limited<br>
                    &nbsp;&nbsp;• No assets are transferred
                  </p>
                </div>
                ` : `
                <div>
                  <p style="margin:0 0 8px 0; font-size: 15px; color: ${textPrimary}; font-weight: 600;">
                    Full Payment: ${formatCurrency(invoice.total, invoice.currency)}
                  </p>
                  <p style="margin:0 0 0 0; font-size: 14px; color: ${textSecondary}; padding-left: 16px;">
                    • Reserves your project slot<br>
                    • Unlocks project timeline<br>
                    • Setup begins immediately upon receipt
                  </p>
                </div>
                `}
              </div>

              <div style="background-color: #fff3cd; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #ffc107;">
                <h2 style="margin:0 0 12px 0; color: #856404; font-size: 18px; font-weight: bold;">
                  ⏰ Important: Invoice Expiration
                </h2>
                <p style="margin:0; font-size: 14px; line-height: 1.6; color: #856404;">
                  <strong>This invoice is valid for 7 days</strong> (expires ${expirationDateStr}).<br>
                  If unpaid, your project slot will be released to ensure we can serve other clients effectively.
                </p>
              </div>

              <div style="background-color: ${accent}; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                <h2 style="margin:0 0 16px 0; color: ${brand}; font-size: 20px; font-weight: bold;">
                  ✅ What Happens After Payment
                </h2>
                <p style="margin:0 0 12px 0; font-size: 15px; line-height: 1.6; color: ${textPrimary};">
                  Once payment is received, you'll immediately receive:
                </p>
                <ul style="margin:0; padding-left: 20px; color: ${textPrimary}; line-height: 1.8;">
                  <li><strong>Confirmation email</strong> with payment receipt</li>
                  <li><strong>Project timeline</strong> outlining milestones and delivery dates</li>
                  <li><strong>What you need from us</strong> - a clear list of assets and information we'll need</li>
                  <li><strong>What you should not worry about anymore</strong> - peace of mind that your system is in capable hands</li>
                </ul>
              </div>

              <div style="background-color: ${brand}; color: #FFFFFF; padding: 20px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
                <h2 style="margin:0 0 12px 0; font-size: 22px; font-weight: bold;">
                  Invoice ${invoice.invoiceNumber}
                </h2>
                <p style="margin:0 0 16px 0; font-size: 18px; font-weight: 600;">
                  Total: ${formatCurrency(invoice.total, invoice.currency)}
                </p>
                <p style="margin:0 0 16px 0; font-size: 14px; opacity: 0.9;">
                  Due Date: ${formatDate(invoice.dueDate)}<br>
                  Valid Until: ${expirationDateStr}
                </p>
                <a href="${pdfUrl}" style="display:inline-block; background: #FFFFFF; color: ${brand}; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; margin-top: 8px;">
                  View & Download Invoice PDF →
                </a>
              </div>

              <div style="border-top: 2px solid ${accent}; padding-top: 24px; margin-top: 24px;">
                <h2 style="margin:0 0 16px 0; color: ${brand}; font-size: 20px; font-weight: bold;">
                  📅 Timeline & Next Steps
                </h2>
                <p style="margin:0 0 16px 0; font-size: 15px; line-height: 1.6; color: ${textPrimary};">
                  After payment confirmation, we'll begin immediately. You'll receive detailed timelines and milestones within 24 hours of payment receipt.
                </p>
                <p style="margin:0; font-size: 15px; line-height: 1.6; color: ${textPrimary};">
                  If you have any questions about this proposal or the payment structure, please reply to this email. We're here to ensure a smooth process.
                </p>
              </div>

              <p style="margin:24px 0 0 0; font-size: 15px; line-height: 1.6; color: ${textPrimary};">
                Best regards,<br>
                <strong style="color: ${brand};">The LashDiary Labs Team</strong>
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
}

// POST - Send build email with invoice
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { tierName, invoiceId } = body

    if (!tierName) {
      return NextResponse.json(
        { error: 'Tier name is required' },
        { status: 400 }
      )
    }

    // Load consultation
    const consultationsData = await readDataFile<{ consultations: any[] }>(
      'labs-consultations.json',
      { consultations: [] }
    )
    const consultation = consultationsData.consultations.find(
      (c: any) => c.consultationId === params.id || c.submittedAt === params.id
    )

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }

    // Load invoice
    const invoices = await readDataFile<ConsultationInvoice[]>('labs-invoices.json', [])
    let invoice: ConsultationInvoice | undefined

    if (invoiceId) {
      invoice = invoices.find(inv => inv.invoiceId === invoiceId || inv.invoiceNumber === invoiceId)
    } else {
      // Find the most recent invoice for this consultation
      const consultationInvoices = invoices
        .filter(inv => inv.consultationId === consultation.consultationId || inv.consultationId === consultation.submittedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      invoice = consultationInvoices[0]
    }

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found. Please create an invoice first.' },
        { status: 404 }
      )
    }

    // Update consultation with outcome and selected tier
    consultation.outcome = 'build-now'
    consultation.selectedTier = tierName
    consultation.buildEmailSentAt = new Date().toISOString()
    
    const consultationIndex = consultationsData.consultations.findIndex(
      (c: any) => c.consultationId === consultation.consultationId || c.submittedAt === consultation.submittedAt
    )
    if (consultationIndex !== -1) {
      consultationsData.consultations[consultationIndex] = consultation
      await writeDataFile('labs-consultations.json', consultationsData)
    }

    // Generate email HTML
    const html = createBuildEmailTemplate(consultation, invoice, tierName)

    // Generate plain text version
    const tierInfo = getTierInfo(tierName)
    const isSplitPayment = tierInfo.upfrontPercent < 100
    const upfrontAmount = isSplitPayment 
      ? Math.round(invoice.total * (tierInfo.upfrontPercent / 100))
      : invoice.total
    const secondAmount = isSplitPayment 
      ? Math.round(invoice.total * ((tierInfo.secondPercent || 0) / 100))
      : 0

    const expirationDate = new Date(invoice.issueDate)
    expirationDate.setDate(expirationDate.getDate() + 7)
    const expirationDateStr = formatDate(expirationDate.toISOString().split('T')[0])

    const text = `
Ready to Get Started: ${tierName}

Hi ${consultation.contactName},

Following our consultation, I'm pleased to move forward with setting up your system. Based on our discussion, we've selected the ${tierName} for ${consultation.businessName}.

PROJECT SUMMARY
- Tier Selected: ${tierName}
- Total Cost: ${formatCurrency(invoice.total, invoice.currency)}
- Payment Structure: ${tierInfo.paymentStructure}

PAYMENT STRUCTURE
To reserve your project slot and ensure focused delivery, payment is structured as follows:

${isSplitPayment ? `
First Payment (${tierInfo.upfrontPercent}%): ${formatCurrency(upfrontAmount, invoice.currency)}
- Reserves your project slot
- Unlocks planning phase
- Setup begins immediately upon receipt

Second Payment (${tierInfo.secondPercent}%): ${formatCurrency(secondAmount, invoice.currency)}
- Required before final handover
- Required before live deployment
- Required before domain connection

Until the second payment clears:
- Site remains in staging
- Access remains limited
- No assets are transferred
` : `
Full Payment: ${formatCurrency(invoice.total, invoice.currency)}
- Reserves your project slot
- Unlocks project timeline
- Setup begins immediately upon receipt
`}

IMPORTANT: INVOICE EXPIRATION
This invoice is valid for 7 days (expires ${expirationDateStr}).
If unpaid, your project slot will be released to ensure we can serve other clients effectively.

WHAT HAPPENS AFTER PAYMENT
Once payment is received, you'll immediately receive:
- Confirmation email with payment receipt
- Project timeline outlining milestones and delivery dates
- What you need from us - a clear list of assets and information we'll need
- What you should not worry about anymore - peace of mind that your system is in capable hands

INVOICE ${invoice.invoiceNumber}
Total: ${formatCurrency(invoice.total, invoice.currency)}
Due Date: ${formatDate(invoice.dueDate)}
Valid Until: ${expirationDateStr}

View Invoice PDF: ${BASE_URL}/api/admin/labs/invoices/${invoice.invoiceId}/pdf

TIMELINE & NEXT STEPS
After payment confirmation, we'll begin immediately. You'll receive detailed timelines and milestones within 24 hours of payment receipt.

If you have any questions about this proposal or the payment structure, please reply to this email. We're here to ensure a smooth process.

Best regards,
The LashDiary Labs Team
    `.trim()

    // Send email
    const result = await sendEmailViaZoho({
      to: consultation.email,
      subject: `🚀 System Proposal: ${tierName} for ${consultation.businessName}`,
      html,
      text,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    // Update invoice status to 'sent' if it's currently 'draft'
    if (invoice.status === 'draft') {
      const invoiceIndex = invoices.findIndex(inv => inv.invoiceId === invoice.invoiceId)
      if (invoiceIndex !== -1) {
        invoice.status = 'sent'
        invoice.updatedAt = new Date().toISOString()
        invoices[invoiceIndex] = invoice
        await writeDataFile('labs-invoices.json', invoices)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Build email sent successfully',
      consultation,
      invoice,
    })
  } catch (error: any) {
    console.error('Error sending build email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send build email' },
      { status: 500 }
    )
  }
}

