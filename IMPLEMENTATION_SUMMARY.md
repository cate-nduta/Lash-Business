# Freemium Implementation - Quick Summary

## ✅ Confirmed Requirements

### Tiers
- **Free**: 1 service, 10 bookings/month, 10 transactions/month (resets every 28 days), 7% fee
- **Tier 1 ($20/28 days)**: Up to 10 services, unlimited bookings, unlimited transactions, 5% fee
- **Tier 2 ($30/28 days)**: Unlimited everything, 3% fee, custom domain

### Payment Model
- **Subscription**: $20 or $30 charged every 28 days
- **Platform Fee**: Taken via split payment immediately (5%, 3%, or 7%)
- **Combined Invoice**: Subscription + platform fee charged together at renewal
- **Payment Method**: **Embedded Paystack (NO REDIRECT)** - stays on website

### URLs
- **Default**: `lashdiary.co.ke/[business-slug]`
- **Custom Domain (Tier 2)**: `bookings.theirsalon.com` with automated DNS verification

### Features
- Availability control (business hours, days off, time slots)
- Embedded payments (no redirect)
- Monthly aggregated reporting
- 3-day grace period for failed payments
- Integrated into main LashDiary site

---

## 🚀 Implementation Order

### Week 1: Foundation
1. ✅ Database schema (all tables)
2. ✅ Supabase Auth setup
3. ✅ Basic business model

### Week 2: Onboarding & Payments
4. ✅ Business signup/onboarding
5. ✅ Paystack subaccount creation
6. ✅ Embedded payment integration (NO REDIRECT)

### Week 3: Subscriptions
7. ✅ Paystack subscription setup
8. ✅ 28-day renewal logic
9. ✅ Combined invoice (subscription + platform fee)
10. ✅ Grace period handling

### Week 4: Features
11. ✅ Availability management
12. ✅ Service management
13. ✅ Booking system
14. ✅ Public booking pages

### Week 5: Dashboard & Gating
15. ✅ Business dashboard
16. ✅ Feature gating (tier limits)
17. ✅ Transaction limit enforcement

### Week 6: Advanced Features
18. ✅ Custom domain routing
19. ✅ DNS verification (automated)
20. ✅ Monthly reporting

### Week 7: Polish & Launch
21. ✅ UI/UX improvements
22. ✅ Testing
23. ✅ Deployment

---

## 📁 Key Files to Create

### Database
- Supabase migrations (all tables)
- RLS policies

### Authentication
- `app/signup/page.tsx`
- `app/login/page.tsx`
- `app/api/auth/*`

### Onboarding
- `app/onboard/page.tsx`
- `app/api/business/onboard/route.ts`

### Payments (EMBEDDED - NO REDIRECT)
- `components/paystack-embed.tsx` ⭐ CRITICAL
- `app/api/paystack/initialize/route.ts`
- `app/api/paystack/verify/route.ts`
- `app/api/paystack/webhook/route.ts`

### Subscriptions
- `app/api/subscription/*`
- `app/api/cron/subscription-renewal/route.ts`

### Availability
- `app/dashboard/availability/page.tsx`
- `app/api/availability/*`
- `lib/availability-calculator.ts`

### Public Pages
- `app/[business-slug]/page.tsx`
- `app/[business-slug]/book/page.tsx`
- `middleware.ts` (for custom domains)

### Dashboard
- `app/dashboard/page.tsx`
- `app/dashboard/*` (all dashboard pages)

### Feature Gating
- `lib/tier-limits.ts`
- `lib/tier-middleware.ts`

### Reporting
- `lib/platform-fee-calculator.ts`
- `app/api/dashboard/statements/route.ts`

---

## 🎯 Critical Implementation Points

### 1. Embedded Payments (NO REDIRECT)
- Use `react-paystack` or Paystack Inline JS
- Payment opens in popup/iframe
- User stays on your website
- Handle callbacks on your page

### 2. Split Payments
- Every transaction automatically splits
- Business gets 95% (Tier 1) or 97% (Tier 2) or 93% (Free)
- You get 5% or 3% or 7% immediately
- No risk of non-payment

### 3. 28-Day Subscription Cycle
- Use Paystack "monthly" interval
- Track 28-day cycles in your database
- Cron job checks daily for renewals
- Charge combined invoice (subscription + platform fee)

### 4. Free Tier Transaction Limit
- Track `total_transactions_count` in database
- Block payment if count >= 5
- Force upgrade to continue

### 5. Custom Domain (Tier 2)
- Automated DNS verification
- Check TXT record every 5-10 minutes
- Auto-activate when verified
- Route via middleware

### 6. Availability System
- Business hours (per day of week)
- Days off (holidays, vacations)
- Time slots (duration, buffers)
- Calculate available slots for booking

---

## 🔧 Environment Variables Needed

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Paystack
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_MAIN_SUBACCOUNT_CODE= # Your main subaccount for platform fees

# App
NEXT_PUBLIC_BASE_URL=https://lashdiary.co.ke
```

---

## 📊 Database Tables Summary

1. `businesses` - Business info, tier, subscription, custom domain
2. `services` - Business services
3. `bookings` - Customer bookings
4. `users` - Business owners
5. `transactions` - All payment transactions
6. `subscription_payments` - Subscription payment history
7. `business_hours` - Weekly schedule
8. `business_days_off` - Holidays/vacations
9. `availability_settings` - Slot duration, buffers, etc.
10. `monthly_platform_fees` - Monthly fee tracking

---

## ✅ Success Criteria

- [ ] Businesses can sign up and onboard
- [ ] Each business gets unique URL: `lashdiary.co.ke/[slug]`
- [ ] Payments are embedded (no redirect)
- [ ] Split payments work correctly
- [ ] Subscriptions renew every 28 days
- [ ] Combined invoice (subscription + platform fee)
- [ ] Free tier limited to 10 bookings and 10 transactions per month (resets every 28 days)
- [ ] Tier limits enforced (services, bookings)
- [ ] Availability system works
- [ ] Custom domains work (Tier 2)
- [ ] DNS verification automated
- [ ] Monthly reporting shows aggregated fees
- [ ] All features gated by tier

---

## 🚀 Ready to Start!

All requirements confirmed. Implementation plan complete with all critical additions:

### ✅ Key Updates
- Free tier: 10 bookings + 10 transactions per month (resets every 28 days)
- Data validation & security (XSS, SQL injection, rate limiting)
- Backup & disaster recovery
- Error handling & logging (Sentry)
- Multi-currency support (KES/USD)
- Simplified domain verification (CNAME, hourly checks)
- WhatsApp support (0797473696)
- Client management/CRM
- Performance & caching
- Legal & compliance

**Next Step**: Begin Phase 1 - Database Schema Setup

