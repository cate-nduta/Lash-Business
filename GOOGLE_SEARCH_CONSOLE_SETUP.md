# Google Search Console Setup Guide for LashDiary

## Step 1: Choose Property Type

### ✅ **Choose: "URL prefix"**

**Why URL prefix?**
- ✅ Simpler verification process
- ✅ Perfect for single websites
- ✅ More verification options available
- ✅ Easier to set up

**Domain property is for:**
- Large organizations with multiple subdomains
- More complex setups
- Requires DNS verification (more technical)

---

## Step 2: Enter Your URL

1. **Select:** `URL prefix` (the second option)

2. **Enter your website URL:**
   ```
   https://lashdiary.co.ke
   ```
   
   **Important:**
   - ✅ Include `https://`
   - ✅ Don't add `/` at the end
   - ✅ Use your actual domain (if different, use that)

3. **Click "Continue"**

---

## Step 3: Verify Ownership

You'll see several verification methods. Choose the **easiest one**:

### Option 1: HTML File Upload (Recommended - Easiest)

1. **Download the HTML file:**
   - Google will give you a file to download
   - It looks like: `google1234567890abcdef.html`

2. **Place it in your `public` folder:**
   - Your project should have a `public` folder
   - Put the downloaded file there
   - So the file path is: `public/google1234567890abcdef.html`

3. **Verify:**
   - Go back to Search Console
   - Click "Verify"
   - If it works, you'll see a success message!

**If you don't have a `public` folder:**
- Create one in your project root (same level as `package.json`)
- Put the HTML file there
- Deploy your site (or test on localhost with a public folder)

---

### Option 2: HTML Tag (Alternative)

If HTML file doesn't work, use this:

1. **Copy the meta tag** Google gives you
   - It looks like:
     ```html
     <meta name="google-site-verification" content="abc123xyz" />
     ```

2. **Add it to your layout:**
   - Open `app/layout.tsx`
   - Find the `<head>` section or add it before `</head>`
   - Add the meta tag

3. **Redeploy your site** (if needed)

4. **Verify in Search Console**

---

### Option 3: Google Analytics (If Already Set Up)

**If you already have Google Analytics connected:**

1. **Select:** "Google Analytics" verification method
2. **It should verify automatically** if GA is working
3. **Click "Verify"**

---

## Step 4: Submit Your Sitemap

After verification succeeds:

1. **Go to "Sitemaps" in the left menu**

2. **Enter your sitemap URL:**
   ```
   https://lashdiary.co.ke/sitemap.xml
   ```
   
   **Important:**
   - ✅ Use your full domain
   - ✅ Include `https://`
   - ✅ Include `/sitemap.xml` at the end

3. **Click "Submit"**

4. **Wait a few minutes:**
   - Status will show "Success" when it's processed
   - It may take a few minutes to index all pages

---

## Step 5: Request Indexing (Optional but Recommended)

Help Google find your pages faster:

1. **Go to "URL Inspection"** (in the top search bar)

2. **Enter your homepage URL:**
   ```
   https://lashdiary.co.ke
   ```

3. **Click "Enter"**

4. **Click "Request Indexing"**

5. **Repeat for important pages:**
   - `/services`
   - `/booking`
   - `/gallery`
   - etc.

---

## ✅ Complete Setup Checklist

- [ ] Chose "URL prefix" property type
- [ ] Entered `https://lashdiary.co.ke` as URL
- [ ] Verified ownership (using one of the methods)
- [ ] Submitted sitemap: `https://lashdiary.co.ke/sitemap.xml`
- [ ] Requested indexing for main pages
- [ ] Waited 24-48 hours for data to appear

---

## 📊 What You'll See After Setup

### Immediate (within hours):
- ✅ Sitemap status showing "Success"
- ✅ Pages discovered count

### After 24-48 hours:
- 📈 Search performance data
- 📈 Which keywords people use to find you
- 📈 Click-through rates
- 📈 Page indexing status

### After 1-2 weeks:
- 📊 Full search analytics
- 📊 Which pages rank for which keywords
- 📊 How to improve your SEO

---

## 🆘 Troubleshooting

### "Verification failed"
- Make sure the HTML file is in the `public` folder
- Check that the file is accessible at `https://yourdomain.com/filename.html`
- Try a different verification method

### "Sitemap not found"
- Wait 5-10 minutes after submitting
- Check that your sitemap works: Visit `https://lashdiary.co.ke/sitemap.xml` in a browser
- Make sure you included `/sitemap.xml` in the URL

### "Pages not indexed"
- This is normal - it takes time!
- Request indexing for important pages manually
- Make sure your site is live and accessible

---

## 🎯 Quick Summary

1. **Choose:** URL prefix ✅
2. **Enter:** `https://lashdiary.co.ke`
3. **Verify:** Use HTML file upload (easiest)
4. **Submit sitemap:** `https://lashdiary.co.ke/sitemap.xml`
5. **Wait:** 24-48 hours for data

**You're all set!** 🎉

---

## 📝 Note About Your Sitemap

Your sitemap is already set up at:
- **URL:** `https://lashdiary.co.ke/sitemap.xml`
- **Auto-updates:** When you add new shop products
- **Includes:** All your public pages

Just submit this URL in Search Console after verification!

