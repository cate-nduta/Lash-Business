# Paystack Full Integration - Complete

## Overview

All payment flows on the website now use Paystack. This includes:
- Course purchases
- Service bookings (Card & M-Pesa)
- Consultation bookings
- Invoice payments
- Gift card purchases
- **Balance payments** (NEW)
- **Admin payment collection** (NEW)

## Changes Made

### 1. Admin Record Payment → Paystack Payment Links

**Before:**
- Admin could manually record Cash, M-Pesa, or Card payments
- M-Pesa used STK push

**After:**
- Admin generates a Paystack payment link
- Client pays via Paystack (Card or M-Pesa)
- Payment is automatically recorded via webhook
- No manual payment recording needed

**Location:** `app/admin/bookings/page.tsx`

**New API:** `app/api/admin/bookings/balance-payment-link/route.ts`

### 2. Removed "Pay Later" Option

**Before:**
- Clients could book without paying (Pay Later option)
- Admin had to follow up for payment

**After:**
- Payment is required to book
- Clients must choose Card or M-Pesa payment
- No "Pay Later" option available

**Location:** `app/booking/page.tsx`

### 3. Balance Payment Flow

**How it works:**
1. Admin opens booking with balance due
2. Clicks "Generate Paystack Payment Link"
3. System creates Paystack transaction
4. Admin copies and shares link with client
5. Client pays via Paystack (Card or M-Pesa)
6. Webhook automatically records payment
7. Booking status updates to "paid" if fully paid

**Webhook Handler:** `app/api/paystack/webhook/route.ts`
- Added `handleBookingBalancePayment()` function
- Processes `payment_type: 'booking_balance'` payments
- Updates booking deposit and payment records
- Sends payment receipt email

## Payment Flow Diagram

```
Admin Books Page
    ↓
Generate Payment Link
    ↓
Paystack Transaction Created
    ↓
Admin Shares Link with Client
    ↓
Client Pays on Paystack
    ↓
Webhook Receives Payment
    ↓
Booking Updated Automatically
    ↓
Client Receives Receipt Email
```

## API Endpoints

### Generate Balance Payment Link
```
POST /api/admin/bookings/balance-payment-link
Body: { bookingId: string }
Response: { authorizationUrl: string, reference: string }
```

### Paystack Webhook
```
POST /api/paystack/webhook
Handles: charge.success, charge.failed
Payment Types:
  - course_purchase
  - consultation
  - invoice
  - gift_card
  - booking
  - booking_balance (NEW)
```

## Admin Interface Changes

### Before:
- Payment Method: Cash / M-Pesa / Card
- Amount input field
- "Mark as Paid" button
- "Send M-Pesa Prompt" button

### After:
- "Generate Paystack Payment Link" button
- Payment link display with copy button
- Automatic payment recording via webhook

## Client Experience

### Booking Page:
- ✅ Card Payment (Full payment)
- ✅ M-Pesa Payment (Deposit)
- ❌ Pay Later (REMOVED)

### Balance Payment:
- Admin generates link
- Client receives link (via email/phone)
- Client clicks link
- Redirects to Paystack checkout
- Client pays (Card or M-Pesa)
- Redirects to success page
- Receives payment receipt email

## Testing

### Test Balance Payment:
1. Create a booking with deposit
2. Go to Admin → Bookings
3. Select booking with balance due
4. Click "Generate Paystack Payment Link"
5. Copy link and open in browser
6. Complete test payment
7. Verify booking deposit updated
8. Check payment receipt email

### Test Booking Page:
1. Go to booking page
2. Verify only Card and M-Pesa options
3. Verify "Pay Later" is removed
4. Complete booking with payment
5. Verify redirects to Paystack

## Environment Variables

Required Paystack configuration:
```env
PAYSTACK_SECRET_KEY=sk_test_xxxxx  # or sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx  # or pk_live_xxxxx
PAYSTACK_ENVIRONMENT=test  # or 'live'
PAYSTACK_WEBHOOK_SECRET=xxxxx
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Benefits

1. **Unified Payment System**: All payments go through Paystack
2. **Automatic Processing**: No manual payment recording needed
3. **Better Tracking**: All payments tracked via Paystack dashboard
4. **Client Convenience**: Clients can pay balance anytime via link
5. **Reduced Admin Work**: No need to manually record payments
6. **Payment Required**: Ensures all bookings have payment

## Migration Notes

- Old manual payment records are preserved
- New payments use Paystack automatically
- Balance payments now require Paystack link
- "Pay Later" option completely removed

## Support

If payment link generation fails:
1. Check Paystack keys are configured
2. Verify booking has balance due
3. Check server logs for errors
4. Ensure webhook URL is configured in Paystack dashboard

All payments now processed through Paystack! 🎉

