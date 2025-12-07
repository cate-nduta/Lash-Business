# Complete Cron Jobs Setup Guide

This guide covers all automated cron jobs that need to be set up for your LashDiary website.

## Overview

Your website has **4 automated cron jobs** that need to be configured:

1. **Appointment Reminders** - Sends reminders 6 hours before appointments (runs hourly)
2. **Birthday Emails** - Sends birthday discount codes to clients (runs daily at 9 AM)
3. **Scheduled Email Processing** - Processes scheduled email campaigns (runs every 15 minutes)
4. **Cleanup Inactive Accounts** - Removes accounts with no bookings after 7 days (runs daily at 2 AM)

---

## Step 1: Choose a Cron Service

Since most hosting platforms (like Netlify) don't have built-in cron jobs, you'll need an external service. We recommend:

### **cron-job.org** (Free & Recommended)
- ✅ Free tier available
- ✅ Easy to use
- ✅ Reliable
- ✅ Supports up to 2 cron jobs on free tier (you may need to upgrade for 4 jobs, or use multiple accounts)

**Alternative Options:**
- **EasyCron** (Free tier available)
- **UptimeRobot** (Free - monitors + cron)
- **Vercel Cron** (if you're using Vercel)

---

## Step 2: Set Up Security (Recommended)

Before setting up cron jobs, add a security secret to prevent unauthorized access:

### 2a. Generate a Secret
Create a random string (you can use a password generator):
```
Example: my-super-secret-cron-key-2024-lashdiary
```

### 2b. Add to Your Hosting Platform
1. Go to your hosting platform's dashboard (Netlify, Vercel, etc.)
2. Navigate to: **Site settings** → **Environment variables**
3. Click **"Add a variable"**
4. Fill in:
   - **Key**: `CRON_SECRET`
   - **Value**: `my-super-secret-cron-key-2024-lashdiary` (use your own secret!)
5. Click **"Save"**
6. **Redeploy your site** (go to Deploys → Trigger deploy → Deploy site)

---

## Step 3: Set Up Each Cron Job

### Cron Job 1: Appointment Reminders

**Purpose**: Sends email reminders 6 hours before appointments

**Setup:**
1. Go to [cron-job.org](https://cron-job.org) and sign up/login
2. Click **"Create cronjob"**
3. Fill in:
   - **Title**: `LashDiary Appointment Reminders`
   - **Address**: `https://YOUR-DOMAIN/api/cron/send-reminders`
     - Replace `YOUR-DOMAIN` with your actual domain (e.g., `lashdiary.co.ke`)
   - **Schedule**: `0 * * * *` (every hour at :00)
   - **Request method**: `GET`
   - **HTTP Headers** (if using security):
     - Header name: `Authorization`
     - Header value: `Bearer YOUR_CRON_SECRET`
4. Click **"Create cronjob"**

**Test**: Visit `https://YOUR-DOMAIN/api/cron/send-reminders` in your browser - you should see a JSON response.

---

### Cron Job 2: Birthday Emails

**Purpose**: Sends birthday discount codes to clients whose birthday is today

**Setup:**
1. In cron-job.org, click **"Create cronjob"**
2. Fill in:
   - **Title**: `LashDiary Birthday Emails`
   - **Address**: `https://YOUR-DOMAIN/api/cron/send-birthday-emails`
   - **Schedule**: `0 9 * * *` (daily at 9:00 AM)
   - **Request method**: `GET`
   - **HTTP Headers** (if using security):
     - Header name: `Authorization`
     - Header value: `Bearer YOUR_CRON_SECRET`
3. Click **"Create cronjob"**

**Test**: Visit `https://YOUR-DOMAIN/api/cron/send-birthday-emails` in your browser.

---

### Cron Job 3: Scheduled Email Processing

**Purpose**: Processes scheduled email campaigns that are due to be sent

**Setup:**
1. In cron-job.org, click **"Create cronjob"**
2. Fill in:
   - **Title**: `LashDiary Scheduled Emails`
   - **Address**: `https://YOUR-DOMAIN/api/cron/process-scheduled-emails`
   - **Schedule**: `*/15 * * * *` (every 15 minutes)
   - **Request method**: `GET`
   - **HTTP Headers** (if using security):
     - Header name: `Authorization`
     - Header value: `Bearer YOUR_CRON_SECRET`
3. Click **"Create cronjob"**

**Test**: Visit `https://YOUR-DOMAIN/api/cron/process-scheduled-emails` in your browser.

---

### Cron Job 4: Cleanup Inactive Accounts

**Purpose**: Removes client accounts that haven't booked within 7 days of signup

**Setup:**
1. In cron-job.org, click **"Create cronjob"**
2. Fill in:
   - **Title**: `LashDiary Cleanup Inactive Accounts`
   - **Address**: `https://YOUR-DOMAIN/api/cron/cleanup-inactive-accounts`
   - **Schedule**: `0 2 * * *` (daily at 2:00 AM)
   - **Request method**: `GET`
   - **HTTP Headers** (if using security):
     - Header name: `Authorization`
     - Header value: `Bearer YOUR_CRON_SECRET`
3. Click **"Create cronjob"**

**Test**: Visit `https://YOUR-DOMAIN/api/cron/cleanup-inactive-accounts` in your browser.

---

## Step 4: Verify All Cron Jobs

After creating all cron jobs:

1. **Test each endpoint manually** by visiting the URLs in your browser
2. **Check execution history** in cron-job.org to see if they're running
3. **Monitor the first few runs** to ensure they're working correctly

### Expected Responses

**Appointment Reminders:**
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

**Birthday Emails:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T09:00:00.000Z",
  "sent": 0,
  "failed": 0,
  "message": "Birthday email check completed. 0 email(s) sent, 0 failed."
}
```

**Scheduled Emails:**
```json
{
  "processed": 0,
  "message": "No scheduled emails ready to send."
}
```

**Cleanup:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T02:00:00.000Z",
  "deletedCount": 0,
  "message": "Cleanup completed. 0 inactive account(s) deleted."
}
```

---

## Cron Schedule Summary

| Cron Job | Schedule | Frequency | Cron Expression |
|----------|----------|-----------|-----------------|
| Appointment Reminders | Every hour | Hourly | `0 * * * *` |
| Birthday Emails | 9:00 AM | Daily | `0 9 * * *` |
| Scheduled Emails | Every 15 minutes | Every 15 min | `*/15 * * * *` |
| Cleanup Inactive | 2:00 AM | Daily | `0 2 * * *` |

---

## Troubleshooting

### ❌ Error: "404 Not Found"
**Problem**: The URL is wrong
**Solution**: 
- Double-check your domain
- Make sure you included the full path (e.g., `/api/cron/send-reminders`)
- Make sure you included `https://` at the beginning

### ❌ Error: "401 Unauthorized"
**Problem**: Security secret mismatch
**Solution**:
- Make sure `CRON_SECRET` is set in your hosting platform's environment variables
- Make sure the Authorization header in cron-job.org matches exactly
- Make sure you redeployed after adding the environment variable

### ❌ Error: "500 Internal Server Error"
**Problem**: Server-side issue
**Solution**:
- Check your hosting platform's function logs
- Make sure Google Calendar API credentials are set up (for reminders)
- Make sure email (Zoho SMTP) credentials are configured
- Check that all required environment variables are set

### ❌ Cron Job Not Running
**Problem**: Schedule not set correctly or not activated
**Solution**:
- Make sure "Activated" is ON in cron-job.org
- Double-check the cron expression
- Check "Execution history" to see if it's actually running
- Verify the timezone settings

### ✅ Success but No Results
**This is normal!** It means:
- The cron job is working correctly
- There are just no items to process right now
- When there are items to process, they will be handled automatically

---

## What Happens After Setup?

Once all cron jobs are configured:

- ✅ **Appointment reminders** will be sent automatically 6 hours before appointments
- ✅ **Birthday emails** will be sent daily to clients whose birthday is today
- ✅ **Scheduled email campaigns** will be sent automatically when their send time arrives
- ✅ **Inactive accounts** will be cleaned up automatically to keep your database tidy
- ✅ You don't need to do anything else - everything runs automatically!

---

## Need Help?

If you're stuck:
1. Check the troubleshooting section above
2. Test each endpoint manually in your browser
3. Check your hosting platform's function logs for errors
4. Make sure all environment variables are set correctly
5. Verify that email and calendar services are configured

---

## Quick Reference: All Cron Endpoints

- **Appointment Reminders**: `https://YOUR-DOMAIN/api/cron/send-reminders`
- **Birthday Emails**: `https://YOUR-DOMAIN/api/cron/send-birthday-emails`
- **Scheduled Emails**: `https://YOUR-DOMAIN/api/cron/process-scheduled-emails`
- **Cleanup Inactive**: `https://YOUR-DOMAIN/api/cron/cleanup-inactive-accounts`

Replace `YOUR-DOMAIN` with your actual domain (e.g., `lashdiary.co.ke`).

