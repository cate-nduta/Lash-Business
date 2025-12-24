# Setting Up Zoho on Netlify (Production)

## Introduction

Hey! We've been testing emails on your local computer. Now we need to set up email for when your website is live on the internet (on Netlify). This is called "production" setup.

**Don't worry** - it's similar to what we did before, just in a different place!

## What's Different in Production?

**Local (your computer):**
- Uses `.env.local` file
- Only works on your computer
- For testing

**Production (Netlify):**
- Uses Netlify's environment variables
- Works for everyone on the internet
- For your live website

**Think of it like:**
- Local = Your test kitchen
- Production = The real restaurant

## Step 1: Get Your Zoho Credentials Ready

**You'll need:**
- ✅ Your Zoho email address (like `bookings@zoho.com`)
- ✅ Your Zoho App Password (the special password we created)
- ✅ Zoho SMTP host: `smtp.zoho.com`
- ✅ Zoho SMTP port: `465` (for secure connection)

**Write these down** - you'll need them in a minute!

## Step 2: Log Into Netlify

1. **Go to**: https://www.netlify.com
2. **Log in** with your account
3. **You should see your dashboard**

## Step 3: Go to Your Site Settings

1. **Click on your site** (the one you deployed)
2. **Click "Site settings"** (or gear icon)
3. **Look for "Environment variables"** in the left menu
4. **Click it**

**You should see a page where you can add environment variables!**

## Step 4: Add Zoho Email Variables

**Now let's add all the Zoho email settings:**

### Add Each Variable:

**Click "Add variable"** and add these one by one:

**Variable 1:**
- **Key:** `ZOHO_SMTP_HOST`
- **Value:** `smtp.zoho.com`
- **Click "Save"**

**Variable 2:**
- **Key:** `ZOHO_SMTP_PORT`
- **Value:** `465`
- **Click "Save"**

**Variable 3:**
- **Key:** `ZOHO_SMTP_USER`
- **Value:** Your Zoho email (like `bookings@zoho.com`)
- **Click "Save"**

**Variable 4:**
- **Key:** `ZOHO_SMTP_PASS`
- **Value:** Your Zoho App Password (the special password)
- **Click "Save"**

**Variable 5:**
- **Key:** `ZOHO_FROM_EMAIL`
- **Value:** Your Zoho email (same as above)
- **Click "Save"**

**Variable 6:**
- **Key:** `FROM_EMAIL`
- **Value:** Your Zoho email (same as above)
- **Click "Save"**

**Variable 7:**
- **Key:** `EMAIL_FROM_NAME`
- **Value:** Your business name (like `LashDiary` or `Your Business Name`)
- **Click "Save"**

**Variable 8:**
- **Key:** `BUSINESS_NOTIFICATION_EMAIL`
- **Value:** Your email where you want to receive booking notifications
- **Click "Save"**

## Step 5: Verify Your Variables

**After adding all variables, you should see:**

- ✅ ZOHO_SMTP_HOST = smtp.zoho.com
- ✅ ZOHO_SMTP_PORT = 465
- ✅ ZOHO_SMTP_USER = your-email@zoho.com
- ✅ ZOHO_SMTP_PASS = (hidden - shows as dots)
- ✅ ZOHO_FROM_EMAIL = your-email@zoho.com
- ✅ FROM_EMAIL = your-email@zoho.com
- ✅ EMAIL_FROM_NAME = Your Business Name
- ✅ BUSINESS_NOTIFICATION_EMAIL = your-notification-email@email.com

**If you see all of these, you're good!**

## Step 6: Redeploy Your Site

**After adding environment variables, you need to redeploy:**

1. **Go to "Deploys"** tab (in your site)
2. **Click "Trigger deploy"** → **"Deploy site"**
3. **Wait for deployment** (2-5 minutes)

**OR**

**If you have GitHub connected:**
- **Make a small change** to any file
- **Push to GitHub**
- **Netlify will auto-deploy**

**The new deployment will use your environment variables!**

## Step 7: Test Email on Live Site

**Now let's test that emails work on your live website!**

1. **Go to your live website** (your Netlify URL or custom domain)
2. **Go to the booking page**
3. **Fill out and submit a test booking** with your real email
4. **Check your email!** 📧

### What to Check:

- ✅ **Did you receive the confirmation email?**
- ✅ **Did you receive the owner notification?**
- ✅ **Are all details correct?**
- ✅ **Check spam folder** if not in inbox

**If emails arrive, your production email is working!** 🎉

## Step 8: Troubleshooting

### If Emails Don't Send:

**Check These Things:**

1. **Environment Variables:**
   - Are they all set correctly?
   - No typos in the values?
   - App password copied correctly?

2. **Deployment:**
   - Did you redeploy after adding variables?
   - Is the latest deployment live?

3. **Zoho Account:**
   - Is your Zoho account active?
   - Is the app password still valid?
   - Check Zoho account settings

4. **Check Logs:**
   - Go to Netlify → Your Site → Functions → Logs
   - Look for error messages
   - See what went wrong

### Ask Cursor for Help:

```
Emails aren't sending on my live Netlify site. The environment variables are set. Can you help me debug? Check the email configuration code and see if there are any issues.
```

## Step 9: Security Notes

**Important security tips:**

✅ **Never commit environment variables to GitHub**  
✅ **Keep your App Password secret**  
✅ **Don't share your Netlify account**  
✅ **Use different passwords for different services**  

**Your App Password is sensitive** - treat it like your regular password!

## What You've Accomplished

✅ Set up Zoho email in Netlify  
✅ Added all environment variables  
✅ Redeployed your site  
✅ Tested email on live site  
✅ Emails work in production!  

## What's Next?

**Your website now:**
- ✅ Sends emails automatically
- ✅ Works on your live site
- ✅ Sends to customers and you
- ✅ Professional email delivery

**In the next lesson**, we'll test email delivery thoroughly!

## Action Items

Before moving on:

1. ✅ **Added all Zoho environment variables to Netlify**
2. ✅ **Redeployed your site**
3. ✅ **Tested email on live site**
4. ✅ **Verified emails are received**
5. ✅ **Checked spam folders**

## Key Takeaways

✅ Production uses Netlify environment variables  
✅ Add all Zoho credentials to Netlify  
✅ Redeploy after adding variables  
✅ Test on live site, not just local  
✅ Keep credentials secure  
✅ Check logs if something doesn't work  

---

**Estimated Time**: 45 minutes  
**Difficulty**: Beginner to Intermediate  
**Next Lesson**: Testing Email Delivery

