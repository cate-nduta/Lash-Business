/**
 * PesaPal Invoice Payment Link Generator
 * 
 * This utility generates payment links for invoices using PesaPal.
 * Currently returns a placeholder URL structure.
 */

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

export interface InvoicePaymentLinkOptions {
  invoiceId: string
  invoiceNumber?: string
  total: number
  currency?: string
  email?: string
  phone?: string
  contactName?: string
  address?: string
  businessName?: string
}

export interface InvoicePaymentLinkResult {
  success: boolean
  paymentUrl?: string
  orderTrackingId?: string
  error?: string
  details?: string
}

/**
 * Generate a payment link for an invoice
 * 
 * @param options - Invoice payment link options
 * @returns Payment link result with URL or error
 */
export async function generateInvoicePaymentLink(
  options: InvoicePaymentLinkOptions
): Promise<InvoicePaymentLinkResult> {
  try {
    const baseUrl = normalizeBaseUrl()
    const { invoiceId, invoiceNumber, total, currency = 'KES' } = options
    
    // Check if PesaPal is configured
    const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY
    const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET
    const PESAPAL_ENVIRONMENT = process.env.PESAPAL_ENVIRONMENT || 'sandbox'
    
    if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
      // Return a fallback payment link if PesaPal is not configured
      const params = new URLSearchParams({
        invoiceId,
        amount: total.toString(),
        currency,
      })
      
      if (invoiceNumber) {
        params.append('invoiceNumber', invoiceNumber)
      }
      
      return {
        success: true,
        paymentUrl: `${baseUrl}/api/labs/invoices/${invoiceId}/payment-link?${params.toString()}`,
        orderTrackingId: `invoice-${invoiceId}-${Date.now()}`,
      }
    }
    
    // TODO: Implement actual PesaPal API integration here
    // For now, return a placeholder URL
    const params = new URLSearchParams({
      invoiceId,
      amount: total.toString(),
      currency,
    })
    
    if (invoiceNumber) {
      params.append('invoiceNumber', invoiceNumber)
    }
    
    return {
      success: true,
      paymentUrl: `${baseUrl}/api/labs/invoices/${invoiceId}/payment-link?${params.toString()}`,
      orderTrackingId: `invoice-${invoiceId}-${Date.now()}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: 'Failed to generate payment link',
      details: error.message || 'Unknown error',
    }
  }
}

