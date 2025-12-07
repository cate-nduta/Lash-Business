# Birthday Email Cron Job Setup Guide

This guide will help you set up an automated daily cron job to send birthday discount emails to your clients.

## What It Does

The cron job will automatically:
- Check for clients whose birthday is today
- Generate a unique 12% discount code for each client
- Send a beautiful birthday email with the discount code
- Make the discount code valid for 7 days

## Setup Options

### Option 1: Using Netlify Cron Jobs (Recommended for Netlify Hosting)

If your site is hosted on Netlify, you can use their built-in cron job feature:

1. **Add to `netlify.toml`** (in your project root):

```toml
[[plugins]]
  package = "@netlify/plugin-nextjs"

[[cron]]
  path = "/api/admin/birthday/send"
  schedule = "0 9 * * *"  # Runs daily at 9:00 AM UTC
```

2. **Set Environment Variable**:
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add: `CRON_SECRET` = `your-secret-token-here` (use a strong random string)

3. **Update the API endpoint** to use the secret:
   The endpoint already supports this - just make sure `CRON_SECRET` is set in your environment variables.

### Option 2: Using External Cron Service (cron-job.org, EasyCron, etc.)

1. **Sign up for a cron service** like:
   - [cron-job.org](https://cron-job.org) (free)
   - [EasyCron](https://www.easycron.com) (free tier available)
   - [Cronitor](https://cronitor.io) (free tier available)

2. **Create a new cron job**:
   - **URL**: `https://yourdomain.com/api/admin/birthday/send`
   - **Method**: POST
   - **Schedule**: Daily at your preferred time (e.g., 9:00 AM)
   - **Headers**: 
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```

3. **Set Environment Variable**:
   - In your hosting platform, add: `CRON_SECRET` = `your-secret-token-here`

### Option 3: Using Vercel Cron Jobs (If Hosted on Vercel)

1. **Create `vercel.json`** in your project root:

```json
{
  "crons": [
    {
      "path": "/api/admin/birthday/send",
      "schedule": "0 9 * * *"
    }
  ]
}
```

2. **Set Environment Variable**:
   - In Vercel Dashboard → Settings → Environment Variables
   - Add: `CRON_SECRET` = `your-secret-token-here`

### Option 4: Manual Setup (Server with Cron Access)

If you have SSH access to your server:

1. **Create a script** (`send-birthday-emails.sh`):

```bash
#!/bin/bash
curl -X POST https://yourdomain.com/api/admin/birthday/send \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

2. **Make it executable**:
```bash
chmod +x send-birthday-emails.sh
```

3. **Add to crontab**:
```bash
crontab -e
```

Add this line (runs daily at 9:00 AM):
```
0 9 * * * /path/to/send-birthday-emails.sh
```

## Security

**Important**: Always use a strong `CRON_SECRET` token to prevent unauthorized access to the birthday email endpoint.

Generate a secure token:
```bash
# On Linux/Mac
openssl rand -hex 32

# Or use an online generator
```

## Testing

You can test the cron job manually:

1. **Via Admin Panel**:
   - Go to `/admin/clients`
   - Click "Send Birthday Emails" button

2. **Via API** (with admin authentication):
   ```bash
   curl -X POST https://yourdomain.com/api/admin/birthday/send \
     -H "Cookie: admin-auth=authenticated; admin-user-id=your-user-id"
   ```

3. **Via API** (with cron secret):
   ```bash
   curl -X POST https://yourdomain.com/api/admin/birthday/send \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

## Monitoring

The API returns:
```json
{
  "success": true,
  "sent": 5,
  "failed": 0,
  "results": [
    { "email": "client@example.com", "success": true },
    ...
  ]
}
```

Check your cron service logs or set up monitoring to ensure emails are being sent successfully.

## Troubleshooting

1. **No emails sent**: 
   - Check that `RESEND_API_KEY` is set in environment variables
   - Verify clients have birthdays set in their profiles
   - Check that today matches a client's birthday (month + day)

2. **Unauthorized errors**:
   - Verify `CRON_SECRET` matches in both environment and cron job headers
   - Or use admin authentication cookies

3. **Promo codes not working**:
   - Check that promo codes are being saved to `promo-codes.json`
   - Verify the discount code format matches your system

## Schedule Recommendations

- **Best time**: 9:00 AM - 10:00 AM (clients check email in the morning)
- **Timezone**: Consider your local timezone vs UTC
- **Frequency**: Daily (the system only sends to clients whose birthday is today)

