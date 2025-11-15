import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Pesapal API Configuration
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || ''
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || ''
const PESAPAL_ENVIRONMENT = process.env.PESAPAL_ENVIRONMENT || 'sandbox'

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
    throw new Error('Failed to get Pesapal access token')
  }

  const data = await response.json()
  return data.token
}

// Verify payment status endpoint (for frontend polling)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderTrackingId = searchParams.get('orderTrackingId')

    if (!orderTrackingId) {
      return NextResponse.json(
        { error: 'Order tracking ID is required' },
        { status: 400 }
      )
    }

    if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
      return NextResponse.json(
        { error: 'Pesapal API credentials not configured' },
        { status: 500 }
      )
    }

    const accessToken = await getAccessToken()
    
    const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pesapal Verify Payment Error:', errorText)
      return NextResponse.json(
        { error: 'Failed to verify payment status' },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      paymentStatus: data.payment_status_description,
      orderTrackingId: data.order_tracking_id || orderTrackingId,
      amount: data.amount,
      currency: data.currency_code,
      paymentMethod: data.payment_method,
      transactionId: data.transaction_id,
      isCompleted: data.payment_status_description === 'COMPLETED' || data.payment_status_description === 'Completed',
    })
  } catch (error: any) {
    console.error('Error verifying Pesapal payment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to verify payment',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

