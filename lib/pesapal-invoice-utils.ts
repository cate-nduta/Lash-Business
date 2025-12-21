// Shared utility for generating PesaPal payment links for invoices

const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || ''
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || ''
const PESAPAL_ENVIRONMENT = process.env.PESAPAL_ENVIRONMENT || 'sandbox'

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || ''
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }
  return 'https://lashdiary.co.ke'
}

const PESAPAL_CALLBACK_URL = process.env.PESAPAL_CALLBACK_URL || `${getBaseUrl()}/api/pesapal/callback`
const PESAPAL_IPN_URL = process.env.PESAPAL_IPN_URL || `${getBaseUrl()}/api/pesapal/ipn`

// PesaPal API URLs
const PESAPAL_BASE_URL = PESAPAL_ENVIRONMENT === 'live'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3'

// Get OAuth access token
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PESAPAL_CONSUMER_KEY}:${PESAPAL_CONSUMER_SECRET}`).toString('base64')
  
  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth}`,
    },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('PesaPal Auth Error:', errorText)
    throw new Error('Failed to get PesaPal access token')
  }

  const data = await response.json()
  return data.token
}

// Generate order tracking ID for invoice
function generateInvoiceOrderTrackingId(invoiceId: string): string {
  return `Invoice-${invoiceId}-${Date.now()}`
}

export interface GeneratePaymentLinkResult {
  success: boolean
  paymentUrl?: string
  orderTrackingId?: string
  error?: string
  details?: string
}

// Generate PesaPal payment link for an invoice
export async function generateInvoicePaymentLink(
  invoice: {
    invoiceId: string
    invoiceNumber: string
    total: number
    currency: string
    email: string
    phone?: string
    contactName: string
    address?: string
    businessName: string
  }
): Promise<GeneratePaymentLinkResult> {
  try {
    // Check if PesaPal is configured
    if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
      return {
        success: false,
        error: 'PesaPal API credentials not configured',
        details: 'PesaPal payment links are not available. Please contact support for alternative payment methods.',
      }
    }

    // Get access token
    const accessToken = await getAccessToken()
    
    // Generate order tracking ID
    const orderTrackingId = generateInvoiceOrderTrackingId(invoice.invoiceId)

    // Prepare order data for PesaPal
    const orderData = {
      id: orderTrackingId,
      currency: invoice.currency.toUpperCase(),
      amount: invoice.currency === 'USD' ? parseFloat(invoice.total.toFixed(2)) : Math.round(invoice.total),
      description: `Invoice ${invoice.invoiceNumber} - ${invoice.businessName}`,
      callback_url: PESAPAL_CALLBACK_URL,
      notification_id: PESAPAL_IPN_URL,
      billing_address: {
        email_address: invoice.email,
        phone_number: invoice.phone || null,
        country_code: invoice.currency === 'USD' ? 'US' : 'KE',
        first_name: invoice.contactName.split(' ')[0] || invoice.contactName,
        middle_name: '',
        last_name: invoice.contactName.split(' ').slice(1).join(' ') || '',
        line_1: invoice.address || '',
        line_2: '',
        city: '',
        postal_code: '',
        zip_code: '',
      },
    }

    // Submit order to PesaPal
    const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('PesaPal Submit Order Error:', data)
      return {
        success: false,
        error: 'Failed to generate payment link',
        details: data.message || data.error || 'Unknown error',
      }
    }

    // Return the redirect URL for payment
    if (data.redirect_url) {
      return {
        success: true,
        paymentUrl: data.redirect_url,
        orderTrackingId: data.order_tracking_id || orderTrackingId,
      }
    } else {
      return {
        success: false,
        error: 'No payment URL received from PesaPal',
      }
    }
  } catch (error: any) {
    console.error('Error generating payment link:', error)
    return {
      success: false,
      error: 'Failed to generate payment link',
      details: error.message || 'Unknown error',
    }
  }
}

