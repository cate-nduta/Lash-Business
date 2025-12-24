# Paystack Setup Instructions

Follow these steps to configure Paystack for your website.

## Step 1: Create Paystack Account

1. Go to [Paystack Dashboard](https://dashboard.paystack.com/#/signup)
2. Sign up for a free account
3. Complete your business verification (required for live mode)

## Step 2: Get Your API Keys

1. Log into your Paystack Dashboard
2. Go to **Settings** → **API Keys & Webhooks**
3. Copy your **Test Secret Key** (starts with `sk_test_`)
4. Copy your **Test Public Key** (starts with `pk_test_`)
5. For production, copy your **Live Secret Key** (starts with `sk_live_`)
6. For production, copy your **Live Public Key** (starts with `pk_live_`)

## Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Paystack API Keys (Test Mode)
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_ENVIRONMENT=test

# Paystack API Keys (Production - when ready)
# PAYSTACK_SECRET_KEY_LIVE=sk_live_xxxxx
# PAYSTACK_PUBLIC_KEY_LIVE=pk_live_xxxxx
# PAYSTACK_ENVIRONMENT=live

# Paystack Webhook Secret (optional but recommended)
# Get this from Settings → API Keys & Webhooks → Webhook Secret
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxx
```

## Step 4: Configure Webhook URL

1. In Paystack Dashboard, go to **Settings** → **API Keys & Webhooks**
2. Scroll to **Webhooks** section
3. Click **Add Webhook URL**
4. Enter your webhook URL:
   ```
   https://yourdomain.com/api/paystack/webhook
   ```
   For local testing, you can use a service like [ngrok](https://ngrok.com/) to expose your local server.

5. Select the events you want to receive:
   - ✅ `charge.success` (Required)
   - ✅ `charge.failed` (Optional but recommended)

6. Copy the **Webhook Secret** and add it to your `.env.local` file

## Step 5: Test the Integration

### Test Cards (Test Mode Only)

Paystack provides test cards for testing:

**Successful Payment:**
- Card Number: `4084084084084081`
- CVV: `408`
- Expiry: Any future date (e.g., `12/25`)
- PIN: `0000` (for Nigerian cards) or any 4 digits

**Declined Payment:**
- Card Number: `5060666666666666666`
- CVV: `408`
- Expiry: Any future date

### Test Flow

1. Make a test purchase (course, consultation, etc.)
2. You'll be redirected to Paystack checkout
3. Use test card: `4084084084084081`
4. Complete payment
5. You'll be redirected back to success page
6. Check your webhook logs to ensure events are received

## Step 6: Go Live

When ready for production:

1. Complete business verification in Paystack Dashboard
2. Switch to live keys in your `.env.local`:
   ```env
   PAYSTACK_SECRET_KEY=sk_live_xxxxx
   PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
   PAYSTACK_ENVIRONMENT=live
   ```
3. Update webhook URL to production URL
4. Test with a small real transaction first

## Integration Points

The Paystack integration is now active for:

1. **Course Purchases** - `/api/courses/purchase`
2. **Consultation Bookings** - `/app/labs/book-appointment`
3. **Invoice Payments** - `/api/admin/labs/invoices`
4. **Gift Card Purchases** - `/app/gift-cards`

## Payment Flow

1. Customer initiates payment
2. System calls `/api/paystack/initialize`
3. Customer redirected to Paystack checkout
4. Customer completes payment
5. Paystack redirects to `/api/paystack/callback`
6. System verifies payment via `/api/paystack/verify`
7. Paystack sends webhook to `/api/paystack/webhook`
8. System updates records and sends confirmation emails

## Troubleshooting

### Payment Not Initializing
- Check that `PAYSTACK_SECRET_KEY` is set correctly
- Verify the key starts with `sk_test_` or `sk_live_`
- Check browser console for errors

### Webhook Not Receiving Events
- Verify webhook URL is correct in Paystack Dashboard
- Check that webhook secret matches in `.env.local`
- Ensure your server is accessible (use ngrok for local testing)
- Check server logs for webhook requests

### Payment Verification Failing
- Ensure reference is passed correctly
- Check that transaction exists in Paystack Dashboard
- Verify secret key has correct permissions

## Support

- [Paystack Documentation](https://paystack.com/docs/api/)
- [Paystack Support](https://paystack.com/contact)
- Check server logs for detailed error messages

