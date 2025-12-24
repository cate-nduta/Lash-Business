# Lesson 11.4: Environment Variables

**Estimated Time**: 25 minutes

---

## Introduction

Environment variables are secret values (like API keys and passwords) that your website needs to work correctly. When you deploy to Netlify, you need to configure these variables so your website can access services like email, calendar, and database. This lesson shows you how to set up environment variables in Netlify for your deployed website.

**What You'll Learn:**
- What environment variables are
- Why they're needed for deployment
- What variables your website needs
- How to add variables in Netlify
- How to verify they're working
- Security best practices

---

## What Are Environment Variables?

### Simple Explanation

**Environment variables are:**
- Secret values stored securely
- API keys, passwords, and configuration
- Not visible in your code
- Different for development vs. production
- Required for services to work

**Examples:**
- Email API key
- Database connection string
- Google Calendar credentials
- Payment gateway keys

**Think of it like:**
- House keys (you need them, but don't leave them in plain sight)
- Passwords (required but kept secret)
- Configuration settings (different for each environment)

**Environment variables = Secret configuration values!**

---

## Why Environment Variables Matter

### Security and Configuration

**Why use environment variables:**
- **Security** - Keep secrets out of code
- **Flexibility** - Different values for dev/production
- **Safety** - Don't commit secrets to GitHub
- **Required** - Services need these to work

**Without environment variables:**
- API keys in code (insecure!)
- Hard to change values
- Same config for dev and production
- Secrets exposed in GitHub

**With environment variables:**
- Secrets stored securely
- Easy to update
- Different values per environment
- Code stays clean and safe

---

## What Variables Your Website Needs

### Common Environment Variables

**Your website likely needs:**

**1. Email Service (Resend):**
- `RESEND_API_KEY` - Your Resend API key
- `FROM_EMAIL` - Email address for sending emails

**2. Google Calendar (if using):**
- `GOOGLE_CLIENT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Private key for authentication
- `GOOGLE_PROJECT_ID` - Google Cloud project ID
- `GOOGLE_CALENDAR_ID` - Calendar ID (usually "primary")
- `GOOGLE_CALENDAR_EMAIL` - Your calendar email

**3. Database (Supabase, if using):**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

**4. Payment (if using M-Pesa or others):**
- `MPESA_CONSUMER_KEY` - M-Pesa consumer key
- `MPESA_CONSUMER_SECRET` - M-Pesa consumer secret
- `MPESA_SHORTCODE` - Business shortcode
- `MPESA_PASSKEY` - M-Pesa passkey

**5. Website Configuration:**
- `NEXT_PUBLIC_BASE_URL` - Your website URL (e.g., https://yourdomain.com)
- `NEXT_PUBLIC_STUDIO_LOCATION` - Your business location
- `NEXT_PUBLIC_CONTACT_EMAIL` - Contact email address

**Note:** Variables starting with `NEXT_PUBLIC_` are visible to browsers. Others are server-only secrets.

---

## Finding Your Environment Variables

### Where to Get Them

**1. Check your `.env.local` file:**
- Open your project folder
- Look for `.env.local` file
- Contains all your local environment variables
- Copy these values for Netlify

**2. Check service dashboards:**
- **Resend:** API Keys section
- **Google Cloud:** Service account JSON file
- **Supabase:** Project settings → API
- **M-Pesa:** Developer portal

**3. Check setup documentation:**
- Review setup guides you followed
- Check service account emails
- Verify API keys are active

---

## Step-by-Step: Adding Variables to Netlify

### Step 1: Access Netlify Site Settings

**1. Go to Netlify dashboard:**
- Log into netlify.com
- Click on your site
- Go to site dashboard

**2. Navigate to environment variables:**
- Click "Site settings"
- Click "Environment variables" in left menu
- You'll see list of variables (empty at first)

---

### Step 2: Add Each Variable

**For each variable you need:**

**1. Click "Add a variable":**
- Button at top of environment variables list
- Opens form to add new variable

**2. Enter variable details:**
- **Key:** Variable name (e.g., `RESEND_API_KEY`)
- **Value:** The actual value (e.g., `re_abc123...`)
- **Scopes:** Choose where it applies
  - "All scopes" (recommended)
  - Or specific branch/environment

**3. Save the variable:**
- Click "Add variable"
- Variable appears in list
- Repeat for each variable

---

### Step 3: Add All Required Variables

**Add variables one by one:**

**Email variables:**
- `RESEND_API_KEY` = Your Resend API key
- `FROM_EMAIL` = Your sending email address

**Google Calendar (if using):**
- `GOOGLE_CLIENT_EMAIL` = Service account email
- `GOOGLE_PRIVATE_KEY` = Full private key (with quotes and \n)
- `GOOGLE_PROJECT_ID` = Project ID
- `GOOGLE_CALENDAR_ID` = "primary" or your calendar ID
- `GOOGLE_CALENDAR_EMAIL` = Your calendar email

**Database (if using Supabase):**
- `SUPABASE_URL` = Your Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` = Service role key

**Website configuration:**
- `NEXT_PUBLIC_BASE_URL` = https://yourdomain.com
- `NEXT_PUBLIC_STUDIO_LOCATION` = "Your Studio Name, City, Country"
- `NEXT_PUBLIC_CONTACT_EMAIL` = hello@yourdomain.com

**Payment (if using):**
- Add M-Pesa or payment gateway variables

---

## Important Notes for Specific Variables

### Google Private Key

**Special formatting needed:**
- Must include full key with headers
- Include `-----BEGIN PRIVATE KEY-----`
- Include `-----END PRIVATE KEY-----`
- Use quotes around the value
- Include `\n` characters for line breaks

**Example format:**
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**How to get it:**
- Open your service account JSON file
- Copy the entire `private_key` value
- Paste into Netlify (with quotes)

---

### Base URL

**Important:**
- Use your actual domain (not localhost)
- Must start with `https://`
- No trailing slash
- Example: `https://yourdomain.com`

**Why it matters:**
- Used for email links
- Used for callback URLs
- Required for proper functionality

---

## Verifying Variables Are Set

### Check in Netlify

**1. Review variable list:**
- Go to Environment variables
- Verify all variables are listed
- Check names are correct
- Values are hidden (shows as dots)

**2. Check variable scopes:**
- Ensure "All scopes" selected
- Or appropriate branch selected
- Variables apply to all deployments

---

### Test Your Website

**1. Trigger a new deployment:**
- Make a small change to your code
- Push to GitHub
- Netlify redeploys with new variables

**2. Test functionality:**
- Test contact form (sends email)
- Test booking (creates calendar event)
- Test any features using APIs
- Check for errors in Netlify logs

**3. Check Netlify logs:**
- Go to "Deploys" tab
- Click on latest deploy
- Check "Deploy log" for errors
- Look for missing variable errors

---

## Common Issues

### Issue 1: Variables Not Working

**Problem:**
- Website works locally but not on Netlify
- Features using APIs don't work
- Errors about missing variables

**Solutions:**
- Verify variables are added in Netlify
- Check variable names match exactly (case-sensitive!)
- Ensure values are correct
- Redeploy after adding variables
- Check Netlify logs for errors

---

### Issue 2: Wrong Variable Names

**Problem:**
- Variables added but not working
- Code can't find variables

**Solutions:**
- Check exact variable names in code
- Ensure names match exactly
- Check for typos
- Verify case sensitivity (RESEND_API_KEY vs resend_api_key)

---

### Issue 3: Private Key Formatting

**Problem:**
- Google Calendar not working
- Authentication errors

**Solutions:**
- Ensure private key has quotes
- Include BEGIN/END markers
- Include \n characters
- Copy entire key from JSON file
- No extra spaces or line breaks

---

## Security Best Practices

### 1. Never Commit Secrets

**Don't:**
- Commit `.env.local` to GitHub
- Put API keys in code
- Share secrets publicly
- Store secrets in comments

**Do:**
- Keep `.env.local` in `.gitignore`
- Use environment variables
- Share secrets securely if needed
- Rotate keys if exposed

---

### 2. Use Different Values

**Development vs. Production:**
- Use test API keys locally
- Use production keys in Netlify
- Different Supabase projects if possible
- Test email addresses vs. real ones

---

### 3. Regular Key Rotation

**Best practice:**
- Rotate API keys periodically
- Update in Netlify when rotated
- Remove old/unused keys
- Monitor for unauthorized access

---

### 4. Limit Access

**Who can see variables:**
- Only add team members who need access
- Don't share Netlify account passwords
- Use team permissions appropriately
- Review access regularly

---

## Using Cursor for Help

### Environment Variable Assistance

**You can ask Cursor:**
```
I need to set up environment variables in Netlify for my deployed website.
My website uses Resend for emails, Google Calendar, and Supabase.
Help me identify all the variables I need and how to format them correctly.
```

**Cursor can help:**
- Identify required variables
- Format values correctly
- Troubleshoot issues
- Verify configuration

---

## Real-World Example

### Complete Environment Variable Setup

**Step 1: Identify variables needed**
- Resend API key
- Google Calendar credentials
- Base URL
- Contact email

**Step 2: Get values**
- Copy from `.env.local`
- Get Resend key from dashboard
- Get Google credentials from JSON file
- Set base URL to production domain

**Step 3: Add to Netlify**
- Go to Site settings → Environment variables
- Add `RESEND_API_KEY` = `re_abc123...`
- Add `FROM_EMAIL` = `hello@yourdomain.com`
- Add `GOOGLE_CLIENT_EMAIL` = `service@project.iam.gserviceaccount.com`
- Add `GOOGLE_PRIVATE_KEY` = `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
- Add `GOOGLE_PROJECT_ID` = `your-project-id`
- Add `GOOGLE_CALENDAR_ID` = `primary`
- Add `GOOGLE_CALENDAR_EMAIL` = `hello@yourdomain.com`
- Add `NEXT_PUBLIC_BASE_URL` = `https://yourdomain.com`
- Add `NEXT_PUBLIC_CONTACT_EMAIL` = `hello@yourdomain.com`

**Step 4: Verify**
- Check all variables listed
- Trigger new deployment
- Test website functionality
- Check logs for errors

**Result:**
- All variables configured
- Website works in production
- Email sending works
- Calendar integration works
- Everything secure

---

## Best Practices

### 1. Document Your Variables

**Keep a list:**
- Which variables you use
- Where to get them
- What they're for
- When they were last updated

---

### 2. Test After Adding

**Always test:**
- After adding variables
- After updating values
- After redeploying
- Verify functionality works

---

### 3. Use Descriptive Names

**Clear variable names:**
- `RESEND_API_KEY` (not `API_KEY`)
- `GOOGLE_CALENDAR_EMAIL` (not `EMAIL`)
- Makes it clear what each does

---

### 4. Keep Backups

**Document values:**
- Keep secure backup of values
- Store in password manager
- Don't lose access to services
- Can recover if needed

---

## Key Takeaways

1. **Environment variables store secrets** - API keys, passwords, configuration
2. **Required for production** - Services need these to work
3. **Add in Netlify settings** - Site settings → Environment variables
4. **Match variable names exactly** - Case-sensitive, no typos
5. **Format private keys correctly** - Include quotes and \n characters
6. **Use production values** - Different from local development
7. **Test after adding** - Verify everything works
8. **Keep secrets secure** - Never commit to GitHub

---

## What's Next?

Perfect! Your environment variables are now configured in Netlify. Your website should be fully functional in production. The final step is going through a comprehensive checklist to ensure everything is ready before you officially launch your website.

**Ready?** Let's move to Lesson 11.5: Going Live Checklist!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand what environment variables are (secret configuration values)
- ✅ Know why they're needed (services require API keys and secrets)
- ✅ Can identify which variables your website needs (email, calendar, database, etc.)
- ✅ Know how to add variables in Netlify (Site settings → Environment variables)
- ✅ Understand how to format special values (private keys with quotes)
- ✅ Can verify variables are working (test functionality, check logs)
- ✅ Understand security best practices (never commit secrets, use different values)
- ✅ Have added all required environment variables to Netlify

If anything is unclear, review this lesson or ask questions!

