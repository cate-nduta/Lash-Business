# Lesson 10.2: PayPal or Stripe Integration

**Estimated Time**: 35 minutes

---

## Introduction

PayPal and Stripe are two of the most popular payment gateways. This lesson shows you how to integrate either one into your booking website, from creating an account to processing your first payment.

**What You'll Learn:**
- How to set up a PayPal account
- How to set up a Stripe account
- How to get API credentials
- How to integrate into your website
- How to process payments

---

## Choosing Between PayPal and Stripe

### PayPal

**Best for:**
- Quick setup
- Customer trust (well-known)
- Easy for customers
- No coding required (buttons)

**Pros:**
- Very familiar to customers
- Easy to get started
- Good for small businesses
- PayPal button option

**Cons:**
- Less customizable
- Higher fees sometimes
- Less developer-friendly

---

### Stripe

**Best for:**
- Full control
- Custom checkout
- Developer-friendly
- Modern integration

**Pros:**
- Highly customizable
- Great documentation
- Lower fees often
- Better for developers

**Cons:**
- More setup required
- Need coding knowledge
- Less familiar to some customers

---

## Setting Up PayPal

### Step 1: Create PayPal Business Account

**1. Go to PayPal:**
- Visit `paypal.com`
- Click "Sign Up"
- Choose "Business Account"

**2. Complete registration:**
- Enter business information
- Verify email
- Link bank account
- Complete setup

**3. Get API credentials:**
- Go to Developer Dashboard
- Create app
- Get Client ID and Secret

---

### Step 2: Install PayPal SDK

**Install package:**
```bash
npm install @paypal/react-paypal-js
```

**Or use Cursor:**
```
Add PayPal SDK package to integrate PayPal payments into the website.
```

---

### Step 3: Integrate PayPal Button

**Basic integration:**
```javascript
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

<PayPalScriptProvider options={{ "client-id": "YOUR_CLIENT_ID" }}>
  <PayPalButtons
    createOrder={(data, actions) => {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: "100.00"
          }
        }]
      });
    }}
    onApprove={(data, actions) => {
      return actions.order.capture().then((details) => {
        // Handle successful payment
      });
    }}
  />
</PayPalScriptProvider>
```

**Cursor prompt:**
```
Integrate PayPal payment button into the booking checkout page. Use the 
PayPal SDK to create a payment button that processes payments when customers 
book appointments. Include proper error handling and success confirmation.
```

---

## Setting Up Stripe

### Step 1: Create Stripe Account

**1. Go to Stripe:**
- Visit `stripe.com`
- Click "Sign Up"
- Create account

**2. Complete setup:**
- Enter business details
- Verify email
- Add bank account
- Complete verification

**3. Get API keys:**
- Go to Developers → API keys
- Copy Publishable key (public)
- Copy Secret key (keep private!)

---

### Step 2: Install Stripe

**Install packages:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Or use Cursor:**
```
Add Stripe packages to integrate Stripe payment processing into the website.
```

---

### Step 3: Integrate Stripe Checkout

**Set up Stripe:**
```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
```

**Create checkout session:**
```javascript
const handleCheckout = async () => {
  const stripe = await stripePromise;
  
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 10000, // $100.00 in cents
      service: 'Classic Lashes'
    })
  });
  
  const session = await response.json();
  const result = await stripe.redirectToCheckout({
    sessionId: session.id
  });
};
```

**Cursor prompt:**
```
Integrate Stripe payment processing into the booking website. Create a 
checkout flow that:
1. Creates a Stripe checkout session when customer clicks "Pay"
2. Redirects to Stripe checkout page
3. Processes payment securely
4. Redirects back to website on success
5. Confirms booking and sends confirmation
```

---

## Creating API Routes

### Stripe Checkout Session

**Create `app/api/create-checkout-session/route.ts`:**

```javascript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, service, bookingId } = body

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: service || 'Booking',
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking`,
      metadata: {
        bookingId: bookingId || '',
      },
    })

    return NextResponse.json({ id: session.id })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**Cursor prompt:**
```
Create a Stripe checkout session API route that:
1. Receives booking details (amount, service, booking ID)
2. Creates Stripe checkout session
3. Returns session ID for redirect
4. Includes success and cancel URLs
5. Handles errors properly
```

---

## Environment Variables

### Required Variables

**For Stripe:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

**For PayPal:**
```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_client_id
PAYPAL_SECRET=your_secret
```

**Important:**
- Use test keys during development
- Switch to live keys for production
- Never commit keys to git
- Store in `.env.local`

---

## Handling Payment Success

### Success Page

**Create success handler:**
```javascript
// app/booking/success/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function BookingSuccess() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    if (sessionId) {
      // Verify payment and confirm booking
      fetch(`/api/verify-payment?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setBooking(data.booking)
            // Send confirmation email
          }
        })
    }
  }, [sessionId])

  return (
    <div>
      <h1>Payment Successful!</h1>
      <p>Your booking has been confirmed.</p>
      {/* Show booking details */}
    </div>
  )
}
```

**Cursor prompt:**
```
Create a booking success page that:
1. Verifies payment was successful
2. Confirms the booking in database
3. Sends confirmation email
4. Displays booking details to customer
5. Handles errors if payment verification fails
```

---

## Real-World Example

### Complete Stripe Integration

**1. Set up Stripe account:**
- Create account
- Get API keys
- Add to environment variables

**2. Install packages:**
```bash
npm install stripe @stripe/stripe-js
```

**3. Create checkout API:**
- Create session endpoint
- Handle payment processing
- Return session ID

**4. Add to booking page:**
- "Pay Now" button
- Redirects to Stripe
- Processes payment

**5. Create success page:**
- Verifies payment
- Confirms booking
- Sends confirmation

**Result:**
- Customers can pay online
- Payments processed securely
- Bookings confirmed automatically
- Money in your account

---

## Key Takeaways

1. **PayPal is easier to start** - Quick setup, familiar to customers
2. **Stripe offers more control** - Customizable, developer-friendly
3. **Both require accounts** - Sign up and get API credentials
4. **Install SDK packages** - Add payment libraries to your project
5. **Create API routes** - Handle payment processing server-side
6. **Use environment variables** - Store API keys securely
7. **Test in test mode** - Use test keys before going live
8. **Handle success/failure** - Create pages for both outcomes

---

## What's Next?

Great! You've learned how to integrate PayPal or Stripe. If you're operating in African countries, you might want to use Pesapal, which offers better local payment options. The next lesson covers Pesapal integration.

**Ready?** Let's move to Lesson 10.3: Pesapal for African Countries!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand the difference between PayPal and Stripe
- ✅ Know how to create accounts and get API keys
- ✅ Can install payment SDK packages
- ✅ Understand how to create checkout sessions
- ✅ Know how to handle payment success/failure
- ✅ Understand environment variable setup
- ✅ Know to use test mode during development

If anything is unclear, review this lesson or ask questions!
