# Lesson 11.2: Connecting Domain to Netlify

**Estimated Time**: 30 minutes

---

## Introduction

Once you have a domain name, you need to connect it to your website hosting so people can visit your site. This lesson shows you how to connect your custom domain to Netlify, where your website is hosted, step-by-step.

**What You'll Learn:**
- What DNS is (simplified)
- How to add your domain to Netlify
- How to configure DNS settings
- How to verify the connection
- How long it takes to work

---

## What Is DNS?

### Simple Explanation

**DNS (Domain Name System) is:**
- Like a phone book for the internet
- Connects domain names to websites
- Tells internet where to find your site
- Required for domain to work

**Think of it like:**
- Phone book: Name → Phone number
- DNS: Domain name → Website address

**DNS = Connects your domain to your website!**

---

## Before You Start

### What You Need

**1. Domain purchased:**
- Your domain name
- Access to domain registrar account
- Domain settings access

**2. Netlify account:**
- Website deployed to Netlify
- Netlify account access
- Site dashboard access

**3. Patience:**
- DNS changes take time
- Usually 15 minutes to 48 hours
- Be patient!

---

## Step-by-Step: Add Domain to Netlify

### Step 1: Deploy Your Website to Netlify

**If not already deployed:**

**1. Push to GitHub:**
- Commit your code
- Push to GitHub repository

**2. Connect to Netlify:**
- Go to netlify.com
- Click "Add new site"
- Choose "Import an existing project"
- Connect GitHub
- Select your repository

**3. Deploy:**
- Netlify builds your site
- Gets a default URL (yoursite.netlify.app)
- Site is live!

---

### Step 2: Add Custom Domain in Netlify

**1. Go to site settings:**
- In Netlify dashboard
- Click your site
- Go to "Domain settings"

**2. Add custom domain:**
- Click "Add custom domain"
- Enter your domain (e.g., `yourbusiness.com`)
- Click "Verify"

**3. Netlify provides DNS records:**
- Netlify shows DNS records needed
- Copy these records
- You'll add them to your domain

---

### Step 3: Configure DNS at Your Registrar

**1. Log into domain registrar:**
- Go to Namecheap, GoDaddy, etc.
- Log into your account
- Find your domain

**2. Go to DNS settings:**
- Click on your domain
- Go to "DNS" or "Nameservers"
- Find DNS management

**3. Add DNS records:**
- Add records Netlify provided
- Usually A record or CNAME
- Save changes

---

## DNS Record Types

### What You Need to Add

**For Netlify, you typically need:**

**Option 1: A Record (Recommended)**
- Type: A
- Host: @ (or leave blank)
- Value: Netlify IP address (Netlify provides)
- TTL: Automatic (or 3600)

**Option 2: CNAME**
- Type: CNAME
- Host: www
- Value: yoursite.netlify.app
- TTL: Automatic

**Netlify will tell you:**
- Exactly what to add
- Copy the values
- Add to your DNS

---

## Detailed DNS Configuration

### For Namecheap

**1. Go to domain list:**
- Log into Namecheap
- Click "Domain List"
- Click "Manage" next to your domain

**2. Go to Advanced DNS:**
- Click "Advanced DNS" tab
- Find "Host Records" section

**3. Add A record:**
- Click "Add New Record"
- Type: A Record
- Host: @
- Value: [Netlify IP - they provide]
- TTL: Automatic
- Save

**4. Add CNAME (for www):**
- Click "Add New Record"
- Type: CNAME Record
- Host: www
- Value: yoursite.netlify.app
- TTL: Automatic
- Save

---

### For GoDaddy

**1. Go to DNS management:**
- Log into GoDaddy
- Go to "My Products"
- Click "DNS" next to your domain

**2. Add records:**
- Click "Add" to add new record
- Add A record (Netlify provides IP)
- Add CNAME for www
- Save changes

---

## Verifying the Connection

### Check DNS Propagation

**1. Wait for propagation:**
- DNS changes take time
- Usually 15 minutes to 2 hours
- Can take up to 48 hours

**2. Check status in Netlify:**
- Go to Domain settings
- Netlify shows status
- "Pending" → "Active" when ready

**3. Test your domain:**
- Type your domain in browser
- Should show your website
- If not, wait longer

---

## Common Issues

### Issue 1: Domain Not Working

**Problem:**
- Domain doesn't load
- Shows error or nothing

**Solutions:**
- Wait longer (DNS takes time)
- Check DNS records are correct
- Verify records saved
- Check Netlify status

---

### Issue 2: Wrong DNS Records

**Problem:**
- Added wrong values
- Domain not connecting

**Solutions:**
- Double-check Netlify values
- Verify you copied correctly
- Remove old records
- Add correct records

---

### Issue 3: Still Pending

**Problem:**
- Netlify shows "Pending"
- Been waiting hours

**Solutions:**
- DNS can take 48 hours
- Check DNS records are correct
- Verify at your registrar
- Contact support if needed

---

## Using Cursor for Help

### DNS Configuration Assistance

**You can ask Cursor:**
```
I need to connect my domain [yourdomain.com] to Netlify. 
Netlify provided these DNS records: [paste records].
I'm using [Namecheap/GoDaddy] as my registrar.
Help me configure the DNS settings step-by-step.
```

**Cursor can help:**
- Explain DNS records
- Guide through configuration
- Troubleshoot issues
- Verify settings

---

## Real-World Example

### Complete Domain Connection

**Step 1: Domain purchased**
- Domain: `lashstudio.com`
- Registrar: Namecheap
- Ready to connect

**Step 2: Website on Netlify**
- Site deployed
- URL: `lashstudio.netlify.app`
- Site is live

**Step 3: Add domain to Netlify**
- Go to Domain settings
- Add `lashstudio.com`
- Netlify provides DNS records:
  - A Record: @ → 75.2.60.5
  - CNAME: www → lashstudio.netlify.app

**Step 4: Configure DNS at Namecheap**
- Go to Advanced DNS
- Add A record: @ → 75.2.60.5
- Add CNAME: www → lashstudio.netlify.app
- Save

**Step 5: Wait and verify**
- Wait 15-30 minutes
- Check Netlify status
- Test `lashstudio.com`
- Works!

**Result:**
- Domain connected
- Website accessible
- Professional URL
- Ready to use

---

## Best Practices

### 1. Use Both www and Non-www

**Set up:**
- `yourbusiness.com` (main)
- `www.yourbusiness.com` (also works)
- Netlify handles both
- Professional setup

---

### 2. Wait for DNS Propagation

**Be patient:**
- Changes take time
- Don't panic if not immediate
- Usually works within hours
- Can take up to 48 hours

---

### 3. Verify Settings

**Double-check:**
- DNS records correct
- Values copied properly
- Records saved
- No typos

---

### 4. Keep Records Simple

**Don't:**
- Add unnecessary records
- Modify existing records unnecessarily
- Add conflicting records

**Do:**
- Add only what Netlify needs
- Keep it simple
- Follow Netlify's instructions

---

## Key Takeaways

1. **DNS connects domain to website** - Like a phone book for internet
2. **Add domain in Netlify first** - Get DNS records from Netlify
3. **Configure DNS at registrar** - Add records Netlify provides
4. **Wait for propagation** - Takes 15 minutes to 48 hours
5. **Verify in Netlify** - Check status in dashboard
6. **Test your domain** - Visit in browser to verify
7. **Be patient** - DNS changes take time
8. **Follow instructions** - Netlify provides exact values needed

---

## What's Next?

Excellent! Your domain is now connected to Netlify. The next step is ensuring your website is secure with SSL/HTTPS. The next lesson covers SSL certificates and HTTPS security.

**Ready?** Let's move to Lesson 11.3: SSL & HTTPS!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand what DNS is (connects domain to website)
- ✅ Know how to add domain to Netlify (Domain settings)
- ✅ Can configure DNS at your registrar (add A and CNAME records)
- ✅ Understand DNS propagation (takes time, be patient)
- ✅ Know how to verify connection (check Netlify status, test domain)
- ✅ Understand common issues and solutions
- ✅ Have successfully connected your domain

If anything is unclear, review this lesson or ask questions!


