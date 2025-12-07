# Client Accounts System - LashDiary

## Overview

A comprehensive client account system that provides personalized lash care management, tracking, and analytics for both clients and lash technicians.

## Features

### Client Features

1. **Account Management**
   - Secure registration and login
   - 30-day session persistence
   - Premium, exclusive feel

2. **Dashboard**
   - Last appointment date with countdown
   - Recommended refill date (auto-calculated 3 weeks from last appointment)
   - Next appointment countdown
   - Total appointments and lash maps count

3. **Lash History**
   - Complete appointment history
   - Service types (full-set, refill, removal, other)
   - Retention tracking

4. **Preferences**
   - Preferred curl (J, C, CC, D, DD, L+)
   - Length range (min/max in mm)
   - Density level (natural, classic, hybrid, volume, mega-volume)
   - Mapping style
   - Signature look description

5. **Allergy & Sensitivity Alerts**
   - Previous reaction tracking
   - Glue sensitivity notes
   - Patches used
   - What to avoid next session
   - Last reaction date

6. **Aftercare Profile**
   - Lash shedding patterns (normal, excessive, minimal)
   - Sleep position (back, side, stomach, mixed)
   - Oil use frequency
   - Makeup habits
   - Special notes

7. **Lash Maps**
   - Saved mapping styles per appointment
   - Visual references
   - Notes and details

### Admin Features

1. **Client Management**
   - View all clients
   - Filter by "Needs Refill" (3+ weeks since last appointment)
   - Client profile management

2. **3-Week Tracking**
   - Automatic detection of clients who need refills
   - Days since last appointment calculation
   - Recommended refill date tracking
   - SMS integration for outreach

3. **Client Profile Editing**
   - Update preferences
   - Add allergy/sensitivity information
   - Record aftercare details
   - Add lash history entries
   - Save lash maps

## Technical Implementation

### Authentication

- Cookie-based sessions (30-day expiration)
- Secure password hashing using scrypt
- Session management via middleware

### Data Storage

- User profiles: `data/users.json`
- Client data: `data/client-{userId}.json`
- Each client has:
  - Profile information
  - Lash history
  - Preferences
  - Allergies
  - Aftercare info
  - Lash maps
  - Retention cycles

### API Endpoints

**Client Authentication:**
- `POST /api/client/auth/register` - Create account
- `POST /api/client/auth/login` - Sign in
- `POST /api/client/auth/logout` - Sign out
- `GET /api/client/auth/me` - Get current user data

**Client Data:**
- `GET /api/client/data` - Get full client data
- `PATCH /api/client/data` - Update client data (limited fields)

**Admin:**
- `GET /api/admin/clients` - List all clients (with optional `?needsRefill=true` filter)
- `GET /api/admin/clients/[id]` - Get specific client data
- `PATCH /api/admin/clients/[id]` - Update client data (full access)

### Integration with Booking System

When a booking is made:
1. System checks if client account exists (by email)
2. If not, creates account automatically
3. Adds appointment to lash history
4. Updates last appointment date
5. Calculates recommended refill date (3 weeks)

## Pages

- `/account/login` - Client login
- `/account/register` - Client registration
- `/account/dashboard` - Client dashboard
- `/admin/clients` - Admin client management

## Security

- Passwords are hashed using scrypt
- Sessions are HTTP-only cookies
- Admin routes require authentication
- Client routes require authentication
- Input validation on all endpoints

## Future Enhancements

1. **Birthday Discounts**
   - Automatic birthday detection
   - Discount code generation
   - Email notifications

2. **Retention Analytics**
   - Retention cycle tracking
   - Quality ratings (excellent, good, fair, poor)
   - Improvement trends over time
   - Visual charts and graphs

3. **SMS Integration**
   - Automated refill reminders
   - Birthday messages
   - Special offers

4. **Client Portal Enhancements**
   - View detailed lash history
   - See retention analytics
   - Book appointments directly from dashboard
   - View lash maps with images

## Usage

### For Clients

1. Register at `/account/register`
2. Login at `/account/login`
3. Access dashboard to see:
   - Last appointment
   - Recommended refill date
   - Preferences and aftercare info
   - Allergy alerts

### For Lash Technicians

1. Access admin panel at `/admin/clients`
2. View clients who need refills (filter: "Needs Refill")
3. Click "Send SMS" to reach out to clients
4. Click "View Profile" to manage client data:
   - Update preferences
   - Add allergy information
   - Record aftercare details
   - Add lash history entries
   - Save lash maps

## Notes

- Client accounts are automatically created when bookings are made
- Clients can set passwords later if they want to access their account
- The system tracks 3-week refill windows automatically
- All data is stored in JSON files (can be migrated to database later)

