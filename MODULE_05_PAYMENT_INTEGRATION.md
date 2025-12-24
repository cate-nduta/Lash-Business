# Module 4: Payment Integration

## Overview

In this module, you'll add payment processing to your booking website. Clients will be able to pay deposits or full amounts when booking appointments. You'll learn how to integrate payment gateways, handle payment confirmations, and securely process transactions.

**Estimated Time**: 3-4 hours

---

## Lesson 4.1: Understanding Payment Integration

### Why Payment Integration?

Payment integration allows your clients to:
- Pay deposits when booking (secures their appointment)
- Pay full amounts upfront
- Complete transactions securely online
- Receive payment confirmations

### Payment Flow

1. **Client completes booking form** → Selects payment option
2. **Payment gateway processes payment** → Secure transaction
3. **Payment confirmed** → Booking is confirmed
4. **Confirmation sent** → Email to client and business

### Payment Gateway Options

**For Kenya (Recommended):**
- **Pesapal** - Supports M-Pesa and card payments
- **M-Pesa Direct** - Direct M-Pesa integration (more complex)

**International:**
- **Stripe** - Card payments worldwide
- **PayPal** - Popular international option

**For this course, we'll use Pesapal** as it supports both M-Pesa (popular in Kenya) and card payments.

### Payment Types

- **Deposit** - Partial payment to secure booking (e.g., 50% of service price)
- **Full Payment** - Complete payment upfront
- **Post-Payment** - Pay after service (not recommended for bookings)

---

## Lesson 4.2: Setting Up Pesapal Account

Before coding, you need to set up a Pesapal account.

### Step 1: Create Pesapal Account

1. Go to [https://www.pesapal.com](https://www.pesapal.com)
2. Click "Sign Up" or "Get Started"
3. Choose "Business Account"
4. Fill in your business details
5. Verify your email

### Step 2: Get API Credentials

1. Log into your Pesapal dashboard
2. Go to "Developers" or "API Settings"
3. You'll need:
   - **Consumer Key** - Your API key
   - **Consumer Secret** - Your API secret
   - **Environment** - Sandbox (for testing) or Live (for production)

### Step 3: Add Credentials to Environment Variables

Add to your `.env.local`:

```env
# Pesapal Configuration
PESAPAL_CONSUMER_KEY=your-consumer-key-here
PESAPAL_CONSUMER_SECRET=your-consumer-secret-here
PESAPAL_ENVIRONMENT=sandbox
PESAPAL_CALLBACK_URL=http://localhost:3000/api/pesapal/callback
PESAPAL_IPN_URL=http://localhost:3000/api/pesapal/ipn
```

**Important:**
- Use `sandbox` for testing
- Use `live` for production
- Update callback URLs when deploying

---

## Lesson 4.3: Installing Payment Dependencies

We'll use Pesapal's API directly (no special package needed, just standard fetch).

### Step 1: Verify Dependencies

Check your `package.json` - you should already have:
- `next` - For API routes
- `crypto` - For secure token generation (built into Node.js)

No additional packages needed! Pesapal uses standard HTTP requests.

---

## Lesson 4.4: Creating Payment API Endpoints

We'll create API endpoints to handle payment processing.

### Step 1: Create Pesapal Authentication Helper

Create `lib/pesapal-auth.ts`:

```typescript
// Pesapal API Configuration
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || ''
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || ''
const PESAPAL_ENVIRONMENT = process.env.PESAPAL_ENVIRONMENT || 'sandbox'

// Pesapal API URLs
const PESAPAL_BASE_URL = PESAPAL_ENVIRONMENT === 'live'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3'

/**
 * Get OAuth access token from Pesapal
 */
export async function getPesapalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PESAPAL_CONSUMER_KEY}:${PESAPAL_CONSUMER_SECRET}`).toString('base64')
  
  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Pesapal access token: ${error}`)
  }

  const data = await response.json()
  
  if (!data.token) {
    throw new Error('Pesapal did not return an access token')
  }

  return data.token
}

export { PESAPAL_BASE_URL }
```

### Step 2: Create Payment Submission Endpoint

Create `app/api/pesapal/submit-order/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPesapalAccessToken, PESAPAL_BASE_URL } from '@/lib/pesapal-auth'
import crypto from 'crypto'

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }
  return 'http://localhost:3000'
}

const PESAPAL_CALLBACK_URL = process.env.PESAPAL_CALLBACK_URL || `${getBaseUrl()}/api/pesapal/callback`
const PESAPAL_IPN_URL = process.env.PESAPAL_IPN_URL || `${getBaseUrl()}/api/pesapal/ipn`

export async function POST(request: NextRequest) {
  try {
    // Check if Pesapal is configured
    if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET) {
      return NextResponse.json(
        { 
          error: 'Pesapal API credentials not configured',
          message: 'Please add PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET to your .env.local file'
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { 
      amount, 
      currency = 'KES',
      email, 
      phoneNumber,
      firstName,
      lastName,
      description,
      orderTrackingId 
    } = body

    // Validate required fields
    if (!amount || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, email, firstName, lastName' },
        { status: 400 }
      )
    }

    // Get access token
    const accessToken = await getPesapalAccessToken()

    // Generate unique order tracking ID if not provided
    const trackingId = orderTrackingId || `ORDER-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

    // Prepare order data
    const orderData = {
      order_tracking_id: trackingId,
      currency: currency,
      amount: amount,
      callback_url: PESAPAL_CALLBACK_URL,
      notification_id: PESAPAL_IPN_URL,
      branch: 'LashDiary Booking',
      customer: {
        email: email,
        phone_number: phoneNumber || '',
        first_name: firstName,
        middle_name: '',
        last_name: lastName,
      },
      description: description || `Booking payment - ${trackingId}`,
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
          error: 'Failed to submit payment order',
          details: data.message || data.error || 'Unknown error',
          pesapalResponse: data
        },
        { status: response.status }
      )
    }

    // Return payment link
    return NextResponse.json({
      success: true,
      orderTrackingId: trackingId,
      redirectUrl: data.redirect_url,
      message: 'Payment order created successfully'
    })
  } catch (error: any) {
    console.error('Error submitting Pesapal order:', error)
    return NextResponse.json(
      { 
        error: 'Failed to submit payment order',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

### Step 3: Create Payment Callback Handler

Create `app/api/pesapal/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

/**
 * Handle Pesapal payment callback
 * This is called when user returns from Pesapal payment page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderTrackingId = searchParams.get('OrderTrackingId')
    const orderMerchantReference = searchParams.get('OrderMerchantReference')

    if (!orderTrackingId) {
      return NextResponse.redirect(new URL('/booking?error=missing-tracking-id', request.url))
    }

    // TODO: Verify payment status with Pesapal API
    // For now, we'll redirect to a success page
    // In production, you should verify the payment status

    return NextResponse.redirect(new URL(`/booking?payment=success&orderId=${orderTrackingId}`, request.url))
  } catch (error) {
    console.error('Error handling Pesapal callback:', error)
    return NextResponse.redirect(new URL('/booking?error=payment-failed', request.url))
  }
}
```

### Step 4: Create Payment Status Verification

Create `app/api/pesapal/verify-payment/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPesapalAccessToken, PESAPAL_BASE_URL } from '@/lib/pesapal-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderTrackingId = searchParams.get('orderTrackingId')

    if (!orderTrackingId) {
      return NextResponse.json(
        { error: 'Order tracking ID is required' },
        { status: 400 }
      )
    }

    // Get access token
    const accessToken = await getPesapalAccessToken()

    // Check payment status
    const response = await fetch(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Failed to verify payment',
          details: data.message || 'Unknown error'
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      paymentStatus: data.payment_status_description,
      orderStatus: data.order_tracking_id,
      amount: data.amount,
      currency: data.currency_code,
    })
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to verify payment',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

✅ **Checkpoint**: Your payment API endpoints should be created!

---

## Lesson 4.5: Integrating Payment into Booking Flow

Now let's add payment processing to the booking form.

### Step 1: Update Booking Form Component

Update your booking form to include payment options. Add this to your booking page:

```typescript
// Add payment state
const [paymentMethod, setPaymentMethod] = useState<'deposit' | 'full' | 'none'>('none')
const [processingPayment, setProcessingPayment] = useState(false)

// Calculate payment amounts
const selectedService = services.find(s => s.id === selectedService)
const depositAmount = selectedService ? selectedService.price * 0.5 : 0 // 50% deposit
const fullAmount = selectedService ? selectedService.price : 0

// Handle payment submission
const handlePayment = async () => {
  if (!selectedService || !formData.name || !formData.email) {
    alert('Please complete all required fields')
    return
  }

  setProcessingPayment(true)

  try {
    // Calculate amount based on payment type
    const amount = paymentMethod === 'deposit' ? depositAmount : fullAmount

    // Submit payment order
    const response = await fetch('/api/pesapal/submit-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount,
        currency: 'KES',
        email: formData.email,
        phoneNumber: formData.phone,
        firstName: formData.name.split(' ')[0] || formData.name,
        lastName: formData.name.split(' ').slice(1).join(' ') || '',
        description: `Booking payment for ${selectedService.name}`,
        orderTrackingId: `BOOKING-${Date.now()}`,
      })
    })

    const data = await response.json()

    if (response.ok && data.redirectUrl) {
      // Redirect to Pesapal payment page
      window.location.href = data.redirectUrl
    } else {
      alert(data.error || 'Failed to initiate payment')
      setProcessingPayment(false)
    }
  } catch (error) {
    console.error('Payment error:', error)
    alert('An error occurred. Please try again.')
    setProcessingPayment(false)
  }
}
```

### Step 2: Add Payment Selection UI

Add this to your booking form:

```typescript
{selectedService && (
  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 className="text-2xl font-semibold mb-4">Payment Options</h2>
    
    <div className="space-y-4">
      <div>
        <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="payment"
            value="deposit"
            checked={paymentMethod === 'deposit'}
            onChange={(e) => setPaymentMethod('deposit')}
            className="mr-3"
          />
          <div className="flex-1">
            <div className="font-semibold">Pay Deposit (50%)</div>
            <div className="text-sm text-gray-600">
              Secure your booking with a deposit
            </div>
            <div className="text-lg font-bold mt-1">
              KES {depositAmount.toLocaleString()}
            </div>
          </div>
        </label>
      </div>

      <div>
        <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="payment"
            value="full"
            checked={paymentMethod === 'full'}
            onChange={(e) => setPaymentMethod('full')}
            className="mr-3"
          />
          <div className="flex-1">
            <div className="font-semibold">Pay Full Amount</div>
            <div className="text-sm text-gray-600">
              Pay the complete service price now
            </div>
            <div className="text-lg font-bold mt-1">
              KES {fullAmount.toLocaleString()}
            </div>
          </div>
        </label>
      </div>
    </div>

    {paymentMethod !== 'none' && (
      <button
        onClick={handlePayment}
        disabled={processingPayment}
        className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {processingPayment ? 'Processing...' : `Proceed to Payment (KES ${(paymentMethod === 'deposit' ? depositAmount : fullAmount).toLocaleString()})`}
      </button>
    )}
  </div>
)}
```

✅ **Checkpoint**: Payment selection should appear in your booking form!

---

## Lesson 4.6: Handling Payment Callbacks

When payment is completed, we need to update the booking status.

### Step 1: Update Booking API to Handle Payment

Update your booking creation API to check payment status:

```typescript
// In your booking API route
export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json()
    const { orderTrackingId, paymentStatus } = bookingData

    // If payment was made, verify it
    if (orderTrackingId) {
      const paymentResponse = await fetch(
        `${request.nextUrl.origin}/api/pesapal/verify-payment?orderTrackingId=${orderTrackingId}`
      )
      const paymentData = await paymentResponse.json()

      if (paymentData.paymentStatus !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'Payment not completed' },
          { status: 400 }
        )
      }
    }

    // Create booking (existing code)
    // ...
  } catch (error) {
    // ...
  }
}
```

### Step 2: Handle Payment Success

Update your booking page to handle payment success callback:

```typescript
useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search)
  const paymentStatus = searchParams.get('payment')
  const orderId = searchParams.get('orderId')

  if (paymentStatus === 'success' && orderId) {
    // Verify payment and create booking
    verifyPaymentAndBook(orderId)
  }
}, [])

const verifyPaymentAndBook = async (orderTrackingId: string) => {
  try {
    // Verify payment
    const verifyResponse = await fetch(`/api/pesapal/verify-payment?orderTrackingId=${orderTrackingId}`)
    const verifyData = await verifyResponse.json()

    if (verifyData.paymentStatus === 'COMPLETED') {
      // Create booking with payment confirmation
      const bookingResponse = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: selectedDate,
          timeSlot: selectedTime,
          serviceId: selectedService,
          paymentStatus: 'paid',
          orderTrackingId: orderTrackingId,
          amount: verifyData.amount,
        })
      })

      if (bookingResponse.ok) {
        alert('Booking confirmed! Check your email.')
        // Reset form
        setSelectedDate('')
        setSelectedTime('')
        setSelectedService('')
        setFormData({ name: '', email: '', phone: '', notes: '' })
      }
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    alert('Payment verification failed. Please contact support.')
  }
}
```

---

## Lesson 4.7: Testing Payments

### Step 1: Test in Sandbox Mode

1. Make sure `PESAPAL_ENVIRONMENT=sandbox` in `.env.local`
2. Use Pesapal test credentials
3. Test with test card numbers (provided by Pesapal)

### Step 2: Test Payment Flow

1. Go to booking page
2. Select date, time, and service
3. Fill out form
4. Select payment option
5. Click "Proceed to Payment"
6. Complete payment on Pesapal page
7. Verify callback works
8. Check booking is created

### Step 3: Test Payment Verification

1. After payment, verify booking status
2. Check that payment amount is recorded
3. Verify email confirmations include payment info

---

## Module 4 Checkpoint

Before moving to Module 5, make sure you have:

✅ Created Pesapal account and got API credentials  
✅ Added credentials to `.env.local`  
✅ Created payment API endpoints  
✅ Integrated payment selection into booking form  
✅ Handled payment callbacks  
✅ Tested payment flow in sandbox  
✅ Payment verification working  

### Common Issues & Solutions

**Problem**: "Pesapal API credentials not configured"  
**Solution**: Check `.env.local` has `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET`

**Problem**: Payment redirect not working  
**Solution**: Check `PESAPAL_CALLBACK_URL` is correct and accessible

**Problem**: Payment verification fails  
**Solution**: Make sure you're using the correct `orderTrackingId`

**Problem**: Sandbox vs Live confusion  
**Solution**: Always test in sandbox first, switch to live only when ready

---

## What's Next?

Congratulations! You've integrated payment processing. You now have:
- ✅ Payment gateway integration
- ✅ Deposit and full payment options
- ✅ Payment verification
- ✅ Secure transaction processing

**Ready for Module 5?**  
Open `MODULE_05_CLIENT_ACCOUNTS.md` to add user authentication and client accounts!

---

## Practice Exercise

Before moving on, try these exercises:

1. **Add payment history** - Show payment history in client accounts
2. **Add refund handling** - Create API endpoint for refunds (if needed)
3. **Add payment receipts** - Generate PDF receipts for payments
4. **Add multiple currencies** - Support USD payments in addition to KES
5. **Add payment reminders** - Send reminders for unpaid bookings

