# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration for your booking system.

## Prerequisites

1. A Google account (catherinenkuria@gmail.com)
2. Node.js installed on your system
3. Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Thee Lash Bar Booking")
5. Click "Create"

### 2. Enable Google Calendar API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and click "Enable"

### 3. Create a Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Enter a name (e.g., "booking-service")
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

### 4. Create and Download Service Account Key

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Click "Create" - this will download a JSON file
6. **Keep this file secure - do not commit it to git!**

### 5. Share Your Google Calendar

1. Open [Google Calendar](https://calendar.google.com/)
2. Click the three dots next to your calendar (or go to Settings)
3. Select "Settings and sharing"
4. Scroll down to "Share with specific people"
5. Click "Add people"
6. Enter the service account email (found in the downloaded JSON file, it looks like: `your-service@project-id.iam.gserviceaccount.com`)
7. Select "Make changes to events" permission
8. Click "Send"

### 6. Get Your Calendar ID

1. In Google Calendar settings, scroll to "Integrate calendar"
2. Copy the "Calendar ID" (usually it's your email address or "primary" for your main calendar)
3. You'll use this in your `.env` file

### 7. Set Up Environment Variables

1. Create a `.env.local` file in the root of your project (same level as `package.json`)
2. Open the downloaded JSON file from step 4
3. Copy the following values and add them to `.env.local`:

```env
GOOGLE_CLIENT_EMAIL=your-service-account-email@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_EMAIL=catherinenkuria@gmail.com
NEXT_PUBLIC_CONTACT_EMAIL=catherinenkuria@gmail.com
```

**Important Notes:**
- The `GOOGLE_PRIVATE_KEY` should be wrapped in quotes and include the `\n` characters
- Replace `your-project-id` with your actual Google Cloud project ID
- Replace the service account email with the one from your JSON file
- The `GOOGLE_CALENDAR_ID` is usually "primary" for your main calendar, or use the Calendar ID from step 6

### 8. Install Dependencies

After Node.js is installed, run:

```bash
npm install googleapis
```

### 9. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the booking page: `http://localhost:3000/booking`

3. Try booking an appointment to test if it works

## How It Works

- **Available Time Slots**: The system generates time slots from 9 AM to 6 PM, Monday through Friday, for the next 30 days
- **Conflict Detection**: When a time slot is booked in your Google Calendar, it automatically disappears from the available options
- **Email Notifications**: Both you and the client will receive email notifications when a booking is made
- **Automatic Updates**: The calendar is checked in real-time, so booked slots are immediately removed from the dropdown

## Troubleshooting

### "Failed to fetch available slots"
- Check that your `.env.local` file has all the correct values
- Verify that the service account has access to your calendar
- Make sure the Google Calendar API is enabled

### "Failed to create booking"
- Ensure the service account has "Make changes to events" permission on your calendar
- Check that the time slot hasn't been booked by someone else
- Verify your environment variables are correct

### Time slots not showing
- Check your browser console for errors
- Verify the API routes are working by checking the Network tab
- Make sure your calendar is shared with the service account

## Security Notes

- Never commit your `.env.local` file to git
- Keep your service account JSON file secure
- The `.gitignore` file is already configured to exclude `.env` files

