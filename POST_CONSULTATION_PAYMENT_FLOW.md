# Post-Consultation Payment Flow

This document explains the complete post-consultation payment flow system for LashDiary Labs.

## Overview

After a consultation, you can now:
1. Set the consultation outcome (Build Now, Fix First, Don't Build)
2. Select the tier (Tier 1, 2, or 3)
3. Send a professional build email with invoice
4. Track payment status with automatic expiration

## Step-by-Step Process

### Step 1: Consultation Ends

After the consultation, you give one of three outcomes:
- **Build now** (Tier 1 / 2 / 3) - Client is ready to proceed
- **Fix a few things first** - Client needs to address some issues before building
- **Don't build yet** - Client is not ready

Only people in "Build now" move forward. This filters unserious clients.

### Step 2: Send Build Email + Invoice

From the admin consultations page (`/admin/labs-consultations`):

1. Click **"Send Build Email"** on a consultation
2. Select the tier (Starter System, Business System, or Full Operations Suite)
3. Optionally select a specific invoice (or use the most recent)
4. Click **"Send Build Email"**

The system will:
- Create/update the consultation with outcome "build-now" and selected tier
- Send a professional build email containing:
  - Tier selected
  - Total cost
  - Payment structure
  - What payment unlocks
  - Timeline
  - Invoice with 7-day expiration notice

## Payment Rules by Tier

### Tier 1 — Starter System
- **100% upfront**
- Invoice sent → Payment received → Intake form + build timeline unlocked → Build begins

### Tier 2 — Business System
- **100% upfront**
- Same logic as Tier 1
- You're doing strategic thinking here — that time must be secured.
- If they hesitate, they're not ready.

### Tier 3 — Full Operations Suite
- **50% to begin · 50% before delivery**
- This is the only tier where split payment is reasonable.

**Rules:**
- **First 50%** → reserves build slot + planning phase
- **Second 50%** → required before:
  - final handover
  - live deployment
  - domain connection

**Until the second payment clears:**
- Site remains in staging
- Access remains limited
- No assets are transferred

## Invoice Expiration

Every build invoice includes:
- **Valid for 7 days** from issue date
- If unpaid, build slot is released
- Prevents "I'll pay next month" situations
- Prevents you from mentally holding space for them
- Prevents stalled pipelines

The system automatically checks for expired invoices and marks them as "expired" status.

## Email Content

The build email is professional, neutral, and adult. It includes:

1. **Project Summary**
   - Tier selected
   - Total cost
   - Payment structure

2. **Payment Structure Explanation**
   - Clear breakdown of payment requirements
   - What each payment unlocks
   - Professional language (not "I need the money")

3. **Invoice Expiration Warning**
   - 7-day validity period
   - Clear consequences if unpaid

4. **What Happens After Payment**
   - Confirmation email
   - Intake form
   - Build timeline
   - What you need from them
   - What they should not worry about anymore

5. **Timeline & Next Steps**
   - What to expect
   - How to proceed

## Admin Interface

### Consultation Management

On `/admin/labs-consultations`, you can:

1. **View Consultation Outcome**
   - See if outcome is set (Build Now, Fix First, Don't Build)
   - See selected tier
   - See when build email was sent

2. **Send Build Email**
   - Click "Send Build Email" button
   - Select tier from dropdown
   - Select invoice (or use most recent)
   - System automatically:
     - Sets outcome to "build-now"
     - Records selected tier
     - Sends professional email with invoice

3. **Create Invoice**
   - Create invoice manually if needed
   - System automatically sets expiration date (7 days) for build invoices
   - System automatically calculates split payments for Tier 3

### Invoice Management

Invoices now support:
- **Expiration dates** (7 days for build invoices)
- **Split payments** (for Tier 3)
- **Status tracking** (draft, sent, paid, expired, cancelled)
- **Automatic expiration checking**

## API Endpoints

### Send Build Email
```
POST /api/admin/labs/consultations/[id]/build-email
Body: {
  tierName: string,
  invoiceId?: string
}
```

### Check Expired Invoices
```
GET /api/admin/labs/invoices/check-expired
```
Automatically marks expired invoices and returns list.

### Manually Expire Invoice
```
POST /api/admin/labs/invoices/check-expired
Body: {
  invoiceId: string
}
```

## Data Structure

### Consultation
```typescript
{
  outcome?: 'build-now' | 'fix-first' | 'don\'t-build',
  selectedTier?: string,
  buildEmailSentAt?: string,
  // ... other fields
}
```

### Invoice
```typescript
{
  expirationDate?: string, // 7 days from issue date
  paymentStructure?: 'full' | 'split',
  upfrontAmount?: number, // For Tier 3
  secondAmount?: number, // For Tier 3
  upfrontPaid?: boolean,
  secondPaid?: boolean,
  status: 'draft' | 'sent' | 'paid' | 'expired' | 'cancelled',
  // ... other fields
}
```

## Key Features

✅ **Professional Language** - No "I need the money" language. Clear, neutral, adult communication.

✅ **Automatic Expiration** - Invoices expire after 7 days, preventing stalled pipelines.

✅ **Split Payment Support** - Tier 3 automatically uses 50/50 split payment structure.

✅ **Clear Communication** - Build email explains exactly what payment unlocks and what happens next.

✅ **No Negotiation Language** - The email is a clear, calm, professional proposal. No room for negotiation.

✅ **Build Slot Protection** - Expired invoices release build slots automatically.

## Workflow Summary

1. **Consultation happens** → Client books consultation
2. **Consultation ends** → You determine outcome
3. **If "Build Now"** → Select tier → Create invoice → Send build email
4. **Client receives** → Professional email with invoice (7-day expiration)
5. **Payment received** → Intake form + timeline unlocked → Build begins
6. **For Tier 3** → Second payment required before delivery/handover

This system ensures:
- Only serious clients move forward
- Clear payment expectations
- No stalled pipelines
- Professional communication
- Automatic slot management

