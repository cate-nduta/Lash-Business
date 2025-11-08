# Admin Settings Guide

## Overview
The Settings page allows you to manage all your business information without editing code or redeploying your website.

## What You Can Edit

### Business Information
- **Business Name**: Your company name (displayed in emails and footer)
- **Phone Number**: Contact number (appears in all email templates)
- **Business Email**: Your primary business email
- **Business Address**: Your location (e.g., "Nairobi, Kenya")
- **Business Description**: Tagline or short description

### Social Media Links
- Instagram
- Facebook  
- TikTok
- Twitter

### Security
- **Change Admin Password**: Update your login password securely

## How to Access

1. Log in to the admin panel at `/admin/login`
2. Click on "Settings" (⚙️) from the dashboard
3. Make your changes
4. Click "Save Changes"

## Important Notes

### Phone Number Updates
When you change your phone number in Settings, it will automatically update in:
- Email marketing campaigns
- Test emails
- Testimonial request emails

### Password Changes
- Minimum 8 characters required
- You'll need to enter your current password to change it
- After changing, you may need to restart the server (if running locally)
- On Vercel, the change takes effect immediately after saving

### What's Still in Environment Variables
These settings require server restart and are managed via `.env.local` or hosting platform:

- `ADMIN_PASSWORD` - Initial admin password
- `CALENDAR_EMAIL` - Business email for Google Calendar
- `RESEND_API_KEY` - Email service API key
- `FROM_EMAIL` - Email sender address
- M-Pesa credentials
- Google Calendar API credentials

## For Deployment (Vercel)

When deploying to Vercel:

1. **Set Environment Variables** in Vercel dashboard:
   - `ADMIN_PASSWORD` - Your admin password
   - `CALENDAR_EMAIL` - Your business email
   - `RESEND_API_KEY` - From resend.com
   - `FROM_EMAIL` - Verified sender email
   - `NEXT_PUBLIC_BASE_URL` - Your website URL
   - M-Pesa variables (if using M-Pesa)
   - Google Calendar variables (if using calendar integration)

2. **After Deployment**:
   - Log in to `/admin/login`
   - Go to Settings
   - Update phone number, address, social links
   - Change password from default

3. **Future Updates**:
   - All Settings page changes apply immediately (no redeploy needed!)
   - Homepage, services, gallery, etc. can all be edited via admin panel
   - You only need to redeploy when:
     - Changing environment variables
     - Adding new features/pages
     - Updating code logic

## Data Storage

Settings are stored in `data/settings.json` and persist across deployments on Vercel's file system during the build. For production with multiple instances, consider using a database.

