# Configuring DNS for Netlify

## Introduction

Hey! Now we're going to connect your domain to Netlify so when people type your domain name, they see your website! This is the final step to make your website live with your own domain.

**Don't worry** - Netlify makes this super easy! We'll do it step by step.

## What We're Doing

We're telling the internet:
- **When someone types:** `yourdomain.com`
- **Show them:** Your website on Netlify

**It's like putting a sign on your house** that says "This is where I live!"

## Step 1: Get Your Netlify Site URL

**First, we need Netlify's address for your site:**

1. **Log into Netlify**
2. **Go to your site**
3. **Look for "Site details"** or "Domain settings"
4. **Find your Netlify URL** - It looks like: `your-site-name.netlify.app`
5. **Copy this URL** - You'll need it!

**This is where your website lives on Netlify!**

## Step 2: Add Domain to Netlify

**Now let's tell Netlify about your domain:**

1. **In Netlify, go to your site**
2. **Click "Domain settings"** (or "Domains")
3. **Click "Add custom domain"**
4. **Enter your domain** (like `lashdiary.co.ke`)
5. **Click "Verify"** or "Add"

**Netlify will check if the domain is available to add.**

## Step 3: Choose DNS Method

**Netlify will show you two options:**

### Option 1: Use Netlify Nameservers (Easiest)

**This is the easiest method!**

1. **Netlify will show you nameservers** (like `dns1.p01.nsone.net`)
2. **You'll copy these**
3. **Add them to your domain registrar** (Namecheap, GoDaddy, etc.)
4. **Netlify manages everything** - super easy!

### Option 2: Use DNS Records (More Control)

**If your registrar doesn't support nameservers:**

1. **Netlify will show you DNS records to add**
2. **You'll add them to your domain registrar**
3. **You manage the DNS records**

**For this course, we'll use Option 1** (nameservers) - it's easier!

## Step 4: Configure Nameservers (Method 1)

**If you're using nameservers (recommended):**

### In Your Domain Registrar (Namecheap):

1. **Log into Namecheap**
2. **Go to "Domain List"**
3. **Click "Manage"** next to your domain
4. **Find "Nameservers"** section
5. **Select "Custom DNS"** (instead of "Namecheap BasicDNS")
6. **Enter Netlify's nameservers** (the ones Netlify gave you)
7. **Click "Save"**

**Netlify's nameservers look like:**
- `dns1.p01.nsone.net`
- `dns2.p01.nsone.net`
- `dns3.p01.nsone.net`
- `dns4.p01.nsone.net`

**You'll get the exact ones from Netlify!**

## Step 5: Configure DNS Records (Method 2)

**If you're using DNS records instead:**

### In Your Domain Registrar:

1. **Go to DNS settings** (or "Advanced DNS")
2. **Add a CNAME record:**
   - **Type:** CNAME
   - **Host:** @ (or leave blank)
   - **Value:** Your Netlify URL (like `your-site.netlify.app`)
   - **TTL:** Automatic (or 3600)
3. **Add another CNAME for www:**
   - **Type:** CNAME
   - **Host:** www
   - **Value:** Your Netlify URL
   - **TTL:** Automatic
4. **Save the records**

**Netlify will show you exactly what to add!**

## Step 6: Wait for DNS Propagation

**After configuring DNS:**

1. **It takes time to work** - Usually 1-24 hours
2. **Be patient!** - This is normal
3. **Check status in Netlify** - It will show "Pending" then "Active"

**You can check if it's working:**
- Go to: https://dnschecker.org
- Enter your domain
- See if it's pointing to Netlify

## Step 7: Verify It's Working

**After DNS propagates (1-24 hours):**

1. **Go to your domain** in browser (like `yourdomain.com`)
2. **You should see your website!** 🎉
3. **Check Netlify** - Should show "Active" for your domain

**If it works, you're done!** Your website is live with your own domain!

## Step 8: Set Up SSL Certificate

**Netlify automatically provides SSL** (the lock icon in browser):

1. **Netlify will automatically get SSL certificate**
2. **Takes a few minutes to hours**
3. **You'll see a lock icon** in browser when it's ready
4. **Your site will use HTTPS** (secure connection)

**This happens automatically** - you don't need to do anything!

## Common Issues and Solutions

### Issue: Domain Not Working After 24 Hours

**Check:**
1. Are nameservers/DNS records correct?
2. Did you save the changes?
3. Check DNS propagation: https://dnschecker.org
4. Contact Netlify support if needed

**Ask Cursor:**
```
My domain isn't working after setting up DNS. Can you help me troubleshoot? The domain is [your domain] and I'm using [nameservers or DNS records].
```

### Issue: SSL Certificate Not Working

**Solutions:**
- Wait a few hours (SSL takes time)
- Check Netlify dashboard for SSL status
- Make sure DNS is configured correctly
- Contact Netlify support if needed

### Issue: www vs. non-www

**You want both to work:**
- `yourdomain.com` ✅
- `www.yourdomain.com` ✅

**Netlify handles this automatically** if you configure it correctly!

## What You've Accomplished

✅ Connected your domain to Netlify  
✅ Configured DNS (nameservers or records)  
✅ Your website is accessible via your domain  
✅ SSL certificate is set up  
✅ Your website is fully live!  

## What's Next?

**Your website is now:**
- ✅ Live on the internet
- ✅ Accessible via your domain
- ✅ Using HTTPS (secure)
- ✅ Professional and ready!

**In the next lesson**, we'll verify everything is working correctly!

## Action Items

Before moving on:

1. ✅ **Added domain to Netlify**
2. ✅ **Configured nameservers or DNS records**
3. ✅ **Waited for DNS propagation**
4. ✅ **Verified domain is working**
5. ✅ **Checked SSL certificate is active**

## Key Takeaways

✅ Netlify makes DNS setup easy  
✅ Use nameservers (easiest) or DNS records  
✅ DNS propagation takes 1-24 hours  
✅ SSL certificate is automatic  
✅ Both www and non-www work  
✅ Your website is now live with your domain!  

---

**Estimated Time**: 45 minutes (plus waiting for propagation)  
**Difficulty**: Beginner (Netlify guides you!)  
**Next Lesson**: Verifying Domain Setup

