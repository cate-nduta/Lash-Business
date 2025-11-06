# Admin Panel Setup Guide

## Initial Setup

1. **Set Admin Password**
   - Create a `.env.local` file in the root directory
   - Add: `ADMIN_PASSWORD=your-secure-password-here`
   - If not set, default password is: `lashdiary2025`

2. **Access Admin Panel**
   - Navigate to: `http://localhost:3000/admin/login`
   - Enter your password
   - You'll be redirected to the dashboard

## Admin Features

### Dashboard (`/admin/dashboard`)
Main hub with links to all management sections:
- Gallery Management
- Service Prices
- Availability & Hours
- Promo Codes
- Discounts

### Gallery Management (`/admin/gallery`)
- Upload and manage gallery images
- Add image URLs or upload files
- Delete images

### Service Prices (`/admin/services`)
- Update prices for all services
- Modify service durations
- Add/remove services
- Manage Full Sets, Lash Fills, and Other Services

### Availability & Hours (`/admin/availability`)
- Set business hours for each day
- Enable/disable specific days
- Configure time slots for weekdays and Sundays
- Add/remove time slots

### Promo Codes (`/admin/promo-codes`)
- Create promotional codes
- Set discount types (percentage or fixed amount)
- Configure validity dates
- Set usage limits
- Track usage count

### Discounts (`/admin/discounts`)
- Manage first-time client discount
- Set deposit percentage
- Configure other discount rules

## Data Storage

All data is stored in JSON files in the `data/` directory:
- `data/services.json` - Service prices and durations
- `data/availability.json` - Business hours and time slots
- `data/promo-codes.json` - Promotional codes
- `data/gallery.json` - Gallery images
- `data/discounts.json` - Discount settings

## Security

- Admin routes are protected with password authentication
- Session is stored in HTTP-only cookies
- All admin API routes require authentication
- Change the default password in production!

## Promo Code Usage

Clients can use promo codes during booking:
- Promo codes are validated on the booking page
- Discounts are applied automatically
- Usage is tracked in the admin panel

