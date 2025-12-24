# Lesson 9.5: Storing Form Data

**Estimated Time**: 30 minutes

---

## Introduction

Now that your website is connected to Supabase, you can store data when visitors submit forms. This lesson shows you how to save contact form submissions and booking data to your Supabase database, using the example prompt you provided.

**What You'll Learn:**
- How to store contact form data in Supabase
- How to structure the data insertion
- How to ensure secure API usage
- How to verify data is saved
- How to retrieve stored data

---

## Storing Contact Form Data

### The Complete Flow

**1. Visitor submits form:**
- Fills out contact form
- Clicks "Send Message"
- Form data collected

**2. Data sent to API:**
- Form submits to `/api/contact`
- Data validated
- Prepared for database

**3. Data saved to Supabase:**
- Inserted into `contact_submissions` table
- Timestamp added automatically
- Data stored permanently

**4. Confirmation:**
- Success message shown
- Data visible in Supabase
- Can retrieve anytime

---

## Using the Example Prompt

### Your Prompt

```
Connect this contact form to Supabase.

Store name, email, message, and timestamp.

Ensure secure API usage.
```

**This prompt covers:**
- Connecting form to Supabase
- Storing specific fields
- Adding timestamp
- Security considerations

---

## Step-by-Step Implementation

### Step 1: Ensure Table Exists

**Verify your table has these fields:**
- `id` - uuid (primary key, auto-generated)
- `name` - text (required)
- `email` - text (required)
- `message` - text (required)
- `created_at` - timestamptz (default now())

**If table doesn't exist, create it:**
```sql
CREATE TABLE contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Cursor prompt:**
```
Create the contact_submissions table in Supabase if it doesn't exist. 
Include fields: id (uuid, primary key), name (text, required), 
email (text, required), message (text, required), and created_at 
(timestamp, default now).
```

---

### Step 2: Create API Route

**Create `app/api/contact/route.ts`:**

```javascript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get form data
    const body = await request.json()
    const { name, email, message } = body

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert([
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          message: message.trim()
          // created_at will be set automatically by default
        }
      ])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Your message has been sent successfully',
        data: data[0]
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
```

**Cursor prompt:**
```
Create an API route for the contact form that connects to Supabase. 
It should:
1. Receive form data (name, email, message)
2. Validate required fields and email format
3. Store data in contact_submissions table (name, email, message, timestamp)
4. Ensure secure API usage (validate input, handle errors)
5. Return appropriate success or error responses
```

---

### Step 3: Update Contact Form

**Update form to use API:**

```javascript
'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setStatus({
          type: 'success',
          message: result.message || 'Thank you! Your message has been sent.'
        })
        // Reset form
        setFormData({ name: '', email: '', message: '' })
      } else {
        setStatus({
          type: 'error',
          message: result.error || 'Failed to send message. Please try again.'
        })
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'An error occurred. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Your Name"
        required
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Your Email"
        required
      />
      <textarea
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        placeholder="Your Message"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Message'}
      </button>
      {status.message && (
        <div className={status.type === 'success' ? 'text-green-600' : 'text-red-600'}>
          {status.message}
        </div>
      )}
    </form>
  )
}
```

**Cursor prompt:**
```
Update the contact form to submit to the /api/contact endpoint. When submitted:
1. Send name, email, and message to API
2. Show loading state while submitting
3. Display success message on success
4. Display error message on failure
5. Reset form on successful submission
6. Handle errors gracefully
```

---

## Ensuring Secure API Usage

### Security Measures

**1. Input Validation:**
- Check required fields
- Validate email format
- Sanitize input (trim, lowercase)
- Prevent SQL injection (Supabase handles this)

**2. Error Handling:**
- Don't expose technical errors
- Generic error messages
- Log errors server-side
- User-friendly messages

**3. Rate Limiting (Optional):**
- Prevent spam submissions
- Limit requests per IP
- Add CAPTCHA if needed

**4. Environment Variables:**
- Use environment variables for keys
- Never expose service_role key
- Use anon key in frontend only

---

## Verifying Data Storage

### Check Supabase Dashboard

**1. Go to Supabase:**
- Open your project
- Click "Table Editor"
- Select `contact_submissions` table

**2. View data:**
- See all submissions
- Check timestamps
- Verify data is correct

**3. Test submission:**
- Submit test form
- Check Supabase immediately
- Verify data appears

---

## Retrieving Stored Data

### Get All Submissions

**Create API route to retrieve:**

```javascript
// app/api/contact/route.ts (add GET method)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
```

**Cursor prompt:**
```
Add a GET method to the contact API route that retrieves all contact form 
submissions from Supabase, ordered by created_at descending (newest first).
Include proper error handling.
```

---

## Real-World Example

### Complete Implementation

**1. Table created:**
- `contact_submissions` with all fields
- Timestamp auto-generated

**2. API route created:**
- Validates input
- Stores in Supabase
- Returns response

**3. Form updated:**
- Submits to API
- Shows loading/success/error
- Resets on success

**4. Test:**
- Submit form
- Check Supabase dashboard
- Verify data saved

**Result:**
- Form data stored in database
- Timestamp automatically added
- Secure API usage
- Data retrievable anytime

---

## Common Issues

### Issue 1: Data Not Saving

**Problem:**
- Form submits but no data in Supabase

**Solutions:**
- Check API route is called
- Verify table name matches
- Check field names match
- Verify Supabase connection
- Check browser console for errors

---

### Issue 2: Timestamp Not Working

**Problem:**
- `created_at` is null or wrong

**Solutions:**
- Ensure default value set in table
- Or manually set in insert
- Check timezone settings

---

### Issue 3: Validation Errors

**Problem:**
- Form won't submit
- Validation failing

**Solutions:**
- Check required fields filled
- Verify email format
- Check field names match
- Ensure data types correct

---

## Best Practices

### 1. Always Validate

**Before storing:**
- Check required fields
- Validate formats
- Sanitize input
- Prevent bad data

---

### 2. Handle Errors

**Show user-friendly messages:**
- "Thank you! Your message has been sent."
- "Please fill all required fields."
- "An error occurred. Please try again."

---

### 3. Provide Feedback

**Let users know:**
- Form is submitting (loading state)
- Submission successful (success message)
- If there's an error (error message)

---

### 4. Test Thoroughly

**Test:**
- Valid submissions
- Missing fields
- Invalid email
- Network errors
- Verify data in Supabase

---

## Key Takeaways

1. **Store form data in Supabase** - Insert into table when form submitted
2. **Validate before storing** - Check required fields and formats
3. **Add timestamp automatically** - Use default value in table
4. **Secure API usage** - Validate input, handle errors, use environment variables
5. **Provide user feedback** - Show loading, success, and error states
6. **Verify data storage** - Check Supabase dashboard to confirm
7. **Handle errors gracefully** - User-friendly error messages
8. **Test thoroughly** - Verify everything works end-to-end

---

## Module 9 Summary

**Congratulations! You've completed Module 9: Database Setup with Supabase!**

**You've learned:**
1. ✅ What Supabase is (easy database service)
2. ✅ How to create a Supabase project (account, project, credentials)
3. ✅ How to create tables and fields (structure your data)
4. ✅ How to connect website to Supabase (client setup, API routes)
5. ✅ How to store form data (contact form to database)

**You now have:**
- Supabase database set up
- Tables created for your data
- Website connected to database
- Contact form saving to database
- Complete backend functionality

**Your website can now store data!** 🎉

---

## What's Next?

Excellent work! Your website now has a database and can store contact form submissions and other data. The next modules will cover more advanced features like payment processing, deployment, and making your website live.

**Ready to continue?** Move to the next module to add more functionality!

---

## Quick Check

Before moving on, make sure you:
- ✅ Can store contact form data in Supabase
- ✅ Understand how to structure the data insertion
- ✅ Know how to ensure secure API usage (validation, error handling)
- ✅ Can verify data is saved (check Supabase dashboard)
- ✅ Know how to retrieve stored data
- ✅ Understand common issues and solutions
- ✅ Have successfully stored form data in your database

If anything is unclear, review this lesson or the entire module!
