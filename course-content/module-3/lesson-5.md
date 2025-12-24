# Lesson 3.5: Connecting GitHub to Cursor

**Estimated Time**: 15 minutes

---

## Introduction

Now that you understand GitHub and commits, let's connect your GitHub repository to Cursor. This way, you can save your code directly from Cursor without leaving your code editor. This makes the workflow seamless and easy.

**What You'll Learn:**
- How to connect GitHub to Cursor
- How to clone your repository
- How to commit from Cursor
- How to push to GitHub from Cursor
- The complete workflow

---

## Why Connect GitHub to Cursor?

### The Benefits

**Without Connection:**
- Have to use GitHub website
- Manual file uploads
- More steps
- Less convenient

**With Connection:**
- Everything in Cursor
- Commit with one click
- Push directly
- Seamless workflow

**Much easier and faster!**

---

## Two Ways to Connect

### Option 1: Clone Repository (Recommended)

**What it means:**
- Download your repository to your computer
- Work on it locally in Cursor
- Push changes back to GitHub

**Best for:**
- Starting a new project
- Working on your computer
- Full development workflow

### Option 2: Initialize Git in Existing Folder

**What it means:**
- You already have code on your computer
- Connect it to GitHub repository
- Link existing code to GitHub

**Best for:**
- You've already started coding
- Have files you want to upload
- Connecting existing project

**We'll cover Option 1 (most common)!**

---

## Step-by-Step: Cloning Your Repository

### Step 1: Get Your Repository URL

**1. Go to your GitHub repository:**
- Open github.com
- Go to your repository
- You'll see the repository page

**2. Click the green "Code" button:**
- Top right of repository page
- Dropdown menu appears
- Shows different ways to get your code

**3. Copy the HTTPS URL:**
- Under "HTTPS" tab
- Click the copy icon (two squares)
- URL is copied to clipboard
- Looks like: `https://github.com/yourusername/repo-name.git`

**Keep this URL - you'll need it!**

### Step 2: Open Cursor

**1. Open Cursor:**
- Launch the Cursor application
- You'll see the welcome screen or file explorer

**2. Open Command Palette:**
- Press `Ctrl+Shift+P` (Windows/Linux)
- Or `Cmd+Shift+P` (Mac)
- Command palette appears

**Alternative:**
- Click "File" menu
- Look for "Clone Repository" option

### Step 3: Clone Repository

**1. Type "Git: Clone":**
- In command palette
- Start typing "clone"
- Select "Git: Clone"

**2. Paste Repository URL:**
- Paste the URL you copied
- Press Enter
- Cursor asks where to save

**3. Choose Location:**
- Select a folder on your computer
- Where you want your project
- Example: Documents/Projects
- Click "Select Repository Location"

**4. Wait for Clone:**
- Cursor downloads repository
- Shows progress
- Takes a few seconds

**5. Open Repository:**
- Cursor asks if you want to open it
- Click "Open" or "Open in New Window"
- Repository opens in Cursor!

**Your repository is now on your computer!**

---

## Understanding Your Repository in Cursor

### What You'll See

**1. File Explorer (Left Sidebar):**
- All your repository files
- Folders and files
- Just like file explorer

**2. Source Control (Left Sidebar):**
- Git icon (usually)
- Shows changes
- Where you commit

**3. Your Files:**
- README.md (if you created one)
- .gitignore (if you added one)
- Ready for your code!

---

## Making Your First Commit from Cursor

### Step 1: Make a Change

**1. Create or edit a file:**
- Add a new file
- Or edit existing file
- Make some changes

**Example:**
- Edit README.md
- Add some text
- Save the file

### Step 2: Stage Your Changes

**1. Open Source Control:**
- Click Git icon in left sidebar
- Or press `Ctrl+Shift+G`
- See your changes

**2. Stage Changes:**
- You'll see changed files
- Click "+" next to file
- Or click "Stage All Changes"
- Files are now staged

**Staging = Preparing to commit**

### Step 3: Write Commit Message

**1. Type Commit Message:**
- Box at top of Source Control panel
- Write your message
- Example: "Update README with project description"

**2. Make it descriptive:**
- What did you change?
- Why did you change it?
- Keep it clear

### Step 4: Commit

**1. Click "Commit" button:**
- Or press `Ctrl+Enter`
- Commit is created!
- Changes are saved locally

**2. You'll see:**
- Commit appears in history
- Changes are committed
- Ready to push

**Your first commit from Cursor!**

---

## Pushing to GitHub

### What Is Pushing?

**Pushing:**
- Uploads your commits to GitHub
- Sends your code to the cloud
- Makes it available online
- Backs up your work

### How to Push

**1. After Committing:**
- You'll see "Sync Changes" or push icon
- Usually in Source Control panel
- Or at bottom status bar

**2. Click Push:**
- Click "Sync Changes" or push icon
- Or use command: "Git: Push"
- Cursor uploads to GitHub

**3. First Time:**
- Cursor may ask for GitHub credentials
- Sign in with GitHub
- Authorize Cursor
- One-time setup

**4. Wait for Push:**
- Cursor uploads your commits
- Shows progress
- Takes a few seconds

**5. Check GitHub:**
- Go to your repository on GitHub
- See your commits!
- Code is now on GitHub

**Your code is now safely on GitHub!**

---

## The Complete Workflow

### Daily Workflow

**1. Make Changes:**
- Edit files in Cursor
- Build features
- Fix bugs

**2. Stage Changes:**
- Open Source Control
- Stage your files
- Prepare to commit

**3. Commit:**
- Write commit message
- Click commit
- Save locally

**4. Push:**
- Click push/sync
- Upload to GitHub
- Code is backed up

**5. Repeat:**
- Continue working
- Commit frequently
- Push regularly

**Simple and efficient!**

---

## Troubleshooting

### Problem: "Repository not found"

**Solution:**
- Check repository URL is correct
- Make sure repository exists on GitHub
- Verify you have access
- Try copying URL again

### Problem: "Authentication failed"

**Solution:**
- Sign in to GitHub in Cursor
- Check your credentials
- May need to generate access token
- GitHub may require token instead of password

### Problem: "Can't push"

**Solution:**
- Make sure you've committed first
- Check internet connection
- Verify GitHub credentials
- Try pulling first, then pushing

### Problem: "Changes not showing"

**Solution:**
- Save your files first
- Refresh Source Control panel
- Check you're in right folder
- Make sure Git is initialized

---

## GitHub Authentication

### First Time Setup

**Cursor may ask you to:**
- Sign in to GitHub
- Authorize Cursor
- Grant permissions

**This is safe and normal:**
- Cursor needs permission to push
- Only accesses your repositories
- Standard OAuth flow
- One-time setup

### Using Personal Access Token

**If password doesn't work:**
- GitHub may require token
- Generate token on GitHub
- Use token as password
- More secure method

**We'll cover this if needed!**

---

## Alternative: Using GitHub Desktop

### If Cursor Git Is Confusing

**GitHub Desktop:**
- Visual Git client
- Easier for beginners
- Graphical interface
- Can use alongside Cursor

**Workflow:**
- Code in Cursor
- Commit/push in GitHub Desktop
- Best of both worlds

**But Cursor's built-in Git is usually fine!**

---

## Best Practices

### 1. Commit Frequently

**Good:**
- Commit after each feature
- Commit when something works
- Small, frequent commits

**Bad:**
- Code for hours without committing
- Large, infrequent commits

### 2. Write Good Messages

**Good:**
- "Add booking form validation"
- "Fix button styling on mobile"

**Bad:**
- "Update"
- "Changes"
- "Fix"

### 3. Push Regularly

**Good:**
- Push after each commit
- Or push at end of session
- Keep GitHub up to date

**Bad:**
- Never push
- Lose work if computer breaks

### 4. Pull Before Starting

**If working on multiple computers:**
- Pull latest changes first
- Get updates from GitHub
- Then start working

**For now, one computer is fine!**

---

## Common Questions

### "Do I need to push after every commit?"

**Answer:** Not necessarily, but it's good practice. Push at least once per work session to backup your work. Pushing after each commit is safest.

### "What's the difference between commit and push?"

**Answer:**
- **Commit:** Saves locally on your computer
- **Push:** Uploads commits to GitHub (cloud)

You can commit multiple times, then push once. But pushing regularly is safer.

### "Can I work offline?"

**Answer:** Yes! You can commit offline. You just need internet to push to GitHub. Commit as you work, push when online.

### "What if I forget to push?"

**Answer:** Your commits are still on your computer. Just push when you remember. Your work isn't lost, just not backed up yet.

### "Can multiple people work on the same repository?"

**Answer:** Yes! That's one of GitHub's strengths. Multiple people can work on the same project. We'll cover collaboration later if needed.

---

## Key Takeaways

1. **Clone repository to work locally** - Download repository to your computer
2. **Cursor has built-in Git** - Can commit and push directly from Cursor
3. **Commit = Save locally** - Saves on your computer
4. **Push = Upload to GitHub** - Sends to cloud, backs up your work
5. **Workflow is simple** - Make changes → Stage → Commit → Push
6. **Push regularly** - Keeps your work backed up on GitHub
7. **Everything in one place** - Code, commit, and push all in Cursor

---

## Module 3 Complete!

Congratulations! You've completed Module 3: Setting Up GitHub (Saving Your Work Safely). You now know:

- ✅ What GitHub is (cloud storage for code)
- ✅ How to create a GitHub account
- ✅ How to create a repository
- ✅ How commits work (saving your work)
- ✅ How to connect GitHub to Cursor

**You're now ready to save your work safely as you build!**

---

## What's Next?

Now that you have GitHub set up and connected to Cursor, you're ready to start building! The next modules will guide you through actually creating your booking website.

**Ready to start building?** Let's move to the next module!

---

## Quick Check

Before moving on, make sure you:
- ✅ Have a GitHub account
- ✅ Created your first repository
- ✅ Understand what commits are
- ✅ Know how to commit from Cursor
- ✅ Know how to push to GitHub
- ✅ Are ready to start building with version control

If anything is unclear, review this lesson or the previous lessons in this module!

**You're ready to build safely!** 🚀
