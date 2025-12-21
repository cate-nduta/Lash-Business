# PayPal Setup Guide for Production

## Overview

PayPal is integrated into your website as a **payment link option**. This allows customers to pay via PayPal.me links or PayPal payment buttons that you configure in the admin settings.

## How PayPal Works

1. **Admin Configuration**: You add PayPal payment links in the Payment Settings
2. **Customer Checkout**: Customers see PayPal as a payment option during checkout
3. **Payment Redirect**: Customers are redirected to your PayPal link to complete payment
4. **Manual Confirmation**: You manually confirm payments in your admin dashboard

## Setting Up PayPal

### Step 1: Create PayPal Payment Links

1. **PayPal.me Link** (Recommended for Simple Payments)
   - Go to [PayPal.me](https://www.paypal.com/paypalme/)
   - Create your PayPal.me link (e.g., `https://paypal.me/lashdiary`)
   - This link allows customers to send you money directly

2. **PayPal Payment Button** (For Specific Amounts)
   - Log in to your PayPal Business account
   - Go to Tools → PayPal Buttons
   - Create a payment button for your services
   - Copy the payment link URL

3. **PayPal Business Account**
   - Ensure you have a PayPal Business account
   - Verify your account for higher transaction limits
   - Set up your business profile

### Step 2: Configure PayPal in Admin Settings

1. Navigate to `/admin/payment-settings`
2. Click **"+ Add Payment Link"**
3. Fill in the details:
   - **Link Name**: "PayPal Payment" or "Pay via PayPal"
   - **Payment Type**: Select "PayPal"
   - **Payment URL/Link**: Enter your PayPal.me link or PayPal button URL
     - Example: `https://paypal.me/lashdiary`
     - Example: `https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=YOUR_BUTTON_ID`
   - **Payment Instructions** (Optional): Add any specific instructions
   - **Enable this payment link**: Check the box
4. Click **"Save Changes"**

### Step 3: Set as Default (Optional)

1. In Payment Settings, scroll to **"Default Payment Method"**
2. Select **"PayPal"** if you want it to be the default option
3. Click **"Save Changes"**

## Production Configuration

### Environment Variables

No special environment variables are needed for PayPal payment links. The system uses:
- `NEXT_PUBLIC_BASE_URL` - Your production domain (already configured)

### URL Verification

✅ **Verified**: PayPal links work correctly in production
- PayPal links are external URLs (paypal.com, paypal.me)
- No localhost references in PayPal integration
- Links redirect customers to PayPal's secure payment page
- After payment, customers return to your website

## How It Works in Production

### Customer Flow

1. Customer adds items to cart or books appointment
2. Customer proceeds to checkout
3. Customer selects "PayPal" as payment method
4. Customer clicks "Complete Payment"
5. Customer is redirected to your PayPal link
6. Customer completes payment on PayPal
7. Customer returns to your website
8. Order/booking is created with "pending payment" status

### Admin Flow

1. You receive PayPal payment notification
2. Log in to `/admin` dashboard
3. Find the order/booking with "pending payment" status
4. Verify payment in your PayPal account
5. Update order/booking status to "confirmed" or "paid"

## PayPal Link Types

### 1. PayPal.me Links
- **Format**: `https://paypal.me/yourusername`
- **Best for**: Simple, direct payments
- **Setup**: Create at [paypal.me](https://www.paypal.com/paypalme/)
- **Usage**: Customers enter amount and pay

### 2. PayPal Payment Buttons
- **Format**: `https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=...`
- **Best for**: Fixed amounts or specific products
- **Setup**: Create in PayPal Business account → Tools → PayPal Buttons
- **Usage**: Pre-configured amounts

### 3. PayPal Checkout Links
- **Format**: Custom PayPal checkout URLs
- **Best for**: Advanced integrations
- **Setup**: Requires PayPal API credentials (not currently implemented)

## Testing PayPal in Production

### Before Going Live

1. ✅ Add your PayPal link in admin settings
2. ✅ Test the payment link redirect
3. ✅ Verify PayPal.me link works
4. ✅ Test a small payment transaction
5. ✅ Verify you receive payment notifications
6. ✅ Test order confirmation flow

### Production Checklist

- [ ] PayPal Business account verified
- [ ] PayPal.me link created and tested
- [ ] PayPal link added in admin settings
- [ ] Payment link enabled in settings
- [ ] Test payment completed successfully
- [ ] Order confirmation process tested
- [ ] Email notifications working

## Troubleshooting

### PayPal Link Not Working

**Issue**: Customer clicks PayPal but nothing happens
- **Solution**: Verify the PayPal URL is correct and starts with `https://`
- **Solution**: Check that the payment link is enabled in admin settings
- **Solution**: Test the PayPal link directly in a new browser tab

### Payment Not Confirmed

**Issue**: Customer paid but order shows "pending payment"
- **Solution**: This is expected - you need to manually confirm payment
- **Solution**: Check your PayPal account for the payment
- **Solution**: Update order status in admin dashboard after verifying payment

### Redirect Issues

**Issue**: Customer redirected to wrong page after payment
- **Solution**: PayPal.me links automatically return to your website
- **Solution**: For PayPal buttons, configure return URL in PayPal button settings
- **Solution**: Ensure `NEXT_PUBLIC_BASE_URL` is set to production domain

## Best Practices

1. **Use PayPal.me for Simplicity**: Easiest to set up and use
2. **Verify Your Account**: Unverified accounts have lower limits
3. **Monitor Payments**: Regularly check PayPal account for payments
4. **Clear Instructions**: Add payment instructions in admin settings
5. **Test Regularly**: Test PayPal links periodically to ensure they work

## Security Notes

- ✅ PayPal handles all payment processing securely
- ✅ No payment data is stored on your website
- ✅ All transactions are processed by PayPal
- ✅ HTTPS is required (automatically handled by PayPal)

## Support

For PayPal-specific issues:
- PayPal Business Support: [https://www.paypal.com/businesshelp](https://www.paypal.com/businesshelp)
- PayPal Developer Documentation: [https://developer.paypal.com/](https://developer.paypal.com/)

## Production Ready ✅

Your PayPal integration is **production-ready**:
- ✅ No localhost references
- ✅ Uses production domain for redirects
- ✅ Secure payment processing via PayPal
- ✅ Works with `lashdiary.co.ke` domain

