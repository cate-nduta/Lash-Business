import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho, FROM_EMAIL, EMAIL_FROM_NAME, BUSINESS_NOTIFICATION_EMAIL } from '@/lib/email/zoho-config'
import type { Contract } from '@/types/consultation-workflow'
import type { Invoice } from '@/types/consultation-workflow'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Get client IP address
function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return undefined
}

// POST: Sign contract
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { signatureType, signatureData, signedByName } = body
    const clientIp = getClientIp(request)

    if (!signatureData) {
      return NextResponse.json(
        { error: 'Signature data is required' },
        { status: 400 }
      )
    }

    // Get contract
    const contracts = await readDataFile<Contract[]>('contracts.json', [])
    const contractIndex = contracts.findIndex(c => c.id === params.id)
    
    if (contractIndex === -1) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    const contract = contracts[contractIndex]

    if (contract.status === 'signed') {
      return NextResponse.json(
        { error: 'Contract has already been signed' },
        { status: 400 }
      )
    }

    if (contract.status === 'expired') {
      return NextResponse.json(
        { error: 'Contract has expired' },
        { status: 410 }
      )
    }

    // Update contract
    const updated: Contract = {
      ...contract,
      status: 'signed',
      signedAt: new Date().toISOString(),
      signedByName: signedByName || contract.clientName,
      signatureData,
      signatureType,
      clientIpAddress: clientIp,
      updatedAt: new Date().toISOString(),
    }

    contracts[contractIndex] = updated
    await writeDataFile('contracts.json', contracts)

    // Create invoice (80% upfront)
    const invoices = await readDataFile<Invoice[]>('invoices.json', [])
    const issueDate = new Date()
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + 7) // 7 days from issue
    const expiryDate = new Date(dueDate)

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const upfrontAmount = Math.round(contract.projectCost * 0.8)

    const invoice: Invoice = {
      id: `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      contractId: contract.id,
      consultationId: contract.consultationId,
      clientName: contract.clientName,
      clientEmail: contract.clientEmail,
      invoiceNumber,
      issueDate: issueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      amount: upfrontAmount,
      description: contract.projectDescription || 'Project Services - 80% Upfront Payment',
      status: 'sent',
      notes: 'Work begins only after payment is received.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    invoices.push(invoice)
    await writeDataFile('invoices.json', invoices)

    // Generate Paystack payment link for the invoice
    let paymentUrl: string | null = null
    try {
      const { initializeTransaction } = await import('@/lib/paystack-utils')
      const paymentResult = await initializeTransaction({
        email: contract.clientEmail.toLowerCase().trim(),
        amount: upfrontAmount,
        currency: 'KES',
        metadata: {
          payment_type: 'invoice',
          invoice_id: invoice.id,
          invoice_number: invoiceNumber,
          contract_id: contract.id,
          consultation_id: contract.consultationId,
          payment_stage: 'upfront_80', // Mark as 80% upfront payment
        },
        customerName: contract.clientName,
      })

      if (paymentResult.success && paymentResult.authorizationUrl) {
        paymentUrl = paymentResult.authorizationUrl
        // Store payment reference in invoice
        invoice.paymentReference = paymentResult.reference
        const invoiceIndex = invoices.findIndex(inv => inv.id === invoice.id)
        if (invoiceIndex !== -1) {
          invoices[invoiceIndex] = invoice
          await writeDataFile('invoices.json', invoices)
        }
      }
    } catch (paymentError) {
      console.error('Error generating payment link:', paymentError)
      // Continue without payment link - admin can generate it later
    }

    // Update contract with invoice ID
    const updatedContract = {
      ...updated,
      // We'll track invoice separately, but could add invoiceId field to Contract type
    }

    // Send confirmation email to client
    const clientEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #FDF9F4;">
          <div style="background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #7C4B31; margin-top: 0;">Contract Signed Successfully</h1>
            
            <p>Hello ${contract.clientName},</p>
            
            <p>Thank you for signing the contract. We're excited to begin working with you!</p>
            
            <p>Your invoice for the upfront payment (80% of project cost) has been generated and will be sent to you shortly.</p>
            
            <p style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E0E0E0; font-size: 14px; color: #666;">
              You can download a copy of your signed contract from your account or contact us if you need assistance.
            </p>
            
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
              Best regards,<br>
              The LashDiary Team
            </p>
          </div>
        </body>
      </html>
    `

    await sendEmailViaZoho({
      to: contract.clientEmail,
      subject: 'Contract Signed - Next Steps',
      html: clientEmailHtml,
    })

    // Send notification to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #FDF9F4;">
          <div style="background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #7C4B31; margin-top: 0;">Contract Signed</h1>
            
            <p><strong>Client:</strong> ${contract.clientName}</p>
            <p><strong>Email:</strong> ${contract.clientEmail}</p>
            <p><strong>Signed At:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>IP Address:</strong> ${clientIp || 'Not available'}</p>
            
            <p style="margin-top: 24px;">
              The contract has been signed and an invoice has been automatically generated for the upfront payment (80%).
            </p>
            
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
              — LashDiary System
            </p>
          </div>
        </body>
      </html>
    `

    await sendEmailViaZoho({
      to: BUSINESS_NOTIFICATION_EMAIL,
      subject: `Contract Signed: ${contract.clientName}`,
      html: adminEmailHtml,
    })

    // Send invoice email to client
    const invoiceEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #FDF9F4;">
          <div style="background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #7C4B31; margin-top: 0;">Invoice #${invoiceNumber}</h1>
            
            <p>Hello ${contract.clientName},</p>
            
            <p>Thank you for signing the contract. Please find your invoice below:</p>
            
            <div style="background: #F3E6DC; border-radius: 6px; padding: 20px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B;"><strong>Description:</strong></td>
                  <td style="padding: 8px 0; color: #3E2A20;">${invoice.description}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B4A3B;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; color: #3E2A20; font-size: 20px; font-weight: bold;">KES ${upfrontAmount.toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #FFF3CD; border-left: 4px solid #FFC107; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #856404; font-weight: 600;">
                ⚠️ Important: Work begins only after payment is received.
              </p>
            </div>
            
            ${paymentUrl ? `
            <div style="background: #E8F5E9; border: 2px solid #4CAF50; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
              <h2 style="margin: 0 0 16px 0; color: #2E7D32; font-size: 20px;">💳 Pay Now</h2>
              <p style="margin: 0 0 20px 0; color: #333; font-size: 15px;">
                Click the button below to pay this invoice securely (Card or M-Pesa).
              </p>
              <a href="${paymentUrl}" style="display: inline-block; background: #7C4B31; color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 12px rgba(124,75,49,0.3);">
                Pay KES ${upfrontAmount.toLocaleString()} →
              </a>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #666;">
                Secure payment processing
              </p>
            </div>
            ` : `
            <p style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #E0E0E0; font-size: 14px; color: #666;">
              Please make payment to secure your project slot. We'll send you a payment link shortly.
            </p>
            `}
            
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
              Best regards,<br>
              The LashDiary Team
            </p>
          </div>
        </body>
      </html>
    `

    await sendEmailViaZoho({
      to: contract.clientEmail,
      subject: `Invoice #${invoiceNumber} - Upfront Payment Required`,
      html: invoiceEmailHtml,
    })

    return NextResponse.json({ 
      success: true,
      contract: updatedContract,
      invoice,
    })
  } catch (error) {
    console.error('Error signing contract:', error)
    return NextResponse.json(
      { error: 'Failed to sign contract' },
      { status: 500 }
    )
  }
}

