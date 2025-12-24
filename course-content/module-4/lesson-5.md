# Lesson 4.5: Fixing Errors Using Cursor

**Estimated Time**: 20 minutes

---

## Introduction

When building websites, you'll encounter errors. That's normal and expected! The good news is that Cursor's AI is excellent at helping you understand and fix errors. This lesson teaches you how to use Cursor to debug and fix problems in your code.

**What You'll Learn:**
- How to identify errors
- Using Cursor to understand errors
- How to ask Cursor to fix errors
- Common error types and solutions
- Debugging workflow
- Best practices for error fixing

---

## Understanding Errors

### Types of Errors

**1. Syntax Errors:**
- Code is written incorrectly
- Missing brackets, quotes, etc.
- Usually caught immediately
- Red squiggly lines in editor

**2. Runtime Errors:**
- Code runs but crashes
- Happens when executing
- Shows in browser console
- Or terminal output

**3. Logic Errors:**
- Code runs but does wrong thing
- Harder to spot
- Need to test to find
- Requires understanding the problem

**4. Type Errors:**
- Wrong data type used
- TypeScript/type checking
- Caught during development
- Prevents bugs

**Cursor can help with all of these!**

---

## Finding Errors

### In Cursor Editor

**Visual indicators:**
- Red squiggly lines = errors
- Yellow squiggly lines = warnings
- Hover to see error message
- Click to see details

**Problems panel:**
- Bottom panel → Problems tab
- Lists all errors
- Click to jump to error
- See all issues at once

**Terminal/Console:**
- Run your code
- Errors appear in output
- Copy error message
- Use with Cursor AI

### In Browser

**Developer console:**
- Press F12 or right-click → Inspect
- Console tab shows errors
- Red error messages
- Click to see details

**Network tab:**
- Shows failed requests
- API errors
- 404, 500 errors
- Connection issues

---

## Using Cursor to Understand Errors

### Method 1: AI Chat

**Step 1: Copy error message**
- Select error text
- Copy it (Ctrl+C)

**Step 2: Open AI Chat**
- Press `Ctrl+L` / `Cmd+L`
- Or click AI icon

**Step 3: Ask about error**
- Paste error message
- Ask: "What does this error mean?"
- Or: "Why is this happening?"

**Example:**
```
You: "I'm getting this error: 'Cannot read property 'name' of undefined'. 
What does it mean?"

AI: "This error means you're trying to access the 'name' property 
on something that is undefined. This usually happens when..."
```

**AI explains the error in simple terms!**

### Method 2: Right-Click on Error

**Step 1: Select error code**
- Highlight the problematic code
- Or click on error line

**Step 2: Right-click**
- Context menu appears
- AI options available

**Step 3: Choose AI action**
- "Explain this error"
- "Fix this error"
- "Why is this failing?"

**Quick help directly on the error!**

### Method 3: Ask About Specific Code

**In AI Chat:**
```
"Looking at line 45 in booking-form.tsx, 
why is this giving an error?"
```

**AI sees your code and explains the issue!**

---

## Using Cursor to Fix Errors

### Method 1: Ask AI to Fix

**In AI Chat:**
```
"I'm getting this error: [paste error].
Can you help me fix it?"
```

**Or:**
```
"Fix the error on line 45 in booking-form.tsx"
```

**AI will:**
- Understand the error
- Identify the cause
- Suggest a fix
- Or fix it directly

### Method 2: Use Composer

**For complex fixes:**
- Press `Ctrl+I` / `Cmd+I`
- Describe the error and what should happen
- AI fixes across multiple files if needed

**Example:**
```
"The booking form is not submitting. The error says 
'Cannot read property email of undefined'. 
Fix the form submission to properly handle the form data 
and send it to the API route."
```

### Method 3: Right-Click Fix

**Quick fixes:**
- Select error code
- Right-click
- "Fix this error"
- AI suggests fix

---

## Common Errors and Solutions

### Error 1: "Cannot read property X of undefined"

**What it means:**
- Trying to access property on undefined object
- Object doesn't exist yet
- Common in React/Next.js

**How to fix with Cursor:**
```
Ask: "I'm getting 'Cannot read property 'name' of undefined' 
on line 23. How do I fix this?"

AI will suggest:
- Add null check
- Initialize the object
- Wait for data to load
- Use optional chaining (?.)
```

**Example fix:**
```javascript
// Before (error)
const name = user.name;

// After (fixed)
const name = user?.name || '';
// or
if (user) {
  const name = user.name;
}
```

### Error 2: "Module not found"

**What it means:**
- Importing something that doesn't exist
- Wrong file path
- Package not installed

**How to fix with Cursor:**
```
Ask: "I'm getting 'Module not found: Can't resolve './components/Button'".
How do I fix this?"

AI will:
- Check if file exists
- Suggest correct path
- Help install package if needed
```

**Common fixes:**
- Check file path is correct
- Install missing package: `npm install package-name`
- Check file extension (.js, .tsx, etc.)

### Error 3: "Unexpected token"

**What it means:**
- Syntax error
- Missing bracket, quote, etc.
- Typo in code

**How to fix with Cursor:**
```
Ask: "I'm getting 'Unexpected token' on line 15. 
What's wrong with the syntax?"

AI will:
- Point out the syntax error
- Show what's missing
- Suggest the fix
```

**Common issues:**
- Missing closing bracket `}`
- Missing quote `"`
- Extra comma
- Wrong syntax

### Error 4: "Type error"

**What it means:**
- TypeScript type mismatch
- Wrong type used
- Type not defined

**How to fix with Cursor:**
```
Ask: "Type error: 'string' is not assignable to type 'number'.
How do I fix this?"

AI will:
- Explain the type issue
- Suggest type conversion
- Fix the type definition
```

**Common fixes:**
- Convert type: `Number(value)`
- Fix type definition
- Use correct type

### Error 5: "Network error" / "Failed to fetch"

**What it means:**
- API request failed
- Server not responding
- CORS issue
- Wrong URL

**How to fix with Cursor:**
```
Ask: "I'm getting 'Failed to fetch' when calling the API.
The endpoint is /api/booking. How do I fix this?"

AI will:
- Check API route exists
- Verify request format
- Check CORS settings
- Help debug the issue
```

**Common fixes:**
- Check API route exists
- Verify request URL
- Check server is running
- Fix CORS if needed

---

## Debugging Workflow

### Step 1: Identify the Error

**Where is it?**
- In editor (red squiggly)
- In browser console
- In terminal
- In Problems panel

**What is it?**
- Read error message
- Understand what it says
- Note the location

### Step 2: Understand the Error

**Use Cursor AI:**
- Ask: "What does this error mean?"
- Paste error message
- Get explanation

**Understand:**
- What went wrong
- Why it happened
- What needs to be fixed

### Step 3: Find the Cause

**Use Cursor AI:**
- Ask: "Why is this error happening?"
- Reference the code
- Get root cause

**Check:**
- The problematic code
- Related files
- Dependencies
- Configuration

### Step 4: Fix the Error

**Use Cursor AI:**
- Ask: "How do I fix this error?"
- Or: "Fix this error"
- Get solution

**Apply fix:**
- Review the suggested fix
- Apply if correct
- Test if it works

### Step 5: Verify the Fix

**Test:**
- Run the code
- Check if error is gone
- Verify functionality works
- No new errors

**If still broken:**
- Ask AI again
- Try different approach
- Check for other issues

---

## Best Practices

### 1. Read the Error Message

**Don't panic:**
- Error messages are helpful
- They tell you what's wrong
- Read them carefully

**Use them:**
- Copy error message
- Paste in Cursor AI
- Get explanation

### 2. Fix One Error at a Time

**Don't try to fix everything:**
- Focus on one error
- Fix it completely
- Then move to next

**Why:**
- Less overwhelming
- Clearer progress
- Easier to track

### 3. Understand Before Fixing

**Don't just apply fixes blindly:**
- Understand what went wrong
- Understand the fix
- Learn from it

**Ask AI:**
- "Why did this happen?"
- "How does this fix work?"
- Learn and grow

### 4. Test After Fixing

**Always test:**
- Run the code
- Check if it works
- Verify no new errors
- Confirm functionality

**Don't assume:**
- Fix might not work
- Might break something else
- Always verify

### 5. Ask for Explanation

**Learn from errors:**
- Ask AI to explain
- Understand the cause
- Learn the pattern
- Prevent future errors

**Example:**
```
"Can you explain why this error happened 
and how to prevent it in the future?"
```

---

## Advanced Debugging

### Using Console Logs

**Add logs to debug:**
```
Ask AI: "Add console.log statements to help debug 
why the booking form isn't submitting"
```

**AI will add strategic logs:**
- Log form data
- Log API response
- Log errors
- Help you trace the issue

### Using Breakpoints

**For complex issues:**
- Use browser debugger
- Set breakpoints
- Step through code
- Inspect variables

**Ask AI:**
```
"How do I use breakpoints to debug 
this React component?"
```

### Checking Network Requests

**For API issues:**
- Check Network tab
- See request/response
- Check status codes
- Verify data format

**Ask AI:**
```
"The API request is failing. 
How do I check what's being sent and received?"
```

---

## Common Questions

### "The error message is confusing"

**Answer:** Ask Cursor AI to explain it! Paste the error and ask "What does this error mean in simple terms?"

### "I fixed it but something else broke"

**Answer:** This happens! Fix one thing at a time. Ask AI: "I fixed X but now Y is broken. How do I fix Y?"

### "The error keeps coming back"

**Answer:** You might not have fixed the root cause. Ask AI: "This error keeps happening even after I fixed it. What's the root cause?"

### "I don't know where the error is"

**Answer:** Check the Problems panel in Cursor, or browser console. The error message usually tells you the file and line number.

### "The fix AI suggested doesn't work"

**Answer:** That's okay! Ask again with more context: "I tried that fix but it's still not working. The error is [paste new error]. What else can I try?"

---

## Key Takeaways

1. **Errors are normal** - Everyone gets errors, it's part of coding
2. **Cursor AI is great at explaining errors** - Ask it what errors mean
3. **Cursor AI can fix errors** - Ask it to fix, or use right-click options
4. **Read error messages** - They tell you what's wrong
5. **Fix one at a time** - Don't get overwhelmed
6. **Test after fixing** - Always verify the fix works
7. **Learn from errors** - Understanding prevents future mistakes

---

## Module 4 Complete!

Congratulations! You've completed Module 4: Installing & Using Cursor (AI Coding Assistant). You now know:

- ✅ How to install Cursor
- ✅ How to navigate the Cursor interface
- ✅ How Cursor uses AI (Chat, Composer, Inline)
- ✅ How to write effective prompts
- ✅ How to fix errors using Cursor

**You're now ready to use Cursor confidently to build your website!**

---

## What's Next?

Now that you're comfortable with Cursor, you're ready to start building! The next modules will guide you through actually creating your booking website using Cursor and AI.

**Ready to start building?** Let's move to the next module!

---

## Quick Check

Before moving on, make sure you:
- ✅ Have Cursor installed and working
- ✅ Understand the Cursor interface
- ✅ Know how to use AI features (Chat, Composer, Inline)
- ✅ Can write effective prompts
- ✅ Know how to use Cursor to fix errors
- ✅ Feel confident using Cursor

If anything is unclear, review this lesson or practice using Cursor!

**You're ready to build with AI!** 🚀
