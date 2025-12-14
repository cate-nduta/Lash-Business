import { NextRequest, NextResponse } from 'next/server'

// M-Pesa API Configuration
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || ''
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || ''
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || ''
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || ''
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
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || `${getBaseUrl()}/api/mpesa/callback`
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox' // 'sandbox' or 'production'

// M-Pesa API URLs
const MPESA_BASE_URL = MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

// Get OAuth access token
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64')
  
  const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get M-Pesa access token')
  }

  const data = await response.json()
  return data.access_token
}

// Format phone number to M-Pesa format (254XXXXXXXXX)
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // If starts with 0, replace with 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1)
  }
  // If starts with +254, remove the +
  else if (cleaned.startsWith('254')) {
    // Already correct
  }
  // If starts with 254, it's already correct
  // If it's 9 digits, assume it's missing 254 prefix
  else if (cleaned.length === 9) {
    cleaned = '254' + cleaned
  }
  
  return cleaned
}

// Generate password for STK push
function generatePassword(): string {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
  const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64')
  return password
}

export async function POST(request: NextRequest) {
  // COMMENTED OUT: M-Pesa payment will be fixed later
  return NextResponse.json(
    { 
      error: 'M-Pesa payment is currently unavailable',
      message: 'M-Pesa payment integration is being updated. Please check back later.',
    },
    { status: 503 }
  )
  
  /* COMMENTED OUT - TO BE FIXED LATER
  try {
    // Check if M-Pesa is configured
    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY) {
      return NextResponse.json(
        { 
          error: 'M-Pesa API credentials not configured',
          message: 'Please add MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, and MPESA_PASSKEY to your .env.local file'
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { phone, amount, accountReference, transactionDesc } = body

    // Validate required fields
    if (!phone || !amount) {
      return NextResponse.json(
        { error: 'Phone number and amount are required' },
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone)
    
    // Validate phone number format
    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use a Kenyan phone number (e.g., 254712345678)' },
        { status: 400 }
      )
    }

    // Get access token
    const accessToken = await getAccessToken()
    
    // Generate password and timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    const password = generatePassword()

    // Prepare STK push request
    // Note: TransactionType can be:
    // - 'CustomerPayBillOnline' for PayBill numbers (recommended for businesses)
    // - 'CustomerBuyGoodsOnline' for Till numbers
    // You cannot use STK Push to send directly to a personal phone number for business transactions
    const roundedAmount = Math.round(amount)
    const stkPushRequest = {
      BusinessShortCode: MPESA_SHORTCODE, // This should be your PayBill or Till number
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline', // Use 'CustomerBuyGoodsOnline' if you have a Till number
      Amount: roundedAmount, // Exact amount in KSH - this will be shown in the M-Pesa prompt
      PartyA: formattedPhone, // Customer's phone number
      PartyB: MPESA_SHORTCODE, // Your PayBill/Till number (where money goes)
      PhoneNumber: formattedPhone, // Customer's phone number (who receives the prompt)
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: accountReference || 'LashDiary Booking',
      TransactionDesc: transactionDesc || `LashDiary Deposit - KSH ${roundedAmount.toLocaleString()}`,
    }

    // Send STK push request
    const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPushRequest),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('M-Pesa STK Push Error:', data)
      return NextResponse.json(
        { 
          error: 'Failed to initiate M-Pesa payment',
          details: data.errorMessage || data.error || 'Unknown error',
          mpesaResponse: data
        },
        { status: response.status }
      )
    }

    // Check if request was successful
    if (data.ResponseCode === '0') {
      return NextResponse.json({
        success: true,
        checkoutRequestID: data.CheckoutRequestID,
        customerMessage: data.CustomerMessage,
        amount: Math.round(amount),
        message: `M-Pesa payment prompt sent to your phone. You'll be asked to pay exactly KSH ${Math.round(amount).toLocaleString()}. Please check your phone and enter your M-Pesa PIN to complete the payment.`,
      })
    } else {
      return NextResponse.json(
        { 
          error: 'M-Pesa payment request failed',
          details: data.CustomerMessage || 'Unknown error',
          mpesaResponse: data
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error initiating M-Pesa payment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initiate M-Pesa payment',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
  */
}

