# Paystack Live Configuration Guide

## Step-by-Step Setup

### 1. Get Your Live Keys from Paystack Dashboard

In your Paystack Dashboard, you should see:

#### Live Secret Key
- This is your **Live Secret Key** (starts with `sk_live_`)
- **IMPORTANT**: Keep this secret! Never expose it in frontend code
- Copy this value

#### Live Public Key
- This is your **Live Public Key** (starts with `pk_live_`)
- This can be used in frontend (though we're not using it in our implementation)
- Copy this value

### 2. Configure Your .env.local File

Add these to your `.env.local` file (or production environment variables):

```env
# Paystack Live Configuration
PAYSTACK_SECRET_KEY=sk_live_YOUR_ACTUAL_SECRET_KEY_HERE
PAYSTACK_PUBLIC_KEY=pk_live_YOUR_ACTUAL_PUBLIC_KEY_HERE
PAYSTACK_ENVIRONMENT=live

# Optional: Webhook Secret (for security)
# Get this from Paystack Dashboard → Settings → API Keys & Webhooks → Webhook Secret
PAYSTACK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

**Replace:**
- `sk_live_YOUR_ACTUAL_SECRET_KEY_HERE` with your actual Live Secret Key
- `pk_live_YOUR_ACTUAL_PUBLIC_KEY_HERE` with your actual Live Public Key
- `whsec_YOUR_WEBHOOK_SECRET_HERE` with your webhook secret (if available)

### 3. Set Up Callback URL

**Live Callback URL:**
```
https://lashdiary.co.ke/api/paystack/callback
```

**Or if using a different domain:**
```
https://yourdomain.com/api/paystack/callback
```

**What this does:**
- After customer completes payment on Paystack, they're redirected here
- This page verifies the payment and redirects to success/failure page
- No need to configure this in Paystack Dashboard - it's set in the code

### 4. Set Up Webhook URL

**Live Webhook URL:**
```
https://lashdiary.co.ke/api/paystack/webhook
```

**Or if using a different domain:**
```
https://yourdomain.com/api/paystack/webhook
```

**How to configure in Paystack Dashboard:**

1. Go to **Settings** → **API Keys & Webhooks**
2. Scroll to **Webhooks** section
3. Click **Add Webhook URL** (or edit existing)
4. Enter your webhook URL: `https://lashdiary.co.ke/api/paystack/webhook`
5. Select events to receive:
   - ✅ **charge.success** (Required - payment successful)
   - ✅ **charge.failed** (Optional - payment failed)
6. Click **Save**
7. Copy the **Webhook Secret** that appears
8. Add it to your `.env.local` as `PAYSTACK_WEBHOOK_SECRET`

**What this does:**
- Paystack sends real-time notifications when payments complete
- Your system automatically updates payment status
- Sends confirmation emails
- Grants access to courses/services

### 5. IP Whitelist (Optional but Recommended)

**For Production:**
- Add your server's IP address(es) to the IP whitelist
- This adds an extra layer of security
- Only requests from whitelisted IPs will be accepted

**How to find your server IP:**
- If using Netlify/Vercel: Check your deployment platform's documentation
- If using your own server: Use `curl ifconfig.me` or check your hosting provider

**To add IPs:**
1. In Paystack Dashboard → **Settings** → **API Keys & Webhooks**
2. Find **IP Whitelist** section
3. Click **Add IP addresses**
4. Enter your server IP(s)
5. Click **Save**

**Note:** If you're using serverless (Netlify/Vercel), you may not have a static IP. In that case, you can skip IP whitelisting, but make sure webhook signature verification is enabled (which it is in our code).

### 6. Generate New Secret Key (If Needed)

If you need to generate a new secret key:

1. Go to **Settings** → **API Keys & Webhooks**
2. Find your **Live Secret Key** section
3. Click **Generate new secret key**
4. **IMPORTANT**: Copy the new key immediately - you won't be able to see it again!
5. Update your `.env.local` file with the new key
6. Restart your application

**Warning:** Generating a new key will invalidate the old one. Make sure to update your environment variables before the old key expires.

## Complete .env.local Example

```env
# Base URL
NEXT_PUBLIC_BASE_URL=https://lashdiary.co.ke

# Paystack Live Configuration
PAYSTACK_SECRET_KEY=sk_live_YOUR_ACTUAL_SECRET_KEY_HERE
PAYSTACK_PUBLIC_KEY=pk_live_YOUR_ACTUAL_PUBLIC_KEY_HERE
PAYSTACK_ENVIRONMENT=live
PAYSTACK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Other environment variables...
```

## Testing Your Configuration

### 1. Test Payment Initialization

Make a test purchase and check:
- ✅ You're redirected to Paystack checkout
- ✅ Payment page loads correctly
- ✅ You can complete a test payment

### 2. Test Webhook

After completing a test payment:
- ✅ Check your server logs for webhook events
- ✅ Verify payment status is updated in your database
- ✅ Confirm emails are sent

### 3. Verify in Paystack Dashboard

- Go to **Transactions** in Paystack Dashboard
- You should see your test transaction
- Check that webhook events are being sent (look for webhook delivery status)

## Troubleshooting

### Webhook Not Working?

1. **Check webhook URL is correct:**
   - Must be HTTPS (not HTTP)
   - Must be publicly accessible
   - Must match exactly what's in Paystack Dashboard

2. **Check webhook secret:**
   - Must match in both `.env.local` and Paystack Dashboard
   - If regenerated, update both places

3. **Check server logs:**
   - Look for webhook requests in your logs
   - Check for signature verification errors

4. **Test webhook manually:**
   - Use Paystack Dashboard → **Settings** → **API Keys & Webhooks** → **Test Webhook**
   - This sends a test event to your webhook URL

### Callback Not Working?

1. **Check callback URL in code:**
   - Verify `NEXT_PUBLIC_BASE_URL` is set correctly
   - Check that `/api/paystack/callback` route exists

2. **Test redirect:**
   - Complete a payment and verify redirect works
   - Check browser console for errors

## Security Best Practices

1. ✅ **Never commit `.env.local` to git** - it's already in `.gitignore`
2. ✅ **Use different keys for test and live** - don't mix them
3. ✅ **Enable webhook signature verification** - already implemented
4. ✅ **Use HTTPS only** - required for production
5. ✅ **Rotate keys periodically** - generate new keys if compromised
6. ✅ **Monitor webhook deliveries** - check Paystack Dashboard regularly

## Quick Reference

| Field | Value | Where to Get |
|-------|-------|--------------|
| Live Secret Key | `sk_live_...` | Paystack Dashboard → Settings → API Keys |
| Live Public Key | `pk_live_...` | Paystack Dashboard → Settings → API Keys |
| Live Callback URL | `https://yourdomain.com/api/paystack/callback` | Your domain + `/api/paystack/callback` |
| Live Webhook URL | `https://yourdomain.com/api/paystack/webhook` | Your domain + `/api/paystack/webhook` |
| Webhook Secret | `whsec_...` | Paystack Dashboard → Settings → Webhooks (after adding webhook URL) |

## Next Steps

1. ✅ Add keys to `.env.local`
2. ✅ Configure webhook URL in Paystack Dashboard
3. ✅ Copy webhook secret to `.env.local`
4. ✅ Test with a small real transaction
5. ✅ Monitor first few transactions closely
6. ✅ Set up monitoring/alerts for failed payments

