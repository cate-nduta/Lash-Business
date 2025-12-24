import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho, FROM_EMAIL, EMAIL_FROM_NAME, BUSINESS_NOTIFICATION_EMAIL } from '@/lib/email/zoho-config'
import type { Consultation } from '@/types/consultation-workflow'
import type { Contract, ContractTerms } from '@/types/consultation-workflow'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function normalizeBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    'https://lashdiary.co.ke'

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

// POST: Generate contract and send email to client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { projectDescription, projectCost, contractTerms } = body

    if (!projectCost || !contractTerms) {
      return NextResponse.json(
        { error: 'Missing required fields: projectCost, contractTerms' },
        { status: 400 }
      )
    }

    // Get consultation
    const consultations = await readDataFile<Consultation[]>('consultations.json', [])
    const consultation = consultations.find(c => c.id === params.id)
    
    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }

    if (consultation.adminDecision !== 'proceed') {
      return NextResponse.json(
        { error: 'Consultation must be marked as "proceed" before sending contract' },
        { status: 400 }
      )
    }

    // Generate unique contract token
    const contractToken = crypto.randomBytes(32).toString('hex')
    
    // Create contract
    const contracts = await readDataFile<Contract[]>('contracts.json', [])
    
    const contract: Contract = {
      id: `contract-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      consultationId: consultation.id,
      clientName: consultation.clientName,
      clientEmail: consultation.clientEmail,
      contractToken,
      contractDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      projectDescription,
      projectCost,
      status: 'pending',
      signatureType: 'typed',
      contractTerms: contractTerms as ContractTerms,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    contracts.push(contract)
    await writeDataFile('contracts.json', contracts)

    // Update consultation with contract ID
    const consultationIndex = consultations.findIndex(c => c.id === params.id)
    if (consultationIndex !== -1) {
      consultations[consultationIndex] = {
        ...consultation,
        contractId: contract.id,
        updatedAt: new Date().toISOString(),
      }
      await writeDataFile('consultations.json', consultations)
    }

    // Send contract email to client
    const contractUrl = `${BASE_URL}/contract/${contractToken}`
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #FDF9F4;">
          <div style="background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #7C4B31; margin-top: 0;">Contract Ready for Review</h1>
            
            <p>Hello ${consultation.clientName},</p>
            
            <p>Thank you for your consultation. We're excited to work with you!</p>
            
            <p>Please review and sign your contract using the link below:</p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${contractUrl}" 
                 style="display: inline-block; background: #7C4B31; color: #FFFFFF; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Review & Sign Contract
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              <strong>Important:</strong> This link is unique to you and will remain active until you sign the contract. 
              Please review all terms carefully before signing.
            </p>
            
            <p style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E0E0E0; font-size: 14px; color: #666;">
              If you have any questions, please don't hesitate to reach out to us.
            </p>
            
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
              Best regards,<br>
              The LashDiary Team
            </p>
          </div>
        </body>
      </html>
    `

    const emailResult = await sendEmailViaZoho({
      to: consultation.clientEmail,
      subject: 'Your Contract is Ready for Review',
      html: emailHtml,
    })

    if (!emailResult.success) {
      console.error('Failed to send contract email:', emailResult.error)
      // Contract is still created, but email failed
    }

    return NextResponse.json({ 
      success: true,
      contract,
      contractUrl,
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    )
  }
}

