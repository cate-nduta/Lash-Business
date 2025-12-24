/**
 * Paystack Utility Functions
 * 
 * Common utilities for Paystack payment integration
 */

import { createHmac } from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY_LIVE || ''
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY_LIVE || ''
const PAYSTACK_ENVIRONMENT = process.env.PAYSTACK_ENVIRONMENT || 'test'
const PAYSTACK_BASE_URL = 'https://api.paystack.co'
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || ''

export interface InitializeTransactionParams {
  email: string
  amount: number // Amount in main currency (will be converted to subunits)
  currency?: string // Default: 'KES'
  reference?: string // Optional: custom reference
  callbackUrl?: string // Optional: custom callback URL
  metadata?: Record<string, any> // Optional: additional metadata
  customerName?: string
  phone?: string
}

export interface InitializeTransactionResponse {
  success: boolean
  authorizationUrl?: string
  reference?: string
  accessCode?: string
  error?: string
}

export interface VerifyTransactionResponse {
  success: boolean
  transaction?: {
    reference: string
    amount: number // Amount in main currency (converted from subunits)
    currency: string
    status: string
    paidAt?: string
    customer?: {
      email: string
      first_name?: string
      last_name?: string
    }
  }
  error?: string
}

/**
 * Convert amount to subunits based on currency
 * KES, USD, etc. use cents (multiply by 100)
 */
export function convertToSubunits(amount: number, currency: string = 'KES'): number {
  // Most currencies use 100 subunits (cents, kobo, etc.)
  const subunitMultiplier: Record<string, number> = {
    KES: 100,
    USD: 100,
    NGN: 100,
    GHS: 100,
    ZAR: 100,
    XOF: 1, // XOF uses 1 subunit
  }

  const multiplier = subunitMultiplier[currency.toUpperCase()] || 100
  return Math.round(amount * multiplier)
}

/**
 * Convert amount from subunits to main currency
 */
export function convertFromSubunits(amount: number, currency: string = 'KES'): number {
  const subunitMultiplier: Record<string, number> = {
    KES: 100,
    USD: 100,
    NGN: 100,
    GHS: 100,
    ZAR: 100,
    XOF: 1,
  }

  const multiplier = subunitMultiplier[currency.toUpperCase()] || 100
  return amount / multiplier
}

/**
 * Generate unique transaction reference
 */
export function generateReference(prefix: string = 'ref'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Initialize a Paystack transaction
 */
export async function initializeTransaction(
  params: InitializeTransactionParams
): Promise<InitializeTransactionResponse> {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return {
        success: false,
        error: 'Paystack secret key not configured',
      }
    }

    const {
      email,
      amount,
      currency = 'KES',
      reference: customReference,
      callbackUrl,
      metadata = {},
      customerName,
      phone,
    } = params

    // Convert amount to subunits
    const amountInSubunits = convertToSubunits(amount, currency)

    // Generate reference if not provided
    const reference = customReference || generateReference()

    // Get base URL for callback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'
    const defaultCallbackUrl = `${baseUrl}/api/paystack/callback`
    const finalCallbackUrl = callbackUrl || defaultCallbackUrl

    // Prepare metadata
    const transactionMetadata: Record<string, any> = {
      ...metadata,
    }

    if (customerName) {
      transactionMetadata.custom_fields = [
        {
          display_name: 'Customer Name',
          variable_name: 'customer_name',
          value: customerName,
        },
      ]
    }

    if (phone) {
      if (!transactionMetadata.custom_fields) {
        transactionMetadata.custom_fields = []
      }
      transactionMetadata.custom_fields.push({
        display_name: 'Phone Number',
        variable_name: 'phone',
        value: phone,
      })
    }

    // Initialize transaction with Paystack
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInSubunits,
        currency: currency.toUpperCase(),
        reference,
        callback_url: finalCallbackUrl,
        metadata: Object.keys(transactionMetadata).length > 0 ? transactionMetadata : undefined,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      return {
        success: false,
        error: data.message || 'Failed to initialize transaction',
      }
    }

    return {
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code,
    }
  } catch (error: any) {
    console.error('Error initializing Paystack transaction:', error)
    return {
      success: false,
      error: error.message || 'Failed to initialize transaction',
    }
  }
}

/**
 * Verify a Paystack transaction
 */
export async function verifyTransaction(
  reference: string
): Promise<VerifyTransactionResponse> {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return {
        success: false,
        error: 'Paystack secret key not configured',
      }
    }

    if (!reference) {
      return {
        success: false,
        error: 'Reference is required',
      }
    }

    // Verify transaction with Paystack
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok || !data.status) {
      return {
        success: false,
        error: data.message || 'Transaction verification failed',
      }
    }

    const transaction = data.data

    return {
      success: true,
      transaction: {
        reference: transaction.reference,
        amount: convertFromSubunits(transaction.amount, transaction.currency),
        currency: transaction.currency,
        status: transaction.status,
        paidAt: transaction.paid_at,
        customer: transaction.customer
          ? {
              email: transaction.customer.email,
              first_name: transaction.customer.first_name,
              last_name: transaction.customer.last_name,
            }
          : undefined,
      },
    }
  } catch (error: any) {
    console.error('Error verifying Paystack transaction:', error)
    return {
      success: false,
      error: error.message || 'Failed to verify transaction',
    }
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  if (!PAYSTACK_WEBHOOK_SECRET || !signature) {
    // If webhook secret is not configured, skip verification (not recommended for production)
    console.warn('Paystack webhook secret not configured, skipping signature verification')
    return true
  }

  const hash = createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  return hash === signature
}

/**
 * Get Paystack configuration status
 */
export function getPaystackConfig(): {
  configured: boolean
  environment: string
  hasSecretKey: boolean
  hasPublicKey: boolean
  hasWebhookSecret: boolean
} {
  return {
    configured: Boolean(PAYSTACK_SECRET_KEY),
    environment: PAYSTACK_ENVIRONMENT,
    hasSecretKey: Boolean(PAYSTACK_SECRET_KEY),
    hasPublicKey: Boolean(PAYSTACK_PUBLIC_KEY),
    hasWebhookSecret: Boolean(PAYSTACK_WEBHOOK_SECRET),
  }
}

