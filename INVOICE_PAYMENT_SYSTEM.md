# Invoice Payment System - How It Works

## Overview

The invoice payment system automatically generates Paystack payment links when invoices are created and includes them in the invoice email sent to clients.

## Payment Structure

### 80% Upfront Payment (First Invoice)
- **When**: Automatically created when contract is signed
- **Amount**: 80% of project cost
- **Due Date**: 7 days from issue date
- **Expiry**: 7 days from issue date
- **Status**: Work begins only after this payment is received

### 20% Final Payment (Second Invoice)
- **When**: Created manually by admin before project launch
- **Amount**: 20% of project cost
- **Due Date**: Before launch (as specified in contract)
- **Status**: Required before project goes live

## How Payment Links Work

### 1. Automatic Generation (80% Invoice)

When a contract is signed:
1. System creates an 80% upfront invoice
2. **Automatically generates a Paystack payment link**
3. Includes the payment link in the invoice email
4. Client receives email with "Pay Now" button

**Email includes:**
- Invoice details (amount, due date, expiry)
- **"Pay Now" button** (Paystack payment link)
- Clear instructions about payment and project timeline

### 2. Manual Generation (20% Invoice)

For the final 20% payment:
1. Admin creates invoice manually (before launch)
2. Admin can generate payment link via API
3. Payment link can be sent via email or shared directly

## API Endpoints

### Generate Payment Link for Invoice
```
GET /api/invoices/[id]/payment-link
```

**Response:**
```json
{
  "success": true,
  "paymentUrl": "https://checkout.paystack.com/xxxxx",
  "authorizationUrl": "https://checkout.paystack.com/xxxxx",
  "reference": "paystack_reference_xxxxx",
  "invoiceId": "invoice-xxx",
  "invoiceNumber": "INV-xxx",
  "amount": 80000,
  "currency": "KES"
}
```

### Payment Flow

1. **Client receives invoice email** with payment link
2. **Client clicks "Pay Now" button** → Redirects to Paystack
3. **Client pays** via Card or M-Pesa on Paystack
4. **Paystack webhook** receives payment confirmation
5. **System automatically:**
   - Updates invoice status to "paid"
   - Records payment method and timestamp
   - Sends confirmation email to client
   - Notifies admin of payment

## Webhook Handling

The Paystack webhook (`/api/paystack/webhook`) handles invoice payments:

```typescript
case 'invoice':
  await handleInvoicePayment(verifiedTransaction, metadata)
  break
```

**What happens:**
- Invoice status updated to "paid"
- `paidAt` timestamp recorded
- Payment method recorded
- Confirmation emails sent

## Email Template

The invoice email template (`lib/invoice-email-template.ts`) includes:

1. **Invoice Details Section:**
   - Invoice number
   - Issue date
   - Due date
   - Expiry date
   - Amount

2. **Payment Section (if paymentUrl provided):**
   - "Pay Now" button
   - Payment amount
   - Secure payment processing note

3. **Important Notes:**
   - 7-day expiry warning
   - "Work begins only after payment" notice
   - Project timeline information

## Example Email Flow

### 80% Invoice Email (Automatic)
```
Subject: Invoice #INV-xxx - Upfront Payment Required

Hello [Client Name],

Thank you for signing the contract. Please find your invoice below:

Invoice Details:
- Amount: KES 80,000 (80% upfront)
- Due Date: [7 days from now]
- Expires: [7 days from now]

⚠️ Important: This invoice expires in 7 days. 
Work begins only after payment is received.

💳 Pay Now
[Pay KES 80,000 →] ← Paystack payment link
Secure payment processing by Paystack
```

### 20% Invoice Email (Manual)
```
Subject: Invoice #INV-xxx - Final Payment Before Launch

Hello [Client Name],

Your project is ready for launch! Please find your final invoice below:

Invoice Details:
- Amount: KES 20,000 (20% final payment)
- Due Date: Before launch
- Required before project goes live

💳 Pay Now
[Pay KES 20,000 →] ← Paystack payment link
```

## Admin Interface

### Viewing Invoices
- Go to `/admin/consultations`
- View invoices for each consultation
- See payment status (sent, paid, expired)

### Generating Payment Links
- Payment links are **automatically generated** for 80% invoices
- For 20% invoices, admin can:
  - Generate link via API: `GET /api/invoices/[id]/payment-link`
  - Copy link and share with client
  - Or resend invoice email with payment link

## Payment Tracking

Each invoice stores:
- `paymentReference`: Paystack transaction reference
- `paymentMethod`: Payment method used (from Paystack)
- `paidAt`: Timestamp when payment was received
- `status`: Current invoice status

## Security

- Payment links are unique per invoice
- Links expire when invoice expires (7 days)
- Payment verification via Paystack webhook
- No manual payment recording needed

## Benefits

1. **Automatic**: Payment links generated automatically
2. **Professional**: Clean email with payment button
3. **Secure**: All payments via Paystack
4. **Tracked**: Automatic status updates
5. **Convenient**: Client pays directly from email

## Testing

To test invoice payment:
1. Sign a contract (creates 80% invoice)
2. Check email for payment link
3. Click "Pay Now" button
4. Complete test payment on Paystack
5. Verify invoice status updates to "paid"

All invoice payments now go through Paystack! 🎉

