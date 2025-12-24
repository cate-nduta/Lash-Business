# Lesson 8.5: Contact Form Email Triggers

**Estimated Time**: 20 minutes

---

## Introduction

Your contact form should send you an email notification whenever a visitor submits an inquiry. This lesson shows you how to connect your contact form to your email system so you receive notifications instantly when someone contacts you through your website.

**What You'll Learn:**
- How contact form emails work
- Setting up email sending from forms
- Using email service APIs
- Configuring email notifications
- Testing your contact form

---

## Why Email Triggers Matter

### Instant Notifications

**With email triggers:**
- You know immediately when someone contacts you
- Can respond quickly
- Don't miss inquiries
- Professional communication
- Better customer service

**Without email triggers:**
- Have to check website manually
- May miss inquiries
- Delayed responses
- Unprofessional
- Lost opportunities

**Email triggers = Better customer service!**

---

## How Contact Form Emails Work

### The Flow

**1. Visitor fills form:**
- Enters name, email, message
- Clicks "Send Message"
- Form submits

**2. Website processes:**
- Validates form data
- Prepares email
- Sends to your email address

**3. You receive email:**
- Notification in your inbox
- Contains form submission
- Can respond directly

**4. Optional: Auto-reply:**
- Visitor receives confirmation
- "Thank you for contacting us"
- Professional touch

---

## Setting Up Email Sending

### Option 1: Using Email Service API

**Popular services:**
- **Zoho Mail API** - If using Zoho
- **SendGrid** - Popular email service
- **Mailgun** - Reliable email API
- **Resend** - Modern email API
- **Nodemailer** - Node.js email library

**For beginners:**
- Start with service you're using (Zoho)
- Or use simple service like Resend
- Easy to set up
- Good documentation

---

### Option 2: Using Nodemailer (Simple)

**Nodemailer:**
- Popular Node.js library
- Works with many email services
- Easy to configure
- Good for beginners

**Supports:**
- Gmail
- Zoho
- Outlook
- Custom SMTP
- Many others

---

## Setting Up with Zoho Mail

### Step 1: Get Zoho SMTP Settings

**1. Log into Zoho Mail:**
- Go to mail.zoho.com
- Access your account

**2. Get SMTP settings:**
- Go to Settings
- Find "POP/IMAP Access"
- Enable SMTP
- Note settings:
  - SMTP Server: `smtp.zoho.com`
  - Port: `587` (TLS) or `465` (SSL)
  - Requires authentication

---

### Step 2: Create App Password

**1. Generate app password:**
- In Zoho Mail settings
- Go to "Security"
- Generate app-specific password
- Save password securely

**2. Use in code:**
- Don't use regular password
- Use app password
- More secure

---

### Step 3: Install Nodemailer

**Install package:**
```bash
npm install nodemailer
```

**Or use Cursor:**
```
Add nodemailer package to handle email sending from the contact form.
```

---

### Step 4: Create Email Service

**Basic setup:**
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_APP_PASSWORD
  }
});
```

**Cursor prompt:**
```
Create an email service using nodemailer that connects to Zoho Mail SMTP.
Use environment variables for email and password. Include a function to 
send emails from the contact form.
```

---

## Creating Email Handler

### Step 1: Create API Route

**For Next.js, create API route:**
- `app/api/contact/route.ts` (or `pages/api/contact.js`)

**Cursor prompt:**
```
Create an API route for handling contact form submissions. It should:
- Receive form data (name, email, message)
- Validate the data
- Send email notification to business email
- Return success or error response
- Include proper error handling
```

---

### Step 2: Send Email Function

**Function to send email:**
```javascript
async function sendContactEmail(formData) {
  const mailOptions = {
    from: process.env.ZOHO_EMAIL,
    to: process.env.BUSINESS_EMAIL,
    subject: `New Contact Form Submission from ${formData.name}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${formData.name}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Message:</strong></p>
      <p>${formData.message}</p>
    `
  };
  
  await transporter.sendMail(mailOptions);
}
```

**Cursor prompt:**
```
Create a function to send contact form emails. It should format the email 
nicely with the visitor's name, email, and message. Send to the business 
email address.
```

---

### Step 3: Connect to Contact Form

**Update contact form:**
- Submit to API route
- Handle response
- Show success/error message

**Cursor prompt:**
```
Update the contact form to submit to the /api/contact endpoint. When form 
is submitted:
1. Send data to API
2. Show loading state
3. Display success message on success
4. Display error message on failure
5. Reset form on success
```

---

## Environment Variables

### Required Variables

**Add to `.env.local`:**
```
ZOHO_EMAIL=hello@yourbusiness.com
ZOHO_APP_PASSWORD=your_app_password
BUSINESS_EMAIL=hello@yourbusiness.com
```

**Important:**
- Never commit `.env.local` to git
- Keep credentials secure
- Use app password, not regular password

---

## Email Template

### Professional Email Format

**Good email format:**
```
Subject: New Contact Form Submission from [Name]

New Contact Form Submission

Name: [Visitor Name]
Email: [Visitor Email]
Phone: [Visitor Phone] (if provided)

Message:
[Visitor Message]

---
This email was sent from your website contact form.
```

**Cursor prompt:**
```
Format the contact form email notification professionally. Include all 
form fields, make it easy to read, and include a clear subject line.
```

---

## Optional: Auto-Reply to Visitor

### Send Confirmation Email

**Thank visitor for contacting:**
```
Subject: Thank You for Contacting [Business Name]

Hi [Name],

Thank you for contacting [Business Name]. We've received your message 
and will get back to you within 24 hours.

Best regards,
[Business Name]
```

**Cursor prompt:**
```
Add an auto-reply feature to the contact form. When a visitor submits 
the form, send them a confirmation email thanking them for contacting 
you and letting them know you'll respond soon.
```

---

## Testing Your Contact Form

### Step 1: Test Locally

**1. Fill out form:**
- Use test data
- Submit form
- Check console for errors

**2. Check email:**
- Check your inbox
- Verify email received
- Check formatting

**3. Test error handling:**
- Submit invalid data
- Test with missing fields
- Verify error messages

---

### Step 2: Test on Live Site

**1. Deploy to production:**
- Ensure environment variables set
- Test on live site
- Submit real form

**2. Verify:**
- Email received
- Formatting correct
- All fields included
- Auto-reply works (if enabled)

---

## Common Issues

### Issue 1: Emails Not Sending

**Problem:**
- No email received
- Error in console

**Solutions:**
- Check SMTP settings
- Verify credentials
- Check app password
- Test connection
- Check spam folder

---

### Issue 2: Authentication Errors

**Problem:**
- Authentication failed
- Invalid credentials

**Solutions:**
- Use app password (not regular password)
- Verify email address
- Check SMTP settings
- Re-generate app password

---

### Issue 3: Emails Going to Spam

**Problem:**
- Emails in spam folder
- Not delivered

**Solutions:**
- Use professional email address
- Proper email formatting
- Include sender information
- Consider email service (SendGrid, etc.)

---

## Best Practices

### 1. Validate Form Data

**Before sending:**
- Check required fields
- Validate email format
- Sanitize input
- Prevent spam

---

### 2. Error Handling

**Handle errors gracefully:**
- Network failures
- Email service errors
- Invalid data
- Show user-friendly messages

---

### 3. Rate Limiting

**Prevent abuse:**
- Limit submissions per IP
- Add CAPTCHA if needed
- Prevent spam submissions

---

### 4. Professional Formatting

**Email should be:**
- Easy to read
- Well formatted
- Professional appearance
- Include all information

---

## Real-World Example

### Complete Setup

**1. Install nodemailer:**
```bash
npm install nodemailer
```

**2. Create API route:**
- `app/api/contact/route.ts`
- Handle form submission
- Send email

**3. Update contact form:**
- Submit to API
- Show success/error
- Reset on success

**4. Test:**
- Submit test form
- Verify email received
- Check formatting

**Result:**
- Contact form sends emails
- You receive notifications
- Professional communication
- Better customer service

---

## Key Takeaways

1. **Email triggers notify you instantly** - Know when visitors contact you
2. **Use email service API** - Zoho, SendGrid, or Nodemailer
3. **SMTP settings required** - Get from your email provider
4. **App passwords more secure** - Use instead of regular passwords
5. **Test thoroughly** - Verify emails send and receive correctly
6. **Professional formatting** - Make emails easy to read
7. **Error handling important** - Handle failures gracefully
8. **Optional auto-reply** - Thank visitors for contacting you

---

## Module 8 Summary

**Congratulations! You've completed Module 8: Email & Calendar Integration!**

**You've learned:**
1. ✅ Why professional email matters (builds trust, credibility)
2. ✅ How to set up Zoho Mail (free professional email)
3. ✅ Google Workspace option (alternative email solution)
4. ✅ Google Calendar integration (automatic appointment sync)
5. ✅ Contact form email triggers (instant notifications)

**You now have:**
- Professional email address
- Calendar integration for bookings
- Contact form that sends emails
- Complete communication system
- Business-ready email setup

**Your email and calendar are integrated!** 🎉

---

## What's Next?

Excellent work! You've set up professional email and integrated Google Calendar. Your website now has a complete communication system. The next modules will cover more advanced features like database integration, payment processing, and deployment.

**Ready to continue?** Move to the next module to add database functionality!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand why email triggers matter (instant notifications)
- ✅ Know how to set up email sending (SMTP, Nodemailer)
- ✅ Can create API route for contact form
- ✅ Understand how to send emails from forms
- ✅ Know how to test email functionality
- ✅ Understand common issues and solutions
- ✅ Have contact form sending emails successfully

If anything is unclear, review this lesson or the entire module!
