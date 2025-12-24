# 🔍 How to Check Netlify Function Logs for Pesapal Errors

## The 404 on test endpoint is normal - it needs to be deployed first.

**But you can check the actual error RIGHT NOW in Netlify logs!**

---

## 📋 Step-by-Step: Check Netlify Function Logs

### Method 1: Via Netlify Dashboard (Easiest)

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Sign in to your account

2. **Select Your Site**
   - Click on "lashdiary.co.ke" (or your site name)

3. **View Function Logs**
   - Click on **"Functions"** in the left sidebar
   - OR
   - Go to **"Deploys"** tab → Click on the **latest deploy** → Scroll down to **"Functions"** section

4. **Find the Error**
   - Look for logs from `/api/pesapal/submit-order`
   - Search for these keywords:
     - `❌ Pesapal Auth Error:`
     - `❌ Pesapal Submit Order Error:`
     - `❌ Error submitting order to Pesapal:`
     - `Failed to get Pesapal access token`

5. **Read the Error Message**
   - The logs will show the **exact error** from Pesapal
   - Look for fields like:
     - `status:` (HTTP status code)
     - `error:` (Error message)
     - `details:` (Detailed error description)
     - `response:` (Pesapal API response)

---

## 🔍 What to Look For in the Logs

### Example Error 1: Authentication Failed
```
❌ Pesapal Auth Error: {
  status: 401,
  statusText: "Unauthorized",
  error: "Invalid credentials"
}
```
**Meaning:** Wrong Consumer Key or Secret

### Example Error 2: Invalid Request
```
❌ Pesapal Submit Order Error: {
  status: 400,
  error: "Invalid callback URL"
}
```
**Meaning:** Callback URL not whitelisted

### Example Error 3: Missing Credentials
```
❌ Pesapal API credentials not configured: {
  hasKey: false,
  hasSecret: false
}
```
**Meaning:** Environment variables not set

---

## 📸 How to Share the Error

When you find the error in the logs:

1. **Copy the entire error block** (from `❌` to the end)
2. **Take a screenshot** of the error (optional but helpful)
3. **Note the timestamp** when the error occurred

---

## 🚀 Quick Alternative: Check Recent Deploy Logs

If you can't find function logs:

1. Go to **"Deploys"** tab
2. Click on the **most recent deploy**
3. Look at the **build logs** for any errors
4. Check if environment variables are being loaded

---

## ✅ Most Likely Issues (Based on 500 Error)

### Issue 1: Credentials Not Set
**Check:**
- Go to **Site configuration** → **Environment variables**
- Verify all 6 Pesapal variables are there

**Fix:**
- Add missing variables
- Redeploy site

### Issue 2: Wrong Credentials
**Check logs for:**
- `401 Unauthorized`
- `Invalid credentials`

**Fix:**
- Verify credentials in Pesapal dashboard
- Make sure they match environment (live/sandbox)

### Issue 3: Access Token Request Failing
**Check logs for:**
- `❌ Pesapal Auth Error:`
- Status code `401` or `403`

**Fix:**
- Verify Consumer Key and Secret are correct
- Check Pesapal account is active

---

## 🆘 If You Can't Find the Logs

1. **Try triggering a new error:**
   - Go to your site
   - Try to make a payment again
   - This will create fresh logs

2. **Check Netlify real-time logs:**
   - In Functions tab, there might be a "Live logs" option
   - This shows errors as they happen

3. **Check browser console:**
   - The error might show more details in the Network tab
   - Look for the `/api/pesapal/submit-order` request
   - Check the response body

---

## 📝 What I Need From You

To help you fix this, please share:

1. **The error message from Netlify logs** (the full error block)
2. **Or a screenshot** of the error in Netlify
3. **Status of environment variables** (which ones are set, don't share the values!)

---

**The Netlify function logs will show you EXACTLY what's wrong!** That's the fastest way to diagnose the issue.

