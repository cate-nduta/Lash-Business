# Lesson 10.3: Pesapal for African Countries

**Estimated Time**: 30 minutes

---

## Introduction

Pesapal is a payment gateway designed for African markets, offering integration with local payment methods like M-Pesa, Airtel Money, and bank transfers. This lesson shows you how to set up Pesapal for your booking website if you're operating in African countries.

**What You'll Learn:**
- What Pesapal is and why it's useful
- How to create a Pesapal account
- How to get API credentials
- How to integrate Pesapal into your website
- How to handle Pesapal payments

---

## What Is Pesapal?

### African Payment Gateway

**Pesapal is:**
- Payment gateway for Africa
- Supports local payment methods
- M-Pesa integration
- Mobile money support
- Bank transfer options

**Best for:**
- Businesses in African countries
- Customers using mobile money
- Local payment preferences
- Regional operations

**Supports:**
- M-Pesa (Kenya, Tanzania)
- Airtel Money
- Bank transfers
- Credit/debit cards
- Mobile wallets

---

## Why Use Pesapal?

### Advantages for African Markets

**1. Local Payment Methods:**
- M-Pesa integration
- Mobile money support
- Bank transfers
- Local preferences

**2. Customer Familiarity:**
- Well-known in Africa
- Trusted brand
- Easy for customers
- Familiar process

**3. Lower Barriers:**
- Easier for customers
- No credit card needed
- Mobile money works
- Accessible payment

**4. Regional Focus:**
- Designed for Africa
- Local support
- Regional expertise
- Better integration

---

## Setting Up Pesapal

### Step 1: Create Pesapal Account

**1. Go to Pesapal:**
- Visit `pesapal.com`
- Click "Sign Up" or "Get Started"
- Choose "Merchant" account

**2. Complete registration:**
- Enter business information
- Provide business details
- Verify email
- Complete KYC (Know Your Customer)

**3. Wait for approval:**
- Pesapal reviews application
- Usually 1-3 business days
- You'll receive email confirmation

---

### Step 2: Get API Credentials

**1. Access developer dashboard:**
- Log into Pesapal account
- Go to "Developers" or "API"
- Access developer tools

**2. Get credentials:**
- Consumer Key
- Consumer Secret
- Save securely

**3. Choose environment:**
- Sandbox (testing)
- Live (production)
- Use sandbox first!

---

### Step 3: Install Pesapal SDK

**Install package:**
```bash
npm install pesapal-node
```

**Or use Cursor:**
```
Add Pesapal SDK package to integrate Pesapal payments into the website.
```

---

## Integrating Pesapal

### Basic Integration

**Set up Pesapal client:**
```javascript
import Pesapal from 'pesapal-node'

const pesapal = new Pesapal({
  consumerKey: process.env.PESAPAL_CONSUMER_KEY,
  consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
  environment: process.env.PESAPAL_ENVIRONMENT || 'sandbox' // or 'live'
})
```

**Cursor prompt:**
```
Set up Pesapal payment integration. Create a Pesapal client using environment 
variables for consumer key and secret. Use sandbox environment for testing.
```

---

### Create Payment Request

**Generate payment link:**
```javascript
const createPayment = async (bookingDetails) => {
  const paymentData = {
    amount: bookingDetails.amount,
    currency: 'KES', // or your currency
    description: `Booking: ${bookingDetails.service}`,
    callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/callback`,
    cancellation_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking`,
    reference: bookingDetails.bookingId, // Unique reference
    email: bookingDetails.customerEmail,
    phone_number: bookingDetails.customerPhone,
  }

  try {
    const response = await pesapal.submitOrderRequest(paymentData)
    return response.redirect_url // Redirect customer here
  } catch (error) {
    console.error('Pesapal error:', error)
    throw error
  }
}
```

**Cursor prompt:**
```
Create a function to generate Pesapal payment requests. It should:
1. Accept booking details (amount, service, customer info)
2. Create payment request with Pesapal
3. Return redirect URL for customer
4. Include callback URLs for success/failure
5. Handle errors properly
```

---

## Creating API Route

### Payment Request Endpoint

**Create `app/api/pesapal/create-payment/route.ts`:**

```javascript
import { NextRequest, NextResponse } from 'next/server'
import Pesapal from 'pesapal-node'

const pesapal = new Pesapal({
  consumerKey: process.env.PESAPAL_CONSUMER_KEY!,
  consumerSecret: process.env.PESAPAL_CONSUMER_SECRET!,
  environment: process.env.PESAPAL_ENVIRONMENT || 'sandbox'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, service, customerEmail, customerPhone, bookingId } = body

    const paymentData = {
      amount: amount,
      currency: 'KES',
      description: `Booking: ${service}`,
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/callback`,
      cancellation_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking`,
      reference: bookingId,
      email: customerEmail,
      phone_number: customerPhone,
    }

    const response = await pesapal.submitOrderRequest(paymentData)

    return NextResponse.json({
      success: true,
      redirect_url: response.redirect_url
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    )
  }
}
```

**Cursor prompt:**
```
Create a Pesapal payment API route that:
1. Receives booking details from frontend
2. Creates Pesapal payment request
3. Returns redirect URL for customer
4. Includes proper callback URLs
5. Handles errors gracefully
```

---

## Handling Payment Callback

### Payment Confirmation

**Create callback handler:**
```javascript
// app/api/pesapal/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Pesapal from 'pesapal-node'

const pesapal = new Pesapal({
  consumerKey: process.env.PESAPAL_CONSUMER_KEY!,
  consumerSecret: process.env.PESAPAL_CONSUMER_SECRET!,
  environment: process.env.PESAPAL_ENVIRONMENT || 'sandbox'
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const orderTrackingId = searchParams.get('OrderTrackingId')
  const orderMerchantReference = searchParams.get('OrderMerchantReference')

  if (!orderTrackingId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/booking?error=payment_failed`)
  }

  try {
    // Verify payment status
    const paymentStatus = await pesapal.getTransactionStatus(orderTrackingId)

    if (paymentStatus.payment_status === 'COMPLETED') {
      // Update booking status in database
      // Send confirmation email
      // Redirect to success page
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/booking/success?booking=${orderMerchantReference}`
      )
    } else {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/booking?error=payment_failed`
      )
    }
  } catch (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/booking?error=payment_error`
    )
  }
}
```

**Cursor prompt:**
```
Create a Pesapal payment callback handler that:
1. Receives payment status from Pesapal
2. Verifies payment was successful
3. Updates booking status in database
4. Sends confirmation email
5. Redirects to success or failure page
```

---

## Environment Variables

### Required Variables

**Add to `.env.local`:**
```
PESAPAL_CONSUMER_KEY=your_consumer_key
PESAPAL_CONSUMER_SECRET=your_consumer_secret
PESAPAL_ENVIRONMENT=sandbox  # or 'live' for production
```

**Important:**
- Use sandbox for testing
- Switch to live for production
- Never commit to git
- Keep credentials secure

---

## Payment Flow

### Complete Process

**1. Customer books:**
- Selects service
- Chooses date/time
- Clicks "Pay with Pesapal"

**2. Payment request created:**
- API creates Pesapal payment
- Gets redirect URL
- Redirects customer

**3. Customer pays:**
- Redirected to Pesapal
- Chooses payment method (M-Pesa, card, etc.)
- Completes payment

**4. Pesapal redirects back:**
- Callback to your website
- Payment verified
- Booking confirmed

**5. Confirmation:**
- Booking saved
- Confirmation sent
- Payment received

---

## Real-World Example

### Complete Integration

**1. Set up Pesapal:**
- Create merchant account
- Get API credentials
- Add to environment variables

**2. Install SDK:**
```bash
npm install pesapal-node
```

**3. Create payment API:**
- Generate payment requests
- Handle callbacks
- Verify payments

**4. Add to booking page:**
- "Pay with Pesapal" button
- Redirects to Pesapal
- Processes payment

**5. Handle callbacks:**
- Verify payment
- Confirm booking
- Send confirmation

**Result:**
- Customers can pay with M-Pesa, cards, etc.
- Payments processed securely
- Bookings confirmed automatically
- Money in your account

---

## Common Issues

### Issue 1: Account Not Approved

**Problem:**
- Application pending
- Can't get credentials

**Solution:**
- Wait for approval (1-3 days)
- Complete all required documents
- Contact Pesapal support
- Use sandbox for testing meanwhile

---

### Issue 2: Callback Not Working

**Problem:**
- Payment succeeds but callback fails
- Booking not confirmed

**Solution:**
- Check callback URL is correct
- Verify URL is accessible
- Check API route is working
- Test callback endpoint

---

### Issue 3: Payment Status Issues

**Problem:**
- Can't verify payment status
- Status check fails

**Solution:**
- Verify API credentials
- Check order tracking ID
- Ensure correct environment
- Contact Pesapal support

---

## Key Takeaways

1. **Pesapal is ideal for Africa** - Supports local payment methods
2. **M-Pesa integration** - Popular mobile money option
3. **Account approval needed** - Takes 1-3 business days
4. **Sandbox for testing** - Test before going live
5. **Callback handling important** - Verify payments and confirm bookings
6. **Environment variables** - Store credentials securely
7. **Redirect flow** - Customer redirected to Pesapal, then back
8. **Multiple payment methods** - Cards, mobile money, bank transfers

---

## What's Next?

Excellent! You've learned how to integrate Pesapal for African markets. Before going live with any payment gateway, it's crucial to test thoroughly. The next lesson shows you how to test payments safely using test mode.

**Ready?** Let's move to Lesson 10.4: Testing Payments!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand what Pesapal is (African payment gateway)
- ✅ Know why Pesapal is useful (local payment methods, M-Pesa)
- ✅ Can create a Pesapal account and get credentials
- ✅ Understand how to integrate Pesapal (SDK, API routes)
- ✅ Know how to handle payment callbacks
- ✅ Understand the payment flow (redirect to Pesapal and back)
- ✅ Know to use sandbox for testing

If anything is unclear, review this lesson or ask questions!
