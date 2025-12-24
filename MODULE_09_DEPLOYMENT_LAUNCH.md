# Module 8: Deployment & Launch

## Overview

In this final module, you'll deploy your booking website to the internet so it's accessible to everyone. You'll learn how to deploy to Vercel or Netlify, configure your domain, and go live with your website.

**Estimated Time**: 2-3 hours

---

## Lesson 8.1: Preparing for Deployment

Before deploying, we need to prepare your code for production.

### Step 1: Final Code Review

Check these items before deploying:

- ✅ All features are working locally
- ✅ No console errors
- ✅ All environment variables are documented
- ✅ `.env.local` is in `.gitignore` (never commit secrets!)
- ✅ Build completes without errors

### Step 2: Test Production Build

Test that your site builds correctly:

```bash
# Build for production
npm run build

# If build succeeds, test the production server
npm start
```

Visit `http://localhost:3000` and test all features.

### Step 3: Update Environment Variables

Make sure all URLs point to production:

```env
# Update base URL for production
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Update callback URLs for payment gateways
PESAPAL_CALLBACK_URL=https://yourdomain.com/api/pesapal/callback
PESAPAL_IPN_URL=https://yourdomain.com/api/pesapal/ipn
```

### Step 4: Create .gitignore

Make sure `.gitignore` includes:

```
# Environment variables
.env
.env.local
.env*.local

# Dependencies
node_modules/

# Build outputs
.next/
out/
build/

# IDE
.vscode/
.idea/

# OS
.DS_Store
```

✅ **Checkpoint**: Your code should be ready for deployment!

---

## Lesson 8.2: Setting Up Git Repository

We'll use Git to manage your code and deploy it.

### Step 1: Initialize Git (If Not Done)

```bash
# Initialize git repository
git init

# Check status
git status
```

### Step 2: Create Initial Commit

```bash
# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Booking website ready for deployment"
```

### Step 3: Create GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click "New" repository
3. Name it (e.g., "booking-website")
4. Don't initialize with README
5. Click "Create repository"

### Step 4: Connect and Push

```bash
# Add remote repository (replace with your URL)
git remote add origin https://github.com/yourusername/booking-website.git

# Push to GitHub
git push -u origin main
```

**Note**: If your default branch is `master`, use `master` instead of `main`.

✅ **Checkpoint**: Your code should be on GitHub!

---

## Lesson 8.3: Deploying to Vercel

Vercel is the easiest way to deploy Next.js applications.

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with GitHub (recommended)

### Step 2: Import Your Project

1. Click "Add New" → "Project"
2. Import your GitHub repository
3. Vercel will detect it's a Next.js project

### Step 3: Configure Build Settings

Vercel should auto-detect:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Step 4: Add Environment Variables

In Vercel dashboard, go to "Settings" → "Environment Variables" and add:

```
NEXT_PUBLIC_BASE_URL=https://your-vercel-url.vercel.app
RESEND_API_KEY=re_your_key
PESAPAL_CONSUMER_KEY=your_key
PESAPAL_CONSUMER_SECRET=your_secret
GOOGLE_CLIENT_EMAIL=your_email
GOOGLE_PRIVATE_KEY=your_key
# ... add all your environment variables
```

**Important**: 
- Add variables for "Production", "Preview", and "Development"
- For `GOOGLE_PRIVATE_KEY`, include the entire key with `\n` characters

### Step 5: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Your site will be live at `your-project.vercel.app`

✅ **Checkpoint**: Your site should be deployed on Vercel!

---

## Lesson 8.4: Deploying to Netlify (Alternative)

Netlify is another great option for deploying Next.js apps.

### Step 1: Create Netlify Account

1. Go to [netlify.com](https://netlify.com)
2. Click "Sign Up"
3. Sign up with GitHub

### Step 2: Create New Site

1. Click "Add new site" → "Import an existing project"
2. Choose "Deploy with GitHub"
3. Select your repository

### Step 3: Configure Build Settings

Netlify should auto-detect, but verify:
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Base directory**: (leave empty)

### Step 4: Add Environment Variables

Go to "Site settings" → "Environment variables" and add all your variables.

### Step 5: Create netlify.toml

Create `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "18"
```

### Step 6: Deploy

1. Click "Deploy site"
2. Wait for deployment
3. Your site will be live at `your-project.netlify.app`

✅ **Checkpoint**: Your site should be deployed on Netlify!

---

## Lesson 8.5: Setting Up Custom Domain

Let's connect your custom domain to your deployed site.

### Step 1: Get Your Domain

You can buy a domain from:
- **Namecheap** - [namecheap.com](https://namecheap.com)
- **Google Domains** - [domains.google](https://domains.google)
- **GoDaddy** - [godaddy.com](https://godaddy.com)

### Step 2: Add Domain to Vercel

1. Go to your project in Vercel
2. Click "Settings" → "Domains"
3. Add your domain (e.g., `yourdomain.com`)
4. Follow DNS configuration instructions

### Step 3: Configure DNS

Add these DNS records at your domain registrar:

**For Vercel:**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21`

- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

**For Netlify:**
- Type: `A`
- Name: `@`
- Value: `75.2.60.5`

- Type: `CNAME`
- Name: `www`
- Value: `your-site.netlify.app`

### Step 4: Wait for DNS Propagation

DNS changes can take 24-48 hours, but usually work within a few hours.

### Step 5: Update Environment Variables

Once domain is live, update:

```env
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
PESAPAL_CALLBACK_URL=https://yourdomain.com/api/pesapal/callback
```

✅ **Checkpoint**: Your custom domain should be working!

---

## Lesson 8.6: Configuring Production Environment

Let's make sure everything works in production.

### Step 1: Update All URLs

Search your codebase for any `localhost:3000` references and replace with your production URL.

### Step 2: Test Payment Callbacks

Make sure payment gateway callbacks use production URLs:
- Pesapal callback URL
- M-Pesa callback URL
- Any webhook URLs

### Step 3: Verify Email Configuration

Test that emails work in production:
1. Make a test booking
2. Check that confirmation emails are sent
3. Verify email formatting

### Step 4: Test All Features

Go through your site and test:
- ✅ Homepage loads
- ✅ Services page works
- ✅ Booking flow works
- ✅ Payment processing works
- ✅ Email confirmations sent
- ✅ Admin login works
- ✅ Client accounts work

---

## Lesson 8.7: Going Live Checklist

Before announcing your site is live, verify everything:

### Pre-Launch Checklist

- [ ] All environment variables configured
- [ ] Custom domain connected and working
- [ ] SSL certificate active (automatic with Vercel/Netlify)
- [ ] Payment gateway in production mode
- [ ] Email service configured and tested
- [ ] Google Calendar integration working
- [ ] All pages load correctly
- [ ] Mobile responsive design works
- [ ] Booking flow tested end-to-end
- [ ] Admin dashboard accessible
- [ ] Error pages configured (404, 500)
- [ ] Analytics set up (optional)
- [ ] SEO meta tags added
- [ ] Favicon and logo uploaded

### Post-Launch Checklist

- [ ] Monitor for errors
- [ ] Test booking from real device
- [ ] Verify emails are delivered
- [ ] Check payment processing
- [ ] Monitor site performance
- [ ] Set up backups (if using database)
- [ ] Document admin credentials securely

---

## Lesson 8.8: Monitoring and Maintenance

Keep your site running smoothly.

### Step 1: Set Up Monitoring

**Vercel:**
- Built-in analytics
- Error tracking
- Performance monitoring

**Netlify:**
- Built-in analytics
- Form submissions
- Deploy notifications

### Step 2: Set Up Error Tracking

Consider adding:
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Google Analytics** - User analytics

### Step 3: Regular Updates

Keep your site updated:
- Update dependencies regularly
- Monitor security advisories
- Test after updates
- Keep backups

### Step 4: Backup Strategy

**For file-based storage:**
- Regularly backup `data/` folder
- Store backups securely
- Test restore process

**For database:**
- Use automated backups
- Test restore regularly

---

## Module 8 Checkpoint

Before considering the course complete, make sure you have:

✅ Code is in Git repository  
✅ Site is deployed to Vercel or Netlify  
✅ Custom domain is connected  
✅ All environment variables configured  
✅ SSL certificate is active  
✅ Payment processing works  
✅ Email notifications work  
✅ All features tested in production  
✅ Site is accessible to public  
✅ Monitoring set up  

### Common Issues & Solutions

**Problem**: Build fails on deployment  
**Solution**: 
- Check build logs for errors
- Test build locally first
- Verify all dependencies are in `package.json`

**Problem**: Environment variables not working  
**Solution**: 
- Check variable names match exactly
- Verify variables are set for correct environment
- Restart deployment after adding variables

**Problem**: Domain not connecting  
**Solution**: 
- Wait for DNS propagation (up to 48 hours)
- Verify DNS records are correct
- Check domain registrar settings

**Problem**: Payment callbacks not working  
**Solution**: 
- Verify callback URLs use HTTPS
- Check payment gateway settings
- Test callback endpoints manually

**Problem**: Emails not sending  
**Solution**: 
- Verify API keys are correct
- Check email service dashboard
- Test with test endpoint first

---

## Congratulations! 🎉

You've completed the entire course! You now have:

- ✅ A fully functional booking website
- ✅ Payment processing integrated
- ✅ Email notifications working
- ✅ Client accounts system
- ✅ Admin dashboard
- ✅ Deployed and live on the internet

### What You've Built

A complete, production-ready booking website with:
- Professional design
- Secure payment processing
- Automated email notifications
- Client management
- Admin dashboard
- Mobile responsive
- SEO optimized

### Next Steps

1. **Market your website** - Share it with potential clients
2. **Gather feedback** - Ask users for feedback
3. **Iterate and improve** - Add features based on needs
4. **Monitor performance** - Track bookings and revenue
5. **Scale** - Add more services or locations

### Resources

- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Resend Docs**: [resend.com/docs](https://resend.com/docs)

---

## Course Completion Certificate

You've successfully completed:

**"How to Build a Client-Booking Website That Accepts Payments (Without a Developer)"**

**Modules Completed:**
- ✅ Module 1: Introduction and Setup
- ✅ Module 2: Building the Foundation
- ✅ Module 3: Booking System Core
- ✅ Module 4: Payment Integration
- ✅ Module 5: Client Accounts & Authentication
- ✅ Module 6: Admin Dashboard
- ✅ Module 7: Email & Notifications
- ✅ Module 8: Deployment & Launch

**Total Time Invested**: 20-30 hours  
**Skills Learned**: Next.js, React, TypeScript, Payment Integration, Email Services, Deployment

**You're now ready to run your own booking business online!** 🚀

---

## Final Practice Exercise

Before you go, try these final exercises:

1. **Add analytics** - Set up Google Analytics or similar
2. **Optimize performance** - Test and improve load times
3. **Add more features** - Implement any additional features you need
4. **Create documentation** - Document your setup for future reference
5. **Plan for growth** - Consider scaling options as you grow

**Good luck with your booking website!** 🎊

