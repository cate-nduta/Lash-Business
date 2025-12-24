/**
 * Post-Consultation Workflow Types
 * 
 * This module defines types for the post-consultation workflow system,
 * including consultations, contracts, and invoices.
 */

export interface Consultation {
  id: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  consultationDate: string
  consultationType?: string
  notes?: string
  status: 'pending' | 'completed' | 'declined'
  adminDecision?: 'proceed' | 'decline'
  adminDecisionAt?: string
  adminDecisionNotes?: string
  contractId?: string
  invoiceId?: string
  createdAt: string
  updatedAt: string
}

export interface Contract {
  id: string
  consultationId: string
  clientName: string
  clientEmail: string
  contractToken: string // Unique token for private URL
  contractDate: string // Auto-generated date
  projectDescription?: string
  projectCost: number
  status: 'pending' | 'signed' | 'expired'
  signedAt?: string
  signedByName?: string
  signatureData?: string // Base64 signature image or typed name
  signatureType: 'typed' | 'drawn'
  clientIpAddress?: string
  contractTerms: ContractTerms
  createdAt: string
  updatedAt: string
}

export interface ContractTerms {
  deliverables: {
    included: string[]
    notIncluded: string[]
    extras: string[]
  }
  paymentTerms: {
    consultationFee: number
    consultationFeeNonRefundable: boolean
    upfrontPercentage: number
    upfrontAmount: number
    finalPercentage: number
    finalAmount: number
    finalPaymentDue: string // e.g., "before launch"
    invoiceExpiryDays: number
    noWorkWithoutPayment: boolean
  }
  timelines: {
    clientResponsibilities: string[]
    clientDelays: string
    providerDelays: string
  }
  boundaries: {
    revisionLimit: number
    revisionType: string
    noRefundsAfterStart: boolean
    noEndlessChanges: boolean
  }
  confidentiality: {
    providerRetainsIPUntilPayment: boolean
    clientReceivesIPOnFullPayment: boolean
    mutualNDA: boolean
  }
  cancellation: {
    clientCancellationPolicy: string
    providerCancellationPolicy: string
  }
  liability: {
    noIndirectDamages: boolean
    noThirdPartyResponsibility: boolean
  }
}

export interface Invoice {
  id: string
  contractId: string
  consultationId: string
  clientName: string
  clientEmail: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  expiryDate: string // 7 days from issue
  amount: number
  description: string
  status: 'draft' | 'sent' | 'paid' | 'expired' | 'cancelled'
  paidAt?: string
  paymentMethod?: string
  paymentReference?: string // Paystack transaction reference
  notes: string // "Work begins only after payment is received"
  createdAt: string
  updatedAt: string
}

