# Paystack Inline Payment Setup

This guide explains how to set up Paystack inline/popup payments on your website instead of redirecting to Paystack's hosted payment page.

## Overview

The inline payment integration allows customers to complete payments directly on your website using a popup/modal, without being redirected to Paystack's payment page. This provides a seamless user experience while maintaining security.

## Environment Variables Required

Add the following environment variable to your `.env.local` file:

```env
# Paystack Public Key (for frontend inline payment)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx  # For testing
# NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx  # For production
```

**Important Notes:**
- The public key must start with `NEXT_PUBLIC_` prefix to be accessible in the browser
- Use `pk_test_xxxxx` for testing/sandbox mode
- Use `pk_live_xxxxx` for production
- The public key is safe to expose in the frontend (it's designed for client-side use)

## How It Works

1. **Backend Initialization**: When a user initiates payment, the backend validates the amount and creates a transaction reference
2. **Frontend Payment Form**: The frontend uses Paystack's inline JavaScript library to create a payment popup
3. **Payment Processing**: Customer completes payment in the popup (Card, M-Pesa, Bank Transfer, etc.)
4. **Webhook Verification**: Paystack sends a webhook to your server to confirm payment
5. **Success Handling**: The frontend receives payment confirmation and updates the UI

## Payment Flow

```
User clicks "Pay" 
  ↓
Backend validates amount & creates reference
  ↓
Frontend opens Paystack payment popup
  ↓
User completes payment in popup
  ↓
Paystack processes payment
  ↓
Webhook notifies backend (automatic)
  ↓
Frontend shows success message
```

## Webhook Configuration

The webhook is already configured at `/api/paystack/webhook`. Make sure to:

1. **Set up webhook in Paystack Dashboard:**
   - Go to Settings → API Keys & Webhooks
   - Add webhook URL: `https://yourdomain.com/api/paystack/webhook`
   - Select events: `charge.success`, `charge.failure`

2. **Set webhook secret in environment:**
   ```env
   PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here
   ```

## Testing

1. Use test keys (`pk_test_...`) for development
2. Test with Paystack test cards:
   - Success: `4084084084084081`
   - Decline: `5060666666666666666`
3. Check webhook logs in Paystack dashboard
4. Verify payments are recorded in your database

## Security Notes

- Amount is validated on backend before payment
- Payment reference is generated on backend
- Webhook signature is verified to prevent fraud
- Public key is safe to expose (designed for frontend use)
- Secret key remains on backend only

## Troubleshooting

### Payment popup doesn't open
- Check that `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is set
- Verify the public key is correct (test vs live)
- Check browser console for errors

### Payment succeeds but not recorded
- Verify webhook is configured correctly
- Check webhook secret matches Paystack dashboard
- Review server logs for webhook errors

### Amount mismatch
- Ensure amount is validated on backend
- Check currency conversion is correct
- Verify amount is in correct format (main currency, not subunits)

## Support

For Paystack API issues:
- Paystack Documentation: https://paystack.com/docs/api/
- Paystack Support: support@paystack.com

