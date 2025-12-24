# Lesson 3.3: Creating Your First Repository

**Estimated Time**: 20 minutes

---

## Introduction

A repository (or "repo") is where your code lives on GitHub. Think of it as a folder for your project. This lesson shows you how to create your first repository for your booking website project.

**What You'll Learn:**
- What a repository is
- How to create a new repository
- What settings to choose
- How to name your repository
- What to do after creating it

---

## What Is a Repository?

### Simple Explanation

**A repository is:**
- A folder for your project on GitHub
- Where all your code files are stored
- Like a project folder in the cloud
- One repository = one project

**Think of it as:**
- A container for your website code
- Your project's home on GitHub
- Where you'll save all your files
- The place where your code lives

### Repository Structure

**A repository contains:**
- All your code files
- Folders and subfolders
- Configuration files
- Documentation
- Everything for your project

**For your booking website:**
- All website files
- Frontend code
- Backend code
- Configuration
- Everything in one place

---

## Before Creating Your Repository

### Choose a Good Name

**Repository name should be:**
- Descriptive of your project
- Easy to remember
- Professional
- Use lowercase letters
- Can use hyphens

**Good examples:**
- `booking-website`
- `lash-booking-site`
- `professional-booking-app`
- `my-booking-website`

**Bad examples:**
- `project1` (not descriptive)
- `test` (too vague)
- `My Awesome Website!!!` (spaces and special chars)

**Tip:** Use kebab-case (lowercase with hyphens) - it's the standard!

### Decide: Public or Private?

**Public Repository:**
- Anyone can see your code
- Good for learning
- Shows your work
- Can be viewed by others
- Free and unlimited

**Private Repository:**
- Only you can see it
- More secure
- Good for business projects
- Still free (with limits)
- Can make public later

**For this course:** Either is fine! Public is good for learning and building a portfolio.

---

## Step-by-Step: Creating Your Repository

### Step 1: Go to GitHub

**1. Log in to GitHub:**
- Go to github.com
- Sign in with your account
- You'll see your dashboard

**2. Find the "New" button:**
- Look for green "New" button
- Usually top right or in left sidebar
- Click it to create new repository

**Alternative:**
- Click the "+" icon (top right)
- Select "New repository"
- Same result!

### Step 2: Fill Out Repository Details

**You'll see a form with several fields:**

#### Repository Name

**Enter your repository name:**
- Example: `booking-website`
- Use lowercase
- Use hyphens for spaces
- Make it descriptive

**This will be:**
- github.com/yourusername/booking-website
- Your repository URL

#### Description (Optional)

**Add a short description:**
- Example: "Professional booking website built with AI"
- Describes what the project is
- Can be changed later
- Helps others understand your project

#### Public or Private

**Choose visibility:**
- **Public:** Anyone can see
- **Private:** Only you can see

**For learning:** Public is fine  
**For business:** Private might be better

**You can change this later!**

### Step 3: Initialize Repository (Important!)

**You'll see options to initialize:**

#### ✅ Add a README file

**What it is:**
- A file that describes your project
- Shows on your repository homepage
- Written in Markdown
- Good practice to include

**Should you check it?**
- **Yes, if you're starting fresh**
- Creates a README.md file
- You can edit it later
- Recommended for beginners

#### ✅ Add .gitignore

**What it is:**
- Tells GitHub what files to ignore
- Prevents uploading unnecessary files
- Template for your project type

**Should you check it?**
- **Yes, if available**
- Choose template for your project type
- For Next.js/React, choose "Node"
- Helps keep repository clean

#### ✅ Choose a license

**What it is:**
- Legal terms for your code
- Who can use it and how

**Should you choose one?**
- **Optional for now**
- Can add later
- MIT License is common for open source
- Skip if unsure

**For your first repo:**
- ✅ Check "Add a README file"
- ✅ Check "Add .gitignore" (if available, choose "Node")
- ⬜ License (optional, can skip)

### Step 4: Create Repository

**1. Review your settings:**
- Name looks good?
- Description added?
- Public or private chosen?
- Initialization options selected?

**2. Click "Create repository":**
- Green button at bottom
- Repository is created!
- You'll see your new repository page

---

## After Creating Your Repository

### What You'll See

**Your repository page shows:**
- Repository name at top
- Description (if you added one)
- Files in your repository
- README.md (if you created one)
- Various tabs and options

### Understanding the Interface

**Main areas:**

**1. Code Tab:**
- Shows your files
- Where your code lives
- Default view

**2. README:**
- Description of your project
- Shows on repository homepage
- Can edit it

**3. Files:**
- List of files in repository
- Currently just README (if you created one)
- Will add more files later

**4. Green "Code" Button:**
- How to get your repository
- Clone, download, etc.
- We'll use this later

---

## Your Repository URL

### Understanding the URL

**Your repository URL is:**
- `github.com/yourusername/repository-name`
- Example: `github.com/johndoe/booking-website`

**This is:**
- Where your code lives
- How others find it
- Your project's address
- What you'll share

**Bookmark it or remember it!**

---

## Next Steps: What to Do Now

### 1. Edit Your README (Optional)

**Your README is your project's homepage:**

**Click on README.md:**
- See the file
- Click pencil icon to edit
- Add description of your project
- Save changes

**Example README content:**
```markdown
# Booking Website

A professional booking website built with AI assistance.

## Features

- Online booking system
- Payment processing
- Email notifications
- Admin dashboard
```

**This helps others (and you) understand your project!**

### 2. Explore Your Repository

**Familiarize yourself with:**
- The interface
- Different tabs
- Settings (gear icon)
- How things work

**Don't worry about understanding everything yet!**

### 3. Get Ready to Add Code

**Your repository is ready for:**
- Adding files
- Uploading code
- Starting your project
- Building your website

**We'll connect it to Cursor next!**

---

## Repository Settings (Optional)

### Accessing Settings

**1. Click "Settings" tab:**
- In your repository
- Top navigation
- Various options

### Useful Settings

**1. General:**
- Change repository name
- Change description
- Change visibility (public/private)
- Archive or delete repository

**2. Branches:**
- Manage branches
- Set default branch
- Can learn about this later

**3. Pages (for later):**
- Host website from GitHub
- We'll use Netlify instead
- But good to know it exists

**For now, default settings are fine!**

---

## Common Questions

### "What if I make a mistake in the name?"

**Answer:** You can change it in Settings! Go to Settings → General → Repository name → Change it → Save.

### "Can I delete a repository?"

**Answer:** Yes! Go to Settings → Scroll to bottom → Danger Zone → Delete this repository. Be careful - this is permanent!

### "What's the difference between public and private?"

**Answer:** 
- **Public:** Anyone can see your code (good for learning, portfolio)
- **Private:** Only you (and people you invite) can see it (good for business)

You can change this anytime in Settings!

### "Do I need a README?"

**Answer:** Not required, but highly recommended! It's like a welcome page for your project. Helps you and others understand what the project is.

### "What is .gitignore?"

**Answer:** A file that tells GitHub to ignore certain files (like node_modules, .env files). Keeps your repository clean. GitHub can create one for you based on templates.

### "Can I have multiple repositories?"

**Answer:** Yes! You can create unlimited repositories (public or private). Each project gets its own repository.

---

## Key Takeaways

1. **Repository = Project folder on GitHub** - Where your code lives
2. **Choose a good name** - Descriptive, lowercase, use hyphens
3. **Public or private** - Your choice, can change later
4. **Initialize with README** - Good practice, helps document your project
5. **Add .gitignore** - Keeps repository clean, choose Node template
6. **Repository URL** - github.com/yourusername/repo-name
7. **Ready for code** - Your repository is set up and waiting for your files!

---

## What's Next?

Now that you have a repository, let's learn about commits - how you save your work to GitHub. The next lesson explains commits in simple terms.

**Ready?** Let's move to Lesson 3.4: Understanding Commits!

---

## Quick Check

Before moving on, make sure you:
- ✅ Created your first repository
- ✅ Understand what a repository is (project folder)
- ✅ Know your repository URL
- ✅ Understand public vs private
- ✅ Are ready to learn about commits

If anything is unclear, review this lesson or ask questions!
