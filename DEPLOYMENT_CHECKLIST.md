# 🚀 Pre-Deployment Checklist

Use this checklist to ensure your website is ready for production deployment.

---

## ✅ Pre-Build Checks

### Code Quality
- [ ] Run `npm run lint` - No linting errors
- [ ] All TypeScript errors resolved
- [ ] No console errors in browser
- [ ] All TODO/FIXME comments addressed or documented

### Dependencies
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Check `package.json` for correct versions
- [ ] Verify no security vulnerabilities: `npm audit`
- [ ] Update outdated packages if needed: `npm outdated`

### Configuration Files
- [ ] `next.config.js` is properly configured
- [ ] `tsconfig.json` is correct
- [ ] `.gitignore` includes all sensitive files
- [ ] `package.json` has correct scripts

---

## ✅ Environment Variables

### Required Variables (Must Have)
- [ ] `NEXT_PUBLIC_BASE_URL` - Set to production domain
- [ ] `GOOGLE_CLIENT_EMAIL` - Google Calendar service account email
- [ ] `GOOGLE_PRIVATE_KEY` - Google Calendar private key
- [ ] `GOOGLE_PROJECT_ID` - Google Cloud project ID
- [ ] `GOOGLE_CALENDAR_ID` - Calendar ID (usually "primary")
- [ ] `ZOHO_SMTP_USER` - Zoho email username
- [ ] `ZOHO_SMTP_PASS` - Zoho email password
- [ ] `ZOHO_SMTP_HOST` - Zoho SMTP host (default: smtp.zoho.com)
- [ ] `ZOHO_SMTP_PORT` - Zoho SMTP port (default: 465)
- [ ] `FROM_EMAIL` - Email address for sending emails
- [ ] `ADMIN_PASSWORD_HASH` - Admin password hash

### Optional but Recommended
- [ ] `CRON_SECRET` - For securing cron job endpoints
- [ ] `NEXT_PUBLIC_STUDIO_LOCATION` - Studio address
- [ ] `BUSINESS_NOTIFICATION_EMAIL` - Business email
- [ ] `NEXT_PUBLIC_GA_ID` - Google Analytics ID

### Payment Integration (If Using)
- [ ] `MPESA_CONSUMER_KEY` - M-Pesa consumer key
- [ ] `MPESA_CONSUMER_SECRET` - M-Pesa consumer secret
- [ ] `MPESA_SHORTCODE` - M-Pesa business shortcode
- [ ] `MPESA_PASSKEY` - M-Pesa passkey

---

## ✅ Build Testing

### Local Build Test
```bash
# Test the production build locally
npm run build
npm run start
```

- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No build warnings (or acceptable warnings documented)
- [ ] Application starts successfully
- [ ] All pages load correctly
- [ ] No runtime errors in console

### Functionality Testing
- [ ] Homepage loads correctly
- [ ] Booking page works
- [ ] Services page displays correctly
- [ ] Admin login works
- [ ] Booking creation works
- [ ] Email sending works (test booking)
- [ ] Calendar integration works (if configured)
- [ ] Payment processing works (if configured)

---

## ✅ Security Checks

### Environment Variables
- [ ] All sensitive variables are in environment variables (not hardcoded)
- [ ] `.env.local` is in `.gitignore`
- [ ] No API keys or secrets in code
- [ ] `CRON_SECRET` is set (if using cron jobs)

### Authentication
- [ ] Admin password is strong and hashed
- [ ] Client authentication works correctly
- [ ] Password reset functionality works

### API Security
- [ ] Admin endpoints require authentication
- [ ] Cron jobs have security (CRON_SECRET) if configured
- [ ] Input validation on all forms
- [ ] SQL injection protection (if using database)

---

## ✅ Email Configuration

### Email Service Setup
- [ ] Zoho SMTP credentials are correct
- [ ] Test email sending works
- [ ] Booking confirmation emails work
- [ ] Reminder emails work (if cron is set up)
- [ ] Birthday emails work (if cron is set up)
- [ ] Email templates render correctly

### Email Testing
- [ ] Send test booking confirmation
- [ ] Send test reminder email
- [ ] Check email formatting (mobile and desktop)
- [ ] Verify unsubscribe links work

---

## ✅ Google Calendar Integration

### Calendar Setup
- [ ] Google Calendar API is enabled
- [ ] Service account is created
- [ ] Calendar is shared with service account
- [ ] Test booking creates calendar event
- [ ] Calendar events show correct information
- [ ] Available slots sync correctly

---

## ✅ Cron Jobs Setup

### Cron Job Configuration
- [ ] All 4 cron jobs are configured in cron-job.org
- [ ] URLs are correct (no redirects)
- [ ] Schedules are set correctly
- [ ] CRON_SECRET is configured (if using)
- [ ] Authorization headers are set (if using CRON_SECRET)

### Cron Job Testing
- [ ] Test each endpoint manually in browser
- [ ] Check execution history in cron-job.org
- [ ] Verify all return `success: true`
- [ ] Check logs for any errors

**Cron Jobs to Verify:**
- [ ] Appointment Reminders: `/api/cron/send-reminders`
- [ ] Birthday Emails: `/api/cron/send-birthday-emails`
- [ ] Scheduled Emails: `/api/cron/process-scheduled-emails`
- [ ] Cleanup Inactive: `/api/cron/cleanup-inactive-accounts`

---

## ✅ Payment Integration (If Using)

### M-Pesa Setup
- [ ] M-Pesa credentials are configured
- [ ] Test payment works in sandbox
- [ ] Callback URL is correct
- [ ] Payment confirmation emails work
- [ ] Payment status updates correctly

---

## ✅ SEO & Analytics

### SEO Setup
- [ ] Meta tags are configured
- [ ] Sitemap is generated (`/sitemap.xml`)
- [ ] Robots.txt is configured
- [ ] Open Graph tags are set
- [ ] Twitter Card tags are set

### Analytics
- [ ] Google Analytics is configured (if using)
- [ ] Google Search Console is verified (if using)
- [ ] Analytics tracking works

---

## ✅ Performance

### Optimization
- [ ] Images are optimized
- [ ] Fonts are optimized
- [ ] CSS is minified
- [ ] JavaScript bundles are optimized
- [ ] No large unused dependencies

### Testing
- [ ] Page load times are acceptable
- [ ] Lighthouse score is good (90+)
- [ ] Mobile performance is good
- [ ] No console errors

---

## ✅ Content & Data

### Content Review
- [ ] All text content is correct
- [ ] Images are uploaded and display correctly
- [ ] Services are configured correctly
- [ ] Pricing is correct
- [ ] Contact information is accurate

### Data Files
- [ ] `data/settings.json` is configured
- [ ] `data/services.json` has correct services
- [ ] `data/availability.json` is set up
- [ ] All JSON files are valid

---

## ✅ Deployment Platform Setup

### Netlify (If Using)
- [ ] Netlify account is set up
- [ ] Site is connected to repository
- [ ] Build command: `npm run build`
- [ ] Publish directory: `.next`
- [ ] Node version is set (18.x or 20.x)
- [ ] All environment variables are set in Netlify dashboard
- [ ] Custom domain is configured (if using)
- [ ] SSL certificate is active

### Vercel (If Using)
- [ ] Vercel account is set up
- [ ] Project is connected to repository
- [ ] Build settings are correct
- [ ] All environment variables are set
- [ ] Custom domain is configured (if using)

### Other Platforms
- [ ] Platform-specific configuration is complete
- [ ] Environment variables are set
- [ ] Build process is configured
- [ ] Domain is configured

---

## ✅ Post-Deployment Verification

### Immediate Checks
- [ ] Website is accessible at production URL
- [ ] All pages load correctly
- [ ] No 404 errors
- [ ] No console errors
- [ ] SSL certificate is active (HTTPS)

### Functionality Testing
- [ ] Create a test booking
- [ ] Verify booking confirmation email
- [ ] Check admin dashboard access
- [ ] Test all major features
- [ ] Verify cron jobs are running

### Monitoring
- [ ] Set up error monitoring (if available)
- [ ] Check application logs
- [ ] Monitor cron job execution
- [ ] Set up uptime monitoring (optional)

---

## ✅ Documentation

### Documentation Files
- [ ] `README.md` is up to date
- [ ] `SETUP_INSTRUCTIONS.md` is complete
- [ ] `COMPLETE_CRON_JOBS_SETUP.md` is available
- [ ] `.env.example` file exists
- [ ] All setup guides are accessible

---

## 🎯 Final Steps

### Before Going Live
1. [ ] Run final build test: `npm run build`
2. [ ] Test all critical paths
3. [ ] Verify all environment variables are set
4. [ ] Check that sensitive data is not exposed
5. [ ] Review error logs
6. [ ] Test on multiple devices/browsers

### Go Live Checklist
- [ ] Deploy to production
- [ ] Verify website is accessible
- [ ] Test booking system
- [ ] Verify email sending
- [ ] Check cron jobs are running
- [ ] Monitor for errors (first 24 hours)

---

## 📝 Notes

**Important Reminders:**
- Never commit `.env.local` to git
- Always test builds locally before deploying
- Keep backups of your data files
- Monitor logs after deployment
- Test all features after deployment

**Support Resources:**
- Check `SETUP_INSTRUCTIONS.md` for setup help
- Check `COMPLETE_CRON_JOBS_SETUP.md` for cron setup
- Review error logs if issues occur

---

## ✅ Ready to Deploy?

Once all items above are checked, you're ready to deploy! 🚀

**Deployment Command:**
```bash
# Build for production
npm run build

# If deploying manually, start the server
npm run start
```

**For Platform-Specific Deployment:**
- **Netlify**: Push to connected repository (auto-deploys)
- **Vercel**: Push to connected repository (auto-deploys)
- **Other**: Follow platform-specific deployment instructions

