# Fix: Credentials Mismatch Issue

## Current Situation

You're getting "Invalid Access Token" because:
- You're using: `PESAPAL_ENVIRONMENT=sandbox`
- But your credentials are likely: **LIVE credentials**

## What I Just Did

I changed your `.env.local` to use `live` environment to test if your credentials are actually live credentials.

## Next Steps

### Step 1: Restart Your Dev Server

**CRITICAL**: You MUST restart the server after this change!

```bash
# Stop server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 2: Test Again

Visit: `http://localhost:3000/api/pesapal/test-credentials`

**If it works now:**
- ✅ Your credentials are **LIVE credentials**
- ✅ Use `PESAPAL_ENVIRONMENT=live` for production
- ⚠️ **WARNING**: Live processes REAL payments!

**If it still fails:**
- Your credentials might be wrong
- Or there's another issue

## Understanding Your Credentials

### How to Know Which Credentials You Have

1. **Log in to Pesapal Dashboard**: https://www.pesapal.com
2. **Go to API Credentials** section
3. **You'll see TWO sets of credentials**:
   - **Sandbox/Test** credentials (for testing)
   - **Live/Production** credentials (for real payments)

### Your Current Credentials

Based on the error, you likely have **LIVE credentials** but were trying to use them with sandbox.

## Solution Options

### Option 1: Use Live Environment (If You Have Live Credentials)

If the test works with `live`, keep it:

```env
PESAPAL_CONSUMER_KEY=your_current_key
PESAPAL_CONSUMER_SECRET=your_current_secret
PESAPAL_ENVIRONMENT=live
```

⚠️ **Important**: 
- Live environment processes **REAL payments**
- Only use for production
- Test carefully before going live

### Option 2: Get Sandbox Credentials (For Testing)

If you want to test safely:

1. **Log in to Pesapal Dashboard**
2. **Go to API Credentials**
3. **Find "Sandbox" or "Test" credentials**
4. **Copy them and update `.env.local`**:
   ```env
   PESAPAL_CONSUMER_KEY=sandbox_key_here
   PESAPAL_CONSUMER_SECRET=sandbox_secret_here
   PESAPAL_ENVIRONMENT=sandbox
   ```
5. **Restart dev server**

## Recommended Setup

### For Development (Testing):
```env
PESAPAL_CONSUMER_KEY=sandbox_key
PESAPAL_CONSUMER_SECRET=sandbox_secret
PESAPAL_ENVIRONMENT=sandbox
```

### For Production (Real Payments):
```env
PESAPAL_CONSUMER_KEY=live_key
PESAPAL_CONSUMER_SECRET=live_secret
PESAPAL_ENVIRONMENT=live
```

## What to Do Now

1. ✅ **Restart your dev server** (I changed it to `live`)
2. ✅ **Test**: `http://localhost:3000/api/pesapal/test-credentials`
3. ✅ **If it works**: Your credentials are live - keep using `live` environment
4. ✅ **If you want to test safely**: Get sandbox credentials from Pesapal dashboard

## Still Not Working?

If it still fails even with `live`:

1. **Double-check credentials** in Pesapal dashboard
2. **Make sure no extra spaces** in `.env.local`
3. **Verify credentials are correct** - click "RESEND" in Pesapal if needed
4. **Contact Pesapal support** if credentials are definitely correct

