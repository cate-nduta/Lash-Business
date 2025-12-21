# Paid Tier Workflow (300,000 KSH) - Complete Flow

This document explains the complete workflow when a customer purchases a paid tier (e.g., Premium tier at 300,000 KSH).

## Complete Customer Journey

### Step 1: Customer Selects Tier
- Customer visits `/labs` page
- Sees pricing tiers (Starter: 100K, Business: 200K, Premium: 300K)
- Clicks "Get Started" on Premium tier
- Redirected to `/labs/checkout?tier=premium`

### Step 2: Checkout Form
- Customer fills out:
  - Business Name (required)
  - Email Address (required)
  - Phone Number (required for M-Pesa)
  - Payment Method (M-Pesa or Card)
- Sees order summary showing: **300,000 KSH**
- Clicks "Pay 300,000 KSH" button

### Step 3: Payment Processing

#### If M-Pesa Payment:
1. **STK Push Initiated**
   - System calls `/api/mpesa/stk-push` with:
     - Phone number: `254712345678`
     - Amount: `300000` KSH
     - Account Reference: `labs-1234567890-abc123`
     - Description: `LashDiary Labs - Full Operations Suite`

2. **Customer Receives M-Pesa Prompt**
   - Phone shows: "Pay KSH 300,000 to [Your Business Name]"
   - Customer enters M-Pesa PIN
   - Payment is processed

3. **Payment Status Polling**
   - Frontend polls `/api/labs/checkout/status` every 5 seconds
   - Shows "Waiting for payment..." message
   - Checks order status until it becomes `completed`

4. **M-Pesa Callback Received**
   - M-Pesa sends callback to `/api/mpesa/callback`
   - System processes payment confirmation
   - Order status updated to `completed`

#### If Card Payment:
- Currently shows "Card payment processing (integration pending)"
- Would integrate with Stripe/PayPal in production
- Order marked as `processing` until payment gateway confirms

### Step 4: Account Creation (After Payment Confirmed)

When payment is confirmed via M-Pesa callback:

1. **User Account Created**
   - Generates secure password (12 random hex characters)
   - Creates user in `users.json` with:
     - Email, name, phone
     - `labsAccess: true`
     - `labsOrderId`, `labsSubdomain`, `labsTierId`
     - Hashed password stored

2. **Business Settings File Created**
   - Creates `labs-settings-{subdomain}.json`
   - Initial business configuration
   - Logo, contact info, social media (empty, ready to configure)

3. **Order Updated**
   - Status: `completed`
   - `accountCreated: true`
   - `completedAt`: timestamp
   - `mpesaReceiptNumber`: receipt from M-Pesa

### Step 5: Emails Sent

**Payment Receipt Email:**
- Sent immediately after payment confirmation
- Shows:
  - Amount: 300,000 KSH
  - Payment Method: M-Pesa
  - Transaction ID: Order ID
  - M-Pesa Receipt Number
  - Tier Name: Full Operations Suite
  - Transaction Date

**Setup Instructions Email:**
- Sent after account creation
- Includes:
  - **Login Credentials:**
    - Email: customer@example.com
    - Password: [generated secure password]
  - **Website Details:**
    - Subdomain: businessname.lashdiarylabs.com
  - **Getting Started Steps:**
    1. Access Website Builder
    2. Configure Business Details
    3. Set Up Services
    4. Configure Payment Methods
    5. Set Availability
    6. Customize Domain (optional)
  - **Direct Links:**
    - Login URL: `/labs/login?orderId=...`
    - Builder URL: `/labs/builder?orderId=...`

### Step 6: Auto-Login & Redirect

1. **Frontend Detects Payment Complete**
   - Polling detects `status: 'completed'`
   - Calls `/api/labs/auth/auto-login` with orderId

2. **Auto-Login**
   - Creates session cookie
   - Validates user account exists
   - Returns authentication token

3. **Redirect to Website Builder**
   - Automatically redirects to `/labs/builder?orderId=...`
   - User is logged in and ready to configure

### Step 7: Website Builder Access

Customer can now:
- Configure business information
- Upload logo or create text logo
- Set up services and pricing
- Connect payment providers (Stripe, PayPal, M-Pesa)
- Configure availability and booking rules
- Set up custom domain
- Access admin dashboard

## Data Flow Summary

```
Customer Action
    ↓
Checkout Form Submitted
    ↓
Order Created (status: 'pending')
    ↓
M-Pesa STK Push Sent
    ↓
Customer Pays on Phone
    ↓
M-Pesa Callback Received
    ↓
Order Updated (status: 'completed')
    ↓
Account Created
    ↓
Settings File Created
    ↓
Emails Sent (Receipt + Setup Instructions)
    ↓
Frontend Polling Detects Completion
    ↓
Auto-Login
    ↓
Redirect to Website Builder
    ↓
Customer Configures Website
```

## Key Differences: Free vs Paid Tier

| Aspect | Free Tier | Paid Tier (300K) |
|--------|-----------|------------------|
| **Payment** | None required | M-Pesa or Card |
| **Account Creation** | Immediate | After payment confirmation |
| **Order Status** | `completed` immediately | `pending` → `processing` → `completed` |
| **Payment Receipt** | Shows $0 / FREE | Shows actual amount (300,000 KSH) |
| **User Experience** | Instant activation | Wait for payment (~30 seconds) |
| **Polling** | Not needed | Polls payment status |

## Files Modified/Created

1. **`labs-orders.json`** - Order record created
2. **`users.json`** - User account added
3. **`labs-settings-{subdomain}.json`** - Business settings file created

## API Endpoints Used

- `POST /api/labs/checkout` - Create order and initiate payment
- `POST /api/mpesa/stk-push` - Send M-Pesa payment prompt
- `POST /api/mpesa/callback` - Receive payment confirmation
- `GET /api/labs/checkout/status` - Check payment status
- `POST /api/labs/auth/auto-login` - Auto-login after payment

## Testing the Paid Workflow

To test the complete paid workflow:

1. Set tier price back to 300,000 KSH (already done)
2. Go to `/labs` and select Premium tier
3. Fill checkout form with:
   - Business name
   - Email
   - Phone number (for M-Pesa)
   - Select M-Pesa payment
4. Click "Pay 300,000 KSH"
5. Complete M-Pesa payment on phone
6. Wait for payment confirmation
7. System will:
   - Create account
   - Send emails
   - Auto-login
   - Redirect to builder

## Notes

- M-Pesa STK Push is currently commented out in the code (needs M-Pesa credentials)
- Card payment integration is pending (would use Stripe/PayPal)
- For testing without real payment, you can manually mark order as `completed` in `labs-orders.json`



