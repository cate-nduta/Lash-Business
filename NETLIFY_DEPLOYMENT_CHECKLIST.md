# Netlify Deployment Checklist ✅

## ✅ Pre-Deployment Fixes Applied

### 1. **Edge Runtime Issues - FIXED**
- Added `export const runtime = 'nodejs'` to all API routes that use `data-utils` or `admin-auth`:
  - ✅ `app/sitemap.ts`
  - ✅ `app/api/settings/route.ts`
  - ✅ `app/api/admin/search/index/route.ts`
  - ✅ `app/api/admin/revenue/route.ts`
  - ✅ `app/api/calendar/available-slots/route.ts`
  - ✅ `app/api/homepage/route.ts`
  - ✅ `app/api/availability/route.ts`
  - ✅ `app/api/gallery/route.ts`
  - ✅ `app/api/services/route.ts`
  - ✅ `app/api/contact/route.ts`
  - ✅ `app/api/admin/newsletters/upload/route.ts`
  - ✅ `app/api/admin/newsletters/upload-logo/route.ts`
  - ✅ `app/api/admin/partner-onboarding/route.ts`

### 2. **Font Issues - FIXED**
- ✅ Removed Ballet font (was causing build warnings)
- ✅ Removed all references to `--font-ballet` from layout

### 3. **Unused Dependencies - FIXED**
- ✅ Deleted `lib/pdf-to-images.ts` (unused, was causing `pdfjs-dist` import error)

### 4. **File System Storage - CONFIGURED**
- ✅ Code uses Supabase for storage when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- ✅ File system fallback only used in development (when Supabase not configured)
- ✅ Perfect for Netlify's read-only file system

## 📋 Required Environment Variables for Netlify

Make sure these are set in Netlify's environment variables:

### Required:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `SUPABASE_GALLERY_BUCKET` - Your Supabase storage bucket name

### 🚨 Pesapal Payment Gateway (REQUIRED for payments):
- `PESAPAL_CONSUMER_KEY` - Your Pesapal consumer key
- `PESAPAL_CONSUMER_SECRET` - Your Pesapal consumer secret
- `PESAPAL_ENVIRONMENT` - Set to `live` for production
- `NEXT_PUBLIC_BASE_URL` - Your production URL (e.g., `https://lashdiary.co.ke`)
- `PESAPAL_CALLBACK_URL` - Your callback URL (e.g., `https://lashdiary.co.ke/api/pesapal/callback`)
- `PESAPAL_IPN_URL` - Your IPN URL (e.g., `https://lashdiary.co.ke/api/pesapal/ipn`)

**⚠️ IMPORTANT**: Without these Pesapal variables, payments will NOT work! See `NETLIFY_PESAPAL_SETUP.md` for detailed setup instructions.

### Email Configuration (choose one):
- **Option 1: Resend**
  - `RESEND_API_KEY`
  
- **Option 2: Zoho SMTP**
  - `ZOHO_SMTP_HOST`
  - `ZOHO_SMTP_PORT`
  - `ZOHO_SMTP_USER`
  - `ZOHO_SMTP_PASS`
  - `ZOHO_FROM_EMAIL`
  - `EMAIL_FROM_NAME`

### Google Calendar (optional but recommended):
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_EMAIL`

### Other:
- `OWNER_EMAIL` - Owner notification email
- `CALENDAR_EMAIL` - Calendar email
- `NODE_VERSION` - Set to "18" (already in netlify.toml)

## ✅ Build Configuration

### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = ".next"

[functions]
  node_bundler = "esbuild"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "18"
```

### next.config.js
- ✅ Configured for Netlify
- ✅ Image optimization settings
- ✅ Supabase image domains configured

## ⚠️ Expected Build Warnings (Not Errors)

These are **normal** and **expected**:
- "Dynamic server usage: Route couldn't be rendered statically because it used `cookies`"
  - This is correct behavior for authenticated routes
  - Routes using cookies must be dynamic

## 🚀 Deployment Steps

1. **Set Environment Variables** in Netlify dashboard
2. **Connect Repository** to Netlify
3. **Deploy** - Netlify will automatically:
   - Run `npm install`
   - Run `npm run build`
   - Deploy to `.next` directory

## ✅ Verification Checklist

After deployment, verify:
- [ ] Homepage loads correctly
- [ ] Booking page works
- [ ] Admin login works
- [ ] API routes respond correctly
- [ ] Images load from Supabase
- [ ] Email sending works (test with a booking)

## 🔧 Troubleshooting

### If build fails:
1. Check environment variables are set correctly
2. Verify Supabase credentials are valid
3. Check Netlify build logs for specific errors

### If runtime errors occur:
1. Verify all `runtime = 'nodejs'` declarations are in place
2. Check Supabase connection
3. Verify file system operations are using Supabase (not local files)

## 📝 Notes

- All data storage uses Supabase (not local file system)
- All API routes that need Node.js runtime are configured
- Build completes successfully with no errors
- Only expected warnings about dynamic routes

