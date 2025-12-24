# Lesson 9.2: Creating a Supabase Project

**Estimated Time**: 40 minutes

---

## Introduction

This lesson walks you through creating your Supabase account and setting up your first project. You'll learn how to sign up, create a project, and get your API credentials that you'll need to connect your website to Supabase.

**What You'll Learn:**
- How to create a Supabase account
- How to create a new project
- How to get your API credentials
- How to navigate the Supabase dashboard
- Basic project settings

---

## Step 1: Create Supabase Account

### Sign Up Process

**1. Go to Supabase:**
- Visit `supabase.com`
- Click "Start your project" or "Sign up"

**2. Choose sign-up method:**
- Sign up with GitHub (recommended)
- Or sign up with email
- Choose what's easiest for you

**3. Complete sign-up:**
- Follow prompts
- Verify email if needed
- Account created

**That's it! Account is ready.**

---

## Step 2: Create New Project

### Project Setup

**1. Click "New Project":**
- In Supabase dashboard
- Click green "New Project" button
- Or "Create new project"

**2. Fill in project details:**
- **Name:** Your project name (e.g., "Booking Website")
- **Database Password:** Create strong password (save it!)
- **Region:** Choose closest to you
- **Pricing Plan:** Free (to start)

**3. Create project:**
- Click "Create new project"
- Wait for setup (takes 1-2 minutes)
- Project is ready!

---

## Step 3: Get Your API Credentials

### Finding Your Keys

**1. Go to Project Settings:**
- In your project dashboard
- Click "Settings" (gear icon)
- Click "API"

**2. Find your keys:**
- **Project URL:** Your project's API URL
- **anon/public key:** Public API key (safe to use in frontend)
- **service_role key:** Secret key (keep private, backend only)

**3. Save your keys:**
- Copy Project URL
- Copy anon/public key
- Save service_role key securely (don't share!)

**You'll need these to connect your website!**

---

## Understanding Your Credentials

### What Each Key Does

**Project URL:**
- Your Supabase project address
- Used to connect to API
- Looks like: `https://xxxxx.supabase.co`

**anon/public key:**
- Safe to use in frontend code
- Limited permissions
- Can be exposed (it's public)

**service_role key:**
- Secret key, keep private!
- Full access to database
- Only use in backend/server
- Never expose in frontend

**Important:** Never share your service_role key!

---

## Supabase Dashboard Overview

### Main Sections

**1. Table Editor:**
- View your data
- Create tables
- Edit data
- Visual interface

**2. SQL Editor:**
- Write SQL queries
- Run database commands
- Advanced features

**3. Authentication:**
- User management
- Authentication settings
- User accounts

**4. Storage:**
- File storage
- Upload files
- Manage files

**5. API:**
- API documentation
- Endpoints
- Code examples

**6. Settings:**
- Project settings
- API keys
- Configuration

---

## Project Settings

### Important Settings

**1. API Settings:**
- Your API URL
- API keys
- CORS settings

**2. Database Settings:**
- Database password
- Connection info
- Backup settings

**3. General Settings:**
- Project name
- Region
- Billing

**4. Security:**
- Access controls
- Row-level security
- API security

---

## Setting Up Environment Variables

### For Your Website

**Create `.env.local` file:**
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:**
- Never commit `.env.local` to git
- Keep keys secure
- Use public key in frontend
- Use service_role key only in backend

---

## Installing Supabase Client

### For Your Website

**Install Supabase client:**
```bash
npm install @supabase/supabase-js
```

**Or use Cursor:**
```
Add the @supabase/supabase-js package to connect the website to Supabase.
```

---

## Creating Supabase Client

### Connection Code

**Basic setup:**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Cursor prompt:**
```
Create a Supabase client file that connects to Supabase using environment 
variables. Use the public/anon key for frontend access. Include proper 
error handling.
```

---

## Real-World Example

### Complete Setup Process

**Step 1: Sign Up**
- Go to supabase.com
- Sign up with GitHub or email
- Account created

**Step 2: Create Project**
- Click "New Project"
- Name: "Lash Studio Booking"
- Password: [strong password]
- Region: [closest to you]
- Plan: Free
- Create project

**Step 3: Get Credentials**
- Go to Settings → API
- Copy Project URL
- Copy anon/public key
- Save service_role key securely

**Step 4: Set Up Website**
- Add to `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  ```
- Install `@supabase/supabase-js`
- Create client connection

**Result:**
- Supabase project created
- Credentials saved
- Ready to connect website

---

## Common Issues

### Issue 1: Can't Find API Keys

**Problem:**
- Don't see API keys
- Not sure where to look

**Solution:**
- Go to Settings → API
- Keys are in API section
- Look for "Project URL" and "anon public" key

---

### Issue 2: Forgot Database Password

**Problem:**
- Can't remember password
- Need to reset

**Solution:**
- Go to Settings → Database
- Can reset password
- Or use connection string

---

### Issue 3: Project Not Loading

**Problem:**
- Project takes long to load
- Stuck on loading screen

**Solution:**
- Wait a few minutes (first setup takes time)
- Refresh page
- Check internet connection
- Contact support if persists

---

## Best Practices

### 1. Save Credentials Securely

**Do:**
- Save in `.env.local`
- Never commit to git
- Use password manager
- Keep service_role key secret

**Don't:**
- Share keys publicly
- Commit to GitHub
- Use in frontend (service_role)
- Share with others

---

### 2. Use Appropriate Keys

**Frontend (public):**
- Use anon/public key
- Safe to expose
- Limited permissions

**Backend (private):**
- Use service_role key
- Keep secret
- Full permissions

---

### 3. Organize Projects

**Naming:**
- Use descriptive names
- Include purpose
- Easy to identify

**Examples:**
- "Booking Website"
- "Lash Studio Database"
- "Contact Form Storage"

---

## Key Takeaways

1. **Sign up is easy** - GitHub or email, quick process
2. **Project setup is simple** - Name, password, region, done
3. **API credentials are important** - Save them securely
4. **Two types of keys** - Public (anon) and private (service_role)
5. **Dashboard is visual** - Easy to navigate and use
6. **Free tier available** - Start for free, upgrade later
7. **Environment variables** - Store keys securely in `.env.local`
8. **Install client library** - `@supabase/supabase-js` for connection

---

## What's Next?

Great! You've created your Supabase project and have your API credentials. Now you need to understand how to structure your data using tables and fields. The next lesson covers database tables, fields, and how to organize your data effectively.

**Ready?** Let's move to Lesson 9.3: Tables & Fields!

---

## Quick Check

Before moving on, make sure you:
- ✅ Can create a Supabase account
- ✅ Know how to create a new project
- ✅ Can find your API credentials (URL and keys)
- ✅ Understand the difference between anon and service_role keys
- ✅ Know how to set up environment variables
- ✅ Can install the Supabase client library
- ✅ Understand basic dashboard navigation

If anything is unclear, review this lesson or ask questions!
