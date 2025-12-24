# Lesson 7: Setting Up Environment Variables

## Introduction

Environment variables let you store sensitive information (like API keys) securely. Let's set them up properly.

**Estimated Time**: 20 minutes

---

## What Are Environment Variables?

### Purpose

- **Store sensitive data**: API keys, passwords, secrets
- **Configuration**: Different settings for dev/production
- **Security**: Keep secrets out of code

### Example Uses

- Email service API keys
- Payment gateway credentials
- Database connections
- API endpoints

---

## Creating .env.local

### Step 1: Create File

In your project root, create `.env.local`

**Important**: 
- Starts with a dot (`.`)
- No extension
- Name exactly: `.env.local`

### Step 2: Add Variables

```env
# Email Configuration
EMAIL_API_KEY=your_email_api_key_here
EMAIL_FROM=noreply@yourbusiness.com

# Payment Gateway
PAYMENT_API_KEY=your_payment_key_here
PAYMENT_SECRET=your_payment_secret_here

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BUSINESS_NAME=Your Business Name
```

### Step 3: Naming Convention

**Public variables** (accessible in browser):
- Prefix: `NEXT_PUBLIC_`
- Example: `NEXT_PUBLIC_SITE_URL`

**Private variables** (server-only):
- No prefix
- Example: `EMAIL_API_KEY`

---

## Using Environment Variables

### In Server Components/API Routes

```typescript
const apiKey = process.env.EMAIL_API_KEY
```

### In Client Components

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
```

**Only `NEXT_PUBLIC_` variables work in client components!**

---

## .gitignore

### Why Ignore .env.local?

**Never commit secrets to Git!**

Your `.gitignore` should include:
```
.env.local
.env*.local
```

This prevents accidentally sharing secrets.

---

## Environment Files

### Development
- `.env.local` - Local development (gitignored)

### Production
- Set in hosting platform (Netlify, Vercel)
- Never commit to Git

---

## Best Practices

### ✅ Do

- Use `.env.local` for development
- Prefix public vars with `NEXT_PUBLIC_`
- Add `.env.local` to `.gitignore`
- Use hosting platform for production vars

### ❌ Don't

- Commit `.env.local` to Git
- Hardcode secrets in code
- Share API keys
- Use same keys for dev/production

---

## Key Takeaways

✅ **Environment variables** store sensitive configuration

✅ **`.env.local`** for local development

✅ **`NEXT_PUBLIC_`** prefix for browser-accessible vars

✅ **Never commit** `.env.local` to Git

✅ **Set in hosting platform** for production

---

## What's Next?

Perfect! Environment variables are set up. In the final lesson of this module, we'll explore package.json scripts and how to use them.

**Ready to continue?** Click "Next Lesson" to proceed!

