# Lesson 6: Adding Email Notifications to Admin

## Introduction

Let's send email notifications to admin when new bookings are made, so you're always informed.

**Estimated Time**: 25 minutes

---

## Admin Notification Features

### What to Include

- New booking notifications
- Cancellation alerts
- Payment confirmations
- Daily summary (optional)

---

## Step 1: Create Admin Notification Template

### Update lib/email-templates.ts

```typescript
export function adminBookingNotification(booking: any) {
  return {
    subject: `New Booking: ${booking.clientName} - ${new Date(booking.date).toLocaleDateString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; }
          .content { padding: 20px; background: #f9fafb; }
          .booking-info { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 New Booking Received</h1>
          </div>
          <div class="content">
            <p>A new booking has been made!</p>
            
            <div class="booking-info">
              <h3>Booking Details</h3>
              <p><strong>Client:</strong> ${booking.clientName}</p>
              <p><strong>Email:</strong> ${booking.clientEmail}</p>
              <p><strong>Phone:</strong> ${booking.clientPhone}</p>
              <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${booking.time}</p>
              <p><strong>Services:</strong> ${booking.services.map((s: any) => s.name).join(', ')}</p>
              <p><strong>Total:</strong> $${booking.totalPrice}</p>
              <p><strong>Status:</strong> ${booking.status}</p>
            </div>

            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/bookings/${booking.id}" 
               style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px;">
              View in Dashboard
            </a>
          </div>
        </div>
      </body>
      </html>
    `
  }
}
```

---

## Step 2: Send Notification on Booking

### Update booking API

```typescript
import { sendEmail } from '@/lib/email-utils'
import { adminBookingNotification } from '@/lib/email-templates'

// After booking created
const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourbusiness.com'
const notification = adminBookingNotification(booking)

await sendEmail({
  to: adminEmail,
  subject: notification.subject,
  html: notification.html
})
```

---

## Step 3: Add to Environment Variables

### Update .env.local

```env
ADMIN_EMAIL=admin@yourbusiness.com
ADMIN_NOTIFICATIONS_ENABLED=true
```

---

## Key Takeaways

✅ **Admin notifications** keep you informed

✅ **New booking alerts** immediate notification

✅ **Email templates** professional design

✅ **Configurable** via environment variables

---

## Module 8 Complete!

Congratulations! Email and notifications are complete.

**You've built:**
- ✅ Email service setup
- ✅ Email utility functions
- ✅ Booking confirmation emails
- ✅ Automated reminders
- ✅ Admin notifications

**Next Module**: Deployment & Launch!

**Ready to continue?** Click "Next Module" to proceed!

