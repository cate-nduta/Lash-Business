# Lesson 10.5: Security Basics

**Estimated Time**: 20 minutes

---

## Introduction

Security is critical when handling payments. This lesson covers essential security practices for payment processing, protecting customer data, and ensuring your payment integration is secure and compliant.

**What You'll Learn:**
- Why payment security matters
- PCI compliance basics
- How to protect API keys
- Secure data handling
- Best security practices

---

## Why Payment Security Matters

### Protecting Customer Data

**Security is essential because:**
- Customer data is sensitive
- Financial information at risk
- Legal requirements (PCI)
- Reputation protection
- Trust building

**Security breaches can:**
- Expose customer data
- Lead to fraud
- Damage reputation
- Result in fines
- Lose customer trust

**Security = Trust and protection!**

---

## PCI Compliance Basics

### What Is PCI?

**PCI DSS (Payment Card Industry Data Security Standard):**
- Security standards for card data
- Required for handling payments
- Protects cardholder data
- Industry requirement

**Key requirements:**
- Don't store card numbers
- Encrypt sensitive data
- Secure networks
- Access controls
- Regular monitoring

**Good news:**
- Payment gateways handle PCI
- You don't store card data
- Gateway is PCI compliant
- You're mostly covered

---

## Protecting API Keys

### Never Expose Keys

**API keys are sensitive:**
- Give access to your account
- Can process payments
- Must be kept secret
- Never expose publicly

**Do:**
- Store in environment variables
- Use `.env.local` file
- Never commit to git
- Use different keys for test/live
- Rotate keys regularly

**Don't:**
- Hardcode in files
- Commit to GitHub
- Share publicly
- Use in frontend code (secret keys)
- Expose in client-side code

---

## Environment Variables

### Secure Storage

**Store keys securely:**
```
# .env.local (never commit to git!)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
PESAPAL_CONSUMER_SECRET=your_secret
```

**Add to `.gitignore`:**
```
.env.local
.env*.local
```

**Use in code:**
```javascript
// Server-side only (API routes)
const secretKey = process.env.STRIPE_SECRET_KEY

// Client-side (safe to expose)
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

## Secure Data Handling

### What to Store

**Safe to store:**
- Booking details
- Customer name
- Email address
- Service information
- Booking dates/times

**Never store:**
- Full card numbers
- CVV codes
- Card expiry dates
- Payment details
- Sensitive financial data

**Payment gateways handle:**
- Card information
- Payment processing
- Sensitive data
- You don't need it

---

## HTTPS and SSL

### Secure Connections

**Always use HTTPS:**
- Encrypts data transmission
- Protects in transit
- Required for payments
- Builds trust

**SSL certificate:**
- Provided by hosting
- Usually automatic
- Ensures HTTPS
- Required for production

**Check:**
- Website uses HTTPS
- SSL certificate valid
- No mixed content warnings
- Secure connection

---

## Input Validation

### Validate Everything

**Always validate:**
- Payment amounts
- Customer data
- Form inputs
- API requests
- User inputs

**Validation prevents:**
- Invalid data
- Security issues
- Payment errors
- Data corruption
- Fraud attempts

**Example:**
```javascript
// Validate amount
if (amount <= 0 || amount > 10000) {
  return error('Invalid amount')
}

// Validate email
if (!isValidEmail(email)) {
  return error('Invalid email')
}
```

---

## Error Handling Security

### Safe Error Messages

**Don't expose:**
- Technical details
- API keys
- Database errors
- Internal information
- System details

**Show user-friendly:**
- "Payment failed. Please try again."
- "An error occurred. Please contact support."
- Generic messages
- No technical details

**Log securely:**
- Log errors server-side
- Don't log sensitive data
- Monitor logs
- Investigate issues

---

## Best Security Practices

### 1. Use Environment Variables

**Always:**
- Store keys in `.env.local`
- Never commit to git
- Use different keys for test/live
- Rotate keys periodically

---

### 2. Validate All Input

**Always:**
- Validate payment amounts
- Check customer data
- Verify form inputs
- Sanitize data

---

### 3. Use HTTPS

**Always:**
- Enable HTTPS
- Use SSL certificate
- Secure connections
- No HTTP in production

---

### 4. Don't Store Card Data

**Never:**
- Store card numbers
- Save CVV codes
- Keep payment details
- Store sensitive data

---

### 5. Handle Errors Safely

**Always:**
- Generic error messages
- Log server-side
- Don't expose details
- User-friendly messages

---

### 6. Monitor Transactions

**Regularly:**
- Review transactions
- Check for fraud
- Monitor patterns
- Investigate suspicious activity

---

### 7. Keep Updated

**Regularly:**
- Update dependencies
- Patch security issues
- Keep gateways updated
- Stay current

---

## Real-World Example

### Secure Payment Setup

**1. Environment variables:**
```
.env.local (not in git)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**2. API route (server-side):**
```javascript
// Uses secret key (server-side only)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
```

**3. Frontend (client-side):**
```javascript
// Uses publishable key (safe to expose)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
)
```

**4. Validation:**
```javascript
// Validate before processing
if (amount <= 0) return error('Invalid amount')
if (!email) return error('Email required')
```

**5. Error handling:**
```javascript
// Safe error messages
catch (error) {
  console.error('Payment error:', error) // Log server-side
  return { error: 'Payment failed. Please try again.' } // User-friendly
}
```

---

## Common Security Mistakes

### Mistake 1: Exposing Secret Keys

**Bad:**
```javascript
// In frontend code
const secretKey = 'sk_live_...' // EXPOSED!
```

**Good:**
```javascript
// In .env.local
STRIPE_SECRET_KEY=sk_live_...
// Only use in API routes (server-side)
```

---

### Mistake 2: Storing Card Data

**Bad:**
```javascript
// Storing card number
await saveToDatabase({ cardNumber: '4242...' }) // NEVER!
```

**Good:**
```javascript
// Only store booking data
await saveToDatabase({ 
  customerName: 'John',
  service: 'Classic Lashes',
  amount: 60
}) // Safe
```

---

### Mistake 3: Exposing Errors

**Bad:**
```javascript
return { error: error.message } // Might expose sensitive info
```

**Good:**
```javascript
console.error('Error:', error) // Log server-side
return { error: 'Payment failed. Please try again.' } // Generic
```

---

## Security Checklist

### Before Going Live

**Environment:**
- [ ] All keys in environment variables
- [ ] `.env.local` in `.gitignore`
- [ ] Different keys for test/live
- [ ] No keys in code

**Validation:**
- [ ] All inputs validated
- [ ] Amounts checked
- [ ] Data sanitized
- [ ] Forms validated

**HTTPS:**
- [ ] HTTPS enabled
- [ ] SSL certificate valid
- [ ] No mixed content
- [ ] Secure connections

**Data:**
- [ ] No card data stored
- [ ] Only necessary data saved
- [ ] Sensitive data encrypted
- [ ] Proper data handling

**Errors:**
- [ ] Generic error messages
- [ ] Errors logged server-side
- [ ] No sensitive info exposed
- [ ] User-friendly messages

---

## Key Takeaways

1. **Security is critical** - Protect customer data and your business
2. **Payment gateways handle PCI** - You don't need full PCI compliance
3. **Protect API keys** - Use environment variables, never expose
4. **Don't store card data** - Payment gateways handle it
5. **Use HTTPS always** - Required for secure payments
6. **Validate all input** - Prevent invalid data and fraud
7. **Handle errors safely** - Generic messages, log server-side
8. **Monitor transactions** - Watch for fraud and issues

---

## Module 10 Summary

**Congratulations! You've completed Module 10: Payments & Checkout (Optional)!**

**You've learned:**
1. ✅ How online payments work (payment flow, gateways)
2. ✅ How to integrate PayPal or Stripe (setup, integration)
3. ✅ How to set up Pesapal (for African markets)
4. ✅ How to test payments (test mode, test cards)
5. ✅ Security basics (PCI, API keys, data protection)

**You now have:**
- Understanding of payment processing
- Ability to integrate payment gateways
- Knowledge of testing payments safely
- Security best practices
- Complete payment integration (optional)

**Your website can now accept payments!** 🎉

---

## What's Next?

Excellent work! You've learned how to integrate payments into your booking website. This module is optional - you can build a booking website without payments if you prefer. The next modules will cover deployment, making your website live, and other advanced features.

**Ready to continue?** Move to the next module to learn about deployment!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand why security matters (protect data, build trust)
- ✅ Know PCI compliance basics (gateways handle most of it)
- ✅ Can protect API keys (environment variables, never expose)
- ✅ Understand secure data handling (don't store card data)
- ✅ Know to use HTTPS (required for payments)
- ✅ Understand input validation (validate everything)
- ✅ Know error handling security (generic messages, safe logging)
- ✅ Understand best security practices

If anything is unclear, review this lesson or the entire module!
