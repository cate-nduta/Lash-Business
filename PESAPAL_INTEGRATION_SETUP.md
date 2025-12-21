# PesaPal Integration Setup - Complete Guide

This guide provides step-by-step instructions for setting up PesaPal payment gateway integration for your LashDiary website.

## Your PesaPal Credentials

You have been provided with the following credentials:

- **Consumer Key**: `I4m3ACQwFIdJlisR8iU5xePau41ZOd+Y`
- **Consumer Secret**: `kpdaPpwTa+aIP7qotWOFF4O3VTE=`

## Environment Variables Setup

Add the following environment variables to your `.env.local` file (create it if it doesn't exist):

```env
# PesaPal Configuration
PESAPAL_CONSUMER_KEY=I4m3ACQwFIdJlisR8iU5xePau41ZOd+Y
PESAPAL_CONSUMER_SECRET=kpdaPpwTa+aIP7qotWOFF4O3VTE=
PESAPAL_ENVIRONMENT=live  # Use 'sandbox' for testing, 'live' for production

# Base URL (update with your actual domain)
NEXT_PUBLIC_BASE_URL=https://lashdiary.co.ke

# PesaPal Callback URLs (will be auto-generated from base URL if not set)
PESAPAL_CALLBACK_URL=https://lashdiary.co.ke/api/pesapal/callback
PESAPAL_IPN_URL=https://lashdiary.co.ke/api/pesapal/ipn
```

## What's Been Integrated

### 1. Booking Checkout
- ✅ Card payments via PesaPal (supports both KES and USD)
- ✅ M-Pesa payments via PesaPal (KES only)
- ✅ Automatic booking confirmation after successful payment

### 2. Shop/Cart Checkout
- ✅ Card payments via PesaPal
- ✅ M-Pesa payments via PesaPal
- ✅ Automatic order confirmation and inventory deduction after payment
- ✅ Email notifications sent after successful payment

### 3. Payment Processing
- ✅ PesaPal IPN (Instant Payment Notification) handler processes both bookings and shop orders
- ✅ Automatic payment verification
- ✅ Payment status updates in real-time

## How It Works

### Payment Flow

1. **Customer selects payment method** (M-Pesa or Card)
2. **Order is created** with pending payment status
3. **PesaPal payment page** is displayed (customer can choose M-Pesa or Card on PesaPal's page)
4. **Customer completes payment** on PesaPal
5. **PesaPal sends IPN** to your server
6. **Payment is verified** and order/booking is confirmed
7. **Confirmation email** is sent to customer

### Supported Payment Methods

- **M-Pesa**: Available for KES payments
- **Card Payment**: Available for both KES and USD payments
- Both methods are processed through PesaPal's secure payment gateway

## Testing

### Sandbox Testing

1. Set `PESAPAL_ENVIRONMENT=sandbox` in your `.env.local`
2. Use PesaPal sandbox test credentials (different from production)
3. Test with PesaPal test cards:
   - Visa: `4111111111111111`
   - Mastercard: `5555555555554444`
4. Use test M-Pesa numbers provided by PesaPal

### Production Testing

1. Set `PESAPAL_ENVIRONMENT=live` in your `.env.local`
2. Use your production credentials (provided above)
3. Make a small test transaction
4. Verify payment appears in PesaPal dashboard
5. Verify order/booking is created correctly

## Important Notes

### Callback URLs

PesaPal needs to whitelist your callback URLs. Make sure:

1. Your callback URLs are publicly accessible (not localhost)
2. Your domain is whitelisted in PesaPal dashboard
3. URLs are using HTTPS (required for production)

### IPN (Instant Payment Notification)

The IPN endpoint (`/api/pesapal/ipn`) automatically:
- Verifies payment status with PesaPal
- Updates booking/order status
- Sends confirmation emails
- Deducts inventory for shop orders

### Security

- Never commit your `.env.local` file to version control
- Keep your Consumer Secret secure
- Use HTTPS in production
- Regularly check PesaPal dashboard for transactions

## Troubleshooting

### Payment Not Processing

1. ✅ Check that API credentials are correct in `.env.local`
2. ✅ Verify callback URLs are accessible and using HTTPS
3. ✅ Check server logs for errors
4. ✅ Ensure PesaPal has whitelisted your callback URLs
5. ✅ Verify `PESAPAL_ENVIRONMENT` is set correctly

### Callback Not Received

1. ✅ Verify callback URL is publicly accessible
2. ✅ Check that PesaPal has whitelisted your domain
3. ✅ Review server logs for incoming requests
4. ✅ Test callback URL manually (should return redirect)

### Payment Status Not Updating

1. ✅ Check IPN endpoint is accessible
2. ✅ Review server logs for IPN processing
3. ✅ Verify payment in PesaPal dashboard
4. ✅ Check that order/booking exists with correct tracking ID

## Support

### PesaPal Support
- Website: https://www.pesapal.com
- Support: https://support.pesapal.com
- API Docs: https://developer.pesapal.com

### System Integration
- Check server logs in your hosting platform
- Review API route handlers in `app/api/pesapal/`
- Verify environment variables are set correctly

## Next Steps

1. ✅ Add credentials to `.env.local`
2. ✅ Update `NEXT_PUBLIC_BASE_URL` with your actual domain
3. ✅ Test in sandbox mode first
4. ✅ Contact PesaPal to whitelist your callback URLs
5. ✅ Switch to production mode when ready
6. ✅ Monitor first few transactions closely

## Files Modified

The following files have been updated to support PesaPal integration:

- `app/api/shop/checkout/route.ts` - Shop checkout now uses PesaPal
- `app/api/pesapal/ipn/route.ts` - IPN handler processes shop orders
- `app/api/pesapal/callback/route.ts` - Callback handles shop orders
- `app/cart/page.tsx` - Cart redirects to PesaPal payment page

Existing booking integration already supports PesaPal and remains unchanged.

