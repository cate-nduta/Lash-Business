# Lesson 8.4: Google Calendar Integration

**Estimated Time**: 30 minutes

---

## Introduction

Google Calendar integration allows your website to automatically check availability, prevent double bookings, and sync appointments. This lesson shows you how to connect Google Calendar to your booking website so appointments are automatically added to your calendar.

**What You'll Learn:**
- Why calendar integration matters
- How Google Calendar API works
- How to set up Google Calendar API
- How to connect it to your website
- How to sync bookings automatically

---

## Why Calendar Integration Matters

### Automatic Appointment Management

**With calendar integration:**
- Bookings automatically added to calendar
- Prevents double bookings
- Shows real-time availability
- Syncs across devices
- Saves time and prevents errors

**Without integration:**
- Manual calendar entry
- Risk of double bookings
- Availability not accurate
- Time-consuming
- Error-prone

**Calendar integration = Professional booking system!**

---

## How Google Calendar Integration Works

### The Basic Flow

**1. Visitor books appointment:**
- Selects date and time
- Completes booking form
- Submits booking

**2. Website checks calendar:**
- Queries Google Calendar API
- Checks if time slot available
- Verifies no conflicts

**3. Booking is created:**
- Adds event to Google Calendar
- Confirms booking
- Sends confirmation email

**4. Calendar updates:**
- Appointment appears in calendar
- Time slot marked as busy
- Available on all devices

---

## Setting Up Google Calendar API

### Step 1: Create Google Cloud Project

**1. Go to Google Cloud Console:**
- Visit `console.cloud.google.com`
- Sign in with Google account

**2. Create project:**
- Click "New Project"
- Name your project (e.g., "Booking Website")
- Click "Create"

**3. Select project:**
- Choose your new project
- Continue setup

---

### Step 2: Enable Calendar API

**1. Go to APIs & Services:**
- In Google Cloud Console
- Click "APIs & Services"
- Click "Library"

**2. Search for Calendar API:**
- Search "Google Calendar API"
- Click on it

**3. Enable API:**
- Click "Enable"
- Wait for activation
- API is now enabled

---

### Step 3: Create Credentials

**1. Go to Credentials:**
- In APIs & Services
- Click "Credentials"
- Click "Create Credentials"

**2. Choose OAuth 2.0:**
- Select "OAuth client ID"
- Configure consent screen first (if needed)

**3. Create OAuth client:**
- Application type: "Web application"
- Name: "Booking Website"
- Authorized redirect URIs: Your website URL
- Create

**4. Save credentials:**
- Copy Client ID
- Copy Client Secret
- Save securely (you'll need these)

---

### Step 4: Configure OAuth Consent Screen

**1. Go to OAuth consent screen:**
- In APIs & Services
- Click "OAuth consent screen"

**2. Configure:**
- User type: External (for most cases)
- App name: Your business name
- Support email: Your email
- Save

**3. Add scopes:**
- Add scope: `https://www.googleapis.com/auth/calendar`
- Save

---

## Connecting to Your Website

### Step 1: Install Required Packages

**If using Next.js/React:**
```bash
npm install googleapis
```

**Or use Cursor:**
```
Add the googleapis package to handle Google Calendar API integration.
```

---

### Step 2: Set Up Environment Variables

**Create `.env.local` file:**
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALENDAR_ID=your_calendar_id_here
```

**Get calendar ID:**
- Open Google Calendar
- Go to calendar settings
- Find "Calendar ID"
- Copy it

---

### Step 3: Create Calendar Service

**Basic setup code:**
```javascript
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
```

**Use Cursor to generate:**
```
Create a Google Calendar service file that connects to Google Calendar API 
using the credentials from environment variables. Include functions to:
- Check availability
- Create calendar events
- List events
```

---

## Using Calendar in Your Booking System

### Check Availability

**Function to check if time is available:**
```javascript
async function checkAvailability(date, time) {
  // Check if time slot is free
  // Return true if available, false if booked
}
```

**Cursor prompt:**
```
Create a function to check if a time slot is available in Google Calendar.
It should check for existing events at that date and time, and return 
true if available, false if booked.
```

---

### Create Booking Event

**Function to add booking to calendar:**
```javascript
async function createBookingEvent(bookingDetails) {
  // Create event in Google Calendar
  // Include client name, service, time
}
```

**Cursor prompt:**
```
Create a function to add a booking to Google Calendar. It should create 
an event with:
- Title: Client name and service
- Start time: Booking date and time
- End time: Based on service duration
- Description: Booking details
```

---

### List Available Times

**Function to get available slots:**
```javascript
async function getAvailableSlots(date) {
  // Get all available time slots for a date
  // Exclude booked times
  // Return array of available times
}
```

**Cursor prompt:**
```
Create a function to get available time slots for a specific date. It should:
- Get all events for that date from Google Calendar
- Calculate available time slots based on working hours
- Exclude booked times
- Return array of available time slots
```

---

## Real-World Example: Booking Flow

### Complete Integration

**1. Visitor selects date:**
- Website queries Google Calendar
- Gets available time slots
- Shows only available times

**2. Visitor books:**
- Selects available time
- Completes booking form
- Submits

**3. Website processes:**
- Checks availability again (double-check)
- Creates event in Google Calendar
- Confirms booking
- Sends confirmation email

**4. Calendar updated:**
- Event appears in calendar
- Time slot marked busy
- Available on all devices

---

## Using Cursor for Integration

### Step 1: Set Up API Connection

**Prompt:**
```
Set up Google Calendar API integration for my booking website. Create a 
service file that:
- Connects to Google Calendar using credentials from environment variables
- Includes functions to check availability, create events, and list events
- Handles authentication properly
- Includes error handling
```

---

### Step 2: Integrate with Booking Form

**Prompt:**
```
Integrate Google Calendar with the booking form. When a visitor books:
1. Check if the selected time is available in Google Calendar
2. If available, create the booking event in Google Calendar
3. Include client name, service, date, and time in the event
4. Mark the time slot as busy
5. Show confirmation to visitor
```

---

### Step 3: Add Availability Check

**Prompt:**
```
Add real-time availability checking to the booking page. When visitor 
selects a date:
1. Query Google Calendar for that date
2. Get all booked time slots
3. Show only available times
4. Update available times dynamically
5. Prevent booking of unavailable slots
```

---

## Common Issues and Solutions

### Issue 1: Authentication Errors

**Problem:**
- API calls failing
- Authentication errors

**Solution:**
- Check credentials are correct
- Verify OAuth consent screen configured
- Ensure scopes are added
- Re-authenticate if needed

---

### Issue 2: Calendar Not Updating

**Problem:**
- Events not appearing in calendar
- Bookings not syncing

**Solution:**
- Check calendar ID is correct
- Verify API is enabled
- Check event creation code
- Test API connection

---

### Issue 3: Availability Not Accurate

**Problem:**
- Showing booked times as available
- Double bookings possible

**Solution:**
- Improve availability checking
- Add double-check before booking
- Handle timezone correctly
- Refresh availability frequently

---

## Best Practices

### 1. Handle Timezones

**Important:**
- Store times in consistent timezone
- Convert for display
- Match calendar timezone
- Avoid confusion

---

### 2. Double-Check Availability

**Before creating booking:**
- Check availability again
- Prevent race conditions
- Ensure slot still free
- Handle conflicts

---

### 3. Error Handling

**Handle errors gracefully:**
- API failures
- Network issues
- Invalid times
- Calendar errors

**Show user-friendly messages:**
- "Unable to check availability, please try again"
- "This time slot is no longer available"
- "Error creating booking, please contact us"

---

### 4. Refresh Availability

**Keep availability current:**
- Refresh when date selected
- Update after bookings
- Check periodically
- Show accurate times

---

## Key Takeaways

1. **Calendar integration prevents double bookings** - Automatic sync keeps calendar accurate
2. **Google Calendar API required** - Set up in Google Cloud Console
3. **OAuth authentication needed** - Create credentials and configure consent
4. **Check availability before booking** - Query calendar for available times
5. **Create events automatically** - Add bookings to calendar when created
6. **Handle timezones correctly** - Avoid confusion with time conversions
7. **Error handling important** - Gracefully handle API failures
8. **Real-time updates** - Keep availability current and accurate

---

## What's Next?

Excellent! You've integrated Google Calendar with your website. Now your bookings automatically sync to your calendar. The final lesson shows you how to set up your contact form to send emails when visitors submit inquiries.

**Ready?** Let's move to Lesson 8.5: Contact Form Email Triggers!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand why calendar integration matters (prevents double bookings)
- ✅ Know how to set up Google Calendar API (Cloud Console, credentials)
- ✅ Understand how to check availability (query calendar for events)
- ✅ Know how to create booking events (add to calendar automatically)
- ✅ Understand common issues and solutions
- ✅ Know best practices (timezones, error handling, refresh)

If anything is unclear, review this lesson or ask questions!
