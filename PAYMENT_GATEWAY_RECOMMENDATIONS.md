# Payment Gateway Recommendations for LashDiary

## Overview
You need a payment gateway that supports:
1. **M-Pesa STK Push** (for Kenyan customers)
2. **Card payments** (Visa, Mastercard) in KES and USD
3. Integration with Next.js application

## Recommended Options (Best to Good)

### 1. **Pesapal** ⭐ (Best for Kenya)
**Why Choose:**
- ✅ Full M-Pesa STK Push support
- ✅ Card payments (Visa, Mastercard, etc.)
- ✅ Multi-currency support (KES, USD, etc.)
- ✅ Well-documented APIs
- ✅ Popular in Kenya (trusted by many businesses)
- ✅ Good customer support for local businesses
- ✅ Webhooks for payment notifications
- ✅ Dashboard for managing transactions

**Fees:**
- M-Pesa: ~1.5% - 2.5% per transaction
- Cards: ~2.9% + KES 10 per transaction

**Integration:**
- Official Node.js SDK available
- REST API well documented
- Supports both sandbox and production

**Website:** https://www.pesapal.com

---

### 2. **Stripe + Pesapal Combo**
**Why Choose:**
- ✅ Stripe for international card payments (USD, etc.)
- ✅ Pesapal for M-Pesa
- ✅ Best user experience for international customers
- ✅ Stripe has excellent USD support

**Downside:**
- Need to integrate two payment systems
- More complex setup

---

### 3. **Cellulant (Tingg)** ⚠️
**Why Consider:**
- ✅ M-Pesa support
- ✅ Card payments
- ✅ Kenyan company

**Downside:**
- Less popular than Pesapal
- Documentation may be less comprehensive

---

## Recommendation for Your Use Case

### **Primary Recommendation: Pesapal**

**Reasons:**
1. **Best M-Pesa integration** - Most seamless STK Push experience
2. **Good card support** - Accepts international cards
3. **Local presence** - Better support in Kenya
4. **Easy to integrate** - Well-documented APIs
5. **Trusted** - Used by many Kenyan businesses
6. **Multi-currency** - Supports USD payments

### Implementation Plan:

1. **Sign up for Pesapal account:**
   - Visit https://www.pesapal.com
   - Register as a merchant
   - Complete KYC (business registration documents)

2. **Get API credentials:**
   - Consumer Key
   - Consumer Secret
   - IPN (Instant Payment Notification) URL

3. **Integration Steps:**
   ```bash
   # Install Pesapal SDK (if available) or use REST API
   npm install pesapal-sdk # or use fetch/axios
   ```

4. **Environment Variables:**
   ```env
   PESAPAL_CONSUMER_KEY=your_consumer_key
   PESAPAL_CONSUMER_SECRET=your_consumer_secret
   PESAPAL_ENVIRONMENT=sandbox # or 'live' for production
   PESAPAL_IPN_URL=https://your-domain.com/api/pesapal/callback
   ```

5. **Features to implement:**
   - M-Pesa STK Push for transfer fees
   - Card payment for transfer fees (KES and USD)
   - Webhook handler for payment confirmations
   - Payment status checking

---

## Important Notes:

1. **M-Pesa STK Push** requires a PayBill or Till number (not a personal phone number)
2. **Card payments** need PCI compliance (handled by gateway)
3. **Webhooks** are essential for confirming payments automatically
4. **Test thoroughly** in sandbox before going live
5. **Handle currency conversion** if accepting USD (convert to KES for display)

---

## Next Steps:

1. Contact Pesapal to open merchant account
2. Complete business registration/KYC
3. Get sandbox credentials
4. Implement payment flow for transfer fees
5. Test in sandbox
6. Apply for production access
7. Go live!

