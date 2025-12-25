import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ContractTerms } from '@/types/consultation-workflow'

interface ContractTemplate {
  id: string
  name: string
  contractTerms: ContractTerms
  createdAt: string
  updatedAt: string
}

// GET - Get contract template
export async function GET(request: NextRequest) {
  try {
    const templates = await readDataFile<ContractTemplate[]>('labs-contract-templates.json', [])
    const template = templates.find(t => t.id === 'default') || templates[0]

    if (!template) {
      // Return default template
      const defaultTemplate: ContractTemplate = {
        id: 'default',
        name: 'Default Contract Template',
        contractTerms: {
          deliverables: {
            included: ['Custom booking website'],
            notIncluded: ['Ongoing marketing services'],
            extras: ['Additional revisions beyond limit'],
          },
          paymentTerms: {
            consultationFee: 0,
            consultationFeeNonRefundable: true,
            upfrontPercentage: 80,
            upfrontAmount: 0,
            finalPercentage: 20,
            finalAmount: 0,
            finalPaymentDue: 'before launch',
            invoiceExpiryDays: 7,
            noWorkWithoutPayment: true,
          },
          timelines: {
            clientResponsibilities: ['Provide content and materials'],
            clientDelays: 'Project timeline may be extended',
            providerDelays: 'We will communicate any delays promptly',
          },
          boundaries: {
            revisionLimit: 2,
            revisionType: 'rounds',
            noRefundsAfterStart: true,
            noEndlessChanges: true,
          },
          confidentiality: {
            providerRetainsIPUntilPayment: true,
            clientReceivesIPOnFullPayment: true,
            mutualNDA: true,
          },
          cancellation: {
            clientCancellationPolicy: 'Consultation fee is non-refundable',
            providerCancellationPolicy: 'Full refund if we cancel',
          },
          liability: {
            noIndirectDamages: true,
            noThirdPartyResponsibility: true,
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return NextResponse.json({ template: defaultTemplate })
    }

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Error fetching contract template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract template' },
      { status: 500 }
    )
  }
}

// PUT - Update contract template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { template } = body

    if (!template || !template.contractTerms) {
      return NextResponse.json(
        { error: 'Invalid template data' },
        { status: 400 }
      )
    }

    const templates = await readDataFile<ContractTemplate[]>('labs-contract-templates.json', [])
    const existingIndex = templates.findIndex(t => t.id === template.id || t.id === 'default')

    const updatedTemplate: ContractTemplate = {
      ...template,
      id: 'default',
      updatedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      templates[existingIndex] = updatedTemplate
    } else {
      templates.push(updatedTemplate)
    }

    await writeDataFile('labs-contract-templates.json', templates)

    return NextResponse.json({ success: true, template: updatedTemplate })
  } catch (error: any) {
    console.error('Error updating contract template:', error)
    return NextResponse.json(
      { error: 'Failed to update contract template' },
      { status: 500 }
    )
  }
}

