# Step-by-Step Cron Job Setup for Netlify

Follow these steps exactly to set up your appointment reminder system.

## Step 1: Find Your Netlify Domain

You need your website's URL. It will be one of these formats:
- `https://your-site-name.netlify.app` (default Netlify domain)
- `https://lashdiary.co.ke` (custom domain, if you have one)

**To find it:**
1. Go to your [Netlify Dashboard](https://app.netlify.com)
2. Click on your site
3. Look at the top - you'll see your site URL
4. **Copy the full URL** (including `https://`)

**Example URLs:**
- `https://lashdiary.netlify.app`
- `https://lashdiary.co.ke`

---

## Step 2: Sign Up for cron-job.org

1. **Go to**: [https://cron-job.org](https://cron-job.org)
2. **Click** the "Sign up" button (top right)
3. **Fill in**:
   - Email address
   - Password
   - Confirm password
4. **Click** "Create account"
5. **Check your email** and verify your account (click the verification link)

---

## Step 3: Create the Cron Job

1. **After logging in**, you'll see the dashboard
2. **Click** the big green button: **"Create cronjob"** (or click "Cronjobs" in the menu, then "Create cronjob")

3. **Fill in the form**:

   **Title:**
   ```
   LashDiary Appointment Reminders
   ```

   **Address (URL):**
   ```
   https://YOUR-DOMAIN-HERE/api/cron/send-reminders
   ```
   
   ⚠️ **IMPORTANT**: Replace `YOUR-DOMAIN-HERE` with your actual Netlify domain!
   
   **Examples:**
   - If your site is `https://lashdiary.netlify.app`, use: `https://lashdiary.netlify.app/api/cron/send-reminders`
   - If your site is `https://lashdiary.co.ke`, use: `https://lashdiary.co.ke/api/cron/send-reminders`

   **Schedule:**
   - Click the dropdown
   - Select **"Hourly"** (or manually enter: `0 * * * *`)
   - This means it runs every hour at the top of the hour (12:00, 1:00, 2:00, etc.)

   **Request method:**
   - Select **"GET"** from the dropdown

   **Activated:**
   - Make sure the toggle/checkbox is **ON** (green/checked)

4. **Click** the **"Create cronjob"** button at the bottom

---

## Step 4: Test It Immediately

1. **After creating**, you'll see your cron job in the list
2. **Click** on the cron job you just created
3. **Click** the **"Run now"** button (or "Execute now")
4. **Wait a few seconds**, then click **"Execution history"** or refresh the page
5. **Check the result**:
   - ✅ **Green/Success**: It worked! You should see a status code like `200`
   - ❌ **Red/Error**: Something went wrong (see troubleshooting below)

---

## Step 5: Verify It's Working

### Option A: Check the Response
1. In cron-job.org, click on your cron job
2. Click "Execution history"
3. Click on the latest execution
4. You should see a response like:
   ```json
   {
     "success": true,
     "timestamp": "2024-01-15T10:00:00.000Z",
     "checked": 0,
     "sent": 0,
     "skipped": 0,
     "errors": 0
   }
   ```
   - `checked: 0` means no appointments were found (this is normal if you don't have appointments 12 hours away right now)
   - `success: true` means the endpoint is working!

### Option B: Test in Browser
1. Open a new browser tab
2. Go to: `https://YOUR-DOMAIN-HERE/api/cron/send-reminders`
3. You should see the same JSON response
4. If you see an error, check the troubleshooting section

---

## Step 6: (Optional) Add Security

To prevent unauthorized access, add a secret:

### 6a. Generate a Secret
Create a random string (you can use a password generator):
```
Example: my-super-secret-reminder-key-2024
```

### 6b. Add to Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click on your site
3. Go to: **Site settings** → **Environment variables** (in the left menu)
4. Click **"Add a variable"**
5. Fill in:
   - **Key**: `CRON_SECRET`
   - **Value**: `my-super-secret-reminder-key-2024` (use your own secret!)
6. Click **"Save"**
7. **Redeploy your site** (go to Deploys → Trigger deploy → Deploy site)

### 6c. Update Cron Job
1. Go back to cron-job.org
2. Click on your cron job
3. Click **"Edit"**
4. Scroll down to **"HTTP headers"** section
5. Click **"Add header"**
6. Fill in:
   - **Header name**: `Authorization`
   - **Header value**: `Bearer my-super-secret-reminder-key-2024` (use the same secret!)
7. Click **"Save"**

---

## Troubleshooting

### ❌ Error: "404 Not Found"
**Problem**: The URL is wrong
**Solution**: 
- Double-check your Netlify domain
- Make sure you included `/api/cron/send-reminders` at the end
- Make sure you included `https://` at the beginning

### ❌ Error: "401 Unauthorized"
**Problem**: Security secret mismatch
**Solution**:
- Make sure `CRON_SECRET` is set in Netlify environment variables
- Make sure the Authorization header in cron-job.org matches exactly
- Make sure you redeployed after adding the environment variable

### ❌ Error: "500 Internal Server Error"
**Problem**: Server-side issue
**Solution**:
- Check Netlify function logs (Site → Functions → Logs)
- Make sure Google Calendar API credentials are set up
- Make sure email (Zoho SMTP) credentials are configured

### ❌ Cron Job Not Running
**Problem**: Schedule not set correctly
**Solution**:
- Make sure "Activated" is ON
- Make sure schedule is set to "Hourly" or `0 * * * *`
- Check "Execution history" to see if it's actually running

### ✅ Success but "checked: 0"
**This is normal!** It means:
- The cron job is working correctly
- There are just no appointments exactly 12 hours away right now
- When you have an appointment 12 hours in the future, it will send the reminder automatically

---

## What Happens Next?

Once set up:
- ✅ The cron job runs **every hour automatically**
- ✅ It checks for appointments **12 hours in the future**
- ✅ It sends reminder emails **automatically**
- ✅ It tracks what's been sent (no duplicates)
- ✅ You don't need to do anything else!

The system will automatically send reminders like:
> **Subject**: Reminder: Your appointment is at 2:00 PM 🤎

---

## Need Help?

If you're stuck:
1. Check the troubleshooting section above
2. Test the endpoint manually in your browser
3. Check Netlify function logs for errors
4. Make sure all environment variables are set correctly


















