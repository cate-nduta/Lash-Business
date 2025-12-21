# 🚨 URGENT: Add Pesapal Environment Variables to Netlify

## ⚠️ Current Issue

Your production site (lashdiary.co.ke) is showing:
```
⚠️ Pesapal API credentials not configured
```

This is because the Pesapal environment variables are **NOT set in Netlify**.

---

## ✅ Solution: Add Environment Variables to Netlify

### Step 1: Go to Netlify Dashboard

1. Visit [https://app.netlify.com](https://app.netlify.com)
2. Sign in to your account
3. Select your site (lashdiary.co.ke)

### Step 2: Navigate to Environment Variables

1. Click on **"Site configuration"** (or **"Site settings"**)
2. Click on **"Environment variables"** in the left sidebar
3. Click **"Add a variable"** button

### Step 3: Add These 6 Environment Variables

Add each variable one by one:

#### Variable 1: PESAPAL_CONSUMER_KEY
- **Key**: `PESAPAL_CONSUMER_KEY`
- **Value**: `I4m3ACQwFIdJlisR8iU5xePau41ZOd+Y`
- **Scopes**: Select **"All scopes"** (or at least "Production")
- Click **"Save"**

#### Variable 2: PESAPAL_CONSUMER_SECRET
- **Key**: `PESAPAL_CONSUMER_SECRET`
- **Value**: `kpdaPpwTa+aIP7qotWOFF4O3VTE=`
- **Scopes**: Select **"All scopes"** (or at least "Production")
- Click **"Save"**

#### Variable 3: PESAPAL_ENVIRONMENT
- **Key**: `PESAPAL_ENVIRONMENT`
- **Value**: `live`
- **Scopes**: Select **"All scopes"** (or at least "Production")
- Click **"Save"**

#### Variable 4: NEXT_PUBLIC_BASE_URL
- **Key**: `NEXT_PUBLIC_BASE_URL`
- **Value**: `https://lashdiary.co.ke`
- **Scopes**: Select **"All scopes"** (or at least "Production")
- Click **"Save"**

#### Variable 5: PESAPAL_CALLBACK_URL
- **Key**: `PESAPAL_CALLBACK_URL`
- **Value**: `https://lashdiary.co.ke/api/pesapal/callback`
- **Scopes**: Select **"All scopes"** (or at least "Production")
- Click **"Save"**

#### Variable 6: PESAPAL_IPN_URL
- **Key**: `PESAPAL_IPN_URL`
- **Value**: `https://lashdiary.co.ke/api/pesapal/ipn`
- **Scopes**: Select **"All scopes"** (or at least "Production")
- Click **"Save"**

---

## 🔄 Step 4: Redeploy Your Site

After adding all environment variables:

1. Go to **"Deploys"** tab in Netlify
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for the deployment to complete (usually 2-5 minutes)

**OR** if you have auto-deploy enabled:
- Just push a new commit to your repository
- Netlify will automatically redeploy with the new environment variables

---

## ✅ Step 5: Verify It's Working

After redeployment:

1. Visit your site: https://lashdiary.co.ke
2. Try to make a booking or consultation
3. The Pesapal payment should now work!

---

## 📋 Quick Copy-Paste Checklist

Use this checklist to make sure you added everything:

- [ ] `PESAPAL_CONSUMER_KEY` = `I4m3ACQwFIdJlisR8iU5xePau41ZOd+Y`
- [ ] `PESAPAL_CONSUMER_SECRET` = `kpdaPpwTa+aIP7qotWOFF4O3VTE=`
- [ ] `PESAPAL_ENVIRONMENT` = `live`
- [ ] `NEXT_PUBLIC_BASE_URL` = `https://lashdiary.co.ke`
- [ ] `PESAPAL_CALLBACK_URL` = `https://lashdiary.co.ke/api/pesapal/callback`
- [ ] `PESAPAL_IPN_URL` = `https://lashdiary.co.ke/api/pesapal/ipn`
- [ ] Redeployed the site

---

## ⚠️ Important Notes

1. **Environment variables are case-sensitive** - Make sure you type them exactly as shown
2. **No spaces** - Don't add spaces before or after the values
3. **Redeploy required** - After adding variables, you MUST redeploy for them to take effect
4. **Scopes matter** - Make sure to select "Production" scope (or "All scopes") so they work in production

---

## 🆘 If It Still Doesn't Work

1. **Check Netlify logs**:
   - Go to "Deploys" → Click on the latest deploy → Check "Functions" logs
   - Look for any errors related to Pesapal

2. **Verify variables are set**:
   - Go back to "Environment variables"
   - Make sure all 6 variables are listed
   - Check that values are correct (no extra spaces)

3. **Clear cache**:
   - In Netlify, go to "Deploys"
   - Click "Trigger deploy" → "Clear cache and deploy site"

4. **Check Pesapal dashboard**:
   - Verify your Pesapal account is active
   - Make sure you're using the correct credentials for "live" environment

---

## ✅ Once Fixed

After adding the environment variables and redeploying:
- ✅ Pesapal payments will work on bookings
- ✅ Pesapal payments will work on shop purchases
- ✅ Pesapal payments will work on Labs consultations
- ✅ Pesapal payment links will work in invoice emails

**No more "Pesapal API credentials not configured" errors!**

---

**Last Updated**: All Pesapal integration points verified and ready ✅

