# Pesapal Payment Integration Setup Guide

This guide will help you set up Pesapal payment gateway integration for your LashDiary booking system.

## Overview

The system now supports:
- **Multi-currency**: KES (Kenyan Shilling) and USD (US Dollar)
- **Payment Methods**: 
  - M-Pesa STK Push (KES only)
  - Pesapal (Cards & M-Pesa) - supports both KES and USD

## Prerequisites

1. **Pesapal Business Account**: You need to register for a Pesapal business account at [pesapal.com](https://www.pesapal.com)
2. **API Credentials**: After registration, you'll receive:
   - Consumer Key
   - Consumer Secret

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Pesapal Configuration
PESAPAL_CONSUMER_KEY=your_consumer_key_here
PESAPAL_CONSUMER_SECRET=your_consumer_secret_here
PESAPAL_ENVIRONMENT=sandbox  # Use 'sandbox' for testing, 'live' for production
PESAPAL_CALLBACK_URL=https://yourdomain.com/api/pesapal/callback
PESAPAL_IPN_URL=https://yourdomain.com/api/pesapal/ipn

# Exchange Rate (optional, defaults to 130)
# Update this with current KES/USD exchange rate
DEFAULT_EXCHANGE_RATE=130
```

## Setup Steps

### 1. Get Pesapal Credentials

1. Log in to your Pesapal dashboard
2. Navigate to "API Credentials" section
3. Copy your Consumer Key and Consumer Secret
4. If you can't find them, click "RESEND" to have them sent to your email

### 2. Configure Environment Variables

1. Open your `.env.local` file
2. Add the Pesapal credentials as shown above
3. Set `PESAPAL_ENVIRONMENT` to `sandbox` for testing
4. Update the callback URLs with your actual domain

### 3. Test in Sandbox Mode

1. Use Pesapal's sandbox environment for testing
2. Test both card payments and M-Pesa STK push
3. Verify that payments are being recorded correctly

### 4. Go Live

1. Once testing is complete, change `PESAPAL_ENVIRONMENT` to `live`
2. Update your Consumer Key and Consumer Secret with production credentials
3. Ensure your callback URLs are publicly accessible (not localhost)
4. Pesapal will need to whitelist your callback URLs

## How It Works

### Payment Flow

1. **Customer Books Appointment**: Customer selects service, date, time, and payment method
2. **Currency Selection**: Customer can choose KES or USD
3. **Payment Method Selection**:
   - **M-Pesa STK Push**: Direct M-Pesa payment (KES only)
   - **Pesapal**: Redirects to Pesapal payment page (KES or USD)
4. **Payment Processing**:
   - For M-Pesa: STK push sent to customer's phone
   - For Pesapal: Customer redirected to Pesapal to complete payment
5. **Payment Confirmation**: 
   - M-Pesa: Callback received and booking confirmed
   - Pesapal: IPN (Instant Payment Notification) received and booking confirmed

### Currency Support

- **KES (Kenyan Shilling)**: 
  - Can use both M-Pesa and Pesapal
  - Prices stored in `services.json` as `price` field
  
- **USD (US Dollar)**:
  - Only available via Pesapal
  - Prices stored in `services.json` as `priceUSD` field
  - If USD price not set, system converts from KES using exchange rate

### Service Price Structure

Services in `services.json` now support both currencies:

```json
{
  "categories": [
    {
      "id": "full-sets",
      "name": "Full Sets",
      "services": [
        {
          "id": "classic-lashes",
          "name": "Classic Lashes",
          "price": 7000,        // KES price
          "priceUSD": 54,       // USD price (optional)
          "duration": 120
        }
      ]
    }
  ]
}
```

## Admin Configuration

### Setting USD Prices

1. Go to Admin → Services
2. Edit a service
3. Set the USD price in the "Price (USD)" field
4. Save the service

The system will:
- Use the USD price if set when currency is USD
- Convert from KES if USD price not set
- Always use KES price when currency is KES

## Testing

### Sandbox Testing

1. Set `PESAPAL_ENVIRONMENT=sandbox`
2. Use Pesapal test credentials
3. Test with Pesapal test cards:
   - Visa: 4111111111111111
   - Mastercard: 5555555555554444
4. Use test M-Pesa numbers provided by Pesapal

### Production Testing

1. Set `PESAPAL_ENVIRONMENT=live`
2. Use real Pesapal credentials
3. Make a small test transaction
4. Verify payment appears in Pesapal dashboard
5. Verify booking is created correctly

## Troubleshooting

### Payment Not Processing

1. Check that API credentials are correct
2. Verify callback URLs are accessible
3. Check server logs for errors
4. Ensure Pesapal has whitelisted your callback URLs

### Currency Conversion Issues

1. Update `DEFAULT_EXCHANGE_RATE` in `.env.local`
2. Or set explicit USD prices for services in admin panel

### Callback Not Received

1. Verify callback URL is publicly accessible
2. Check that Pesapal has whitelisted your domain
3. Review server logs for incoming requests
4. Test callback URL manually

## Support

For Pesapal-specific issues:
- Pesapal Support: [support.pesapal.com](https://support.pesapal.com)
- Pesapal API Docs: [developer.pesapal.com](https://developer.pesapal.com)

For system integration issues:
- Check server logs
- Review API route handlers in `app/api/pesapal/`
- Verify environment variables are set correctly

