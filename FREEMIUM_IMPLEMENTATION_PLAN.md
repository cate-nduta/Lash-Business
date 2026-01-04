# LashDiary Freemium - Complete Implementation Plan

## 📋 Project Overview

Building a multi-tenant freemium booking platform where businesses can:
- Sign up and create their booking pages
- Process payments via Paystack subaccounts
- Manage subscriptions (Free, Tier 1, Tier 2)
- Control availability (hours, days off, time slots)
- Get custom URLs: `lashdiary.co.ke/[business-slug]`
- Tier 2: Custom domains with automated DNS verification

---

## 🎯 Core Requirements Summary

### Tiers
- **Free**: 1 service, 10 bookings/month, 10 transactions/month (resets every 28 days), 7% fee, LashDiary branding
- **Tier 1 ($20/28 days)**: Up to 10 services, unlimited bookings, unlimited transactions, 5% fee, no branding
- **Tier 2 ($30/28 days)**: Unlimited everything, 3% fee, custom domain, white-label

### Payment Model
- **Subscription**: Monthly fee ($20 or $30) charged every 28 days
- **Platform Fee**: Taken via split payment immediately (5%, 3%, or 7%)
- **Combined Invoice**: Subscription + platform fee charged together at renewal
- **Payment Method**: Embedded Paystack (no redirect - stays on site)

### URLs
- Default: `lashdiary.co.ke/[business-slug]`
- Custom Domain (Tier 2): `bookings.theirsalon.com` (with DNS verification)

---

## 📐 Phase 1: Database Schema Setup

### Step 1.1: Create Supabase Database Tables

```sql
-- 1. Businesses Table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(255) UNIQUE NOT NULL, -- slug: "beauty-salon"
  display_name VARCHAR(255) NOT NULL,
  owner_email VARCHAR(255) UNIQUE NOT NULL,
  owner_name VARCHAR(255),
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'tier1', 'tier2')),
  
  -- Paystack Integration
  paystack_subaccount_code VARCHAR(255) UNIQUE,
  paystack_subaccount_id VARCHAR(255),
  
  -- Subscription Management
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'past_due')),
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  subscription_renewal_date TIMESTAMP, -- Next billing date (28 days from start/renewal)
  paystack_subscription_code VARCHAR(255),
  subscription_cycle_days INTEGER DEFAULT 28,
  
  -- Monthly Limits (Free Tier - Resets every 28 days)
  monthly_bookings_count INTEGER DEFAULT 0, -- Current month booking count (resets on renewal_date)
  monthly_transactions_count INTEGER DEFAULT 0, -- Current month transaction count (resets on renewal_date)
  booking_limit INTEGER DEFAULT 10, -- Free tier = 10, paid tiers = NULL (unlimited)
  transaction_limit INTEGER DEFAULT 10, -- Free tier = 10, paid tiers = NULL (unlimited)
  payment_processing_locked BOOLEAN DEFAULT false, -- Lock if free tier hit limit
  limit_reset_date TIMESTAMP, -- Date when limits reset (renewal_date for free tier)
  
  -- Currency Support
  currency VARCHAR(3) DEFAULT 'KES' CHECK (currency IN ('KES', 'USD')), -- Business currency preference
  
  -- Custom Domain (Tier 2 only)
  custom_domain VARCHAR(255),
  custom_domain_verified BOOLEAN DEFAULT false,
  custom_domain_verification_token VARCHAR(255),
  custom_domain_verified_at TIMESTAMP,
  
  -- Settings
  settings JSONB DEFAULT '{}', -- calendar_id, branding, timezone, logo, colors, etc.
  
  -- Grace Period
  grace_period_end_date TIMESTAMP, -- 3 days after failed payment
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Services Table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Bookings Table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  client_email VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  service_id UUID REFERENCES services(id),
  appointment_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_reference VARCHAR(255), -- Paystack reference
  payment_amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'KES', -- Currency used for payment
  platform_fee_amount DECIMAL(10,2), -- How much platform fee was taken
  business_receives_amount DECIMAL(10,2), -- What business actually received
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Users Table (Business Owners)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Supabase handles this, but we track it
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Transactions Table (Track all payments and fees)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  paystack_reference VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL, -- Total transaction amount
  currency VARCHAR(3) DEFAULT 'KES', -- Currency used
  platform_fee DECIMAL(10,2) NOT NULL, -- Your cut (5%, 3%, or 7%)
  business_receives DECIMAL(10,2) NOT NULL, -- What business gets
  tier_at_time VARCHAR(20) NOT NULL, -- Tier when transaction happened
  fee_percentage DECIMAL(5,2) NOT NULL, -- 5.00, 3.00, or 7.00
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Subscription Payments Table
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL, -- Subscription fee
  platform_fee_amount DECIMAL(10,2) NOT NULL, -- Platform fee for the period
  total_amount DECIMAL(10,2) NOT NULL, -- Combined total
  paystack_reference VARCHAR(255),
  subscription_period_start TIMESTAMP NOT NULL,
  subscription_period_end TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Business Hours Table
CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  break_start TIME, -- Optional lunch break
  break_end TIME,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, day_of_week)
);

-- 8. Business Days Off Table
CREATE TABLE business_days_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason VARCHAR(255), -- "Holiday", "Vacation", etc.
  is_recurring BOOLEAN DEFAULT false, -- For annual holidays
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, date)
);

-- 9. Availability Settings Table
CREATE TABLE availability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  slot_duration INTEGER DEFAULT 60, -- minutes
  buffer_time INTEGER DEFAULT 15, -- minutes between appointments
  min_advance_booking_hours INTEGER DEFAULT 2,
  max_advance_booking_days INTEGER DEFAULT 90,
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Monthly Platform Fee Tracking
CREATE TABLE monthly_platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  total_transactions_amount DECIMAL(10,2) DEFAULT 0,
  platform_fee_amount DECIMAL(10,2) DEFAULT 0,
  fee_percentage DECIMAL(5,2) NOT NULL,
  transaction_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'failed')),
  subscription_payment_id UUID REFERENCES subscription_payments(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, month_start)
);

-- 11. Clients Table (CRM)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  tags TEXT[], -- Array of tags: ['VIP', 'new', 'regular']
  notes TEXT, -- Stylist notes (allergies, preferences, etc.)
  total_bookings INTEGER DEFAULT 0,
  last_booking_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, email)
);

-- 12. Client Notes Table (Tier 1+)
CREATE TABLE client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_businesses_business_name ON businesses(business_name);
CREATE INDEX idx_businesses_tier ON businesses(tier);
CREATE INDEX idx_businesses_custom_domain ON businesses(custom_domain);
CREATE INDEX idx_services_business_id ON services(business_id);
CREATE INDEX idx_bookings_business_id ON bookings(business_id);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_transactions_business_id ON transactions(business_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_business_hours_business_id ON business_hours(business_id);
CREATE INDEX idx_business_days_off_business_id ON business_days_off(business_id);
CREATE INDEX idx_clients_business_id ON clients(business_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_bookings_appointment_date ON bookings(appointment_date);
CREATE INDEX idx_transactions_currency ON transactions(currency);
```

### Step 1.2: Set Up Row Level Security (RLS) in Supabase

```sql
-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_days_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_platform_fees ENABLE ROW LEVEL SECURITY;

-- Policies: Businesses can only see their own data
CREATE POLICY "Users can view own business" ON businesses
  FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE business_id = businesses.id));

CREATE POLICY "Users can update own business" ON businesses
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM users WHERE business_id = businesses.id));

-- Similar policies for other tables...
```

---

## 🔐 Phase 2: Supabase Auth Integration

### Step 2.1: Install and Configure Supabase

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### Step 2.2: Create Supabase Client Utilities

**File: `lib/supabase-client.ts`**
- Create Supabase client for client-side
- Create Supabase admin client for server-side
- Handle authentication state

### Step 2.3: Create Auth API Routes

**File: `app/api/auth/signup/route.ts`**
- Business signup endpoint
- Create Supabase auth user
- Create business record
- Link user to business

**File: `app/api/auth/login/route.ts`**
- Business login endpoint
- Authenticate with Supabase
- Return session

**File: `app/api/auth/logout/route.ts`**
- Logout endpoint
- Clear session

**File: `app/api/auth/me/route.ts`**
- Get current user and business data
- Check subscription status

### Step 2.4: Create Auth Middleware

**File: `middleware.ts`**
- Protect dashboard routes
- Check authentication
- Redirect to login if not authenticated

---

## 🚀 Phase 3: Business Onboarding Flow

### Step 3.1: Create Signup Page

**File: `app/signup/page.tsx`**
- Business name input
- Owner email input
- Owner name input
- Password input
- Submit to `/api/auth/signup`

### Step 3.2: Create Multi-Step Onboarding

**File: `app/onboard/page.tsx`**
- Step 1: Business Information
  - Business name (auto-generate slug)
  - Display name
  - Logo upload (optional)
  - Timezone selection
  
- Step 2: Paystack Subaccount Setup
  - Create Paystack subaccount via API
  - Store subaccount_code and subaccount_id
  - Verify connection
  
- Step 3: First Service (Required)
  - Service name
  - Price
  - Duration
  - Description
  - Validate: Free tier = max 1 service
  
- Step 4: Availability Setup
  - Business hours (per day of week)
  - Set default hours
  - Optional: Days off
  
- Step 5: Calendar Connection (Optional)
  - Connect Google Calendar
  - Free tier: One-way sync only
  - Paid tiers: Two-way sync
  
- Step 6: Launch
  - Preview booking page
  - Show shareable URL: `lashdiary.co.ke/[business-slug]`
  - Redirect to dashboard

### Step 3.3: Create Onboarding API Routes

**File: `app/api/business/onboard/route.ts`**
- Handle each onboarding step
- Validate tier limits
- Create Paystack subaccount
- Create first service
- Set up availability

---

## 💳 Phase 4: Paystack Integration

### Step 4.1: Paystack Configuration

**File: `lib/paystack-config.ts`**
- Paystack secret key
- Paystack public key
- Your main subaccount code (for platform fees)
- Environment (test/live)

### Step 4.2: Create Paystack Subaccount

**File: `lib/paystack-subaccount.ts`**
- Function to create subaccount
- Function to get subaccount details
- Function to update subaccount

**API Route: `app/api/paystack/create-subaccount/route.ts`**
- Create subaccount for new business
- Store credentials in database

### Step 4.3: Embedded Payment Integration (NO REDIRECT)

**File: `components/paystack-embed.tsx`**
- Use Paystack Inline Popup (not redirect)
- Embed payment form in modal/component
- Handle payment callback
- Stay on same page

**Implementation:**
```typescript
// Use Paystack Inline Popup
import { usePaystackPayment } from 'react-paystack';

const config = {
  reference: transactionRef,
  email: customerEmail,
  amount: amount * 100, // in kobo
  publicKey: PAYSTACK_PUBLIC_KEY,
  subaccount: businessSubaccountCode,
  split: {
    type: "percentage",
    currency: "NGN",
    subaccounts: [
      {
        subaccount: businessSubaccountCode,
        share: tier === 'tier1' ? 95 : tier === 'tier2' ? 97 : 93
      },
      {
        subaccount: YOUR_MAIN_SUBACCOUNT_CODE,
        share: tier === 'tier1' ? 5 : tier === 'tier2' ? 3 : 7
      }
    ]
  }
};

const initializePayment = usePaystackPayment(config);
// Opens popup, stays on page
```

### Step 4.4: Payment Processing API

**File: `app/api/paystack/initialize/route.ts`**
- Initialize payment with split
- Return payment reference
- Track transaction

**File: `app/api/paystack/verify/route.ts`**
- Verify payment status
- Update booking status
- Record transaction
- Update free tier transaction count

**File: `app/api/paystack/webhook/route.ts`**
- Handle Paystack webhooks
- Process payment confirmations
- Update booking status
- Record transactions

### Step 4.5: Transaction Tracking

**File: `lib/transaction-tracker.ts`**
- Record all transactions
- Calculate platform fees
- Track for monthly reporting
- Update free tier limits

---

## 💰 Phase 5: Subscription System

### Step 5.1: Create Paystack Plans

**In Paystack Dashboard:**
- Plan 1: Smart Assistant - $20/month
- Plan 2: Business Suite - $30/month

**Or via API:**
```typescript
// Create plans programmatically
const createPlan = async (name, amount, interval) => {
  // Create Paystack plan
  // Store plan_code in database
};
```

### Step 5.2: Subscription Management

**File: `app/api/subscription/create/route.ts`**
- Create subscription for business
- Handle upgrade from free tier
- Set 28-day renewal date
- Store subscription_code

**File: `app/api/subscription/upgrade/route.ts`**
- Upgrade tier (free → tier1, tier1 → tier2)
- Charge immediately (prorated if mid-cycle)
- Update tier immediately
- Unlock features

**File: `app/api/subscription/downgrade/route.ts`**
- Cancel subscription
- Mark for downgrade at end of cycle
- Lock features after cycle ends

**File: `app/api/subscription/renew/route.ts`**
- Handle 28-day renewal
- Calculate platform fee for past 28 days
- Charge combined amount (subscription + platform fee)
- Update renewal date

### Step 5.3: Subscription Renewal Cron Job

**File: `app/api/cron/subscription-renewal/route.ts`**
- Run daily (via Vercel Cron or external service)
- Find businesses where `subscription_renewal_date <= today`
- Calculate platform fee for past 28 days
- Charge combined invoice
- Update renewal date = today + 28 days
- Handle payment failures (3-day grace period)

### Step 5.4: Grace Period Handling

**File: `lib/grace-period.ts`**
- Track failed payments
- Set grace_period_end_date = today + 3 days
- Lock features if grace period expired
- Downgrade to free tier if payment fails after grace period

### Step 5.5: Combined Invoice Generation

**File: `lib/invoice-generator.ts`**
- Calculate subscription fee
- Calculate platform fee (sum of all transactions in 28-day period)
- Generate invoice
- Send to business owner
- Record in subscription_payments table

---

## 📅 Phase 6: Availability Management

### Step 6.1: Business Hours Management

**File: `app/dashboard/availability/page.tsx`**
- Weekly schedule UI
- Set hours per day
- Set break times
- Save to business_hours table

**API Route: `app/api/availability/hours/route.ts`**
- GET: Fetch business hours
- POST/PUT: Update business hours

### Step 6.2: Days Off Management

**File: `components/days-off-calendar.tsx`**
- Calendar picker for holidays
- Add/remove days off
- Recurring holidays option

**API Route: `app/api/availability/days-off/route.ts`**
- GET: Fetch days off
- POST: Add day off
- DELETE: Remove day off

### Step 6.3: Availability Settings

**File: `components/availability-settings.tsx`**
- Slot duration selector
- Buffer time input
- Min/max advance booking
- Timezone selector

**API Route: `app/api/availability/settings/route.ts`**
- GET: Fetch settings
- POST/PUT: Update settings

### Step 6.4: Availability Calculation Logic

**File: `lib/availability-calculator.ts`**
- Calculate available time slots
- Check business hours
- Check days off
- Check existing bookings
- Apply buffer times
- Return available slots for booking

---

## 🌐 Phase 7: Public Booking Pages

### Step 7.1: Dynamic Route Setup

**File: `app/[business-slug]/page.tsx`**
- Public booking landing page
- Show business info
- Show services
- Link to booking form

**File: `app/[business-slug]/services/page.tsx`**
- Services listing page
- Show all active services
- Prices and descriptions

**File: `app/[business-slug]/book/page.tsx`**
- Booking form
- Service selection
- Date/time picker (using availability calculator)
- Customer info form
- Payment integration (embedded Paystack)

### Step 7.2: Custom Domain Routing

**File: `middleware.ts` (Update)**
- Check Host header
- If custom domain → lookup business
- If verified → route to business booking page
- If not verified → redirect to main site

**File: `lib/domain-verification.ts`**
- Simplified CNAME verification (not TXT)
- Check if CNAME points to lashdiary.netlify.app
- Verify domain automatically
- Activate domain when verified
- Use Netlify's built-in domain handling
- Automatic SSL certificates via Netlify

**API Route: `app/api/domain/verify/route.ts`**
- Check DNS record
- Verify token matches
- Activate domain

**API Route: `app/api/domain/check/route.ts`**
- Cron job to check pending verifications
- Auto-verify when DNS record found

### Step 7.3: DNS Verification System

**File: `app/api/cron/dns-verification/route.ts`**
- Run every hour (not every 5 minutes - DNS changes take time)
- Check pending domain verifications
- Query DNS for CNAME record (simpler than TXT)
- Verify CNAME points to lashdiary.netlify.app
- Auto-verify when found
- Send notification to business owner

**File: `app/dashboard/settings/custom-domain/page.tsx`**
- Custom domain setup UI
- Clear visual instructions with screenshots
- Video tutorial for .co.ke domains
- Popular Kenyan hosting provider guides (Kenya Web Experts, HostPoa)
- WhatsApp support button (0797473696)
- Step-by-step CNAME setup guide

---

## 📊 Phase 8: Business Dashboard

### Step 8.1: Main Dashboard

**File: `app/dashboard/page.tsx`**
- Overview stats
- Recent bookings
- Revenue summary
- Subscription status
- Quick actions

### Step 8.2: Bookings Management

**File: `app/dashboard/bookings/page.tsx`**
- List all bookings
- Filter by status
- Search functionality
- View booking details
- Cancel bookings

**API Route: `app/api/dashboard/bookings/route.ts`**
- GET: Fetch bookings for business
- PUT: Update booking status
- DELETE: Cancel booking

### Step 8.3: Services Management

**File: `app/dashboard/services/page.tsx`**
- List services
- Add new service (check tier limits)
- Edit service
- Delete service
- Activate/deactivate

**API Route: `app/api/dashboard/services/route.ts`**
- GET: Fetch services
- POST: Create service (validate limits)
- PUT: Update service
- DELETE: Delete service

### Step 8.4: Subscription Management

**File: `app/dashboard/subscription/page.tsx`**
- Current tier display
- Next billing date
- Monthly platform fee summary
- Upgrade/downgrade buttons
- Payment history
- Invoice downloads

**API Route: `app/api/dashboard/subscription/route.ts`**
- GET: Fetch subscription details
- POST: Upgrade tier
- DELETE: Cancel subscription

### Step 8.5: Settings Page

**File: `app/dashboard/settings/page.tsx`**
- Business information
- Booking page URL (with edit option)
- Custom domain setup (Tier 2)
- Logo upload
- Branding settings
- Calendar integration
- Notification settings

### Step 8.6: Analytics (Tier-Dependent)

**File: `app/dashboard/analytics/page.tsx`**
- Basic reports (Tier 1)
- Advanced analytics (Tier 2)
- Revenue charts
- Booking trends
- Client insights

---

## 🔒 Phase 9: Feature Gating

### Step 9.1: Tier Limit Enforcement

**File: `lib/tier-limits.ts`**
- Check service count limit
- Check booking count limit
- Check transaction limit (free tier)
- Check feature access

**Middleware: `lib/tier-middleware.ts`**
- Validate before allowing actions
- Block if limit reached
- Show upgrade prompts

### Step 9.2: Service Limit Enforcement

**API Route: `app/api/dashboard/services/route.ts` (Update)**
```typescript
// Before creating service
const serviceCount = await getServiceCount(businessId);
const limit = getServiceLimit(business.tier); // free=1, tier1=10, tier2=unlimited

if (serviceCount >= limit) {
  return error("Service limit reached. Upgrade to add more services.");
}
```

### Step 9.3: Monthly Limit Enforcement (Free Tier - Resets Every 28 Days)

**File: `lib/monthly-limits.ts`**
- Check if limits need reset (compare current date to limit_reset_date)
- Reset monthly_bookings_count and monthly_transactions_count if needed
- Update limit_reset_date = today + 28 days

**API Route: `app/api/bookings/create/route.ts`**
```typescript
// Check monthly booking count for free tier (resets every 28 days)
if (business.tier === 'free') {
  // Check if limits need reset
  await checkAndResetMonthlyLimits(businessId);
  
  const currentBookings = business.monthly_bookings_count || 0;
  if (currentBookings >= 10) {
    return error("Monthly booking limit reached (10 bookings). Upgrade for unlimited bookings.");
  }
  
  // Increment count after successful booking
  await incrementMonthlyBookingCount(businessId);
}
```

### Step 9.4: Transaction Limit Enforcement (Free Tier - Resets Every 28 Days)

**API Route: `app/api/paystack/initialize/route.ts` (Update)**
```typescript
// Check free tier transaction limit (resets every 28 days)
if (business.tier === 'free') {
  // Check if limits need reset
  await checkAndResetMonthlyLimits(businessId);
  
  const currentTransactions = business.monthly_transactions_count || 0;
  if (currentTransactions >= 10) {
    return error("Monthly transaction limit reached (10 transactions). Upgrade to continue processing payments.");
  }
  
  // Increment count after successful payment
  await incrementMonthlyTransactionCount(businessId);
}
```

### Step 9.5: Feature Access Control

**File: `lib/feature-access.ts`**
- Check if feature is available for tier
- Calendar sync: free = one-way, paid = two-way
- Custom domain: tier2 only
- Client management: tier1+ only
- Analytics: tier-dependent

---

## 📈 Phase 10: Monthly Reporting

### Step 10.1: Platform Fee Calculation

**File: `lib/platform-fee-calculator.ts`**
- Sum all transactions in 28-day period
- Calculate platform fee based on tier
- Generate monthly statement
- Record in monthly_platform_fees table

### Step 10.2: Monthly Statement Generation

**File: `app/api/dashboard/statements/route.ts`**
- GET: Fetch monthly statements
- Generate PDF invoice (optional)
- Show transaction breakdown

**File: `components/monthly-statement.tsx`**
- Display monthly summary
- Show all transactions
- Show platform fees
- Show net revenue

### Step 10.3: Dashboard Reporting Views

**File: `app/dashboard/reports/page.tsx`**
- Per-transaction view
- Monthly aggregated view
- Platform fee breakdown
- Revenue trends

---

## 🎨 Phase 11: UI/UX Implementation

### Step 11.1: Main Site Pages

**File: `app/page.tsx`** - Homepage
- Marketing content
- Features showcase
- Pricing CTA
- "Start Free" button

**File: `app/pricing/page.tsx`** - Pricing Page
- Tier comparison table
- Feature list
- "Start Free" CTAs

**File: `app/features/page.tsx`** - Features Page
- Platform features
- Screenshots/demos

### Step 11.2: Navigation

**File: `components/navbar-main.tsx`** - Main site navbar
- Logo, Features, Pricing, Login, Sign Up

**File: `components/navbar-dashboard.tsx`** - Dashboard navbar
- Logo, Dashboard, Bookings, Services, Settings, User Menu

**File: `components/navbar-booking.tsx`** - Booking page navbar
- Business logo, Services, Book Now

### Step 11.3: Embedded Payment UI

**File: `components/payment-modal.tsx`**
- Modal with embedded Paystack form
- No redirect - stays on page
- Payment status updates
- Success/error handling

---

## 🔒 Phase 11: Data Validation & Security

### Step 11.1: Input Validation

**File: `lib/validation.ts`**
```typescript
// Business slug validation
export const validateBusinessSlug = (slug: string): boolean => {
  const reserved = ['admin', 'api', 'dashboard', 'login', 'signup', 'onboard', 'pricing', 'features'];
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug) && !reserved.includes(slug) && slug.length >= 3 && slug.length <= 50;
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

// Price validation
export const validatePrice = (price: number, currency: string): boolean => {
  if (currency === 'KES') {
    return price >= 0 && price <= 1000000; // Max 1M KES
  } else if (currency === 'USD') {
    return price >= 0 && price <= 10000; // Max 10K USD
  }
  return false;
};
```

### Step 11.2: SQL Injection Prevention

**File: `lib/db-utils.ts`**
- Always use parameterized queries
- Never concatenate user input into SQL
- Use Supabase client methods (they handle this automatically)
- Validate all inputs before database operations

### Step 11.3: XSS Protection

**File: `lib/sanitization.ts`**
```typescript
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
};

export const sanitizeText = (text: string): string => {
  return text.replace(/<[^>]*>/g, ''); // Remove HTML tags
};
```

### Step 11.4: Rate Limiting

**File: `lib/rate-limiter.ts`**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
});
```

**API Route Example: `app/api/bookings/create/route.ts`**
```typescript
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await rateLimiter.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }
  
  // Continue with booking creation...
}
```

---

## 💾 Phase 12: Backup & Disaster Recovery

### Step 12.1: Database Backups

**Supabase Configuration:**
- Enable daily automated backups in Supabase dashboard
- Set retention period (7-30 days)
- Enable point-in-time recovery
- Test restore procedures

**File: `scripts/backup-test.ts`**
- Test backup restoration
- Verify data integrity
- Document recovery procedures

### Step 12.2: Payment Fallback System

**File: `lib/payment-fallback.ts`**
```typescript
// If Paystack fails, allow "pay at salon" option
export const handlePaymentFailure = async (bookingId: string) => {
  // Mark booking as "pending payment"
  // Send notification to business owner
  // Allow customer to pay later or at salon
  // Queue payment for retry
};
```

**File: `app/api/payments/retry/route.ts`**
- Retry failed payments
- Queue payments for later processing
- Manual payment entry option

### Step 12.3: Status Page & Monitoring

**File: `app/status/page.tsx`**
- System status page
- API health checks
- Payment gateway status
- Database status
- Recent incidents

**File: `lib/health-check.ts`**
```typescript
export const checkSystemHealth = async () => {
  return {
    database: await checkDatabase(),
    paystack: await checkPaystackAPI(),
    netlify: await checkNetlifyStatus(),
    timestamp: new Date().toISOString()
  };
};
```

**File: `app/api/health/route.ts`**
- Health check endpoint
- Monitor system status
- Alert on failures

### Step 12.4: Emergency Contact & Procedures

**File: `docs/emergency-procedures.md`**
- Emergency contact list
- Critical issue escalation
- Data recovery procedures
- Communication plan

---

## 🐛 Phase 13: Error Handling & Logging

### Step 13.1: Centralized Error Handling

**File: `lib/error-handler.ts`**
```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational = true,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: AppError, req: Request, res: Response) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  
  // Log error
  logger.error(err);
  
  // Send to Sentry
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err);
  }
  
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

### Step 13.2: Sentry Integration

**Install:**
```bash
npm install @sentry/nextjs
```

**File: `sentry.client.config.ts`**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**File: `sentry.server.config.ts`**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Step 13.3: User-Friendly Error Messages

**File: `lib/error-messages.ts`**
```typescript
export const getUserFriendlyError = (error: Error): string => {
  if (error.message.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (error.message.includes('payment')) {
    return 'Payment processing failed. Please try again or contact support.';
  }
  if (error.message.includes('limit')) {
    return 'You have reached your plan limit. Please upgrade to continue.';
  }
  return 'Something went wrong. Please try again or contact support.';
};
```

---

## 💱 Phase 14: Currency Support (KES/USD)

### Step 14.1: Multi-Currency Configuration

**File: `lib/currency-config.ts`**
```typescript
export const CURRENCIES = {
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    paystackCode: 'KES'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    paystackCode: 'USD'
  }
};

export const getCurrencyConfig = (currency: string) => {
  return CURRENCIES[currency as keyof typeof CURRENCIES] || CURRENCIES.KES;
};
```

### Step 14.2: Paystack Split Payment with Currency

**File: `components/paystack-embed.tsx` (Update)**
```typescript
const config = {
  reference: transactionRef,
  email: customerEmail,
  amount: amount * 100, // Convert to smallest unit
  currency: business.currency || 'KES', // KES or USD
  publicKey: PAYSTACK_PUBLIC_KEY,
  subaccount: businessSubaccountCode,
  split: {
    type: "percentage",
    currency: business.currency || 'KES', // Must match payment currency
    subaccounts: [
      {
        subaccount: businessSubaccountCode,
        share: tier === 'tier1' ? 95 : tier === 'tier2' ? 97 : 93
      },
      {
        subaccount: YOUR_MAIN_SUBACCOUNT_CODE,
        share: tier === 'tier1' ? 5 : tier === 'tier2' ? 3 : 7
      }
    ]
  }
};
```

### Step 14.3: Currency Selection in Business Settings

**File: `app/dashboard/settings/currency/page.tsx`**
- Currency selector (KES/USD)
- Show conversion rates
- Update business currency preference
- Validate Paystack subaccount supports currency

### Step 14.4: Currency Display & Formatting

**File: `lib/currency-formatter.ts`**
```typescript
export const formatCurrency = (amount: number, currency: string): string => {
  if (currency === 'KES') {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  } else if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  return `${amount} ${currency}`;
};
```

---

## 👥 Phase 15: Client Management/CRM

### Step 15.1: Auto-Create Clients from Bookings

**File: `lib/client-manager.ts`**
```typescript
export const createOrUpdateClient = async (bookingData: {
  businessId: string;
  email: string;
  name: string;
  phone?: string;
}) => {
  // Check if client exists
  let client = await getClientByEmail(bookingData.businessId, bookingData.email);
  
  if (!client) {
    // Create new client
    client = await createClient(bookingData);
  } else {
    // Update existing client
    await updateClient(client.id, {
      name: bookingData.name,
      phone: bookingData.phone,
      last_booking_date: new Date()
    });
  }
  
  // Increment total bookings
  await incrementClientBookings(client.id);
  
  return client;
};
```

### Step 15.2: Client List & Management

**File: `app/dashboard/clients/page.tsx`**
- List all clients
- Search by name/email/phone
- Filter by tags
- View client profile
- Booking history per client

**API Route: `app/api/dashboard/clients/route.ts`**
- GET: Fetch clients (with pagination)
- GET /[id]: Get client details
- PUT /[id]: Update client
- DELETE /[id]: Delete client

### Step 15.3: Client Notes (Tier 1+)

**File: `app/dashboard/clients/[id]/notes/page.tsx`**
- Add notes (allergies, preferences, etc.)
- View note history
- Edit/delete notes
- Only available for Tier 1 and Tier 2

**API Route: `app/api/dashboard/clients/[id]/notes/route.ts`**
- GET: Fetch client notes
- POST: Add note
- PUT /[noteId]: Update note
- DELETE /[noteId]: Delete note

### Step 15.4: Client Tagging

**File: `components/client-tags.tsx`**
- Tag management UI
- Predefined tags: VIP, new, regular, inactive
- Custom tags
- Filter by tags

### Step 15.5: Client Marketing (Tier 2 Only)

**File: `app/dashboard/clients/marketing/page.tsx`**
- Email/SMS to clients
- Segment by tags
- Send promotions
- Booking reminders

**API Route: `app/api/dashboard/clients/marketing/route.ts`**
- POST: Send email/SMS to clients
- Segment selection
- Template management

---

## 🌐 Phase 16: Simplified Domain Verification

### Step 16.1: CNAME-Based Verification

**File: `lib/domain-verification.ts` (Update)**
```typescript
import dns from 'dns';
import { promisify } from 'util';

const resolveCname = promisify(dns.resolveCname);

export const verifyCustomDomain = async (domain: string): Promise<boolean> => {
  try {
    const records = await resolveCname(domain);
    // Check if CNAME points to lashdiary.netlify.app
    return records.some(record => 
      record.includes('lashdiary.netlify.app') || 
      record.includes('netlify.app')
    );
  } catch (error) {
    return false;
  }
};
```

### Step 16.2: Hourly DNS Check

**File: `app/api/cron/dns-verification/route.ts` (Update)**
```typescript
// Run every hour (not every 5 minutes)
export async function GET() {
  const pendingDomains = await getPendingDomainVerifications();
  
  for (const domain of pendingDomains) {
    const isVerified = await verifyCustomDomain(domain.custom_domain);
    
    if (isVerified) {
      await activateCustomDomain(domain.id);
      await sendDomainVerifiedNotification(domain.business_id);
    }
  }
  
  return NextResponse.json({ checked: pendingDomains.length });
}
```

### Step 16.3: Clear Setup Instructions

**File: `app/dashboard/settings/custom-domain/page.tsx`**
- Step-by-step CNAME setup guide
- Screenshots for popular providers:
  - Kenya Web Experts
  - HostPoa
  - Other Kenyan hosting providers
- Video tutorial for .co.ke domains
- WhatsApp support button (0797473696)
- Live verification status

**File: `components/domain-setup-guide.tsx`**
```typescript
export default function DomainSetupGuide() {
  return (
    <div>
      <h2>How to Set Up Your Custom Domain</h2>
      <ol>
        <li>Go to your domain registrar (e.g., Kenya Web Experts)</li>
        <li>Find DNS settings</li>
        <li>Add CNAME record:
          <ul>
            <li>Name: bookings (or your subdomain)</li>
            <li>Value: lashdiary.netlify.app</li>
          </ul>
        </li>
        <li>Save changes</li>
        <li>Wait 5 minutes to 48 hours for DNS to propagate</li>
        <li>We'll verify automatically within 1 hour</li>
      </ol>
      <a href="https://wa.me/254797473696" target="_blank">
        Need Help? WhatsApp Us
      </a>
    </div>
  );
}
```

### Step 16.4: Netlify Domain Integration

**File: `lib/netlify-domain.ts`**
```typescript
// Use Netlify API to add custom domain
export const addNetlifyDomain = async (domain: string) => {
  const response = await fetch(`https://api.netlify.com/api/v1/sites/${process.env.NETLIFY_SITE_ID}/domains`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NETLIFY_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ domain })
  });
  
  return response.json();
};
```

---

## ⚖️ Phase 17: Legal & Compliance

### Step 17.1: Privacy Policy

**File: `app/privacy/page.tsx`**
- Kenya Data Protection Act, 2019 compliance
- Data collection practices
- How data is used
- Data sharing policies
- User rights
- Contact information

### Step 17.2: Terms of Service

**File: `app/terms/page.tsx`**
- Service terms
- User obligations
- Payment terms
- Refund policy
- Limitation of liability
- Dispute resolution

### Step 17.3: PCI Compliance

**File: `docs/pci-compliance.md`**
- Never store card details
- Use HTTPS everywhere
- Paystack handles PCI compliance
- Document security measures
- Regular security audits

### Step 17.4: Tax Considerations

**File: `lib/tax-calculator.ts`**
```typescript
// Track platform fees for tax purposes
export const calculateTaxableIncome = async (periodStart: Date, periodEnd: Date) => {
  const transactions = await getTransactionsInPeriod(periodStart, periodEnd);
  const totalPlatformFees = transactions.reduce((sum, txn) => sum + txn.platform_fee, 0);
  
  return {
    totalPlatformFees,
    transactionCount: transactions.length,
    period: { start: periodStart, end: periodEnd }
  };
};
```

**File: `app/dashboard/tax/page.tsx`**
- Tax reports
- Export for KRA
- Platform fee summaries
- Transaction records

---

## 💬 Phase 18: Support System

### Step 18.1: WhatsApp Integration

**File: `components/whatsapp-support.tsx`**
```typescript
export default function WhatsAppSupport() {
  const phoneNumber = '254797473696'; // 0797473696
  
  return (
    <a
      href={`https://wa.me/${phoneNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600"
    >
      <span>💬 WhatsApp Support</span>
    </a>
  );
}
```

### Step 18.2: Help Center

**File: `app/help/page.tsx`**
- FAQ section
- Getting started guide
- Video tutorials
- Contact support
- WhatsApp button

### Step 18.3: Documentation

**File: `app/docs/page.tsx`**
- API documentation
- Integration guides
- Troubleshooting
- Best practices

---

## ⚡ Phase 19: Performance & Caching

### Step 19.1: Availability Caching

**File: `lib/availability-cache.ts`**
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const getCachedAvailability = async (businessId: string, date: string) => {
  const cacheKey = `availability:${businessId}:${date}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  // Calculate availability
  const slots = await calculateAvailability(businessId, date);
  
  // Cache for 5-10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(slots));
  
  return slots;
};
```

### Step 19.2: Pre-compute Availability

**File: `app/api/cron/precompute-availability/route.ts`**
```typescript
// Run nightly to pre-compute next 7 days of availability
export async function GET() {
  const businesses = await getAllActiveBusinesses();
  
  for (const business of businesses) {
    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      const slots = await calculateAvailability(business.id, date);
      await cacheAvailability(business.id, date, slots);
    }
  }
  
  return NextResponse.json({ success: true });
}
```

### Step 19.3: Lazy Loading

**File: `components/availability-calendar.tsx`**
- Load availability only when date is selected
- Show loading state
- Cache loaded dates
- Optimize API calls

---

## 🔄 Phase 20: Integration & Testing

### Step 20.1: Google Calendar Integration

**File: `lib/calendar-sync.ts`**
- One-way sync (free tier)
- Two-way sync (paid tiers)
- Create calendar events
- Update calendar events

### Step 20.2: Email Notifications

**File: `lib/email-notifications.ts`**
- Booking confirmations
- Payment confirmations
- Subscription renewals
- Upgrade notifications

### Step 20.3: Testing

- Test all tiers
- Test payment flows
- Test subscription renewals
- Test feature gating
- Test custom domains
- Test availability system

---

## 📝 Implementation Checklist

### Database & Auth
- [ ] Create all database tables
- [ ] Set up RLS policies
- [ ] Configure Supabase Auth
- [ ] Create auth API routes
- [ ] Set up middleware

### Onboarding
- [ ] Create signup page
- [ ] Create onboarding flow
- [ ] Paystack subaccount creation
- [ ] First service setup
- [ ] Availability setup

### Payments
- [ ] Embedded Paystack integration (no redirect)
- [ ] Split payment setup
- [ ] Transaction tracking
- [ ] Webhook handlers

### Subscriptions
- [ ] Create Paystack plans
- [ ] Subscription creation
- [ ] 28-day renewal logic
- [ ] Combined invoice (subscription + platform fee)
- [ ] Grace period handling

### Features
- [ ] Availability management
- [ ] Service management
- [ ] Booking system
- [ ] Public booking pages
- [ ] Custom domain routing
- [ ] DNS verification

### Dashboard
- [ ] Main dashboard
- [ ] Bookings management
- [ ] Services management
- [ ] Subscription management
- [ ] Settings page
- [ ] Analytics (tier-dependent)

### Feature Gating
- [ ] Tier limit enforcement
- [ ] Service limits
- [ ] Monthly booking limits (free tier - resets every 28 days)
- [ ] Monthly transaction limits (free tier - resets every 28 days)
- [ ] Feature access control

### Reporting
- [ ] Platform fee calculation
- [ ] Monthly statements
- [ ] Dashboard reports

### Security & Validation
- [ ] Input validation (slug, email, phone, price)
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Rate limiting
- [ ] Business slug reserved words check

### Backup & Recovery
- [ ] Database backups (Supabase daily backups)
- [ ] Payment fallback system
- [ ] Status page
- [ ] Health check endpoints
- [ ] Emergency procedures documentation

### Error Handling
- [ ] Centralized error handling
- [ ] Sentry integration
- [ ] User-friendly error messages
- [ ] Error logging

### Currency Support
- [ ] Multi-currency (KES/USD)
- [ ] Paystack split payment with currency
- [ ] Currency selection in settings
- [ ] Currency formatting

### Client Management/CRM
- [ ] Auto-create clients from bookings
- [ ] Client list & management
- [ ] Client notes (Tier 1+)
- [ ] Client tagging
- [ ] Client marketing (Tier 2)

### Domain Verification
- [ ] Simplified CNAME verification
- [ ] Hourly DNS checks
- [ ] Clear setup instructions with screenshots
- [ ] Video tutorials for .co.ke domains
- [ ] WhatsApp support integration
- [ ] Netlify domain integration

### Legal & Compliance
- [ ] Privacy Policy (Kenya DPA compliant)
- [ ] Terms of Service
- [ ] PCI compliance documentation
- [ ] Tax tracking & reporting

### Support System
- [ ] WhatsApp integration (0797473696)
- [ ] Help center
- [ ] Documentation
- [ ] FAQ section

### Performance & Caching
- [ ] Availability caching (Redis)
- [ ] Pre-compute availability (nightly)
- [ ] Lazy loading for availability

---

## 🚀 Deployment Steps

1. Set up Supabase project
2. Run database migrations
3. Configure environment variables
4. Deploy to Vercel/Netlify
5. Set up Paystack webhooks
6. Configure cron jobs (subscription renewals, DNS verification)
7. Test all flows
8. Launch!

---

## 📌 Key Files to Create

### API Routes
- `/api/auth/*` - Authentication
- `/api/business/*` - Business management
- `/api/paystack/*` - Payment processing
- `/api/subscription/*` - Subscription management
- `/api/availability/*` - Availability management
- `/api/bookings/*` - Booking creation
- `/api/dashboard/*` - Dashboard data
- `/api/cron/*` - Cron jobs

### Pages
- `/signup` - Business signup
- `/login` - Business login
- `/onboard` - Onboarding flow
- `/dashboard/*` - Dashboard pages
- `/[business-slug]/*` - Public booking pages

### Components
- Payment modal (embedded)
- Availability calendar
- Service management
- Subscription management
- Monthly statements

### Libraries
- Paystack integration
- Availability calculator
- Tier limits checker
- Platform fee calculator
- Domain verifier (CNAME)
- Currency formatter
- Input validator
- Rate limiter
- Error handler
- Client manager
- Cache manager (Redis)

---

---

## 📋 Updated Requirements Summary

### Free Tier Changes
- ✅ **10 bookings/month** (not lifetime) - resets every 28 days
- ✅ **10 transactions/month** (not lifetime) - resets every 28 days
- ✅ Limits reset on `renewal_date` (28-day cycle)
- ✅ When limits are reached, business must wait until next cycle or upgrade

### Critical Additions
- ✅ Data validation & sanitization (slug, email, XSS protection)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting (API protection)
- ✅ Backup & disaster recovery (Supabase backups, payment fallback)
- ✅ Error handling & logging (Sentry integration)
- ✅ Multi-currency support (KES/USD with Paystack)
- ✅ Simplified domain verification (CNAME, hourly checks)
- ✅ WhatsApp support (0797473696)
- ✅ Client management/CRM (auto-create, notes, tags, marketing)
- ✅ Performance & caching (Redis, pre-compute availability)
- ✅ Legal & compliance (Privacy Policy, Terms, PCI, Tax)

### Domain Verification
- ✅ Use CNAME method (simpler than TXT)
- ✅ Check every hour (not every 5 minutes)
- ✅ Clear instructions with screenshots
- ✅ Video tutorials for Kenyan hosting providers
- ✅ WhatsApp support button
- ✅ Netlify automatic SSL

### Client Management
- ✅ Auto-create clients from bookings
- ✅ Free tier: View clients only
- ✅ Tier 1: Add notes, tags
- ✅ Tier 2: Marketing features (email/SMS)

---

This is the complete implementation plan with all updates. Each phase builds on the previous one. Ready to start implementation?

