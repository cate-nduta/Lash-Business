# Lesson 3.4: Understanding Commits

**Estimated Time**: 20 minutes

---

## Introduction

Commits are how you save your work to GitHub. Every time you make changes and want to save them, you create a commit. This lesson explains what commits are, why they matter, and how to use them effectively.

**What You'll Learn:**
- What a commit actually is
- Why commits are important
- How to write good commit messages
- When to make commits
- How commits create your project history

---

## What Is a Commit? (Simple Explanation)

### The Simple Analogy: Saving Your Game

**Think of Commits Like Saving a Video Game**

**Video Game:**
- You play for a while
- Reach a checkpoint
- Save your game
- If you die, you go back to last save
- Each save = one checkpoint

**GitHub Commits:**
- You code for a while
- Make some progress
- Create a commit (save)
- If something breaks, go back to last commit
- Each commit = one save point

**Commits are like save points for your code!**

---

## What a Commit Actually Is

### The Technical Definition

**A commit is:**
- A snapshot of your code at a specific moment
- A saved version of your project
- A record of what changed
- A point in your project's history

**Think of it as:**
- A photo of your code
- A bookmark in your project
- A save file
- A milestone

### What Gets Committed

**A commit includes:**
- All the files you changed
- What changed in each file
- A message describing the changes
- The date and time
- Who made the commit

**Everything about that moment in time!**

---

## Why Commits Matter

### 1. Safety Net

**If something breaks:**
- Go back to last commit
- Undo the mistake
- Continue from safe point
- No work lost

**Example:**
- You commit: "Added booking form"
- You try to add animation
- Website breaks
- Go back to "Added booking form" commit
- Start over from there

### 2. History of Your Project

**See your progress:**
- Timeline of all changes
- What you did and when
- How your project evolved
- Learn from your journey

**Example:**
- Commit 1: "Created homepage"
- Commit 2: "Added services page"
- Commit 3: "Created booking form"
- Commit 4: "Fixed form validation"

**Complete history of your project!**

### 3. Understanding Changes

**See what changed:**
- Compare versions
- See exactly what you changed
- Understand your edits
- Debug problems

**Example:**
- Commit message: "Fixed button styling"
- See exactly which lines changed
- Understand what was fixed
- Learn from changes

### 4. Collaboration

**Work with others:**
- See who changed what
- Understand team progress
- Coordinate work
- Merge changes safely

**Even solo, it helps you stay organized!**

---

## How Commits Work

### The Process

**Step 1: Make Changes**
- Edit files in Cursor
- Add new features
- Fix bugs
- Make improvements

**Step 2: Stage Changes**
- Tell GitHub which files to commit
- Select what to save
- Prepare for commit

**Step 3: Create Commit**
- Write commit message
- Describe what changed
- Save the commit
- Create snapshot

**Step 4: Push to GitHub**
- Upload commit to GitHub
- Code is now in cloud
- Safe and backed up

**Simple workflow!**

---

## Writing Good Commit Messages

### Why Messages Matter

**Commit messages:**
- Describe what changed
- Help you remember later
- Help others understand
- Make history useful

**Good message:**
- Clear and descriptive
- Explains what and why
- Easy to understand later

**Bad message:**
- Vague or unclear
- Doesn't explain anything
- Useless later

### Commit Message Format

**Good format:**
```
Short summary (50 characters or less)

Longer description if needed
- What changed
- Why it changed
- Any important notes
```

**Example:**
```
Added booking form validation

- Validate email format
- Require all fields
- Show error messages
- Prevents invalid submissions
```

### Commit Message Best Practices

**1. Use Present Tense:**
- ✅ "Add booking form"
- ❌ "Added booking form"

**2. Be Specific:**
- ✅ "Fix button color on mobile"
- ❌ "Fix stuff"

**3. Keep It Short (for simple changes):**
- ✅ "Add homepage hero section"
- ❌ "This commit adds a hero section to the homepage with a headline, description, and call-to-action button"

**4. Explain Why (if not obvious):**
- ✅ "Change button color to improve contrast"
- ❌ "Change button color"

**5. One Logical Change Per Commit:**
- ✅ "Add booking form"
- ✅ "Style booking form"
- ❌ "Add booking form and style it and fix homepage"

---

## When to Make Commits

### Good Times to Commit

**1. After Completing a Feature:**
- Added booking form? Commit!
- Created services page? Commit!
- Finished a section? Commit!

**2. After Fixing a Bug:**
- Fixed an error? Commit!
- Resolved an issue? Commit!
- Made something work? Commit!

**3. Before Making Big Changes:**
- About to try something risky? Commit first!
- Safe point to return to
- Can experiment freely

**4. At End of Work Session:**
- Finished for the day? Commit!
- Save your progress
- Safe stopping point

**5. When Something Works:**
- Got something working? Commit!
- Don't lose working code
- Mark the milestone

### How Often to Commit

**Commit frequently:**
- Small, frequent commits are better
- Easier to understand
- Easier to undo
- Better history

**Don't wait too long:**
- Don't code for hours without committing
- Risk losing work
- Hard to remember what changed
- Large commits are harder to understand

**Rule of thumb:** Commit whenever you complete something or get something working!

---

## Real-World Example

### Building Your Booking Website

**Day 1:**
```
Commit 1: "Create Next.js project"
- Initialized project
- Set up basic structure

Commit 2: "Add homepage layout"
- Created homepage component
- Added hero section
- Basic styling
```

**Day 2:**
```
Commit 3: "Add services page"
- Created services component
- Listed services
- Added pricing display

Commit 4: "Style services page"
- Improved layout
- Added cards
- Better spacing
```

**Day 3:**
```
Commit 5: "Create booking form"
- Added form component
- Form fields
- Basic structure

Commit 6: "Add form validation"
- Email validation
- Required fields
- Error messages

Commit 7: "Fix form submission bug"
- Fixed submission issue
- Form now works correctly
```

**Each commit = one logical step forward!**

---

## Understanding Commit History

### Viewing Your History

**On GitHub:**
- Go to your repository
- Click "Commits" or history
- See all your commits
- Timeline of your project

**You'll see:**
- Commit messages
- Who made them
- When they were made
- What files changed

**Like a diary of your project!**

### Comparing Versions

**You can:**
- Compare any two commits
- See what changed
- Understand differences
- Go back to any version

**Very powerful for debugging!**

---

## Common Mistakes to Avoid

### 1. Vague Commit Messages

**Bad:**
- "Update"
- "Fix"
- "Changes"
- "Stuff"

**Good:**
- "Update homepage hero text"
- "Fix button alignment on mobile"
- "Add email validation to form"

### 2. Committing Too Much at Once

**Bad:**
- One commit: "Added entire website"

**Good:**
- Commit 1: "Added homepage"
- Commit 2: "Added services page"
- Commit 3: "Added booking form"

### 3. Not Committing Often Enough

**Bad:**
- Code for 8 hours, then commit

**Good:**
- Commit after each feature
- Commit when something works
- Commit frequently

### 4. Committing Broken Code

**Try to:**
- Commit working code
- Test before committing
- Fix bugs, then commit

**But it's okay to:**
- Commit work in progress
- Mark it in commit message
- Fix in next commit

---

## Commit Workflow Summary

### The Daily Workflow

**1. Start Working:**
- Pull latest code (if working with others)
- Make changes
- Test your changes

**2. Make Progress:**
- Complete a feature
- Fix a bug
- Get something working

**3. Commit:**
- Stage your changes
- Write good commit message
- Create commit
- Push to GitHub

**4. Repeat:**
- Continue working
- Commit frequently
- Build your history

**Simple and effective!**

---

## Common Questions

### "How long should commit messages be?"

**Answer:** Short summary (50 chars) is good for simple changes. Add longer description if needed. Most commits can be one short line.

### "Can I change a commit message?"

**Answer:** Yes, but it's easier to just make a new commit. For the most recent commit, you can amend it, but it's usually better to just commit again with a better message.

### "What if I commit something by mistake?"

**Answer:** You can undo the last commit (but keep your changes), or make a new commit to fix it. Don't worry - commits are safe to experiment with!

### "How many commits should I have?"

**Answer:** There's no limit! More commits are better than fewer. Commit whenever you make progress. Hundreds of commits for a project is normal and good!

### "Do I need to commit every single change?"

**Answer:** No, but commit frequently. A good rule: commit when you complete something or get something working. Don't commit every single character you type, but don't wait too long either.

---

## Key Takeaways

1. **Commit = Save point** - Like saving a video game, but for your code
2. **Commit frequently** - Small, frequent commits are better than large, infrequent ones
3. **Write good messages** - Clear, descriptive messages help you and others understand changes
4. **Commit working code** - Try to commit when things work, but it's okay to commit work in progress
5. **Commits create history** - Your commit history is like a diary of your project
6. **Commits are safe** - You can always go back to previous commits
7. **One logical change per commit** - Makes history easier to understand

---

## What's Next?

Now that you understand commits, let's connect GitHub to Cursor so you can commit and push your code directly from your code editor. The next lesson shows you how to set this up.

**Ready?** Let's move to Lesson 3.5: Connecting GitHub to Cursor!

---

## Quick Check

Before moving on, make sure you understand:
- ✅ What a commit is (save point for your code)
- ✅ Why commits matter (safety, history, understanding changes)
- ✅ How to write good commit messages (clear, descriptive)
- ✅ When to make commits (frequently, after completing features)
- ✅ How commits create project history (timeline of changes)

If anything is unclear, review this lesson or ask questions!
