# PesaPal Booking Payment Flow - Complete Guide

## Overview

The booking system now uses **PesaPal** for all online payments (both Card and M-Pesa). This provides a unified, secure payment gateway that supports multiple payment methods.

## Payment Flow

### 1. Card Payment (Full Payment Required)

**Flow:**
1. Customer selects "Card Payment" option
2. Booking is created immediately with `paymentStatus: 'pending_payment'`
3. Customer is redirected to PesaPal's secure payment page
4. Customer completes payment (card) on PesaPal
5. PesaPal sends IPN (Instant Payment Notification) to your server
6. Booking is updated with payment confirmation
7. Confirmation emails are sent

**Features:**
- ✅ Supports both KES and USD
- ✅ Full payment required
- ✅ Secure payment processing via PesaPal
- ✅ Automatic booking confirmation after payment

### 2. M-Pesa Payment (Deposit Payment)

**Flow:**
1. Customer selects "M-Pesa Payment" option
2. Booking is created immediately with `paymentStatus: 'pending_payment'`
3. Customer is redirected to PesaPal's secure payment page
4. Customer chooses M-Pesa on PesaPal's page
5. Customer completes M-Pesa payment
6. PesaPal sends IPN to your server
7. Booking is updated with deposit payment confirmation
8. Confirmation emails are sent
9. Customer can pay remaining balance later

**Features:**
- ✅ KES currency only
- ✅ Deposit payment (typically 40% of total)
- ✅ Remaining balance can be paid later
- ✅ Secure payment processing via PesaPal

### 3. Pay Later (No Payment)

**Flow:**
1. Customer selects "Pay Later" option
2. Booking is created immediately
3. Customer receives confirmation
4. Admin contacts customer for payment instructions

**Features:**
- ✅ Only available if admin allows deposit option
- ✅ No payment required at booking time
- ✅ Manual payment processing

## Technical Implementation

### Booking Creation Before Payment

**Why?** 
- Ensures booking data is saved even if payment fails
- Allows tracking of pending payments
- Enables better customer support

**How?**
- Booking is created with `paymentStatus: 'pending_payment'`
- PesaPal `orderTrackingId` is stored with booking
- Booking is updated after payment confirmation

### Payment Confirmation

**IPN Handler** (`/api/pesapal/ipn`):
- Receives payment notifications from PesaPal
- Verifies payment status with PesaPal API
- Updates booking with payment details
- Sends confirmation emails
- Handles both bookings and shop orders

### Booking Update Flow

1. **Before Redirect:**
   - Booking created with `paymentStatus: 'pending_payment'`
   - PesaPal order submitted
   - `orderTrackingId` stored in booking

2. **After Payment:**
   - IPN received from PesaPal
   - Payment verified
   - Booking updated:
     - `paymentStatus: 'paid'` (if full payment)
     - `deposit` amount recorded
     - Payment record added to `payments` array

## Payment Status States

- **`pending_payment`**: Booking created, payment not yet completed
- **`paid`**: Full payment received
- **`partial`**: Deposit received, balance pending (for M-Pesa deposits)

## Error Handling

### Payment Fails
- Booking remains in `pending_payment` status
- Customer can retry payment
- Admin can manually update payment status

### Payment Succeeds but IPN Fails
- Payment is recorded in PesaPal
- Booking may remain in `pending_payment` status
- Admin can manually verify and update

### Network Issues
- Booking is created before redirect
- Payment can be retried
- No data loss

## Customer Experience

### Card Payment
1. Select "Card Payment"
2. Click "Book Appointment & Pay Full Amount"
3. Redirected to PesaPal
4. Enter card details
5. Payment processed
6. Redirected back to booking confirmation

### M-Pesa Payment
1. Select "M-Pesa Payment"
2. Click "Book Appointment & Pay Deposit"
3. Redirected to PesaPal
4. Choose M-Pesa option
5. Complete M-Pesa payment
6. Redirected back to booking confirmation
7. Can pay remaining balance later

## Admin Benefits

- ✅ All payments processed through one gateway (PesaPal)
- ✅ Unified payment reporting
- ✅ Better payment tracking
- ✅ Automatic payment confirmation
- ✅ Reduced manual payment processing

## Testing

### Test Card Payment
1. Use PesaPal test card numbers
2. Verify booking is created before redirect
3. Complete test payment
4. Verify booking is updated after payment
5. Check confirmation emails

### Test M-Pesa Payment
1. Use PesaPal test M-Pesa numbers
2. Verify booking is created before redirect
3. Complete test M-Pesa payment
4. Verify deposit is recorded
5. Check confirmation emails

## Troubleshooting

### Booking Not Created
- Check booking creation API logs
- Verify form data is valid
- Check for validation errors

### Payment Not Processing
- Verify PesaPal credentials
- Check callback URLs are whitelisted
- Review PesaPal dashboard for errors

### IPN Not Received
- Verify IPN URL is accessible
- Check PesaPal has whitelisted your domain
- Review server logs for incoming requests

### Booking Not Updated After Payment
- Check IPN handler logs
- Verify payment status in PesaPal dashboard
- Manually verify payment and update booking if needed

## Support

For issues:
1. Check server logs
2. Review PesaPal dashboard
3. Verify environment variables
4. Test with PesaPal sandbox first

