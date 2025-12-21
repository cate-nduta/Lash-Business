# Production URL Verification

## ✅ Verification Complete

All code has been verified to ensure **NO localhost:3000 references** exist in production code. The website will use `lashdiary.co.ke` when published.

## Base URL Configuration

### Environment Variable
Set this in your production environment:
```env
NEXT_PUBLIC_BASE_URL=https://lashdiary.co.ke
```

### Default Fallback
All base URL functions default to `https://lashdiary.co.ke` (never localhost) if the environment variable is not set.

## Verified Components

### ✅ Server-Side API Routes
- All API routes use `process.env.NEXT_PUBLIC_BASE_URL` with fallback to `https://lashdiary.co.ke`
- No hardcoded localhost URLs found
- All base URL functions properly normalize URLs

### ✅ Client-Side Code
- Uses `window.location.origin` which automatically uses the current domain
- Relative API calls (`/api/...`) work correctly in production
- No hardcoded localhost URLs found

### ✅ Email Templates
- All email links use `BASE_URL` from environment variables
- Defaults to `https://lashdiary.co.ke` if not set
- No localhost references in email content

### ✅ Payment Callbacks
- M-Pesa callbacks use `getBaseUrl()` function
- PesaPal callbacks use environment variables
- All default to production domain

### ✅ PayPal Integration
- PayPal is implemented as payment links (PayPal.me or PayPal buttons)
- Payment links are external URLs (paypal.com, paypal.me) - no domain dependency
- No localhost references in PayPal code
- Payment links redirect customers to PayPal's secure payment pages
- Works correctly with production domain (`lashdiary.co.ke`)
- See `PAYPAL_SETUP.md` for complete setup instructions

### ✅ Image Configuration
- `next.config.js` allows localhost images only for development
- Production images use proper domain or CDN

## Files Verified

### Base URL Functions (All Default to lashdiary.co.ke)
- `app/api/booking/email/utils.ts` ✅
- `app/api/labs/email/utils.ts` ✅
- `app/api/mpesa/stk-push/route.ts` ✅
- `app/api/pesapal/submit-order/route.ts` ✅
- `app/api/admin/labs/invoices/[id]/route.ts` ✅
- `app/api/admin/manage-admins/invite/route.ts` ✅
- `app/layout.tsx` ✅
- `lib/base-url.ts` ✅ (New centralized utility)

### Client-Side Code
- All pages use relative URLs or `window.location.origin` ✅
- No hardcoded localhost references ✅

## Deployment Checklist

Before deploying to production:

1. ✅ Set `NEXT_PUBLIC_BASE_URL=https://lashdiary.co.ke` in production environment
2. ✅ Verify all API routes use environment variables
3. ✅ Test email links point to production domain
4. ✅ Verify payment callbacks use production URLs
5. ✅ Check that all images load from production domain

## Testing

After deployment, verify:
- [ ] All email links point to `lashdiary.co.ke`
- [ ] Payment callbacks work correctly
- [ ] API routes respond correctly
- [ ] No console errors about localhost
- [ ] All images load properly
- [ ] Social media sharing uses production URLs

## Notes

- Documentation files (`.md`) may contain localhost references for setup instructions - this is intentional
- Development environment can use `NEXT_PUBLIC_BASE_URL=http://localhost:3000` for local testing
- Production will always use `https://lashdiary.co.ke` as the default

