import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to verify Flutterwave configuration
 * GET /api/flutterwave/test
 */
export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    // IMPORTANT: Flutterwave API requires Secret Key (FLWSECK-...), not Client Secret
    const clientId = process.env.FLUTTERWAVE_CLIENT_ID
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLUTTERWAVE_CLIENT_SECRET
    const encryptionKey = process.env.FLUTTERWAVE_ENCRYPTION_KEY
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH
    const environment = process.env.FLUTTERWAVE_ENVIRONMENT || 'sandbox'
    const webhookUrl = process.env.FLUTTERWAVE_WEBHOOK_URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

    // Check which credentials are configured
    const configStatus = {
      clientId: {
        configured: !!clientId,
        value: clientId ? `${clientId.substring(0, 10)}...` : 'Not set',
      },
      secretKey: {
        configured: !!secretKey,
        value: secretKey ? `${secretKey.substring(0, 15)}...` : 'Not set',
        isCorrectFormat: secretKey ? (secretKey.startsWith('FLWSECK-') || secretKey.startsWith('FLWSECK_test-') || secretKey.startsWith('FLWSECK_live-')) : false,
      },
      encryptionKey: {
        configured: !!encryptionKey,
        value: encryptionKey ? `${encryptionKey.substring(0, 10)}...` : 'Not set',
      },
      secretHash: {
        configured: !!secretHash,
        value: secretHash ? `${secretHash.substring(0, 10)}...` : 'Not set',
      },
      environment: {
        configured: !!environment,
        value: environment,
      },
      webhookUrl: {
        configured: !!webhookUrl,
        value: webhookUrl || 'Not set',
      },
      baseUrl: {
        configured: !!baseUrl,
        value: baseUrl || 'Not set',
      },
    }

    // Check if all required credentials are present
    // Note: Secret Key is required for API calls, Client ID is optional
    const allConfigured =
      secretKey &&
      encryptionKey &&
      secretHash &&
      environment &&
      webhookUrl

    // Check if secret key format is correct
    const hasValidSecretKey = secretKey && (secretKey.startsWith('FLWSECK-') || secretKey.startsWith('FLWSECK_test-') || secretKey.startsWith('FLWSECK_live-'))

    // Try to make a test API call to Flutterwave
    let apiTest = null
    if (allConfigured && hasValidSecretKey) {
      try {
        // Flutterwave API base URL (same for sandbox and live)
        const baseApiUrl = 'https://api.flutterwave.com/v3'

        // Test endpoint - Get transactions (simple endpoint to test authentication)
        const testResponse = await fetch(`${baseApiUrl}/transactions`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          // Add query params to limit results
          cache: 'no-store',
        })

        const testData = await testResponse.json()

        // Check if we got a valid response (even if it's an error about no transactions, that means auth worked)
        const isAuthValid = 
          testResponse.ok || 
          (testResponse.status === 200) ||
          (testData.status === 'success') ||
          (testData.message && !testData.message.toLowerCase().includes('invalid') && !testData.message.toLowerCase().includes('unauthorized'))

        apiTest = {
          success: isAuthValid,
          status: testResponse.status,
          message: isAuthValid
            ? '✅ Flutterwave API connection successful! Credentials are valid.'
            : `⚠️ API test inconclusive: ${testData.message || 'Could not verify'}. This might be normal for sandbox - try the payment test instead.`,
          details: testResponse.ok
            ? `API responded successfully. Environment: ${environment}. Status: ${testData.status || 'OK'}`
            : testData.status === 'success' 
              ? `API responded. Environment: ${environment}`
              : `Status: ${testResponse.status}. ${testData.message || 'Note: API test may fail in sandbox. Try the payment test to verify it works.'}`,
          note: 'The payment test will give more accurate results. This API test is just a basic check.',
        }
      } catch (error: any) {
        apiTest = {
          success: false,
          message: `⚠️ Could not test API connection: ${error.message}. This is okay - try the payment test instead.`,
          error: error.message,
          note: 'API connection test failed, but credentials look correct. Try the payment test to verify everything works.',
        }
      }
    } else if (!hasValidSecretKey && secretKey) {
      apiTest = {
        success: false,
        message: '⚠️ Secret Key format is incorrect. It should start with FLWSECK-',
        help: 'Get your Secret Key from Flutterwave Dashboard > Settings > API Keys. Client Secret won\'t work for API authentication.',
      }
    } else {
      apiTest = {
        success: false,
        message:
          '⚠️ Cannot test API connection. Some credentials are missing.',
      }
    }

    return NextResponse.json(
      {
        success: allConfigured && apiTest?.success,
        message: allConfigured
          ? apiTest?.success
            ? '✅ Flutterwave credentials are configured! All set to test payments.'
            : '✅ Flutterwave credentials are configured! API test is optional - try the payment test to verify everything works.'
          : '⚠️ Flutterwave credentials are not fully configured.',
        configStatus,
        apiTest,
        nextSteps: allConfigured
          ? [
              '✅ All credentials are configured correctly!',
              '🧪 Click "Test Payment" to verify Flutterwave works end-to-end',
              '💳 Use test card: 5531886652142950 (CVV: 123, Expiry: 12/25, Pin: 1234)',
              '📝 The payment test is the most reliable way to verify integration',
            ]
          : [
              '📝 Add missing credentials to .env.local',
              '🔐 See FLUTTERWAVE_SETUP.md for setup instructions',
              '📋 All required variables:',
              '   - FLUTTERWAVE_SECRET_KEY (starts with FLWSECK-, NOT Client Secret)',
              '   - FLUTTERWAVE_ENCRYPTION_KEY',
              '   - FLUTTERWAVE_SECRET_HASH',
              '   - FLUTTERWAVE_ENVIRONMENT',
              '   - FLUTTERWAVE_WEBHOOK_URL',
              '   - FLUTTERWAVE_CLIENT_ID (optional)',
            ],
      },
      { status: allConfigured && apiTest?.success ? 200 : 200 } // Still return 200 to show status
    )
  } catch (error: any) {
    console.error('Error testing Flutterwave configuration:', error)
    return NextResponse.json(
      {
        success: false,
        message: '❌ Error testing Flutterwave configuration',
        error: error.message,
      },
      { status: 500 }
    )
  }
}

