import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Pesapal API Configuration
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || ''
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || ''
const PESAPAL_ENVIRONMENT = process.env.PESAPAL_ENVIRONMENT || 'sandbox' // 'sandbox' or 'live'
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

// Pesapal API URLs
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
    console.error('Pesapal Auth Error:', errorText)
    throw new Error('Failed to get Pesapal access token')
  }

  const data = await response.json()
  return data.token
}

// Generate order tracking ID
function generateOrderTrackingId(): string {
  return `LashDiary-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export async function POST(request: NextRequest) {
  try {
    // Check if Pesapal is configured
    if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
      console.error('❌ Pesapal API credentials not configured:', {
        hasKey: !!PESAPAL_CONSUMER_KEY,
        hasSecret: !!PESAPAL_CONSUMER_SECRET,
        environment: PESAPAL_ENVIRONMENT,
      })
      return NextResponse.json(
        { 
          error: 'Pesapal API credentials not configured',
          message: 'Pesapal environment variables are missing. Please add PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET to your Netlify environment variables (for production) or .env.local file (for local development). See NETLIFY_PESAPAL_SETUP.md for instructions.'
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { 
      amount, 
      currency = 'KES',
      phoneNumber,
      email,
      firstName,
      lastName,
      description,
      bookingReference,
    } = body

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Customer email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Get access token
    const accessToken = await getAccessToken()
    
    // Generate order tracking ID
    const orderTrackingId = generateOrderTrackingId()

    // Prepare order data
    const orderData = {
      id: orderTrackingId,
      currency: currency.toUpperCase(),
      amount: currency === 'USD' ? parseFloat(amount.toFixed(2)) : Math.round(amount),
      description: description || `LashDiary Booking - ${bookingReference || orderTrackingId}`,
      callback_url: PESAPAL_CALLBACK_URL,
      notification_id: PESAPAL_IPN_URL,
      billing_address: {
        email_address: email,
        phone_number: phoneNumber || null,
        country_code: currency === 'USD' ? 'US' : 'KE',
        first_name: firstName,
        middle_name: '',
        last_name: lastName,
        line_1: '',
        line_2: '',
        city: '',
        postal_code: '',
        zip_code: '',
      },
    }

    // Submit order to Pesapal
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
      console.error('Pesapal Submit Order Error:', data)
      return NextResponse.json(
        { 
          error: 'Failed to submit order to Pesapal',
          details: data.message || data.error || 'Unknown error',
          pesapalResponse: data
        },
        { status: response.status }
      )
    }

    // Return the redirect URL for payment
    if (data.redirect_url) {
      return NextResponse.json({
        success: true,
        orderTrackingId: data.order_tracking_id || orderTrackingId,
        redirectUrl: data.redirect_url,
        message: 'Order submitted successfully. Redirect to payment page.',
      })
    } else {
      return NextResponse.json(
        { 
          error: 'No redirect URL received from Pesapal',
          pesapalResponse: data
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error submitting order to Pesapal:', error)
    return NextResponse.json(
      { 
        error: 'Failed to submit order to Pesapal',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

