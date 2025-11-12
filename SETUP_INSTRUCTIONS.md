# LashDiary - Complete Setup Instructions

## Quick Start Guide

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google Calendar API (Required for Full Functionality)

The booking system will work with email notifications even without Google Calendar, but for automatic calendar integration, follow these steps:

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project"
3. Name it "LashDiary" (or any name you prefer)
4. Click "Create"

#### Step 2: Enable Google Calendar API
1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and click "Enable"

#### Step 3: Create Service Account
1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name it "lashdiary-booking"
4. Click "Create and Continue"
5. Skip optional steps, click "Done"

#### Step 4: Create and Download Key
1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Click "Create" - this downloads a JSON file
6. **Keep this file secure!**

#### Step 5: Share Your Calendar
1. Open [Google Calendar](https://calendar.google.com/)
2. Click the three dots next to your calendar
3. Select "Settings and sharing"
4. Scroll to "Share with specific people"
5. Click "Add people"
6. Enter the service account email (from the JSON file, looks like: `xxxxx@xxxxx.iam.gserviceaccount.com`)
7. Select "Make changes to events" permission
8. Click "Send"

#### Step 6: Get Your Calendar ID
1. In Google Calendar settings, scroll to "Integrate calendar"
2. Copy the "Calendar ID" (usually your email or "primary")

#### Step 7: Create .env.local File
Create a file named `.env.local` in the root of your project with:

```env
# Google Calendar API Credentials (from the downloaded JSON file)
GOOGLE_CLIENT_EMAIL=your-service-account-email@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id

# Your Calendar ID (usually 'primary' or your email)
GOOGLE_CALENDAR_ID=primary

# Your email for receiving bookings
GOOGLE_CALENDAR_EMAIL=hello@lashdiary.co.ke
CALENDAR_EMAIL=hello@lashdiary.co.ke

# Supabase (optional – enables the hosted data layer)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Studio location (used in booking emails & UI)
NEXT_PUBLIC_STUDIO_LOCATION="LashDiary Studio, Nairobi, Kenya"

# Base URL (for production, use your domain)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Important Notes:**
- The `GOOGLE_PRIVATE_KEY` should be wrapped in quotes and include `\n` characters
- Copy the entire private key from the JSON file, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Replace all values with your actual credentials

### 3. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your website.

## How It Works

### With Google Calendar Configured:
- Bookings are automatically added to your Google Calendar
- Both you and the client receive email confirmations
- Booked time slots are automatically hidden from availability

### Without Google Calendar (Fallback Mode):
- Bookings are sent via email notification
- You'll receive an email with booking details
- Client receives a confirmation email
- You'll need to manually add appointments to your calendar

## Email Notifications with Resend

The booking system uses Resend for sending email notifications. Both you and your customers will receive beautifully formatted HTML emails when a booking is made.

### Setting Up Resend

#### Step 1: Create a Resend Account
1. Go to [Resend](https://resend.com)
2. Sign up for a free account (100 emails/day on free tier)
3. Verify your email address

#### Step 2: Get Your API Key
1. Once logged in, go to [API Keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "LashDiary Production")
4. Copy the API key (starts with `re_`)

#### Step 3: Verify Your Domain (Optional but Recommended for Production)
For testing, you can use `onboarding@resend.dev` as the FROM_EMAIL. For production:
1. Go to [Domains](https://resend.com/domains) in Resend dashboard
2. Click "Add Domain"
3. Follow the DNS setup instructions
4. Once verified, you can use emails like `noreply@yourdomain.com`

#### Step 4: Add to .env.local
Add these variables to your `.env.local` file:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=onboarding@resend.dev  # Use your verified domain email in production
```

#### Step 5: Test the Setup
1. Make a test booking on your website
2. Check your email inbox for the booking notification
3. Check the customer's email for the confirmation email

### Email Templates

The system sends two emails:
1. **Customer Confirmation Email**: Sent to the customer with appointment details
2. **Business Owner Notification**: Sent to you with all booking information

Both emails are beautifully formatted with your brand colors (pink and red) and include all appointment details.

## Supabase Data Layer (Production Ready)

By default, the app reads and writes JSON files from the `data/` directory. To enable the hosted, multi-user data layer:

### 1. Provision Supabase Resources
1. Create a Supabase project at [supabase.com](https://supabase.com/)
2. In the SQL editor, run the migration in `supabase/migrations/20251107_create_app_documents_table.sql` (or add it to your Supabase CLI migrations and run `supabase db push`)

This sets up a simple `app_documents` table that stores each JSON document keyed by filename.

### 2. Seed Supabase with Existing Data
1. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are defined in your environment (service role key is required locally; never expose it client-side)
2. Run:

```bash
npm run seed:supabase
```

The script reads every `.json` file in the `data/` folder and upserts it into the `app_documents` table.

### 3. Switch the App to Supabase Mode
Once the environment variables are present (locally or on your host), `lib/data-utils.ts` automatically detects Supabase and will read/write through the hosted table instead of the filesystem. Remove or archive the JSON files after verifying the hosted data works end-to-end.

### 4. Recommended Hardening
- Add row-level security (RLS) policies that match your access model
- Create dedicated service/API keys with limited scopes if exposing Supabase to edge functions or API routes
- Back up the `app_documents` table regularly using Supabase backups or the CLI

## Production Deployment

### For Vercel:
1. Push your code to GitHub
2. Import project to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production:
Make sure to add all variables from `.env.local` to your hosting platform's environment variables section.

## Troubleshooting

### "Google Calendar is not configured" Error
- Check that all environment variables are set in `.env.local`
- Verify the service account email has access to your calendar
- Make sure the private key is correctly formatted with `\n` characters

### Bookings Not Appearing in Calendar
- Check that the service account has "Make changes to events" permission
- Verify the Calendar ID is correct
- Check server logs for error messages

### Email Notifications Not Working
- Check console logs for email content (currently logged)
- Set up an email service (Resend, SendGrid, etc.) for actual sending
- Verify email addresses are correct

## Support

If you need help, check the console logs for detailed error messages. The system is designed to work even without Google Calendar configured, using email notifications as a fallback.

