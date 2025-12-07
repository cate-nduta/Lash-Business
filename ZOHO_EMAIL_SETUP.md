# Zoho Email Configuration Setup Guide

This guide will help you configure Zoho SMTP for sending emails from your LashDiary system.

## Prerequisites

1. A Zoho Mail account (you can sign up at [zoho.com/mail](https://www.zoho.com/mail/))
2. Access to your Zoho account settings to generate an App Password

## Step-by-Step Setup

### Step 1: Create a Zoho Mail Account (if you don't have one)

1. Go to [zoho.com/mail](https://www.zoho.com/mail/)
2. Sign up for a free account or use an existing account
3. Verify your email address

### Step 2: Generate an App Password

1. Log in to your Zoho account
2. Go to [Zoho Account Security](https://accounts.zoho.com/home#security)
3. Navigate to "App Passwords" or "Two-Factor Authentication" section
4. Click on "Generate New Password" or "App Passwords"
5. Give it a name (e.g., "LashDiary Email Service")
6. Copy the generated password (you'll only see it once!)

**Important:** 
- This is NOT your regular Zoho account password
- You need to generate a specific App Password for SMTP
- The password will look like a random string of characters

### Step 3: Configure Environment Variables

Create or update your `.env.local` file in the root of your project with the following variables:

```env
# Zoho SMTP Configuration (REQUIRED)
ZOHO_SMTP_USER=your-email@zoho.com
ZOHO_SMTP_PASS=your-app-password-here
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=465

# Optional: Custom from email (defaults to ZOHO_SMTP_USER)
ZOHO_FROM_EMAIL=your-email@zoho.com

# Optional: Custom from name (defaults to "LashDiary")
EMAIL_FROM_NAME=LashDiary

# Business notification email (where booking notifications are sent)
BUSINESS_NOTIFICATION_EMAIL=hello@lashdiary.co.ke
```

### Step 4: Verify Configuration

After setting up your environment variables:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Check the console output - you should see:
   ```
   ✅ Zoho SMTP configuration is valid
   ```

3. Test the configuration by making a test booking or using the admin check endpoint:
   ```
   GET /api/admin/email/check-config
   ```

## Configuration Details

### SMTP Settings

- **Host:** `smtp.zoho.com`
- **Port:** `465` (SSL) or `587` (TLS)
- **Security:** SSL/TLS encryption
- **Authentication:** Required (uses App Password)

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ZOHO_SMTP_USER` | ✅ Yes | Your Zoho email address | `hello@zoho.com` |
| `ZOHO_SMTP_PASS` | ✅ Yes | App Password (not regular password) | `AbCd1234EfGh5678` |
| `ZOHO_SMTP_HOST` | No | SMTP server (default: `smtp.zoho.com`) | `smtp.zoho.com` |
| `ZOHO_SMTP_PORT` | No | SMTP port (default: `465`) | `465` or `587` |
| `ZOHO_FROM_EMAIL` | No | From email address | `noreply@zoho.com` |
| `EMAIL_FROM_NAME` | No | Display name for emails | `LashDiary` |
| `BUSINESS_NOTIFICATION_EMAIL` | No | Where booking notifications go | `hello@lashdiary.co.ke` |

### Alternative Variable Names

The system also accepts these alternative variable names for flexibility:

- `ZOHO_SMTP_USERNAME` (instead of `ZOHO_SMTP_USER`)
- `ZOHO_USERNAME` (instead of `ZOHO_SMTP_USER`)
- `ZOHO_SMTP_PASSWORD` (instead of `ZOHO_SMTP_PASS`)
- `ZOHO_APP_PASSWORD` (instead of `ZOHO_SMTP_PASS`)
- `ZOHO_FROM` (instead of `ZOHO_FROM_EMAIL`)

## Troubleshooting

### "Email service not configured" Error

**Problem:** You're seeing errors that Zoho SMTP is not configured.

**Solution:**
1. Check that `ZOHO_SMTP_USER` and `ZOHO_SMTP_PASS` are set in your `.env.local` file
2. Make sure you're using an App Password, not your regular Zoho password
3. Restart your development server after changing environment variables
4. Verify the variables are loaded: check console for configuration status

### "Authentication failed" Error

**Problem:** Emails fail with authentication errors.

**Solution:**
1. Verify you're using an App Password, not your account password
2. Make sure the App Password was generated correctly
3. Check that `ZOHO_SMTP_USER` matches the email associated with the App Password
4. Try regenerating the App Password

### "Connection timeout" Error

**Problem:** Cannot connect to Zoho SMTP server.

**Solution:**
1. Check your internet connection
2. Verify `ZOHO_SMTP_HOST` is set to `smtp.zoho.com`
3. Try using port `587` instead of `465` (update `ZOHO_SMTP_PORT=587`)
4. Check if your firewall or network is blocking SMTP connections

### Emails Not Being Received

**Problem:** System says emails are sent but they're not received.

**Solution:**
1. Check spam/junk folders
2. Verify recipient email addresses are correct
3. Check Zoho account for any sending limits or restrictions
4. Review server logs for detailed error messages
5. Test with a different email address

### Configuration Check Endpoint

You can check your configuration status programmatically:

```bash
# In development
curl http://localhost:3000/api/admin/email/check-config

# Response will show:
# - configured: true/false
# - connectionVerified: true/false
# - errors: array of configuration errors
# - warnings: array of warnings
# - info: configuration details
```

## Email Types Sent by the System

The system sends the following types of emails via Zoho:

1. **Booking Confirmations** - Sent to customers when they book an appointment
2. **Owner Notifications** - Sent to business owner when a booking is made
3. **Appointment Reminders** - Sent to customers before their appointment
4. **Aftercare Instructions** - Sent after appointments
5. **Verification Codes** - For account verification
6. **Password Reset** - For password recovery
7. **Admin Invites** - For inviting admin users
8. **Email Marketing** - Campaign emails
9. **Birthday Emails** - Automated birthday messages
10. **Survey Invitations** - For collecting feedback
11. **Promo Code Notifications** - For promotions and referrals
12. **Gift Card Confirmations** - For gift card purchases

## Best Practices

1. **Use App Passwords:** Always use App Passwords, never your regular account password
2. **Keep Passwords Secure:** Never commit `.env.local` to version control
3. **Monitor Sending Limits:** Zoho has daily sending limits based on your plan
4. **Test Regularly:** Use the check-config endpoint to verify configuration
5. **Use Custom Domain:** For production, consider using a custom domain email
6. **Monitor Logs:** Check server logs for email sending issues

## Production Deployment

When deploying to production (e.g., Netlify, Vercel):

1. Add all environment variables to your hosting platform's environment settings
2. Use the same variable names as in `.env.local`
3. Never expose App Passwords in client-side code
4. Consider using environment-specific configurations

### Netlify Example

1. Go to Site settings → Environment variables
2. Add each variable:
   - `ZOHO_SMTP_USER`
   - `ZOHO_SMTP_PASS`
   - `ZOHO_SMTP_HOST`
   - `ZOHO_SMTP_PORT`
   - etc.

### Vercel Example

1. Go to Project settings → Environment Variables
2. Add variables for Production, Preview, and Development
3. Use the same variable names

## Support

If you continue to experience issues:

1. Check the server logs for detailed error messages
2. Verify your Zoho account status and limits
3. Test the configuration using the check-config endpoint
4. Review Zoho's SMTP documentation: [Zoho Mail SMTP Settings](https://www.zoho.com/mail/help/zoho-mail-smtp-configuration.html)

## Quick Test

After configuration, test by making a booking on your website. You should receive:
- A confirmation email at the customer's email address
- A notification email at `BUSINESS_NOTIFICATION_EMAIL`

If both emails are received successfully, your Zoho configuration is working correctly! ✅

