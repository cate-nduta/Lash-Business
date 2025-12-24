# Lesson 10.4: Testing Payments

**Estimated Time**: 20 minutes

---

## Introduction

Before accepting real payments, you must test your payment integration thoroughly. This lesson shows you how to test payments safely using test mode, test cards, and test scenarios without processing real transactions.

**What You'll Learn:**
- Why testing payments is essential
- How to use test mode
- Test card numbers for different gateways
- How to test different scenarios
- How to verify everything works

---

## Why Test Payments?

### Avoid Problems

**Testing helps you:**
- Find bugs before going live
- Verify payment flow works
- Test error handling
- Ensure security
- Build confidence

**Without testing:**
- Real customers might have issues
- Payments might fail
- You could lose money
- Reputation damage
- Support headaches

**Testing = Peace of mind!**

---

## Using Test Mode

### What Is Test Mode?

**Test mode:**
- Simulates payments
- No real money transferred
- Safe to test
- All features work
- Identical to live mode

**All payment gateways have:**
- Test/sandbox environment
- Test API keys
- Test card numbers
- Test scenarios

**Use test mode until everything works!**

---

## Test Mode Setup

### Stripe Test Mode

**1. Get test keys:**
- Log into Stripe dashboard
- Go to Developers → API keys
- Use "Test mode" toggle
- Copy test keys

**2. Use test keys:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

**3. Test cards:**
- Use provided test card numbers
- Different scenarios available
- No real charges

---

### PayPal Test Mode

**1. Use sandbox:**
- Log into PayPal Developer
- Create sandbox accounts
- Test buyer and seller accounts
- Use sandbox credentials

**2. Test with sandbox:**
- Use sandbox Client ID
- Test payments
- No real money

---

### Pesapal Test Mode

**1. Use sandbox:**
- Set environment to "sandbox"
- Use test credentials
- Test payments
- No real transactions

**2. Test environment:**
```
PESAPAL_ENVIRONMENT=sandbox
```

---

## Test Card Numbers

### Stripe Test Cards

**Successful payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVV: Any 3 digits
- ZIP: Any 5 digits

**Declined payment:**
- Card: `4000 0000 0000 0002`
- Tests declined scenario

**Insufficient funds:**
- Card: `4000 0000 0000 9995`
- Tests insufficient funds

**More test cards:**
- Check Stripe documentation
- Different scenarios
- Various error cases

---

### PayPal Test Cards

**Use sandbox accounts:**
- Create test buyer account
- Use test credentials
- Complete test payments
- No real money

**Test scenarios:**
- Successful payment
- Declined payment
- Cancelled payment
- Various cases

---

## Testing Scenarios

### What to Test

**1. Successful Payment:**
- Complete payment flow
- Verify booking confirmed
- Check confirmation email
- Verify database updated

**2. Declined Payment:**
- Use declined test card
- Verify error handling
- Check user sees error
- Booking not confirmed

**3. Cancelled Payment:**
- Start payment
- Cancel during process
- Verify cancellation handled
- Check redirect works

**4. Network Errors:**
- Simulate network failure
- Test error handling
- Verify user feedback
- Check no data loss

---

## Step-by-Step Testing

### Test 1: Successful Payment

**1. Use test card:**
- `4242 4242 4242 4242` (Stripe)
- Or sandbox account (PayPal)
- Complete payment

**2. Verify:**
- Payment processed
- Booking confirmed
- Email sent
- Database updated
- Success page shown

**3. Check:**
- Payment in dashboard
- Booking in database
- Confirmation email received
- All data correct

---

### Test 2: Declined Payment

**1. Use declined card:**
- `4000 0000 0000 0002` (Stripe)
- Or declined scenario

**2. Verify:**
- Payment declined
- Error message shown
- Booking not confirmed
- User can retry

**3. Check:**
- No booking created
- No confirmation sent
- Error handled gracefully
- User experience good

---

### Test 3: Payment Flow

**1. Test complete flow:**
- Select service
- Choose date/time
- Click "Pay"
- Complete payment
- Verify success

**2. Check each step:**
- Booking page works
- Payment page loads
- Payment processes
- Success page shows
- Confirmation sent

---

## Testing Checklist

### Before Going Live

**Payment Integration:**
- [ ] Test successful payment
- [ ] Test declined payment
- [ ] Test cancelled payment
- [ ] Test error handling
- [ ] Test all payment methods

**Booking Flow:**
- [ ] Booking created on payment
- [ ] Database updated correctly
- [ ] Confirmation email sent
- [ ] Calendar updated (if applicable)
- [ ] Success page works

**Error Handling:**
- [ ] Network errors handled
- [ ] Payment failures handled
- [ ] User sees clear messages
- [ ] No data loss on errors
- [ ] Can retry payment

**Security:**
- [ ] API keys secure
- [ ] No sensitive data exposed
- [ ] HTTPS enabled
- [ ] Proper validation
- [ ] Error messages safe

---

## Using Cursor for Testing

### Test Payment Integration

**Prompt:**
```
Add comprehensive testing for the payment integration. Create test scenarios 
that verify:
1. Successful payment flow works end-to-end
2. Declined payments are handled gracefully
3. Cancelled payments don't create bookings
4. Error messages are user-friendly
5. All data is saved correctly on success
Include test mode configuration and test card numbers.
```

---

## Common Testing Issues

### Issue 1: Test Mode Not Working

**Problem:**
- Using live keys
- Test mode not enabled
- Wrong environment

**Solution:**
- Verify test keys
- Check environment variable
- Enable test mode
- Use sandbox

---

### Issue 2: Test Cards Not Working

**Problem:**
- Card declined
- Payment fails
- Not recognized

**Solution:**
- Use correct test cards
- Check card format
- Verify test mode enabled
- Check gateway documentation

---

### Issue 3: Callbacks Not Working

**Problem:**
- Payment succeeds but callback fails
- Booking not confirmed

**Solution:**
- Test callback URL
- Verify API route works
- Check error logs
- Test locally first

---

## Best Practices

### 1. Test Thoroughly

**Don't rush:**
- Test all scenarios
- Test error cases
- Test edge cases
- Verify everything

---

### 2. Use Test Mode

**Always:**
- Use test mode first
- Test extensively
- Only go live when ready
- Never test with real cards

---

### 3. Document Tests

**Keep notes:**
- What you tested
- What worked
- What didn't
- Issues found
- Fixes applied

---

### 4. Test on Mobile

**Important:**
- Test mobile payment flow
- Check mobile experience
- Verify responsive design
- Test touch interactions

---

## Real-World Example

### Complete Testing Process

**1. Set up test mode:**
- Configure test keys
- Enable sandbox
- Set test environment

**2. Test successful payment:**
- Use test card
- Complete payment
- Verify all steps

**3. Test failures:**
- Declined cards
- Cancelled payments
- Network errors

**4. Verify data:**
- Check database
- Verify emails
- Check confirmations

**5. Fix issues:**
- Address problems found
- Retest fixes
- Verify solutions

**6. Go live:**
- Switch to live keys
- Test once more
- Monitor closely

---

## Key Takeaways

1. **Always test first** - Never go live without testing
2. **Use test mode** - All gateways provide test environments
3. **Test all scenarios** - Success, failure, cancellation, errors
4. **Use test cards** - Provided by payment gateways
5. **Verify everything** - Database, emails, confirmations
6. **Test on mobile** - Ensure mobile experience works
7. **Document tests** - Keep track of what you tested
8. **Only go live when ready** - Test thoroughly first

---

## What's Next?

Perfect! You've learned how to test payments safely. The final lesson covers security basics for handling payments, protecting customer data, and ensuring your payment integration is secure.

**Ready?** Let's move to Lesson 10.5: Security Basics!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand why testing is essential (find bugs, verify flow)
- ✅ Know how to use test mode (sandbox, test keys)
- ✅ Can use test card numbers (Stripe, PayPal, etc.)
- ✅ Know what scenarios to test (success, failure, cancellation)
- ✅ Understand how to verify everything works (database, emails, flow)
- ✅ Know to test on mobile devices
- ✅ Understand best practices (test thoroughly, document, go live when ready)

If anything is unclear, review this lesson or ask questions!
