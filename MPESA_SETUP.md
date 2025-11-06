# M-Pesa Integration Setup Guide

This guide will help you set up M-Pesa STK Push payment integration for your LashDiary booking system.

## Prerequisites

1. **Safaricom Developer Account**: You need to register at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. **Business Registration**: Your business must be registered with Safaricom to use M-Pesa APIs
3. **Business Shortcode**: You'll receive a business shortcode from Safaricom
4. **Passkey**: You'll receive a passkey from Safaricom

## Getting Your Credentials

### Step 1: Register on Safaricom Developer Portal

1. Go to [https://developer.safaricom.co.ke/](https://developer.safaricom.co.ke/)
2. Sign up for a developer account
3. Create a new app to get your Consumer Key and Consumer Secret

### Step 2: Get Your Business Shortcode and Passkey

1. Contact Safaricom to register your business for M-Pesa payments
2. You'll receive:
   - **Business Shortcode**: A 6-digit number (e.g., 174379 for sandbox)
   - **Passkey**: A long string provided by Safaricom

### Step 3: Set Up Your Environment Variables

Add the following to your `.env.local` file:

```env
# M-Pesa API Credentials
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=your_business_shortcode_here
MPESA_PASSKEY=your_passkey_here

# M-Pesa Environment (sandbox or production)
MPESA_ENVIRONMENT=sandbox

# M-Pesa Callback URL (your production URL)
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback

# Your base URL (for callback URL generation)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Testing with Sandbox

For testing purposes, you can use Safaricom's sandbox environment:

1. **Sandbox Shortcode**: `174379` (for testing)
2. **Sandbox Passkey**: Get this from the Safaricom Developer Portal
3. **Test Phone Numbers**: Use the test numbers provided in the developer portal

## Production Setup

When you're ready for production:

1. Change `MPESA_ENVIRONMENT` to `production`
2. Update `MPESA_SHORTCODE` to your production shortcode
3. Update `MPESA_PASSKEY` to your production passkey
4. Ensure your callback URL is publicly accessible (not localhost)
5. Safaricom will need to whitelist your callback URL

## How It Works

1. **User Books Appointment**: When a user clicks "Book Appointment & Pay Deposit"
2. **M-Pesa STK Push**: The system sends an STK push request to the user's phone number with the **exact deposit amount** calculated (e.g., "Pay KSH 2,100 to LashDiary")
3. **User Sees Exact Amount**: The M-Pesa prompt shows the exact amount - customers cannot pay more or less
4. **User Enters PIN**: The user enters their M-Pesa PIN to authorize the payment
5. **Payment Confirmation**: M-Pesa processes the payment and sends a callback to your server
6. **Booking Confirmed**: The booking is confirmed and emails are sent

## Receiving Payments - PayBill vs Till Number vs Phone Number

**Important:** M-Pesa STK Push for business payments requires either a **PayBill number** or a **Till number**. You cannot directly receive business payments to a personal phone number via STK Push.

### Payment Options:

1. **PayBill Number (Recommended for Businesses)**
   - This is what the current setup uses (`TransactionType: 'CustomerPayBillOnline'`)
   - Customers pay to your PayBill number
   - Funds go to your business M-Pesa account
   - You can withdraw funds to your personal account manually or set up auto-transfer
   - More professional and suitable for businesses

2. **Till Number**
   - Alternative option (`TransactionType: 'CustomerBuyGoodsOnline'`)
   - Similar to PayBill but used for retail/point-of-sale
   - Funds also go to your business account

3. **Personal Phone Number (Not Recommended)**
   - STK Push cannot send business payments directly to a personal phone number
   - For business transactions, you MUST use PayBill or Till number
   - Personal-to-person transfers are different and not suitable for business bookings

### How Payments Work:

1. Customer receives STK push prompt showing the **exact amount** (e.g., "Pay KSH 2,100 to LashDiary")
2. Customer enters their M-Pesa PIN
3. Payment is processed and sent to your **PayBill/Till number**
4. You receive the funds in your business M-Pesa account
5. You can then withdraw to your personal account as needed

### Setting Up PayBill or Till Number:

- Contact Safaricom to register for a PayBill or Till number
- You'll receive:
  - Business Shortcode (PayBill/Till number)
  - Passkey
  - Consumer Key and Consumer Secret (from Developer Portal)
- Update your `.env.local` with these credentials

## Callback URL

The callback URL (`/api/mpesa/callback`) receives payment confirmations from M-Pesa. Make sure:

- It's publicly accessible (not behind a firewall)
- It uses HTTPS in production
- It's whitelisted with Safaricom

## Troubleshooting

### Payment Prompt Not Appearing

- Check that the phone number is in the correct format (254XXXXXXXXX)
- Verify your M-Pesa credentials are correct
- Check the browser console and server logs for errors

### Callback Not Working

- Ensure your callback URL is publicly accessible
- Check that it's whitelisted with Safaricom
- Verify the callback endpoint is returning 200 OK

### Sandbox vs Production

- Sandbox: Use for testing with test credentials
- Production: Use real credentials and ensure proper setup

## Support

For M-Pesa API issues, contact:
- Safaricom Developer Support: [https://developer.safaricom.co.ke/support](https://developer.safaricom.co.ke/support)
- M-Pesa API Documentation: [https://developer.safaricom.co.ke/apis](https://developer.safaricom.co.ke/apis)

