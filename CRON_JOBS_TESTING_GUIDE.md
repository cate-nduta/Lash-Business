# Cron Jobs Testing Guide

This guide will help you verify that all your cron jobs are working correctly.

---

## ✅ Quick Test: Manual URL Testing

You can test each cron job endpoint directly in your browser. Open each URL below:

### 1. Appointment Reminders
**URL**: `https://lashdiary.co.ke/api/cron/send-reminders`

**Expected Response** (if working):
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

**What it means**:
- ✅ `success: true` = Endpoint is working
- `checked: 0` = No appointments found 6 hours from now (normal if you don't have appointments)
- `sent: 0` = No reminders sent (normal if no appointments match)

---

### 2. Birthday Emails
**URL**: `https://lashdiary.co.ke/api/cron/send-birthday-emails`

**Expected Response** (if working):
```json
{
  "success": true,
  "timestamp": "2024-01-15T09:00:00.000Z",
  "sent": 0,
  "failed": 0,
  "message": "Birthday email check completed. 0 email(s) sent, 0 failed."
}
```

**What it means**:
- ✅ `success: true` = Endpoint is working
- `sent: 0` = No birthdays today (normal unless it's someone's birthday)
- If someone has a birthday today, you'll see `sent: 1` or more

---

### 3. Scheduled Email Processing
**URL**: `https://lashdiary.co.ke/api/cron/process-scheduled-emails`

**Expected Response** (if working):
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:00:00.000Z",
  "processed": 0,
  "totalSent": 0,
  "totalErrors": 0,
  "message": "Processed 0 scheduled email(s). 0 email(s) sent, 0 error(s)."
}
```

**What it means**:
- ✅ `success: true` = Endpoint is working
- `processed: 0` = No scheduled emails ready to send (normal if you haven't scheduled any)

---

### 4. Cleanup Inactive Accounts
**URL**: `https://lashdiary.co.ke/api/cron/cleanup-inactive-accounts`

**Expected Response** (if working):
```json
{
  "success": true,
  "timestamp": "2024-01-15T02:00:00.000Z",
  "deletedCount": 0,
  "totalUsers": 10,
  "remainingUsers": 10,
  "message": "Cleanup completed. 0 inactive account(s) deleted."
}
```

**What it means**:
- ✅ `success: true` = Endpoint is working
- `deletedCount: 0` = No inactive accounts found (normal if all accounts have bookings)

---

## 🔍 How to Check if Cron Jobs Are Actually Running

### Method 1: Check cron-job.org Execution History

1. Go to [cron-job.org](https://cron-job.org)
2. Log in to your account
3. Click on each cron job
4. Click **"Execution history"** or **"Logs"**
5. Check the latest executions:
   - ✅ **Green/200 status** = Working correctly
   - ❌ **Red/Error status** = Something went wrong

**What to look for**:
- Status code should be `200` (success)
- Response should show `"success": true`
- Check the timestamp to confirm it's running on schedule

---

### Method 2: Check Your Hosting Platform Logs

#### For Netlify:
1. Go to your [Netlify Dashboard](https://app.netlify.com)
2. Click on your site
3. Go to **Functions** → **Logs**
4. Look for log entries with:
   - `[Reminder Cron]` - Appointment reminders
   - `[Birthday Cron]` - Birthday emails
   - `[Scheduled Email Cron]` - Scheduled emails
   - `[Cleanup Cron]` - Account cleanup

#### For Vercel:
1. Go to your [Vercel Dashboard](https://vercel.com)
2. Click on your project
3. Go to **Functions** → **Logs**
4. Filter by function name or search for cron-related logs

---

### Method 3: Test with Real Data

#### Test Appointment Reminders:
1. Create a test booking for **6 hours from now**
2. Wait for the next hourly cron run (or trigger it manually)
3. Check if the client received a reminder email

#### Test Birthday Emails:
1. Add a test user with today's date as their birthday
2. Wait for the 9 AM cron run (or trigger it manually)
3. Check if they received a birthday email with discount code

#### Test Scheduled Emails:
1. Go to Admin → Email Marketing
2. Create a scheduled email for **5 minutes from now**
3. Wait for the next 15-minute cron run
4. Check if the email was sent

#### Test Cleanup:
1. Create a test account (or identify an old account with no bookings)
2. Wait for the 2 AM cron run (or trigger it manually)
3. Check if the account was removed

---

## 🚨 Common Issues and Solutions

### Issue: "401 Unauthorized"
**Problem**: CRON_SECRET mismatch
**Solution**:
1. Check that `CRON_SECRET` is set in your hosting platform's environment variables
2. Verify the Authorization header in cron-job.org matches exactly: `Bearer YOUR_SECRET`
3. Make sure you redeployed after adding the environment variable

### Issue: "500 Internal Server Error"
**Problem**: Server-side error
**Solution**:
1. Check your hosting platform's function logs
2. Verify all required environment variables are set:
   - `ZOHO_SMTP_USER` and `ZOHO_SMTP_PASS` (for email jobs)
   - `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_PROJECT_ID` (for reminders)
3. Check that email service is configured correctly

### Issue: Cron Job Not Running
**Problem**: Schedule not set correctly
**Solution**:
1. Verify "Activated" is ON in cron-job.org
2. Double-check the cron expression:
   - Reminders: `0 * * * *` (every hour)
   - Birthday: `0 9 * * *` (daily at 9 AM)
   - Scheduled: `*/15 * * * *` (every 15 minutes)
   - Cleanup: `0 2 * * *` (daily at 2 AM)
3. Check timezone settings in cron-job.org

### Issue: "Success but No Results"
**This is normal!** It means:
- ✅ The cron job is working correctly
- ✅ There's just nothing to process right now
- ✅ When there are items to process, they will be handled automatically

---

## 📊 Monitoring Your Cron Jobs

### Daily Checks (First Week):
- ✅ Check execution history in cron-job.org
- ✅ Verify status codes are 200
- ✅ Check for any error messages

### Weekly Checks:
- ✅ Review logs for any recurring errors
- ✅ Verify emails are being sent (check spam folders)
- ✅ Confirm reminders are working (ask a client)

### Monthly Checks:
- ✅ Review cleanup job results
- ✅ Check birthday email delivery
- ✅ Verify scheduled campaigns are sending

---

## ✅ Success Indicators

Your cron jobs are working correctly if:

1. ✅ **All endpoints return 200 status** when tested manually
2. ✅ **Execution history shows successful runs** in cron-job.org
3. ✅ **No error messages** in logs
4. ✅ **Emails are being sent** when conditions are met (reminders, birthdays, scheduled)
5. ✅ **Accounts are being cleaned up** when appropriate

---

## 🎯 Quick Verification Checklist

- [ ] Appointment Reminders endpoint returns `success: true`
- [ ] Birthday Emails endpoint returns `success: true`
- [ ] Scheduled Emails endpoint returns `success: true`
- [ ] Cleanup endpoint returns `success: true`
- [ ] All cron jobs show in execution history
- [ ] All executions show status 200
- [ ] No error messages in logs
- [ ] CRON_SECRET is configured (if using security)

---

## 💡 Pro Tips

1. **Test during off-peak hours** to avoid affecting real users
2. **Keep execution history** - cron-job.org stores it for you
3. **Set up email notifications** in cron-job.org to alert you of failures
4. **Monitor logs regularly** especially in the first few weeks
5. **Test with real data** occasionally to ensure everything works end-to-end

---

## Need Help?

If you're seeing errors:
1. Check the troubleshooting section above
2. Review your hosting platform's logs
3. Verify all environment variables are set
4. Test each endpoint manually in your browser
5. Check cron-job.org execution history for detailed error messages

---

**Remember**: A `success: true` response with `0` results is **normal** - it just means there's nothing to process right now. The important thing is that the endpoint is accessible and responding correctly!

