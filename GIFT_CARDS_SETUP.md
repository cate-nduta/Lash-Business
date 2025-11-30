# Gift Cards Private Access Setup Guide

This guide will help you set up private access to the Gift Cards page using a secret token.

## Option 1: Using Environment Variable (Recommended)

### Step 1: Create or Edit `.env.local` File

1. In your project root directory (same folder as `package.json`), create or open the `.env.local` file
2. Add this line with your custom secret token:

```env
NEXT_PUBLIC_GIFT_CARD_SECRET_TOKEN=your-custom-secret-token-here
```

**Example:**
```env
NEXT_PUBLIC_GIFT_CARD_SECRET_TOKEN=lashdiary-gift-2024-secret
```

### Step 2: Restart Your Dev Server

1. Stop your dev server (press `Ctrl+C`)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 3: Access the Gift Cards Page

Visit the URL with your secret token:
```
http://localhost:3000/gift-cards?token=your-custom-secret-token-here
```

**Example:**
```
http://localhost:3000/gift-cards?token=lashdiary-gift-2024-secret
```

## Option 2: Change Token Directly in Code

### Step 1: Open the Gift Cards Page File

1. Open `app/gift-cards/page.tsx`
2. Find line 11 which looks like:
   ```typescript
   const GIFT_CARD_SECRET_TOKEN = process.env.NEXT_PUBLIC_GIFT_CARD_SECRET_TOKEN || 'gift-card-secret-2024'
   ```

### Step 2: Change the Default Token

Replace `'gift-card-secret-2024'` with your own secret token:
```typescript
const GIFT_CARD_SECRET_TOKEN = process.env.NEXT_PUBLIC_GIFT_CARD_SECRET_TOKEN || 'your-custom-secret-token'
```

### Step 3: Save and Access

1. Save the file
2. Access the page at:
   ```
   http://localhost:3000/gift-cards?token=your-custom-secret-token
   ```

## How It Works

- ✅ **With Token**: If you visit `/gift-cards?token=YOUR_SECRET_TOKEN`, the page loads normally
- ❌ **Without Token**: If someone visits `/gift-cards` without the token (or with wrong token), they see a 404 page
- 🔒 **Private**: The Gift Cards link has been removed from the navigation menu, so it's not publicly visible

## Example Workflow

1. **Set your secret token** in `.env.local`:
   ```
   NEXT_PUBLIC_GIFT_CARD_SECRET_TOKEN=my-super-secret-token-123
   ```

2. **Restart your server**

3. **Access the page** using:
   ```
   http://localhost:3000/gift-cards?token=my-super-secret-token-123
   ```

4. **Share the secret URL** only with people who should have access to purchase gift cards

## Tips

- ✅ Use a strong, unique token (mix of letters, numbers, dashes)
- ✅ Change it periodically for security
- ✅ Don't commit `.env.local` to git (it's already in `.gitignore`)
- ✅ For production, set the environment variable in your hosting platform

## Production Setup

When deploying to production (Netlify, Vercel, etc.):

1. Go to your hosting platform's environment variables settings
2. Add: `NEXT_PUBLIC_GIFT_CARD_SECRET_TOKEN` = `your-production-secret-token`
3. Redeploy your site
4. Access gift cards at: `https://yourdomain.com/gift-cards?token=your-production-secret-token`

## Current Default Token

If you haven't set up a custom token yet, the default is:
- **Default Token**: `gift-card-secret-2024`
- **Access URL**: `http://localhost:3000/gift-cards?token=gift-card-secret-2024`

⚠️ **Important**: Change this default token for security!

