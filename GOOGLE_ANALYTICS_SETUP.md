# Google Analytics Setup Guide for LashDiary

## 📋 Step-by-Step Setup Instructions

### Step 1: Create Google Analytics Account

1. **Go to Google Analytics:**
   - Visit [https://analytics.google.com](https://analytics.google.com)
   - Sign in with your Google account (use the same account you use for your business)

2. **Start Setting Up:**
   - Click **"Start measuring"** button
   - You'll see a setup wizard

### Step 2: Create an Account

1. **Account Name:**
   - Enter: `LashDiary` (or your preferred name)
   - This is just for organizing - you can change it later

2. **Account Data Sharing Settings:**
   - Check/uncheck as you prefer
   - These help Google improve services
   - Click **"Next"**

### Step 3: Create a Property

1. **Property Name:**
   - Enter: `LashDiary Website` (or your website name)

2. **Reporting Time Zone:**
   - Select: `(GMT+03:00) Nairobi`
   - This ensures all times are shown in Kenya time

3. **Currency:**
   - Select: `Kenyan Shilling (KES)`
   - Click **"Next"**

### Step 4: Business Information

1. **Industry Category:**
   - Select: `Beauty` or `Personal Care`

2. **Business Size:**
   - Select the option that fits (usually `Small` or `Medium`)

3. **How will you use Google Analytics?**
   - Check:
     - ✅ Measure customer engagement with my site
     - ✅ Understand how customers find my website
     - ✅ Measure conversions (bookings/purchases)
   - Click **"Create"**

### Step 5: Accept Terms of Service

1. **Read and Accept:**
   - Review the Google Analytics Terms of Service
   - Check the boxes to accept
   - Click **"I Accept"**

### Step 6: Set Up Data Stream

1. **Choose Platform:**
   - Click **"Web"** (the globe icon)

2. **Website URL:**
   - Enter: `https://lashdiary.co.ke` (or your actual domain)
   - **Important:** Use `https://` and don't add `/` at the end

3. **Stream Name:**
   - Enter: `LashDiary Website` (auto-filled, you can change it)

4. **Click "Create Stream"**

### Step 7: Get Your Measurement ID

1. **You'll See a Screen with Your Stream Details**

2. **Find "Measurement ID":**
   - It looks like: `G-XXXXXXXXXX`
   - It starts with `G-` followed by letters and numbers
   - **Copy this ID** - you'll need it!

   Example: `G-ABC123XYZ9`

### Step 8: Add Measurement ID to Your Website

1. **Open Your Project:**
   - Go to your project folder on your computer
   - Find the `.env.local` file (in the root folder, same level as `package.json`)

2. **If `.env.local` doesn't exist:**
   - Create a new file named `.env.local`
   - Make sure it starts with a dot (`.env.local`)

3. **Add the Measurement ID:**
   - Open `.env.local` in a text editor
   - Add this line:
     ```env
     NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
     ```
   - **Replace `G-XXXXXXXXXX`** with your actual Measurement ID from Step 7
   
   Example:
   ```env
   NEXT_PUBLIC_GA_ID=G-ABC123XYZ9
   ```

4. **Save the file**

### Step 9: Restart Your Development Server

1. **Stop Your Server:**
   - If your dev server is running, press `Ctrl+C` in the terminal to stop it

2. **Start It Again:**
   ```bash
   npm run dev
   ```

3. **Environment variables are only loaded when the server starts**, so you must restart!

### Step 10: Verify It's Working

1. **Visit Your Website:**
   - Go to `http://localhost:3000` (or your local URL)

2. **Check Browser Console:**
   - Open Developer Tools: Press `F12` or right-click → Inspect
   - Go to the **"Network"** tab
   - Filter by: `google` or `gtag`
   - Look for requests to:
     - `googletagmanager.com`
     - `google-analytics.com`
   - If you see these requests, **it's working!** ✅

3. **Check Google Analytics:**
   - Go back to [analytics.google.com](https://analytics.google.com)
   - Click on your property
   - Go to **"Reports"** → **"Realtime"**
   - Visit your website in a browser
   - You should see yourself as "1 user right now" (may take a few seconds)

---

## 🎯 What You'll See in Google Analytics

### Real-Time Reports (Available Immediately)
- **Active Users** - See who's on your site right now
- **Top Pages** - Which pages people are viewing
- **Traffic Sources** - Where visitors come from

### Standard Reports (24-48 hours)
- **Audience** - Who your visitors are
- **Acquisition** - How people find you
- **Behavior** - What pages they visit
- **Conversions** - Track booking completions (can be set up later)

---

## 🔧 Troubleshooting

### "I don't see the Measurement ID"
- Make sure you completed Step 6 (created the web stream)
- Check the "Admin" section (gear icon) → Data Streams
- Click on your stream to see the Measurement ID

### "Analytics isn't tracking"
1. Check that `.env.local` has the correct ID
2. Make sure you restarted the dev server
3. Clear your browser cache and refresh
4. Check browser console for errors (F12)

### "I see errors in the console"
- Make sure the ID starts with `G-`
- Make sure there are no spaces around the `=` sign
- Make sure the file is named exactly `.env.local` (with the dot)

### "Real-time shows 0 users"
- It may take a few seconds to update
- Try visiting your website again
- Make sure you're viewing the correct property

---

## 📱 For Production (After Deployment)

When you deploy your website to production:

1. **The same Measurement ID works for both dev and production**
2. **Make sure to add the env variable to your hosting platform:**
   - **Netlify:** Site Settings → Environment Variables → Add `NEXT_PUBLIC_GA_ID`
   - **Vercel:** Project Settings → Environment Variables → Add `NEXT_PUBLIC_GA_ID`
   - **Other platforms:** Add as environment variable in their dashboard

3. **After adding, redeploy your site**

---

## 🎓 Advanced Setup (Optional, Later)

### Set Up Goals/Conversions
Track when someone completes a booking:
1. Go to Admin → Goals
2. Create a new goal
3. Set destination: `/booking/confirmation` (or your booking success page)

### Link with Google Search Console
Connect your Google Search Console for better SEO insights:
1. Go to Admin → Search Console
2. Click "Link" and follow the steps

### Set Up Custom Events
Track specific actions like:
- Button clicks
- Form submissions
- Page scroll depth

(We can set these up later if needed)

---

## ✅ Checklist

- [ ] Created Google Analytics account
- [ ] Created property named "LashDiary Website"
- [ ] Created web data stream
- [ ] Copied Measurement ID (starts with `G-`)
- [ ] Added `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` to `.env.local`
- [ ] Restarted development server
- [ ] Verified tracking in browser Network tab
- [ ] Saw myself in Real-time reports

---

## 🆘 Need Help?

If you get stuck at any step:
1. Take a screenshot of where you're stuck
2. Check the troubleshooting section above
3. Make sure you followed all steps in order

**Common Issues:**
- Forgot to restart server → Restart it!
- Wrong ID format → Should be `G-` followed by letters/numbers
- File not found → Make sure `.env.local` is in the root folder

---

## 📊 Next Steps After Setup

Once Analytics is working:

1. **Set up Google Search Console** (free SEO tool)
2. **Submit your sitemap** (`/sitemap.xml`) to Search Console
3. **Wait 24-48 hours** for data to populate
4. **Explore the reports** to understand your visitors

---

**You're all set! Google Analytics will now track all your website visitors automatically.** 🎉

Need help with any step? Let me know!

