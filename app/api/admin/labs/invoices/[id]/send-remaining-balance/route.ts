import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho } from '@/lib/email/zoho-config'
import type { ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'
import { initializeTransaction } from '@/lib/paystack-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

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
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

// POST - Send remaining balance (20%) email
export async function POST(
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

    // Calculate remaining balance (20% of total)
    const remainingBalance = Math.round(invoice.total * 0.2)
    const alreadyPaid = invoice.invoiceAmount || invoice.total * 0.8 // Assume 80% was paid if invoiceAmount exists

    // Check if this is a downpayment invoice
    if (invoice.invoiceType !== 'downpayment' && invoice.invoiceType !== undefined) {
      return NextResponse.json(
        { error: 'This invoice is not a downpayment invoice. Remaining balance can only be sent for downpayment invoices.' },
        { status: 400 }
      )
    }

    // Generate Paystack payment link for remaining balance
    let paymentUrl: string | undefined = undefined
    try {
      const baseUrl = normalizeBaseUrl()
      const paymentResult = await initializeTransaction({
        email: invoice.email,
        amount: remainingBalance,
        currency: invoice.currency || 'KES',
        metadata: {
          payment_type: 'invoice_remaining_balance',
          invoice_id: invoice.invoiceId,
          invoice_number: invoice.invoiceNumber,
          payment_stage: 'final_20',
        },
        customerName: invoice.contactName || invoice.businessName,
        phone: invoice.phone,
        callbackUrl: `${baseUrl}/api/paystack/callback`,
      })
      
      if (paymentResult.success && paymentResult.authorizationUrl) {
        paymentUrl = paymentResult.authorizationUrl
      }
    } catch (error) {
      console.warn('Failed to generate payment link for remaining balance:', error)
      // Continue without payment link
    }

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #FDF9F4;">
          <div style="background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #7C4B31; margin-top: 0;">Final Payment Required - Invoice ${invoice.invoiceNumber}</h1>
            
            <p>Hello ${invoice.contactName},</p>
            
            <p>Thank you for your upfront payment. We're making great progress on your project!</p>
            
            <p>This email is to request the final payment (20% remaining balance) for your project.</p>
            
            <div style="background: #F3E6DC; border-radius: 6px; padding: 20px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B;"><strong>Invoice Number:</strong></td>
                  <td style="padding: 8px 0; color: #3E2A20;">${invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B;"><strong>Project Total:</strong></td>
                  <td style="padding: 8px 0; color: #3E2A20;">${formatCurrency(invoice.total, invoice.currency)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B;"><strong>Already Paid (80%):</strong></td>
                  <td style="padding: 8px 0; color: #3E2A20;">${formatCurrency(alreadyPaid, invoice.currency)}</td>
                </tr>
                <tr style="border-top: 2px solid #7C4B31; margin-top: 8px;">
                  <td style="padding: 12px 0; color: #7C4B31;"><strong>Remaining Balance (20%):</strong></td>
                  <td style="padding: 12px 0; color: #7C4B31; font-size: 24px; font-weight: bold;">${formatCurrency(remainingBalance, invoice.currency)}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #FFF3CD; border-left: 4px solid #FFC107; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #856404; font-weight: 600;">
                ⚠️ Important: Final payment is required before project completion and launch.
              </p>
            </div>
            
            ${paymentUrl ? `
            <div style="background: #E8F5E9; border: 2px solid #4CAF50; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
              <h2 style="margin: 0 0 16px 0; color: #2E7D32; font-size: 20px;">💳 Pay Final Balance Now</h2>
              <p style="margin: 0 0 20px 0; color: #333; font-size: 15px;">
                Click the button below to pay the remaining balance securely (Card or M-Pesa).
              </p>
              <a href="${paymentUrl}" style="display: inline-block; background: #7C4B31; color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 12px rgba(124,75,49,0.3);">
                Pay ${formatCurrency(remainingBalance, invoice.currency)} →
              </a>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #666;">
                Secure payment processing via PesaPal
              </p>
            </div>
            ` : `
            <p style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #E0E0E0; font-size: 14px; color: #666;">
              Please make payment to complete your project. We'll send you a payment link shortly if needed.
            </p>
            `}
            
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
              If you have any questions about this payment, please don't hesitate to reach out to us.
            </p>
            
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
              Best regards,<br>
              The LashDiary Labs Team
            </p>
          </div>
        </body>
      </html>
    `

    // Send email
    const result = await sendEmailViaZoho({
      to: invoice.email,
      subject: `Final Payment Required - Invoice ${invoice.invoiceNumber} (20% Remaining Balance)`,
      html: emailHtml,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Remaining balance email sent successfully',
      remainingBalance,
      paymentUrl,
    })
  } catch (error: any) {
    console.error('Error sending remaining balance email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send remaining balance email' },
      { status: 500 }
    )
  }
}

