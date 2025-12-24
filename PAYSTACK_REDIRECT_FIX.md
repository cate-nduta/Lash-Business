# Paystack Redirect Fix

## Issue Fixed

Course purchases were not redirecting to Paystack checkout page. They were falling back to an internal checkout page instead.

## Changes Made

### 1. Course Purchase API (`/api/courses/purchase`)
- ✅ Removed fallback to checkout page
- ✅ Now requires Paystack to be configured
- ✅ Returns clear error if Paystack fails
- ✅ Returns `authorizationUrl` in response

### 2. Course Checkout Page (`/app/courses/[courseId]/checkout/page.tsx`)
- ✅ Now uses `window.location.href` for external Paystack redirect
- ✅ Checks for `authorizationUrl` first
- ✅ Properly redirects to Paystack payment page
- ✅ Shows error if Paystack URL is missing

## How It Works Now

1. User clicks "Purchase Course"
2. Frontend calls `/api/courses/purchase`
3. API initializes Paystack transaction
4. API returns `authorizationUrl` (Paystack checkout URL)
5. Frontend redirects using `window.location.href = authorizationUrl`
6. User completes payment on Paystack
7. Paystack redirects back to `/api/paystack/callback`
8. System verifies payment and redirects to success page

## All Payment Flows Using Paystack

✅ **Course Purchases** - `/api/courses/purchase` → Paystack
✅ **Service Bookings** - `/app/booking` → Paystack (Card & M-Pesa)
✅ **Consultation Bookings** - `/app/labs/book-appointment` → Paystack
✅ **Invoice Payments** - `/api/admin/labs/invoices` → Paystack
✅ **Gift Card Purchases** - `/app/gift-cards` → Paystack

## Testing

To test course purchase:
1. Go to a paid course
2. Click "Purchase" or "Buy Now"
3. Enter email and name
4. Click "Purchase Course"
5. Should redirect to `https://checkout.paystack.com/xxxxx`
6. Complete test payment
7. Should redirect back to success page

## Troubleshooting

If course purchase still goes to checkout page:

1. **Check Paystack Configuration:**
   ```env
   PAYSTACK_SECRET_KEY=sk_test_xxxxx  # or sk_live_xxxxx
   PAYSTACK_ENVIRONMENT=test  # or 'live'
   ```

2. **Check Browser Console:**
   - Look for errors in console
   - Check network tab for `/api/courses/purchase` response
   - Verify `authorizationUrl` is in the response

3. **Check Server Logs:**
   - Look for "Paystack initialization failed" errors
   - Verify Paystack API is responding

4. **Verify Paystack Keys:**
   - Test keys should start with `sk_test_`
   - Live keys should start with `sk_live_`
   - Keys must be valid and active

## Expected Behavior

**Before Fix:**
- Purchase → Checkout page (internal) ❌

**After Fix:**
- Purchase → Paystack checkout (`https://checkout.paystack.com/xxxxx`) ✅

All payments now go through Paystack!

