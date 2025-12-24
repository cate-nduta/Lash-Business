# Preparing Your Code for Deployment

## Introduction

Hey! Before we deploy your website, we need to make sure everything is ready. Think of it like cleaning your room before guests come over - we want everything to look good!

**Don't worry** - this is mostly checking things and making small fixes. Cursor can help with everything!

## What We're Preparing

We need to:
- ✅ Remove any test/debug code
- ✅ Make sure everything works
- ✅ Optimize for production
- ✅ Check for errors
- ✅ Clean up files

**Let's do it step by step!**

## Step 1: Remove Test Code

**Let's find and remove any test code:**

### Ask Cursor:

```
Search my codebase for any test pages, debug code, or temporary files that should be removed before deployment. List them for me.
```

**Common things to remove:**
- Test pages (like `/test-data`)
- Console.log statements (debugging code)
- Commented-out code
- Temporary files

### Remove Test Pages:

**If you created a test page:**

**Ask Cursor:**
```
Remove the test page at app/test-data/page.tsx. We don't need it for production.
```

## Step 2: Check for Console Logs

**Console logs are fine for development, but we should clean them up:**

### Ask Cursor:

```
Find all console.log statements in my codebase. Replace them with proper error handling or remove them if they're just for debugging.
```

**Or be more specific:**

**Ask Cursor:**
```
Remove all console.log debugging statements from my codebase, but keep console.error for actual error logging.
```

## Step 3: Check for Errors

**Let's make sure there are no errors:**

### Check TypeScript Errors:

1. **In Cursor, look at the bottom** - Are there any red error messages?
2. **Fix any errors** you see

### Ask Cursor to Check:

```
Check my codebase for any TypeScript errors, linting errors, or build errors. List them and help me fix them.
```

## Step 4: Optimize Images

**Large images slow down your website:**

### Ask Cursor:

```
Check all images in my project. Are they optimized? Should any be compressed or converted to WebP format for better performance?
```

**If images are large:**

**Ask Cursor:**
```
Optimize all images in the public folder. Compress them and convert to WebP format if possible, while maintaining quality.
```

## Step 5: Check Environment Variables

**Make sure all environment variables are documented:**

### Check Your .env.local:

1. **Open** `.env.local` file
2. **Make a list** of all variables you're using
3. **You'll need these** for Netlify setup

### Ask Cursor:

```
Review my .env.local file and create a list of all environment variables that need to be set in Netlify for production. Also create a .env.example file with placeholder values (no real secrets).
```

## Step 6: Test Everything Locally

**Before deploying, test that everything works:**

### Test Checklist:

- [ ] Homepage loads
- [ ] All pages work
- [ ] Booking system works
- [ ] Forms submit correctly
- [ ] No console errors
- [ ] Looks good on mobile
- [ ] Looks good on desktop

**If everything works locally, you're ready to deploy!**

## Step 7: Create .gitignore

**We need to make sure sensitive files aren't uploaded to GitHub:**

### Ask Cursor:

```
Create or update the .gitignore file to ensure:
- .env.local is not committed (contains secrets)
- node_modules is not committed
- .next build folder is not committed
- Any other sensitive or generated files are ignored
```

**This is important for security!**

## Step 8: Final Code Review

**Let's do a final check:**

### Ask Cursor:

```
Do a final review of my codebase before deployment. Check for:
- Any hardcoded secrets or API keys
- Any localhost URLs that should be environment variables
- Any test code that should be removed
- Any TODO comments
- Overall code quality
```

## Common Issues to Fix

### Issue: Hardcoded URLs

**If you see `http://localhost:3000` in your code:**

**Ask Cursor:**
```
Replace all hardcoded localhost URLs with environment variables. Use NEXT_PUBLIC_BASE_URL for the base URL.
```

### Issue: API Keys in Code

**If you see API keys in your code files:**

**Ask Cursor:**
```
I see API keys hardcoded in my code. Move them to environment variables and update the code to read from process.env.
```

### Issue: Large Bundle Size

**If your website is slow:**

**Ask Cursor:**
```
My website bundle size seems large. Can you help me optimize it? Check for unused dependencies and large files.
```

## What You've Accomplished

✅ Removed test code  
✅ Cleaned up debugging statements  
✅ Fixed any errors  
✅ Optimized images  
✅ Documented environment variables  
✅ Created .gitignore  
✅ Code is ready for deployment!  

## What's Next?

**Your code is now:**
- ✅ Clean and optimized
- ✅ Error-free
- ✅ Ready for production
- ✅ Secure (no secrets in code)

**In the next lesson**, we'll set up Git and push to GitHub!

## Key Takeaways

✅ Clean up test code before deploying  
✅ Remove console.log debugging statements  
✅ Fix all errors  
✅ Optimize images  
✅ Use environment variables for secrets  
✅ Create .gitignore for security  
✅ Test everything before deploying  
✅ Your code is production-ready!  

---

**Estimated Time**: 30 minutes  
**Difficulty**: Beginner (Cursor helps with everything!)  
**Next Lesson**: Setting Up Git Repository

