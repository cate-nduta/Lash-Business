# 🚀 Complete Deployment Guide

This guide will help you push your code and deploy it to production.

---

## 📋 Pre-Deployment Summary

### ✅ Completed
- ✅ All `localhost:3000` references removed
- ✅ All "website builder" references updated to "system setup"
- ✅ All URL generation uses production base URL
- ✅ `.gitignore` properly configured
- ✅ Build configuration ready

---

## 🔧 Step 1: Initialize Git Repository (If Not Already Done)

If you haven't initialized git yet:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Production ready"
```

---

## 📤 Step 2: Prepare Git Repository

### Check Current Status
```bash
# Check what files are tracked
git status

# Review changes
git diff
```

### Stage and Commit Changes
```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Prepare for production deployment

- Remove all localhost:3000 references
- Update website builder references to system setup  
- Ensure all URLs use production base URL (https://lashdiary.co.ke)
- Ready for deployment"
```

### Create Remote Repository (If Needed)

**GitHub:**
1. Go to [GitHub](https://github.com) and create a new repository
2. Don't initialize with README (you already have files)
3. Copy the repository URL

**GitLab:**
1. Go to [GitLab](https://gitlab.com) and create a new project
2. Copy the repository URL

### Connect to Remote
```bash
# Add remote repository
git remote add origin https://github.com/yourusername/your-repo.git
# or
git remote add origin https://gitlab.com/yourusername/your-repo.git

# Verify remote
git remote -v
```

### Push to Remote
```bash
# Push to main branch
git push -u origin main

# If your default branch is master:
git push -u origin master
```

---

## 🌐 Step 3: Deploy to Netlify

### Option A: Deploy via Git (Recommended)

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Sign in or create account

2. **Add New Site**
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider (GitHub/GitLab)
   - Select your repository

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - These should auto-detect from `netlify.toml`

4. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add all required variables (see list below)

5. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

---

## 🔐 Step 4: Set Environment Variables in Netlify

Go to: **Site Settings → Environment Variables**

Add these variables:

### Required Base Configuration
```
NEXT_PUBLIC_BASE_URL=https://lashdiary.co.ke
NODE_ENV=production
```

### Email Configuration (Choose One)

**Zoho SMTP:**
```
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=465
ZOHO_SMTP_USER=your-email@zoho.com
ZOHO_SMTP_PASS=your-app-password
ZOHO_FROM_EMAIL=your-email@zoho.com
FROM_EMAIL=your-email@zoho.com
EMAIL_FROM_NAME=The LashDiary
```

**OR Resend:**
```
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=your-email@yourdomain.com
```

### Google Calendar (Optional)
```
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_EMAIL=hello@lashdiary.co.ke
```

### Supabase (If Using)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Admin Authentication
```
ADMIN_PASSWORD_HASH=your-hashed-password
```

### Business Information
```
NEXT_PUBLIC_STUDIO_LOCATION="LashDiary Studio, Nairobi, Kenya"
BUSINESS_NOTIFICATION_EMAIL=hello@lashdiary.co.ke
OWNER_EMAIL=hello@lashdiary.co.ke
```

### Payment Integration (If Using)
```
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
MPESA_ENVIRONMENT=production
MPESA_CALLBACK_URL=https://lashdiary.co.ke/api/mpesa/callback
```

### Analytics (Optional)
```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Cron Jobs (If Using)
```
CRON_SECRET=your-secret-key
```

---

## 🌍 Step 5: Configure Custom Domain (If Using)

1. **In Netlify Dashboard:**
   - Go to Site settings → Domain management
   - Click "Add custom domain"
   - Enter your domain: `lashdiary.co.ke`

2. **Configure DNS:**
   - Netlify will provide DNS records
   - Add them to your domain registrar
   - Wait for DNS propagation (can take up to 48 hours)

3. **SSL Certificate:**
   - Netlify automatically provisions SSL
   - Wait for certificate to be issued

---

## ✅ Step 6: Verify Deployment

### Check Build Logs
1. Go to Netlify Dashboard → Deploys
2. Click on the latest deploy
3. Check for any errors or warnings

### Test Website
1. Visit your production URL
2. Test homepage loads
3. Test booking page
4. Test admin login
5. Create a test booking
6. Verify email sending works

### Check Functionality
- [ ] Homepage loads correctly
- [ ] All pages accessible
- [ ] Booking system works
- [ ] Admin dashboard works
- [ ] Email sending works
- [ ] No console errors
- [ ] HTTPS is working

---

## 🔄 Step 7: Future Updates

### To Deploy Updates

```bash
# Make your changes
# ... edit files ...

# Stage changes
git add .

# Commit
git commit -m "Description of changes"

# Push to remote
git push origin main

# Netlify will automatically deploy
```

Netlify will automatically:
- Detect the push
- Run `npm run build`
- Deploy the new version

---

## 🐛 Troubleshooting

### Build Fails

1. **Check Build Logs**
   - Go to Netlify Dashboard → Deploys
   - Click on failed deploy
   - Review error messages

2. **Common Issues:**
   - Missing environment variables
   - TypeScript errors
   - Missing dependencies
   - Build timeout

3. **Fix:**
   - Add missing environment variables
   - Fix code errors
   - Check `package.json` dependencies

### Website Not Loading

1. **Check Domain Configuration**
   - Verify DNS records are correct
   - Wait for DNS propagation
   - Check SSL certificate status

2. **Check Environment Variables**
   - Verify all required variables are set
   - Check variable names are correct
   - Ensure no typos

### Email Not Sending

1. **Check Email Configuration**
   - Verify SMTP credentials are correct
   - Test email service separately
   - Check email service logs

2. **Check Environment Variables**
   - Verify `FROM_EMAIL` is set
   - Check SMTP credentials
   - Ensure email service is active

---

## 📝 Important Notes

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Always set environment variables** in Netlify dashboard
3. **Test locally first** before pushing
4. **Monitor deployment logs** for errors
5. **Keep backups** of your data

---

## ✅ Deployment Checklist

Before deploying:
- [ ] Code is committed to git
- [ ] Code is pushed to remote repository
- [ ] All environment variables are set in Netlify
- [ ] Build succeeds locally (`npm run build`)
- [ ] Domain is configured (if using custom domain)

After deploying:
- [ ] Website is accessible
- [ ] All pages load correctly
- [ ] Booking system works
- [ ] Admin login works
- [ ] Email sending works
- [ ] No console errors

---

## 🎉 You're Ready!

Your code is now ready for deployment. Follow the steps above to push to git and deploy to Netlify.

**Need Help?**
- Check `PRE_DEPLOYMENT_CHECKLIST.md` for detailed checks
- Review `DEPLOYMENT_CHECKLIST.md` for comprehensive checklist
- Check `NETLIFY_DEPLOYMENT_CHECKLIST.md` for Netlify-specific info









