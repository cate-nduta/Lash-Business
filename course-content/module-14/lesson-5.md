# Creating Netlify Account and Site

## Introduction

Netlify is where your website will live on the internet. Think of it as the "hosting" - the place where your website files are stored and served to visitors. This lesson will walk you through creating a Netlify account and setting up your first site.

## What is Netlify?

**Netlify is:**
- A hosting platform for websites
- Free for basic use (perfect for getting started)
- Automatically deploys from GitHub
- Provides free SSL certificates (HTTPS)
- Handles all the server stuff for you

**Think of it like this:**
- Your code = The website files you build
- GitHub = Where you store your code
- Netlify = Where your website lives on the internet

## Step 1: Create a Netlify Account

### Go to Netlify:

1. **Open your browser**
2. **Go to**: https://www.netlify.com
3. **Click "Sign up"** (top right corner)

### Sign Up Options:

**Option 1: Sign up with GitHub (Recommended)**
- ✅ Easiest integration
- ✅ One-click deployment
- ✅ Best for this course

**Option 2: Sign up with Email**
- ✅ Works fine too
- ✅ Just need email and password

**For this course, we recommend GitHub** (we'll set up GitHub in a previous lesson).

### If Using GitHub:

1. **Click "Sign up with GitHub"**
2. **Authorize Netlify** to access your GitHub account
3. **You're in!** Netlify account is created

### If Using Email:

1. **Enter your email address**
2. **Create a password**
3. **Verify your email** (check your inbox)
4. **Complete your profile**

## Step 2: Understand the Netlify Dashboard

**After logging in, you'll see:**

### Main Areas:

1. **Sites** - Your deployed websites
2. **Add new site** - Button to create new site
3. **Team** - If working with others
4. **Settings** - Your account settings

**For now, focus on "Sites" - that's where your website will be.**

## Step 3: Connect Your GitHub Repository

**Before creating a site, make sure:**
- ✅ You have a GitHub account
- ✅ Your code is pushed to GitHub
- ✅ Your repository is ready

**If you haven't set up GitHub yet**, complete that lesson first, then come back here.

### Connect GitHub to Netlify:

1. **In Netlify dashboard**, click "Add new site"
2. **Select "Import an existing project"**
3. **Choose "Deploy with GitHub"**
4. **Authorize Netlify** to access your GitHub (if first time)
5. **You'll see your GitHub repositories**

## Step 4: Select Your Repository

1. **Find your booking website repository** in the list
2. **Click on it**
3. **Netlify will prepare to deploy it**

**If you don't see your repository:**
- Make sure it's pushed to GitHub
- Check that you authorized Netlify correctly
- Try refreshing the page

## Step 5: Configure Build Settings

**This is important!** Netlify needs to know how to build your Next.js site.

### Build Settings:

**Build command:**
```
npm run build
```

**Publish directory:**
```
.next
```

**Wait, actually for Next.js, it's different!**

### Correct Settings for Next.js:

**Build command:**
```
npm run build
```

**Publish directory:**
```
.next
```

**Actually, for Next.js on Netlify, you might need:**

**Build command:**
```
npm install && npm run build
```

**Publish directory:**
```
out
```

**But wait - we need to configure Next.js for static export first!**

### Ask Cursor to Help:

Before deploying, ask Cursor:

```
I want to deploy my Next.js app to Netlify. How do I configure it for static export? Update next.config.js to enable static export.
```

Cursor will update your `next.config.js` file.

**Then use these settings:**

**Build command:**
```
npm run build
```

**Publish directory:**
```
out
```

## Step 6: Deploy Your Site

1. **Enter the build settings** (from step 5)
2. **Click "Deploy site"**
3. **Watch the magic happen!**

**You'll see:**
- Building... (this takes 2-5 minutes)
- Deploying...
- Live!

## Step 7: Your Site is Live!

**After deployment, you'll see:**

1. **A success message**
2. **Your site URL** (like `random-name-123.netlify.app`)
3. **A link to view your site**

**Click the link** to see your website live on the internet! 🎉

## Step 8: Customize Your Site Name

**Your site has a random name like `happy-panda-123.netlify.app`**

### Change It:

1. **Go to "Site settings"** (click on your site, then "Site settings")
2. **Find "Change site name"**
3. **Enter your preferred name** (like `my-booking-website`)
4. **Save**

**Your new URL:** `my-booking-website.netlify.app`

**Note:** The name must be unique, so you might need to try a few variations.

## Step 9: Understand Automatic Deployments

**Here's the magic:**

1. **You make changes** to your code
2. **You push to GitHub**
3. **Netlify automatically detects** the change
4. **Netlify automatically rebuilds** your site
5. **Your site updates** automatically!

**You don't need to manually deploy anymore!**

### Test It:

1. **Make a small change** to your website
2. **Push to GitHub**
3. **Watch Netlify** - you'll see a new deployment start
4. **Wait for it to finish**
5. **Refresh your site** - see your changes!

## Step 10: View Deployment History

**In your site dashboard, you can see:**

- ✅ All deployments (every time you push code)
- ✅ Build logs (see what happened)
- ✅ Deploy status (success or failure)
- ✅ Rollback option (go back to previous version)

**This is helpful for:**
- Debugging issues
- Seeing what changed
- Rolling back if something breaks

## Common Issues and Solutions

### Issue: Build Fails

**Ask Cursor:**
```
My Netlify build is failing. Here's the error: [paste error]. How do I fix it?
```

**Common causes:**
- Missing environment variables
- Build command wrong
- Dependencies not installing
- TypeScript errors

### Issue: Site Not Updating

**Solutions:**
- Make sure you pushed to GitHub
- Check that Netlify is connected to the right branch
- Clear Netlify cache and redeploy

### Issue: Can't Find Repository

**Solutions:**
- Make sure repository is public (or grant Netlify access)
- Re-authorize GitHub connection
- Check repository name spelling

## What You've Accomplished

✅ Created Netlify account  
✅ Connected GitHub  
✅ Deployed your website  
✅ Your site is live on the internet!  
✅ Automatic deployments set up  
✅ Custom site name configured  

## Next Steps

**Your website is now:**
- ✅ Live on the internet
- ✅ Accessible to anyone
- ✅ Automatically updating when you push code
- ✅ Using a free Netlify subdomain

**In the next lesson**, we'll connect your custom domain (the one you bought) to Netlify, so people can visit `yourdomain.com` instead of `yoursite.netlify.app`.

## Security Note

**Your site is now public!** Make sure:
- ✅ No sensitive information in your code
- ✅ Environment variables are set in Netlify (not in code)
- ✅ Admin pages are protected (we'll cover this later)

## Action Items

1. **Create Netlify account**
2. **Connect GitHub**
3. **Deploy your site**
4. **Customize site name**
5. **Test automatic deployment** (make a change and push)
6. **Share your site URL** with friends to test!

## Key Takeaways

✅ Netlify hosts your website for free  
✅ Connect GitHub for automatic deployments  
✅ Configure build settings for Next.js  
✅ Your site is live immediately after deployment  
✅ Changes auto-deploy when you push to GitHub  
✅ You can customize your Netlify subdomain  
✅ Deployment history helps with debugging  

---

**Estimated Time**: 35 minutes  
**Difficulty**: Beginner  
**Next Lesson**: Setting Environment Variables in Netlify

