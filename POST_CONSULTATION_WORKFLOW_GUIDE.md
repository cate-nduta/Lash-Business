# Post-Consultation Workflow System

This document explains the complete post-consultation workflow system for managing client contracts and invoices.

## Overview

After a consultation is completed, the system provides a complete workflow:

1. **Admin Decision**: Admin decides whether to proceed with the client
2. **Contract Generation**: System generates a unique contract link and sends it to the client
3. **Contract Signing**: Client signs the contract digitally (typed name or drawn signature)
4. **Invoice Generation**: System automatically generates an 80% upfront invoice
5. **Invoice Management**: Invoices expire after 7 days if unpaid

## System Components

### 1. Admin Interface (`/admin/consultations`)

**Features:**
- View all consultations (pending, completed, declined)
- Make decision: Proceed or Decline
- Send contract to clients who are approved
- Configure contract terms (deliverables, payment terms, timelines, etc.)

**Workflow:**
1. After consultation, consultation appears in "Pending Decisions"
2. Admin clicks "Proceed" or "Decline"
3. If "Proceed", consultation moves to "Ready for Contract"
4. Admin clicks "Send Contract" and fills in:
   - Project description
   - Project cost
   - Contract terms (what's included, not included, extras, etc.)
5. System generates unique contract link and emails client

### 2. Contract Signing Page (`/contract/[token]`)

**Features:**
- Unique, private URL per client (token-based)
- Displays full contract with all terms
- Two signature methods:
  - Type full legal name
  - Draw signature on canvas (mobile-friendly with touch support)
- Agreement checkbox required
- Saves signature data, timestamp, and IP address

**Contract Terms Included:**
1. **Deliverables**: What's included, not included, what counts as extra
2. **Payment Terms**: Consultation fee, 80% upfront, 20% before launch, invoice expiry, no work without payment
3. **Timelines & Responsibilities**: What's needed from client, what happens if they delay, what happens if you delay
4. **Boundaries**: Revision limits, no refunds after start, no endless changes
5. **Confidentiality/IP**: Provider retains IP until payment, client receives IP on full payment
6. **Cancellation**: Client and provider cancellation policies
7. **Liability**: No indirect damages, no third-party responsibility

### 3. Invoice System

**Automatic Generation:**
- Created automatically when contract is signed
- 80% of project cost (upfront payment)
- 7-day expiry from issue date
- Status: draft → sent → paid/expired

**Invoice Details:**
- Invoice number
- Description of services
- Amount (80% upfront)
- Due date (7 days from issue)
- Expiry date
- Clear note: "Work begins only after payment is received"

**Email Notifications:**
- Client receives invoice email immediately after signing
- Admin receives notification when contract is signed
- Invoice expiry warnings (can be automated via cron job)

## API Endpoints

### Consultations

- `GET /api/consultations` - List all consultations
- `POST /api/consultations` - Create new consultation
- `GET /api/consultations/[id]` - Get specific consultation
- `PATCH /api/consultations/[id]` - Update consultation (admin decision)
- `POST /api/consultations/[id]/send-contract` - Generate and send contract

### Contracts

- `GET /api/contracts/token/[token]` - Get contract by token (for signing page)
- `POST /api/contracts/[id]/sign` - Sign contract

### Invoices

- `GET /api/invoices` - List invoices (with optional filters: contractId, consultationId, status)
- `GET /api/invoices/check-expired` - Check and mark expired invoices
- `POST /api/invoices/check-expired` - Manually expire an invoice

## Data Storage

All data is stored in JSON files in the `data/` directory:

- `consultations.json` - All consultations
- `contracts.json` - All contracts
- `invoices.json` - All invoices

## Workflow Steps

### Step 1: Consultation Completed

After consultation, create a consultation record:

```typescript
POST /api/consultations
{
  clientName: "John Doe",
  clientEmail: "john@example.com",
  clientPhone: "+254712345678",
  consultationDate: "2024-01-15",
  consultationType: "Initial Consultation",
  notes: "Client interested in website development"
}
```

### Step 2: Admin Decision

Admin reviews consultation and makes decision:

```typescript
PATCH /api/consultations/[id]
{
  adminDecision: "proceed", // or "decline"
  adminDecisionNotes: "Client is ready to proceed"
}
```

### Step 3: Send Contract

Admin sends contract to client:

```typescript
POST /api/consultations/[id]/send-contract
{
  projectDescription: "Website development and design",
  projectCost: 100000,
  contractTerms: {
    deliverables: {
      included: ["Website design", "Development", "Basic SEO"],
      notIncluded: ["Content writing", "Photography"],
      extras: ["Additional pages", "E-commerce integration"]
    },
    paymentTerms: {
      consultationFee: 5000,
      consultationFeeNonRefundable: true,
      upfrontPercentage: 80,
      upfrontAmount: 80000,
      finalPercentage: 20,
      finalAmount: 20000,
      finalPaymentDue: "before launch",
      invoiceExpiryDays: 7,
      noWorkWithoutPayment: true
    },
    // ... other terms
  }
}
```

### Step 4: Client Signs Contract

Client visits unique contract URL: `/contract/[token]`

- Reviews contract terms
- Chooses signature method (typed or drawn)
- Checks agreement box
- Submits signature

### Step 5: Invoice Generated

When contract is signed:
- Invoice automatically created (80% upfront)
- Invoice email sent to client
- Admin notification sent
- Invoice expires in 7 days if unpaid

### Step 6: Invoice Expiry Check

Run periodically (via cron job or manual check):

```typescript
GET /api/invoices/check-expired
```

This automatically marks invoices as "expired" if they're past the expiry date.

## Security Features

1. **Unique Tokens**: Each contract has a unique, unguessable token
2. **IP Tracking**: Client IP address is recorded when signing
3. **Signature Data**: Full signature (typed or drawn) is saved
4. **Timestamp Tracking**: All actions are timestamped
5. **Status Validation**: Contracts can only be signed once

## Email Notifications

### Contract Email (to Client)
- Subject: "Your Contract is Ready for Review"
- Contains unique contract link
- Professional, clear instructions

### Contract Signed Confirmation (to Client)
- Subject: "Contract Signed - Next Steps"
- Confirms signature received
- Explains next steps

### Contract Signed Notification (to Admin)
- Subject: "Contract Signed: [Client Name]"
- Includes client details, timestamp, IP address
- Confirms invoice generation

### Invoice Email (to Client)
- Subject: "Invoice #[Number] - Upfront Payment Required"
- Includes invoice details
- Clear expiry warning (7 days)
- Payment instructions

## Important Rules

1. **No Work Without Payment**: Work begins only after 80% upfront payment is received
2. **Invoice Expiry**: Invoices expire after 7 days
3. **No PDF Tools**: This is a web-based e-sign agreement (no DocuSign, etc.)
4. **Contract Required**: Contract must be signed before any invoice is sent
5. **One Signature Per Contract**: Contracts can only be signed once

## Contract Terms Template

The contract includes all required sections:

1. **Deliverables**: Clear definition of what's included, not included, and extras
2. **Payment Terms**: Consultation fee, 80% upfront, 20% before launch, expiry rules
3. **Timelines**: Client responsibilities, delay policies
4. **Boundaries**: Revision limits, refund policies, change policies
5. **Confidentiality/IP**: IP ownership until payment, transfer on payment
6. **Cancellation**: Client and provider cancellation policies
7. **Liability**: Limitation of liability clauses

## Testing

### Test Contract Signing Flow

1. Create a consultation via API
2. Mark as "proceed" via admin interface
3. Send contract
4. Visit contract URL
5. Sign contract (test both typed and drawn signatures)
6. Verify invoice is created
7. Check emails are sent

### Test Invoice Expiry

1. Create an invoice with past expiry date
2. Call `/api/invoices/check-expired`
3. Verify invoice status changes to "expired"

## Future Enhancements

- Automated invoice expiry checking (cron job)
- Contract download/save functionality
- Payment integration for invoices
- Invoice payment tracking
- Contract templates for different service types
- Bulk contract generation

## Support

For issues or questions:
- Check API responses for error messages
- Review data files in `data/` directory
- Check email configuration (Zoho SMTP)
- Verify environment variables are set correctly

