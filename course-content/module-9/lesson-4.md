# Lesson 9.4: Connecting Website to Supabase

**Estimated Time**: 40 minutes

---

## Introduction

Now that you have your Supabase project and tables set up, you need to connect your website to Supabase so you can store and retrieve data. This lesson shows you how to set up the connection, create the Supabase client, and make your first API calls.

**What You'll Learn:**
- How to set up Supabase client in your website
- How to configure environment variables
- How to create API routes
- How to make basic database operations
- How to handle errors

---

## Setting Up the Connection

### Step 1: Install Supabase Client

**Install the package:**
```bash
npm install @supabase/supabase-js
```

**Or use Cursor:**
```
Add the @supabase/supabase-js package to connect the website to Supabase database.
```

---

### Step 2: Create Supabase Client File

**Create `lib/supabase.ts` (or similar):**

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Cursor prompt:**
```
Create a Supabase client file that exports a configured Supabase client 
using environment variables. Use NEXT_PUBLIC_SUPABASE_URL and 
NEXT_PUBLIC_SUPABASE_ANON_KEY. Include proper TypeScript types if using TypeScript.
```

---

### Step 3: Verify Environment Variables

**Check `.env.local` has:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:**
- Must start with `NEXT_PUBLIC_` for client-side access
- Get values from Supabase dashboard (Settings → API)
- Never commit `.env.local` to git

---

## Testing the Connection

### Simple Test

**Create a test API route:**

```javascript
// app/api/test-supabase/route.ts
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .limit(1)
    
    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    
    return Response.json({ success: true, data })
  } catch (error) {
    return Response.json({ error: 'Connection failed' }, { status: 500 })
  }
}
```

**Cursor prompt:**
```
Create a test API route to verify Supabase connection. It should query the 
contact_submissions table and return success if connected, error if not.
```

---

## Basic Database Operations

### 1. Insert Data (Create)

**Insert a new record:**
```javascript
const { data, error } = await supabase
  .from('contact_submissions')
  .insert([
    {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello, I have a question'
    }
  ])
```

**Cursor prompt:**
```
Create a function to insert contact form data into Supabase. It should 
accept name, email, and message, and insert into the contact_submissions table.
Handle errors properly.
```

---

### 2. Select Data (Read)

**Get all records:**
```javascript
const { data, error } = await supabase
  .from('contact_submissions')
  .select('*')
```

**Get specific records:**
```javascript
const { data, error } = await supabase
  .from('contact_submissions')
  .select('*')
  .eq('email', 'john@example.com')
```

**Cursor prompt:**
```
Create a function to retrieve contact form submissions from Supabase. 
It should get all submissions, ordered by created_at descending (newest first).
Include error handling.
```

---

### 3. Update Data

**Update a record:**
```javascript
const { data, error } = await supabase
  .from('contact_submissions')
  .update({ status: 'read' })
  .eq('id', 'record-id-here')
```

---

### 4. Delete Data

**Delete a record:**
```javascript
const { data, error } = await supabase
  .from('contact_submissions')
  .delete()
  .eq('id', 'record-id-here')
```

---

## Creating API Routes

### Contact Form API Route

**Create `app/api/contact/route.ts`:**

```javascript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, message } = body

    // Validate
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert([
        {
          name,
          email,
          message,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    )
  }
}
```

**Cursor prompt:**
```
Create an API route for the contact form that:
1. Receives form data (name, email, message)
2. Validates required fields
3. Inserts data into Supabase contact_submissions table
4. Returns success or error response
5. Includes proper error handling
```

---

## Connecting Contact Form

### Update Contact Form Component

**Update form to submit to API:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault()
  
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      message: formData.message
    })
  })
  
  const result = await response.json()
  
  if (result.success) {
    // Show success message
    // Reset form
  } else {
    // Show error message
  }
}
```

**Cursor prompt:**
```
Update the contact form to submit to the /api/contact endpoint. When submitted:
1. Send form data to API
2. Show loading state
3. Display success message on success
4. Display error message on failure
5. Reset form on success
```

---

## Error Handling

### Common Errors

**1. Connection Error:**
- Check environment variables
- Verify Supabase URL and key
- Check internet connection

**2. Table Not Found:**
- Verify table name is correct
- Check table exists in Supabase
- Ensure table is created

**3. Validation Error:**
- Check required fields
- Verify data types
- Check field names match

**4. Permission Error:**
- Check API key permissions
- Verify row-level security settings
- Check access policies

---

## Security Best Practices

### 1. Use Environment Variables

**Do:**
- Store keys in `.env.local`
- Never commit to git
- Use public key in frontend
- Use service_role key only in backend

---

### 2. Validate Input

**Always validate:**
- Required fields
- Data types
- Format (email, etc.)
- Sanitize input

---

### 3. Handle Errors Gracefully

**Show user-friendly messages:**
- "Unable to save, please try again"
- "Please fill all required fields"
- Don't expose technical errors

---

## Real-World Example

### Complete Setup

**1. Install package:**
```bash
npm install @supabase/supabase-js
```

**2. Create client (`lib/supabase.ts`):**
```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**3. Create API route (`app/api/contact/route.ts`):**
- Handles form submission
- Validates data
- Inserts into Supabase
- Returns response

**4. Update contact form:**
- Submits to API
- Shows success/error
- Resets on success

**5. Test:**
- Submit form
- Check Supabase dashboard
- Verify data saved

**Result:**
- Website connected to Supabase
- Form data saved to database
- Can retrieve data anytime

---

## Key Takeaways

1. **Install Supabase client** - `@supabase/supabase-js` package
2. **Create client file** - Configure with environment variables
3. **Set environment variables** - URL and anon key in `.env.local`
4. **Create API routes** - Handle database operations server-side
5. **Basic operations** - Insert, select, update, delete
6. **Error handling** - Always handle errors gracefully
7. **Security** - Use environment variables, validate input
8. **Test connection** - Verify everything works before proceeding

---

## What's Next?

Excellent! Your website is now connected to Supabase. The final lesson shows you how to actually store form data when visitors submit your contact form. You'll learn to save submissions to your database and retrieve them later.

**Ready?** Let's move to Lesson 9.5: Storing Form Data!

---

## Quick Check

Before moving on, make sure you:
- ✅ Can install the Supabase client package
- ✅ Know how to create a Supabase client file
- ✅ Understand environment variables setup
- ✅ Can create API routes for database operations
- ✅ Understand basic operations (insert, select)
- ✅ Know how to handle errors
- ✅ Understand security best practices
- ✅ Can test the Supabase connection

If anything is unclear, review this lesson or ask questions!
