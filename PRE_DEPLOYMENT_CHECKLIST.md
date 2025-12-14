# 🚀 Pre-Deployment Checklist - Ready to Publish

This checklist ensures your code is ready for pushing to Git and deploying to production.

---

## ✅ Code Quality Checks

### 1. Remove Localhost References
- [x] All `localhost:3000` references removed from production code
- [x] All API routes use production base URL (`https://lashdiary.co.ke`)
- [x] All URL generation functions use proper base URL fallback

### 2. Remove Website Builder References
- [x] All "website builder" references changed to "system setup"
- [x] All "building websites" changed to "systems for service providers"
- [x] All "build slot" changed to "project slot"

### 3. Code Review
- [ ] Run `npm run lint` - Check for linting errors
- [ ] Run `npm run build` - Verify build succeeds
- [ ] Check for TypeScript errors
- [ ] Verify no console errors in browser

---

## ✅ Security Checks

### 1. Environment Variables
- [ ] `.env.local` is in `.gitignore` ✅ (Already configured)
- [ ] No API keys or secrets hardcoded in code
- [ ] All sensitive data uses environment variables
- [ ] `.env.example` file exists (if needed)

### 2. Git Security
- [ ] No passwords or API keys in git history
- [ ] `.gitignore` properly configured ✅
- [ ] No sensitive files tracked by git

---

## ✅ Build & Test

### 1. Local Build Test
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Test build
npm run build

# Test production server (optional)
npm run start
```

- [ ] Build completes without errors
- [ ] No TypeScript compilation errors
- [ ] All pages compile successfully
- [ ] No critical warnings

### 2. Functionality Test
- [ ] Homepage loads correctly
- [ ] Booking page works
- [ ] Services page displays
- [ ] Admin login works
- [ ] API routes respond correctly

---

## ✅ Environment Variables for Production

### Required Variables (Set in Deployment Platform)

#### Base Configuration
- [ ] `NEXT_PUBLIC_BASE_URL=https://lashdiary.co.ke`
- [ ] `NODE_ENV=production`

#### Email Configuration (Choose One)
**Option 1: Zoho SMTP**
- [ ] `ZOHO_SMTP_HOST=smtp.zoho.com`
- [ ] `ZOHO_SMTP_PORT=465`
- [ ] `ZOHO_SMTP_USER=your-email@zoho.com`
- [ ] `ZOHO_SMTP_PASS=your-app-password`
- [ ] `ZOHO_FROM_EMAIL=your-email@zoho.com`
- [ ] `FROM_EMAIL=your-email@zoho.com`
- [ ] `EMAIL_FROM_NAME=The LashDiary`

**Option 2: Resend**
- [ ] `RESEND_API_KEY=re_your_api_key`
- [ ] `FROM_EMAIL=your-email@yourdomain.com`

#### Google Calendar (Optional but Recommended)
- [ ] `GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com`
- [ ] `GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
- [ ] `GOOGLE_PROJECT_ID=your-project-id`
- [ ] `GOOGLE_CALENDAR_ID=primary`
- [ ] `GOOGLE_CALENDAR_EMAIL=hello@lashdiary.co.ke`

#### Supabase (If Using)
- [ ] `SUPABASE_URL=https://your-project.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`

#### Admin Authentication
- [ ] `ADMIN_PASSWORD_HASH=your-hashed-password`

#### Business Information
- [ ] `NEXT_PUBLIC_STUDIO_LOCATION="LashDiary Studio, Nairobi, Kenya"`
- [ ] `BUSINESS_NOTIFICATION_EMAIL=hello@lashdiary.co.ke`
- [ ] `OWNER_EMAIL=hello@lashdiary.co.ke`

#### Payment Integration (If Using)
- [ ] `MPESA_CONSUMER_KEY=your-consumer-key`
- [ ] `MPESA_CONSUMER_SECRET=your-consumer-secret`
- [ ] `MPESA_SHORTCODE=your-shortcode`
- [ ] `MPESA_PASSKEY=your-passkey`
- [ ] `MPESA_ENVIRONMENT=production`
- [ ] `MPESA_CALLBACK_URL=https://lashdiary.co.ke/api/mpesa/callback`

#### Analytics (Optional)
- [ ] `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`

#### Cron Jobs (If Using)
- [ ] `CRON_SECRET=your-secret-key`

---

## ✅ Git Preparation

### 1. Check Git Status
```bash
git status
```

- [ ] No uncommitted sensitive files
- [ ] All changes are staged or committed
- [ ] `.env.local` is not tracked

### 2. Review Changes
```bash
git diff
```

- [ ] Review all changes before committing
- [ ] Ensure no localhost references
- [ ] Ensure no hardcoded secrets

### 3. Commit Changes
```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Prepare for production deployment

- Remove all localhost:3000 references
- Update website builder references to system setup
- Ensure all URLs use production base URL
- Ready for deployment"
```

---

## ✅ Deployment Platform Setup

### For Netlify

1. **Connect Repository**
   - [ ] Repository is connected to Netlify
   - [ ] Build command: `npm run build`
   - [ ] Publish directory: `.next`
   - [ ] Node version: 18.x

2. **Environment Variables**
   - [ ] All required environment variables are set in Netlify dashboard
   - [ ] Variables are set for production site (not preview)

3. **Domain Configuration**
   - [ ] Custom domain configured (if using)
   - [ ] SSL certificate active
   - [ ] DNS records configured

### For Vercel

1. **Connect Repository**
   - [ ] Repository is connected to Vercel
   - [ ] Framework preset: Next.js
   - [ ] Build command: `npm run build`

2. **Environment Variables**
   - [ ] All required environment variables are set
   - [ ] Variables are set for production environment

3. **Domain Configuration**
   - [ ] Custom domain configured (if using)
   - [ ] SSL certificate active

---

## ✅ Final Verification

### Before Pushing to Git
- [ ] All code changes reviewed
- [ ] No localhost references in code
- [ ] No sensitive data in code
- [ ] Build succeeds locally
- [ ] All tests pass (if any)

### Before Deploying
- [ ] Code is pushed to repository
- [ ] All environment variables are set in deployment platform
- [ ] Domain is configured
- [ ] SSL certificate is active

### After Deployment
- [ ] Website is accessible at production URL
- [ ] Homepage loads correctly
- [ ] Booking system works
- [ ] Admin login works
- [ ] Email sending works (test with booking)
- [ ] All pages load without errors
- [ ] No console errors

---

## 🚀 Deployment Commands

### Git Commands
```bash
# Check status
git status

# Stage all changes
git add .

# Commit changes
git commit -m "Prepare for production deployment"

# Push to remote
git push origin main
# or
git push origin master
```

### Build Commands
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test production build locally (optional)
npm run start
```

---

## 📝 Post-Deployment Checklist

After deployment, verify:

1. **Website Accessibility**
   - [ ] Website loads at production URL
   - [ ] HTTPS is working
   - [ ] No mixed content warnings

2. **Core Functionality**
   - [ ] Homepage displays correctly
   - [ ] Services page works
   - [ ] Booking page works
   - [ ] Contact page works

3. **Admin Features**
   - [ ] Admin login works
   - [ ] Admin dashboard loads
   - [ ] Can manage bookings
   - [ ] Can manage services

4. **Email System**
   - [ ] Test booking sends confirmation email
   - [ ] Business receives notification email
   - [ ] Email formatting is correct

5. **Payment System** (If Using)
   - [ ] Payment processing works
   - [ ] Callbacks are received
   - [ ] Payment confirmations work

6. **Calendar Integration** (If Configured)
   - [ ] Bookings create calendar events
   - [ ] Available slots sync correctly

---

## ⚠️ Important Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Always test build locally** before deploying
3. **Set environment variables** in deployment platform before deploying
4. **Monitor logs** after deployment for any errors
5. **Test all features** after deployment

---

## ✅ Ready to Deploy?

Once all items above are checked:
1. ✅ Code is ready
2. ✅ Environment variables are documented
3. ✅ Build succeeds locally
4. ✅ Git is prepared
5. ✅ Deployment platform is configured

**You're ready to push and deploy! 🚀**

---

## 📞 Support

If you encounter issues:
- Check deployment logs
- Verify environment variables
- Review `DEPLOYMENT_CHECKLIST.md`
- Check `NETLIFY_DEPLOYMENT_CHECKLIST.md` (if using Netlify)

