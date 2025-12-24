# 🔍 How to See the Full Error Message

## What You're Seeing

The Netlify logs show:
- ✅ Request was received: `POST /api/pesapal/submit-order`
- ✅ Status: `500 Internal Server Error`
- ❌ But we need to see the **response body** to know what went wrong

---

## 📋 Step 1: View Function Execution Logs

The request logs you're seeing don't show the error message. You need to see the **function execution logs**:

### Method 1: Real-time Function Logs

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Select your site

2. **Go to Functions Tab**
   - Click **"Functions"** in left sidebar
   - Look for **"Real-time logs"** or **"Live logs"** option
   - If available, enable it

3. **Trigger the Error Again**
   - Go to your site
   - Try to make a payment
   - Watch the logs appear in real-time

### Method 2: Check Function Invocations

1. **In Functions Tab**
   - Look for `/api/pesapal/submit-order` function
   - Click on it to see invocation history
   - Click on the most recent invocation (the one with 500 error)
   - This should show the full error details

### Method 3: Check Response Body in Request Logs

1. **In the Request Logs you showed**
   - Click on the request with status `500`
   - Look for **"Response"** or **"Response body"** section
   - Expand it to see the JSON error response

---

## 📋 Step 2: Check Browser Network Tab

You can also see the error in your browser:

1. **Open Browser Developer Tools**
   - Press `F12` or right-click → "Inspect"
   - Go to **"Network"** tab

2. **Try the Payment Again**
   - Go to your site
   - Try to make a payment

3. **Find the Request**
   - Look for `submit-order` in the network requests
   - Click on it
   - Go to **"Response"** tab
   - This will show the error JSON

The response should look like:
```json
{
  "error": "Failed to submit order to Pesapal",
  "details": "...",
  "troubleshooting": "..."
}
```

---

## 📋 Step 3: Check Netlify Build Logs

Sometimes errors are in the build logs:

1. **Go to Deploys Tab**
2. **Click on Latest Deploy**
3. **Check Build Logs**
   - Look for any errors during build
   - Check if environment variables are being loaded

---

## 🔍 What to Look For

The error response should contain one of these:

### Error 1: Missing Credentials
```json
{
  "error": "Pesapal API credentials not configured",
  "message": "Pesapal environment variables are missing..."
}
```

### Error 2: Authentication Failed
```json
{
  "error": "Failed to authenticate with Pesapal",
  "details": "Failed to get Pesapal access token: 401 Unauthorized"
}
```

### Error 3: Order Submission Failed
```json
{
  "error": "Failed to submit order to Pesapal",
  "details": "Invalid callback URL",
  "pesapalResponse": {...}
}
```

---

## 🚀 Quick Test: Check Browser Console

1. **Open your site**
2. **Open Browser Console** (F12 → Console tab)
3. **Try to make a payment**
4. **Look for the error** in the console

The error should be logged there too!

---

## 📸 What I Need

Please share:

1. **The response body** from the 500 error (from Network tab or function logs)
2. **OR** the error message from browser console
3. **OR** a screenshot of the function execution logs showing the error

This will tell us exactly what's wrong!

