# Setting Up Git Repository

## Introduction

Hey! Git is like a time machine for your code - it saves every version so you can go back if something breaks. GitHub is where we store your code online so Netlify can access it.

**Don't worry** - we'll set it up step by step, and Cursor can help!

## What is Git?

### Simple Explanation:

**Git = Version control system**

**Think of it like:**
- **Saving your game** - Git saves your code
- **Multiple save files** - You can have many versions
- **Go back in time** - If something breaks, go back to working version

**It's like having unlimited "undo" for your entire project!**

## What is GitHub?

### Simple Explanation:

**GitHub = Where your code lives online**

**Think of it like:**
- **Google Drive for code** - Stores your code in the cloud
- **Backup** - Your code is safe online
- **Sharing** - Others can see your code (if you want)
- **Deployment** - Netlify can access it to deploy

**It's like a cloud storage specifically for code!**

## Step 1: Check if Git is Installed

**First, let's see if Git is already on your computer:**

### Open Terminal in Cursor:

1. **In Cursor, click "Terminal" → "New Terminal"**
2. **Or press** `` Ctrl+` `` (Ctrl + backtick)

### Check Git Version:

**Type this command:**
```bash
git --version
```

**Press Enter**

### What You'll See:

**If Git is installed:**
- You'll see: `git version 2.x.x` (some version number)
- ✅ Git is ready to use!

**If Git is NOT installed:**
- You'll see: `'git' is not recognized` or similar error
- You need to install Git (we covered this in Module 2!)

**If you need to install Git, go back to Module 2, Lesson 2!**

## Step 2: Initialize Git in Your Project

**Now let's turn your project into a Git repository:**

### In Terminal:

1. **Make sure you're in your project folder**
2. **Type:**
   ```bash
   git init
   ```
3. **Press Enter**

**What happens:** Git creates a hidden `.git` folder that tracks all your changes!

## Step 3: Configure Git (If Not Done)

**Tell Git who you are:**

### Set Your Name:

```bash
git config user.name "Your Name"
```

**Replace "Your Name" with your actual name!**

### Set Your Email:

```bash
git config user.email "your-email@example.com"
```

**Replace with your actual email!**

**Or ask Cursor:**
```
Help me configure Git with my name and email. My name is [your name] and email is [your email].
```

## Step 4: Create .gitignore File

**We need to tell Git what NOT to track:**

### Ask Cursor:

```
Create a .gitignore file for a Next.js project that ignores:
- node_modules folder
- .next build folder
- .env.local (contains secrets)
- .env files
- Any build artifacts
- IDE files
- OS files
```

**This prevents sensitive files from being uploaded!**

## Step 5: Make Your First Commit

**Now let's save your code for the first time!**

### Add All Files:

**In Terminal, type:**
```bash
git add .
```

**This tells Git:** "Track all these files!"

### Create First Commit:

**Type:**
```bash
git commit -m "Initial commit - booking website"
```

**This saves your code with a message!**

**Or ask Cursor:**
```
Help me make my first Git commit. Add all files and commit with message "Initial commit".
```

## Step 6: Create GitHub Repository

**Now let's create a place on GitHub for your code:**

### Go to GitHub:

1. **Open your browser**
2. **Go to**: https://github.com
3. **Log in** to your account

### Create New Repository:

1. **Click the "+" icon** (top right)
2. **Click "New repository"**
3. **Fill out the form:**

**Repository name:**
- Type: `my-booking-website` (or any name you like)
- Keep it lowercase, no spaces

**Description (optional):**
- Type: "Booking website built with Next.js and AI"

**Visibility:**
- Choose: **Public** (so Netlify can access it)
- Or **Private** (if you have GitHub Pro, Netlify can still access it)

**Initialize repository:**
- ❌ Don't check "Add a README" (you already have code)
- ❌ Don't add .gitignore (you already have one)
- ❌ Don't choose a license (optional)

4. **Click "Create repository"**

**GitHub will show you instructions** - but we'll do it our way!

## Step 7: Connect Local Git to GitHub

**Now let's connect your local code to GitHub:**

### GitHub will show you commands like:

```bash
git remote add origin https://github.com/yourusername/my-booking-website.git
git branch -M main
git push -u origin main
```

### But Let's Do It Step by Step:

**Step 1: Add GitHub as Remote**

**In Terminal, type:**
```bash
git remote add origin https://github.com/yourusername/your-repo-name.git
```

**Replace:**
- `yourusername` = Your GitHub username
- `your-repo-name` = Your repository name

**Step 2: Rename Branch to Main**

```bash
git branch -M main
```

**Step 3: Push to GitHub**

```bash
git push -u origin main
```

**You'll be asked to log in** - use your GitHub username and a Personal Access Token (not your password).

### Or Ask Cursor:

```
Help me connect my local Git repository to GitHub. My repository URL is [paste the URL from GitHub].
```

## Step 8: Create Personal Access Token

**GitHub requires a token instead of password:**

### Create Token:

1. **Go to GitHub**
2. **Click your profile** (top right)
3. **Click "Settings"**
4. **Click "Developer settings"** (bottom left)
5. **Click "Personal access tokens" → "Tokens (classic)"**
6. **Click "Generate new token" → "Generate new token (classic)"**
7. **Fill out:**
   - **Note:** "For Netlify deployment"
   - **Expiration:** 90 days (or longer)
   - **Scopes:** Check "repo" (full control)
8. **Click "Generate token"**
9. **COPY THE TOKEN** - You'll only see it once!

### Use Token When Pushing:

**When Git asks for password, use the token instead!**

## Step 9: Verify It Worked

**Let's make sure your code is on GitHub:**

1. **Go to your GitHub repository** in browser
2. **You should see all your files!** ✅
3. **Refresh the page** if needed

**If you see your files, it worked!** 🎉

## Common Issues and Solutions

### Issue: "Repository not found"

**Solutions:**
- Check the repository URL is correct
- Make sure repository exists on GitHub
- Verify you're logged into GitHub

### Issue: "Authentication failed"

**Solutions:**
- Use Personal Access Token, not password
- Make sure token has "repo" permissions
- Check token hasn't expired

### Issue: "Nothing to commit"

**Solutions:**
- Make sure you're in the right folder
- Check that files exist
- Try `git status` to see what's happening

## What You've Learned

✅ What Git and GitHub are  
✅ How to initialize Git  
✅ How to create commits  
✅ How to connect to GitHub  
✅ How to push code  
✅ How to create Personal Access Tokens  

## Real Talk: This is Professional Development!

**Think about it:**
- You just set up version control
- Your code is backed up online
- You can track all changes
- This is what professional developers use!

**A 13-year-old just set up Git and GitHub. That's impressive!** 🎉

## Key Takeaways

✅ Git = Version control (saves your code)  
✅ GitHub = Cloud storage for code  
✅ Always use .gitignore for security  
✅ Commits save your code  
✅ Push to GitHub to back up online  
✅ Use Personal Access Tokens (not passwords)  
✅ Your code is now safely stored online!  

---

**Estimated Time**: 35 minutes  
**Difficulty**: Beginner (just following steps!)  
**Next Lesson**: Pushing Code to GitHub

