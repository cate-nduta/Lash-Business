# Module 7: Email & Notifications

## Overview

In this module, you'll add email notifications to your booking system. Clients will receive confirmation emails when they book, and you'll receive notifications about new bookings. You'll also learn how to set up automated reminders.

**Estimated Time**: 2-3 hours

---

## Lesson 7.1: Understanding Email Services

### Why Email Notifications?

Email notifications provide:
- **Confirmation** - Clients know their booking was successful
- **Reminders** - Reduce no-shows with automated reminders
- **Professionalism** - Automated emails look professional
- **Information** - Include all booking details in one place

### Email Service Options

**For this course, we'll use Resend** because:
- ✅ Free tier (100 emails/day)
- ✅ Easy to set up
- ✅ Great developer experience
- ✅ Good deliverability
- ✅ Simple API

**Alternative options:**
- **Zoho Mail** - SMTP-based (already used in this codebase)
- **SendGrid** - Popular, more features
- **Mailgun** - Developer-friendly
- **AWS SES** - Cost-effective at scale

---

## Lesson 7.2: Setting Up Resend

Let's set up Resend for sending emails.

### Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click "Sign Up" (free account)
3. Verify your email address
4. Complete the setup

### Step 2: Get API Key

1. Once logged in, go to [API Keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Booking Website")
4. Copy the API key (starts with `re_`)
5. **Save it securely** - you'll only see it once!

### Step 3: Verify Domain (Optional for Testing)

For testing, you can use `onboarding@resend.dev` as the sender.

For production:
1. Go to [Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Follow DNS setup instructions
4. Once verified, use emails like `noreply@yourdomain.com`

### Step 4: Install Resend Package

```bash
npm install resend
```

### Step 5: Add to Environment Variables

Add to your `.env.local`:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=onboarding@resend.dev
EMAIL_FROM_NAME=Your Business Name
BUSINESS_NOTIFICATION_EMAIL=your-email@example.com
```

✅ **Checkpoint**: Resend should be configured!

---

## Lesson 7.3: Creating Email Utility Functions

Let's create helper functions for sending emails.

### Step 1: Create Email Utility

Create `lib/email-utils.ts`:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail(options: EmailOptions) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return { success: false, error: 'Email service not configured' }
    }

    const fromEmail = options.from || process.env.FROM_EMAIL || 'onboarding@resend.dev'
    const fromName = process.env.EMAIL_FROM_NAME || 'Your Business'

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    })

    return { success: true, data: result }
  } catch (error: any) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message }
  }
}

export function createEmailTemplate(content: {
  title: string
  greeting: string
  message: string
  details?: Array<{ label: string; value: string }>
  buttonText?: string
  buttonUrl?: string
  footer?: string
}): string {
  const {
    title,
    greeting,
    message,
    details = [],
    buttonText,
    buttonUrl,
    footer = 'Thank you for choosing us!',
  } = content

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #4F46E5;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">${title}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
                ${greeting},
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                ${message}
              </p>
              
              ${details.length > 0 ? `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0; background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                ${details.map(detail => `
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 150px;">${detail.label}:</td>
                    <td style="padding: 8px 0; color: #6B7280;">${detail.value}</td>
                  </tr>
                `).join('')}
              </table>
              ` : ''}
              
              ${buttonText && buttonUrl ? `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${buttonUrl}" style="display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6B7280;">
                ${footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
```

✅ **Checkpoint**: Email utilities should be created!

---

## Lesson 7.4: Sending Booking Confirmation Emails

Now let's send emails when bookings are created.

### Step 1: Update Booking API to Send Emails

Update your booking creation API (`app/api/calendar/book/route.ts` or similar):

```typescript
import { sendEmail, createEmailTemplate } from '@/lib/email-utils'

// In your booking creation function, after creating the booking:
async function sendBookingConfirmation(booking: {
  name: string
  email: string
  serviceName: string
  date: string
  timeSlot: string
  price: number
  bookingId: string
}) {
  const { name, email, serviceName, date, timeSlot, price, bookingId } = booking

  // Format date
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Create email template
  const emailHtml = createEmailTemplate({
    title: 'Booking Confirmed! 🎉',
    greeting: `Hi ${name}`,
    message: `Your appointment has been confirmed! We're looking forward to seeing you.`,
    details: [
      { label: 'Service', value: serviceName },
      { label: 'Date', value: formattedDate },
      { label: 'Time', value: timeSlot },
      { label: 'Price', value: `KES ${price.toLocaleString()}` },
    ],
    buttonText: 'View Booking Details',
    buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/manage?token=${bookingId}`,
    footer: 'If you need to make any changes, please contact us.',
  })

  // Send to client
  await sendEmail({
    to: email,
    subject: `Booking Confirmed - ${serviceName} on ${formattedDate}`,
    html: emailHtml,
  })

  // Send notification to business owner
  const ownerEmail = process.env.BUSINESS_NOTIFICATION_EMAIL || process.env.FROM_EMAIL
  if (ownerEmail) {
    const ownerEmailHtml = createEmailTemplate({
      title: 'New Booking Received',
      greeting: 'Hello',
      message: `You have received a new booking from ${name}.`,
      details: [
        { label: 'Client Name', value: name },
        { label: 'Email', value: email },
        { label: 'Service', value: serviceName },
        { label: 'Date', value: formattedDate },
        { label: 'Time', value: timeSlot },
        { label: 'Price', value: `KES ${price.toLocaleString()}` },
      ],
      footer: 'Check your admin dashboard for more details.',
    })

    await sendEmail({
      to: ownerEmail,
      subject: `New Booking: ${name} - ${serviceName}`,
      html: ownerEmailHtml,
    })
  }
}
```

### Step 2: Call Email Function After Booking

In your booking creation endpoint:

```typescript
// After successfully creating the booking:
try {
  await sendBookingConfirmation({
    name: bookingData.name,
    email: bookingData.email,
    serviceName: selectedService.name,
    date: bookingData.date,
    timeSlot: bookingData.timeSlot,
    price: selectedService.price,
    bookingId: newBooking.id,
  })
} catch (error) {
  // Log error but don't fail the booking
  console.error('Error sending confirmation email:', error)
}
```

✅ **Checkpoint**: Booking confirmation emails should be sent!

---

## Lesson 7.5: Creating Email Templates

Let's create more professional email templates.

### Step 1: Create Booking Confirmation Template

Create `lib/email-templates.ts`:

```typescript
export function createBookingConfirmationEmail(data: {
  name: string
  serviceName: string
  date: string
  timeSlot: string
  price: number
  location: string
  manageLink?: string
}): string {
  const { name, serviceName, date, timeSlot, price, location, manageLink } = data

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Booking Confirmed! ✨</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 18px; color: #333333;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Great news! Your appointment has been confirmed. We're excited to see you!
              </p>
              
              <!-- Booking Details Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 30px 0;">
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Service:</strong>
                    <span style="color: #6B7280; margin-left: 8px;">${serviceName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Date:</strong>
                    <span style="color: #6B7280; margin-left: 8px;">${formattedDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Time:</strong>
                    <span style="color: #6B7280; margin-left: 8px;">${timeSlot}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Location:</strong>
                    <span style="color: #6B7280; margin-left: 8px;">${location}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Price:</strong>
                    <span style="color: #6B7280; margin-left: 8px;">KES ${price.toLocaleString()}</span>
                  </td>
                </tr>
              </table>
              
              ${manageLink ? `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${manageLink}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Manage Booking
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #6B7280; line-height: 1.6;">
                If you need to make any changes or have questions, please don't hesitate to contact us.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6B7280;">
                We look forward to seeing you!<br>
                <strong>Your Business Name</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
```

✅ **Checkpoint**: Email templates should be created!

---

## Lesson 7.6: Creating Reminder Emails

Let's create automated reminder emails.

### Step 1: Create Reminder Email Template

Add to `lib/email-templates.ts`:

```typescript
export function createReminderEmail(data: {
  name: string
  serviceName: string
  date: string
  timeSlot: string
  location: string
}): string {
  const { name, serviceName, date, timeSlot, location } = data

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #F59E0B;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Reminder: Your Appointment Tomorrow 📅</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 18px; color: #333333;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                This is a friendly reminder that you have an appointment scheduled for tomorrow!
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FEF3C7; border-radius: 8px; padding: 24px; margin: 30px 0;">
                <tr>
                  <td style="padding: 8px 0;">
                    <strong>Service:</strong> ${serviceName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong>Date:</strong> ${formattedDate}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong>Time:</strong> ${timeSlot}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong>Location:</strong> ${location}
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #6B7280;">
                See you tomorrow! If you need to reschedule, please contact us as soon as possible.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
```

### Step 2: Create Reminder API Endpoint

Create `app/api/reminders/send/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { sendEmail } from '@/lib/email-utils'
import { createReminderEmail } from '@/lib/email-templates'

export async function POST() {
  try {
    // Load bookings
    const bookingsData = await readDataFile<{ bookings: any[] }>('bookings.json', { bookings: [] })
    
    // Get tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Find bookings for tomorrow
    const tomorrowBookings = bookingsData.bookings.filter(booking => {
      return booking.date === tomorrowStr && booking.status === 'confirmed'
    })

    // Send reminders
    const results = []
    for (const booking of tomorrowBookings) {
      try {
        const emailHtml = createReminderEmail({
          name: booking.name,
          serviceName: booking.serviceName || booking.service,
          date: booking.date,
          timeSlot: booking.timeSlot,
          location: process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'Your Location',
        })

        const result = await sendEmail({
          to: booking.email,
          subject: `Reminder: Your Appointment Tomorrow - ${booking.serviceName}`,
          html: emailHtml,
        })

        results.push({ bookingId: booking.id, success: result.success })
      } catch (error) {
        console.error(`Error sending reminder for booking ${booking.id}:`, error)
        results.push({ bookingId: booking.id, success: false })
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent: results.filter(r => r.success).length,
      total: tomorrowBookings.length,
      results,
    })
  } catch (error: any) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
```

✅ **Checkpoint**: Reminder emails should work!

---

## Lesson 7.7: Testing Email Functionality

Let's test that emails are working correctly.

### Step 1: Create Test Email Endpoint

Create `app/api/email/test/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, createEmailTemplate } from '@/lib/email-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    const testEmailHtml = createEmailTemplate({
      title: 'Test Email',
      greeting: 'Hello',
      message: 'This is a test email from your booking system. If you received this, your email configuration is working correctly!',
      details: [
        { label: 'Test Time', value: new Date().toLocaleString() },
        { label: 'Status', value: 'Email service is working' },
      ],
      footer: 'This is a test email.',
    })

    const result = await sendEmail({
      to,
      subject: 'Test Email - Booking System',
      html: testEmailHtml,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    )
  }
}
```

### Step 2: Test Email Sending

1. Make a test booking
2. Check your email inbox
3. Check the client's email
4. Verify emails are formatted correctly

### Step 3: Test Reminder Emails

1. Create a booking for tomorrow
2. Call the reminder endpoint: `POST /api/reminders/send`
3. Check that reminder emails are sent

---

## Module 7 Checkpoint

Before moving to Module 8, make sure you have:

✅ Created Resend account and got API key  
✅ Installed Resend package  
✅ Created email utility functions  
✅ Created email templates  
✅ Integrated email sending into booking flow  
✅ Created reminder email system  
✅ Tested email sending  
✅ Verified emails are received  

### Common Issues & Solutions

**Problem**: "RESEND_API_KEY not configured"  
**Solution**: Check `.env.local` has `RESEND_API_KEY` set

**Problem**: Emails not being received  
**Solution**: 
- Check spam folder
- Verify API key is correct
- Check Resend dashboard for delivery status
- Make sure FROM_EMAIL is verified

**Problem**: Emails going to spam  
**Solution**: 
- Verify your domain in Resend
- Use a custom domain email address
- Add SPF/DKIM records

**Problem**: Template not rendering correctly  
**Solution**: Check HTML is valid and properly formatted

---

## What's Next?

Congratulations! You've added email notifications. You now have:
- ✅ Email confirmation system
- ✅ Booking confirmation emails
- ✅ Business owner notifications
- ✅ Reminder email system
- ✅ Professional email templates

**Ready for Module 8?**  
Open `MODULE_08_DEPLOYMENT_LAUNCH.md` to deploy your website and go live!

---

## Practice Exercise

Before moving on, try these exercises:

1. **Add cancellation emails** - Send email when booking is cancelled
2. **Add reschedule emails** - Send email when booking is rescheduled
3. **Add payment confirmation emails** - Send receipt after payment
4. **Add welcome emails** - Send welcome email to new clients
5. **Add birthday emails** - Send special offers on client birthdays

