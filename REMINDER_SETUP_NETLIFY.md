# Appointment Reminder Setup for Netlify

This guide will help you set up automatic email reminders that are sent 12 hours before each appointment.

## Quick Setup (5 minutes)

### Step 1: Choose a Cron Service

Since Netlify doesn't have built-in cron jobs, you'll use an external service. We recommend **cron-job.org** (free and easy).

### Step 2: Set Up cron-job.org

1. **Create Account**
   - Go to [https://cron-job.org](https://cron-job.org)
   - Click "Sign up" and create a free account
   - Verify your email

2. **Create Cron Job**
   - Click the **"Create cronjob"** button
   - Fill in the details:
     - **Title**: `LashDiary Appointment Reminders`
     - **Address**: `https://yourdomain.com/api/cron/send-reminders`
       - Replace `yourdomain.com` with your actual Netlify domain
     - **Schedule**: Select **"Hourly"** or enter cron expression: `0 * * * *`
     - **Request method**: `GET`
   - Click **"Create cronjob"**

3. **Test It**
   - Click the "Run now" button to test
   - Check the logs to see if it worked
   - You should see a success message

### Step 3: (Optional) Add Security

To prevent unauthorized access to your cron endpoint:

1. **Generate a Secret**
   - Create a random string (e.g., use a password generator)
   - Example: `my-super-secret-cron-key-2024`

2. **Add to Netlify Environment Variables**
   - Go to your Netlify dashboard
   - Navigate to: **Site settings** → **Environment variables**
   - Click **"Add a variable"**
   - Key: `CRON_SECRET`
   - Value: `my-super-secret-cron-key-2024` (your secret)
   - Click **"Save"**

3. **Update Cron Job**
   - Go back to cron-job.org
   - Edit your cron job
   - Add a header:
     - **Header name**: `Authorization`
     - **Header value**: `Bearer my-super-secret-cron-key-2024`
   - Save the changes

## How It Works

- The cron job runs **every hour**
- It checks for appointments that are **12 hours away**
- It sends reminder emails automatically
- It tracks which reminders have been sent (no duplicates)
- The email subject includes the appointment time: "Reminder: Your appointment is at 2:00 PM 🤎"

## Testing

### Manual Test
Visit this URL in your browser:
```
https://yourdomain.com/api/cron/send-reminders
```

You should see a JSON response like:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:00:00.000Z",
  "checked": 5,
  "sent": 2,
  "skipped": 3,
  "errors": 0
}
```

### Check Logs
- In cron-job.org: Click on your cron job → "Execution history"
- In Netlify: Go to **Functions** → **Logs** to see server-side logs

## Troubleshooting

### "Unauthorized" Error
- Make sure `CRON_SECRET` is set in Netlify environment variables
- Make sure the Authorization header matches exactly: `Bearer YOUR_SECRET`

### No Reminders Being Sent
- Check that you have appointments in Google Calendar
- Verify the appointments are exactly 12 hours in the future
- Check Netlify function logs for errors
- Make sure email credentials (Zoho SMTP) are configured

### Cron Job Not Running
- Verify the cron job is active in cron-job.org
- Check the schedule is set to hourly
- Make sure the URL is correct (use your actual Netlify domain)

## Alternative Services

If cron-job.org doesn't work for you, try:

- **EasyCron**: [https://www.easycron.com](https://www.easycron.com)
- **UptimeRobot**: [https://uptimerobot.com](https://uptimerobot.com)
- **Cronitor**: [https://cronitor.io](https://cronitor.io)

All of these services have free tiers that work perfectly for this use case.

## Need Help?

If you encounter any issues:
1. Check the Netlify function logs
2. Test the endpoint manually in your browser
3. Verify all environment variables are set correctly
4. Make sure Google Calendar API credentials are configured










