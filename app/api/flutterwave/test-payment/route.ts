import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to initialize a Flutterwave payment
 * POST /api/flutterwave/test-payment
 * 
 * This will create a test payment to verify Flutterwave is working
 */
export async function POST(request: NextRequest) {
  try {
    // Get credentials
    // IMPORTANT: Flutterwave API v3 requires "Secret Key" (FLWSECK-...) for authentication
    // Client Secret is for OAuth and won't work for payment API calls
    const clientId = process.env.FLUTTERWAVE_CLIENT_ID
    // Prioritize FLUTTERWAVE_SECRET_KEY (correct) over FLUTTERWAVE_CLIENT_SECRET (wrong for API)
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLUTTERWAVE_CLIENT_SECRET
    const encryptionKey = process.env.FLUTTERWAVE_ENCRYPTION_KEY
    const environment = process.env.FLUTTERWAVE_ENVIRONMENT || 'sandbox'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://lashdiary.co.ke'

    // Validate credentials
    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flutterwave Secret Key not configured',
          message: 'Please add FLUTTERWAVE_SECRET_KEY (starts with FLWSECK-) to .env.local',
          help: 'Get your Secret Key from Flutterwave Dashboard > Settings > API Keys. It should start with FLWSECK-',
          note: 'Client Secret (FLUTTERWAVE_CLIENT_SECRET) is NOT the same as Secret Key. You need the Secret Key for API authentication.',
        },
        { status: 500 }
      )
    }

    // Check if secret key format looks correct (should start with FLWSECK-)
    if (!secretKey.startsWith('FLWSECK-') && !secretKey.startsWith('FLWSECK_test-') && !secretKey.startsWith('FLWSECK_live-')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Secret Key format',
          message: 'Flutterwave Secret Key should start with FLWSECK-, FLWSECK_test-, or FLWSECK_live-',
          help: 'The value you have looks like a Client Secret. You need the Secret Key from Flutterwave Dashboard > Settings > API Keys.',
          currentFormat: secretKey.substring(0, 15) + '...',
          expectedFormat: 'FLWSECK-test-xxxxxxxxxxxxx or FLWSECK-xxxxxxxxxxxxx',
          solution: [
            '1. Go to Flutterwave Dashboard: https://dashboard.flutterwave.com/',
            '2. Navigate to: Settings > API Keys',
            '3. Look for "Secret Key" (NOT "Client Secret")',
            '4. Copy the Secret Key (it should start with FLWSECK-test- for sandbox)',
            '5. Add it to .env.local as: FLUTTERWAVE_SECRET_KEY=FLWSECK-test-xxxxx',
            '6. Restart your development server',
          ],
        },
        { status: 500 }
      )
    }

    // Get request body
    const body = await request.json()
    const { amount = 100, email = 'test@example.com', name = 'Test User', phone = '254712345678' } = body

    // Flutterwave API base URL
    const apiBaseUrl = 'https://api.flutterwave.com/v3'

    // Prepare payment data
    const paymentData = {
      tx_ref: `test-${Date.now()}`, // Unique transaction reference
      amount: amount, // Amount in KES
      currency: 'KES',
      redirect_url: `${baseUrl}/api/flutterwave/payment-callback?test=true`,
      payment_options: 'card,ussd,mpesa,mobilemoney', // Payment methods
      customer: {
        email: email,
        phonenumber: phone,
        name: name,
      },
      customizations: {
        title: 'LashDiary Test Payment',
        description: 'Testing Flutterwave Integration',
        logo: `${baseUrl}/logo.png`, // Optional: your logo
      },
    }

        // Make API call to Flutterwave
    // Flutterwave v3 API uses Bearer token with Secret Key
    const response = await fetch(`${apiBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    })

    console.log('Flutterwave API Response Status:', response.status)

    const data = await response.json()

    if (!response.ok) {
      // Check for authentication errors specifically
      if (response.status === 401 || (data.message && data.message.toLowerCase().includes('authorization'))) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed - Invalid authorization key',
            message: data.message || 'Invalid authorization key',
            details: data,
            help: {
              problem: 'The Secret Key you\'re using is not valid for Flutterwave API authentication',
              solution: [
                '1. Go to Flutterwave Dashboard: https://dashboard.flutterwave.com/',
                '2. Navigate to: Settings > API Keys',
                '3. Look for "Secret Key" (NOT "Client Secret")',
                '4. Copy the Secret Key (it should start with FLWSECK-test- or FLWSECK-)',
                '5. Add it to .env.local as: FLUTTERWAVE_SECRET_KEY=FLWSECK-test-xxxxx',
                '6. Restart your development server (npm run dev)',
              ],
              note: 'Client ID and Client Secret are for OAuth. For payment API, you need the Secret Key that starts with FLWSECK-',
            },
          },
          { status: response.status }
        )
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to initialize Flutterwave payment',
          message: data.message || 'Unknown error',
          details: data,
        },
        { status: response.status }
      )
    }

    // Check if payment was initialized successfully
    if (data.status === 'success' && data.data?.link) {
      return NextResponse.json({
        success: true,
        message: '✅ Payment initialized successfully!',
        paymentLink: data.data.link, // This is the payment URL to redirect user to
        txRef: data.data.tx_ref,
        status: data.status,
        instructions: [
          '✅ Flutterwave is working!',
          '🔗 Use the paymentLink to redirect user to payment page',
          '🧪 In sandbox, use test card: 5531886652142950',
          '💳 CVV: 123, Expiry: 12/25, Pin: 1234',
          '📱 Or test with M-Pesa using any Kenyan number',
        ],
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment initialization returned unexpected response',
          data: data,
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error testing Flutterwave payment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error initializing payment',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

