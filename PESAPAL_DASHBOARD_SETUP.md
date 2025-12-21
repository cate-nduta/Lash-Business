# PesaPal Dashboard Configuration Guide

This guide will help you configure your PesaPal dashboard settings for your LashDiary website.

## Required Settings in PesaPal Dashboard

When setting up your PesaPal account, you'll need to configure these two important settings:

### 1. Website Domain

**What to enter:**
```
lashdiary.co.ke
```

**OR if you have a different domain:**
```
yourdomain.com
```

**Important Notes:**
- Enter **only the domain name** (without `http://` or `https://`)
- Do **NOT** include `www.` unless your site specifically requires it
- Do **NOT** include any paths like `/api` or trailing slashes
- Examples:
  - ✅ Correct: `lashdiary.co.ke`
  - ✅ Correct: `myserver.net`
  - ❌ Wrong: `https://lashdiary.co.ke`
  - ❌ Wrong: `www.lashdiary.co.ke` (unless your site requires www)
  - ❌ Wrong: `lashdiary.co.ke/api`

### 2. IPN Listener Url

**What to enter:**
```
https://lashdiary.co.ke/api/pesapal/ipn
```

**OR if you have a different domain:**
```
https://yourdomain.com/api/pesapal/ipn
```

**Important Notes:**
- Must use **HTTPS** (not HTTP) in production
- Must include the **full path** to the IPN endpoint
- The endpoint is: `/api/pesapal/ipn`
- This URL must be **publicly accessible** (not behind a firewall)
- PesaPal will send payment notifications to this URL

## How to Find Your Correct URLs

### Option 1: Check Your Environment Variables

Check your `.env.local` file for `NEXT_PUBLIC_BASE_URL`:

```env
NEXT_PUBLIC_BASE_URL=https://lashdiary.co.ke
```

If this is set, use that domain. If not set, the system defaults to `https://lashdiary.co.ke`.

### Option 2: Check Your Live Website

1. Visit your live website
2. Check the URL in your browser's address bar
3. Use that domain (without any paths)

## Complete Configuration Example

Based on your current setup, here's what you should enter in the PesaPal dashboard:

### For Domain: `lashdiary.co.ke`

**Website Domain:**
```
lashdiary.co.ke
```

**IPN Listener Url:**
```
https://lashdiary.co.ke/api/pesapal/ipn
```

## Additional PesaPal Settings

### Callback URL (if required)

Some PesaPal configurations also require a Callback URL. If asked, use:

```
https://lashdiary.co.ke/api/pesapal/callback
```

**Note:** The callback URL is different from the IPN URL:
- **IPN URL**: Receives payment status updates (server-to-server)
- **Callback URL**: Redirects users back to your site after payment

## Testing Your Configuration

### 1. Verify IPN Endpoint is Accessible

You can test if your IPN endpoint is accessible by visiting:
```
https://lashdiary.co.ke/api/pesapal/ipn
```

**Expected Result:**
- You should get a response (even if it's an error about missing data)
- If you get a 404 or connection error, the URL is incorrect

### 2. Check Server Logs

After a test payment, check your server logs for:
```
Pesapal IPN Received: ...
```

This confirms that PesaPal is successfully sending notifications to your IPN URL.

## Common Issues

### Issue: IPN Not Receiving Notifications

**Possible Causes:**
1. **Wrong URL**: Double-check the IPN URL matches exactly
2. **HTTPS Required**: Make sure you're using `https://` not `http://`
3. **Firewall**: Ensure your server allows incoming requests from PesaPal
4. **Whitelisting**: PesaPal may need to whitelist your IPN URL

### Issue: Domain Mismatch

**Solution:**
- The domain in "Website Domain" should match your actual website domain
- If your site uses `www.`, include it: `www.lashdiary.co.ke`
- If your site doesn't use `www.`, don't include it: `lashdiary.co.ke`

## Environment Variables Reference

Make sure these are set in your `.env.local` file:

```env
# Your website's base URL
NEXT_PUBLIC_BASE_URL=https://lashdiary.co.ke

# PesaPal Credentials
PESAPAL_CONSUMER_KEY=your_consumer_key
PESAPAL_CONSUMER_SECRET=your_consumer_secret
PESAPAL_ENVIRONMENT=live

# Optional: Override URLs if needed
PESAPAL_IPN_URL=https://lashdiary.co.ke/api/pesapal/ipn
PESAPAL_CALLBACK_URL=https://lashdiary.co.ke/api/pesapal/callback
```

## Next Steps

1. ✅ Enter the **Website Domain** in PesaPal dashboard
2. ✅ Enter the **IPN Listener Url** in PesaPal dashboard
3. ✅ Save the settings
4. ✅ Test with a small payment to verify IPN is working
5. ✅ Check server logs to confirm notifications are being received

## Support

If you're still having issues:
- Check PesaPal documentation: [https://developer.pesapal.com/](https://developer.pesapal.com/)
- Contact PesaPal support for dashboard configuration help
- Verify your server is publicly accessible and not behind a firewall

