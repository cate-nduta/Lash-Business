# Paystack Payment Integration Guide

This document outlines how to integrate Paystack as your payment checkout system based on the official Paystack API documentation.

## Overview

Paystack is a payment gateway that supports multiple currencies including KES (Kenyan Shilling). The integration follows a standard flow: initialize transaction → redirect to payment → verify transaction → handle webhooks.

## API Basics

### Base URL
```
https://api.paystack.co
```

### Authentication
All API requests require authentication using your secret key:
```
Authorization: Bearer YOUR_SECRET_KEY
```

### HTTP Methods
- `POST`: Create resources (initialize transactions, create customers)
- `GET`: Retrieve resources (verify transactions, list customers)
- `PUT`: Update resources
- `DELETE`: Remove resources

### Supported Currencies
Paystack supports multiple currencies including:
- **KES** (Kenyan Shilling) - amounts in cents (100 KES = 10000 cents)
- **NGN** (Nigerian Naira) - amounts in kobo
- **USD** (US Dollar) - amounts in cents
- **GHS** (Ghanaian Cedi)
- **ZAR** (South African Rand)
- **XOF** (West African CFA Franc)

**Important**: Amounts must be sent in the **subunit** of the currency:
- KES: Convert to cents (multiply by 100)
- USD: Convert to cents (multiply by 100)
- NGN: Convert to kobo (multiply by 100)

## Payment Flow

### 1. Initialize Transaction

**Endpoint**: `POST /transaction/initialize`

**Purpose**: Start a payment process and get authorization URL

**Request Headers**:
```
Authorization: Bearer YOUR_SECRET_KEY
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "customer@example.com",
  "amount": 10000,  // Amount in subunits (10000 cents = 100 KES)
  "currency": "KES",
  "reference": "unique-reference-123",  // Optional: your unique reference
  "callback_url": "https://yourdomain.com/api/paystack/callback",
  "metadata": {
    "custom_fields": [
      {
        "display_name": "Customer Name",
        "variable_name": "customer_name",
        "value": "John Doe"
      }
    ]
  }
}
```

**Response**:
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/xxxxx",
    "access_code": "xxxxx",
    "reference": "unique-reference-123"
  }
}
```

**Implementation Steps**:
1. Create API route: `app/api/paystack/initialize/route.ts`
2. Accept payment details (amount, email, currency, etc.)
3. Convert amount to subunits (KES × 100)
4. Generate unique reference
5. Call Paystack API
6. Return authorization URL to frontend
7. Redirect customer to authorization URL

### 2. Customer Redirects to Paystack

After receiving the authorization URL, redirect the customer:
```javascript
window.location.href = authorizationUrl
```

Customer completes payment on Paystack's secure checkout page.

### 3. Verify Transaction

**Endpoint**: `GET /transaction/verify/:reference`

**Purpose**: Verify that a transaction was successful

**Request Headers**:
```
Authorization: Bearer YOUR_SECRET_KEY
```

**Response**:
```json
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "amount": 10000,
    "currency": "KES",
    "status": "success",
    "reference": "unique-reference-123",
    "customer": {
      "email": "customer@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "paid_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Implementation Steps**:
1. Create API route: `app/api/paystack/verify/route.ts`
2. Accept transaction reference
3. Call Paystack verify endpoint
4. Check if `status === "success"`
5. Update your database/records
6. Send confirmation emails

### 4. Webhook Handler

**Endpoint**: `POST /api/paystack/webhook`

**Purpose**: Receive real-time notifications about transaction events

**Webhook Events**:
- `charge.success` - Payment was successful
- `charge.failed` - Payment failed
- `transfer.success` - Transfer completed
- `subscription.create` - Subscription created

**Request Body** (from Paystack):
```json
{
  "event": "charge.success",
  "data": {
    "amount": 10000,
    "currency": "KES",
    "status": "success",
    "reference": "unique-reference-123",
    "customer": {
      "email": "customer@example.com"
    },
    "paid_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Security**: Paystack sends a `x-paystack-signature` header that you must verify to ensure the request is from Paystack.

**Implementation Steps**:
1. Create API route: `app/api/paystack/webhook/route.ts`
2. Verify webhook signature (security)
3. Parse event type
4. Handle `charge.success` event
5. Update payment status in your system
6. Send confirmation emails
7. Return 200 OK to Paystack

## Implementation Structure

### File Structure
```
app/
  api/
    paystack/
      initialize/
        route.ts      # Initialize transaction
      verify/
        route.ts      # Verify transaction
      webhook/
        route.ts      # Handle webhooks
      callback/
        route.ts      # Handle redirect callback (optional)
```

### Environment Variables
```env
# Paystack API Keys
PAYSTACK_SECRET_KEY=sk_test_xxxxx  # Test key
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx  # Public key (for frontend if needed)
PAYSTACK_SECRET_KEY_LIVE=sk_live_xxxxx  # Live key (production)
PAYSTACK_PUBLIC_KEY_LIVE=pk_live_xxxxx  # Live public key

# Environment
PAYSTACK_ENVIRONMENT=test  # or 'live' for production

# Webhook Secret (for signature verification)
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxx
```

## Code Examples

### Initialize Transaction (API Route)

```typescript
// app/api/paystack/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, email, currency = 'KES', metadata = {} } = body

    if (!amount || !email) {
      return NextResponse.json(
        { error: 'Amount and email are required' },
        { status: 400 }
      )
    }

    // Convert amount to subunits (KES to cents)
    const amountInSubunits = Math.round(amount * 100)

    // Generate unique reference
    const reference = `ref-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

    // Get base URL for callback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'
    const callbackUrl = `${baseUrl}/api/paystack/callback`

    // Initialize transaction with Paystack
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInSubunits,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || 'Failed to initialize transaction' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code,
    })
  } catch (error: any) {
    console.error('Error initializing Paystack transaction:', error)
    return NextResponse.json(
      { error: 'Failed to initialize transaction' },
      { status: 500 }
    )
  }
}
```

### Verify Transaction (API Route)

```typescript
// app/api/paystack/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference is required' },
        { status: 400 }
      )
    }

    // Verify transaction with Paystack
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || 'Transaction verification failed' },
        { status: 400 }
      )
    }

    const transaction = data.data

    // Check if payment was successful
    if (transaction.status === 'success') {
      // Update your database/records here
      // Send confirmation emails
      // etc.

      return NextResponse.json({
        success: true,
        transaction: {
          reference: transaction.reference,
          amount: transaction.amount / 100, // Convert back from subunits
          currency: transaction.currency,
          status: transaction.status,
          paidAt: transaction.paid_at,
          customer: transaction.customer,
        },
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Transaction not successful',
      transaction: {
        status: transaction.status,
        reference: transaction.reference,
      },
    })
  } catch (error: any) {
    console.error('Error verifying Paystack transaction:', error)
    return NextResponse.json(
      { error: 'Failed to verify transaction' },
      { status: 500 }
    )
  }
}
```

### Webhook Handler (API Route)

```typescript
// app/api/paystack/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Verify webhook signature (security)
    if (PAYSTACK_WEBHOOK_SECRET) {
      const hash = crypto
        .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
        .update(body)
        .digest('hex')

      if (hash !== signature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const event = JSON.parse(body)

    // Handle different event types
    if (event.event === 'charge.success') {
      const transaction = event.data

      // Update payment status in your system
      // Example: Update consultation payment status
      // Example: Update course purchase status
      // Example: Update invoice status
      // Example: Send confirmation emails

      console.log('Payment successful:', {
        reference: transaction.reference,
        amount: transaction.amount / 100,
        currency: transaction.currency,
        email: transaction.customer?.email,
      })

      // TODO: Implement your business logic here
      // - Update database records
      // - Send confirmation emails
      // - Grant access to courses/services
      // - Update invoice status
    }

    // Always return 200 OK to Paystack
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing Paystack webhook:', error)
    // Still return 200 to prevent Paystack from retrying
    return NextResponse.json({ received: true })
  }
}
```

## Integration Points

### 1. Course Purchases
- Initialize transaction when user purchases course
- Verify after redirect
- Update course purchase status on webhook
- Grant course access

### 2. Consultation Bookings
- Initialize transaction for consultation fee
- Verify after redirect
- Update consultation payment status
- Confirm consultation booking

### 3. Invoice Payments
- Initialize transaction from invoice
- Verify after redirect
- Update invoice status to "paid"
- Send payment confirmation

### 4. Gift Cards
- Initialize transaction for gift card purchase
- Verify after redirect
- Create gift card on webhook
- Send gift card to recipient

## Security Best Practices

1. **Never expose secret keys** - Only use in server-side code
2. **Verify webhook signatures** - Always verify `x-paystack-signature` header
3. **Use HTTPS** - All API calls must be over HTTPS
4. **Validate amounts** - Always verify amounts match your records
5. **Idempotency** - Handle duplicate webhook events gracefully
6. **Log everything** - Log all payment events for debugging

## Testing

### Test Cards (Test Mode)
Paystack provides test cards for testing:
- **Successful payment**: `4084084084084081`
- **Declined payment**: `5060666666666666666`
- **Insufficient funds**: `5060666666666666667`

### Test Environment
- Use `sk_test_xxxxx` for test secret key
- Use `pk_test_xxxxx` for test public key
- Set `PAYSTACK_ENVIRONMENT=test`

## Next Steps

1. **Set up Paystack account** - Get API keys
2. **Create API routes** - Implement initialize, verify, webhook
3. **Update frontend** - Add payment buttons/redirects
4. **Configure webhooks** - Set webhook URL in Paystack dashboard
5. **Test thoroughly** - Use test mode and test cards
6. **Go live** - Switch to live keys when ready

## Resources

- [Paystack API Documentation](https://paystack.com/docs/api/)
- [Paystack Dashboard](https://dashboard.paystack.com)
- [Paystack Test Cards](https://paystack.com/docs/payments/test-payments)

