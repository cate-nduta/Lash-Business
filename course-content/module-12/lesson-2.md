# Lesson 12.2: Fixing Errors with Cursor

**Estimated Time**: 25 minutes

---

## Introduction

Even after thorough testing, you might find errors or issues with your website. Don't worry! This lesson shows you how to use Cursor to fix errors, even if you're not a coding expert. You'll learn how to read error messages, describe problems to Cursor, and implement fixes.

**What You'll Learn:**
- How to identify errors
- How to read error messages
- How to describe problems to Cursor
- How to implement fixes
- Common error types
- How to verify fixes work

---

## Understanding Errors

### What Are Errors?

**Errors are:**
- Problems in your code
- Things that don't work as expected
- Issues that prevent functionality
- Bugs that need fixing

**Types of errors:**
- **Syntax errors** - Code written incorrectly
- **Runtime errors** - Problems when code runs
- **Logic errors** - Code works but does wrong thing
- **Display errors** - Things look wrong

**Think of it like:**
- Typos in a document
- Missing pieces in a puzzle
- Wrong ingredients in a recipe
- Broken parts in a machine

**Errors = Problems to fix!**

---

## Where Errors Appear

### Browser Console

**How to access:**
- Open browser (Chrome, Firefox, etc.)
- Press F12 or right-click → Inspect
- Click "Console" tab
- Errors appear in red

**What you'll see:**
- Error messages in red
- File names and line numbers
- Description of the problem
- Sometimes stack traces

---

### Netlify Logs

**How to access:**
- Go to Netlify dashboard
- Click your site
- Go to "Deploys" tab
- Click on a deploy
- Check "Deploy log"

**What you'll see:**
- Build errors
- Deployment issues
- Missing dependencies
- Configuration problems

---

### Website Display

**Visual errors:**
- Things don't display correctly
- Layout is broken
- Buttons don't work
- Forms don't submit
- Pages don't load

**These indicate:**
- Code errors
- CSS problems
- Missing files
- Configuration issues

---

## Reading Error Messages

### Understanding Error Text

**Error messages contain:**
- **Error type** - What kind of error
- **File name** - Where the error is
- **Line number** - Which line has the problem
- **Description** - What went wrong

**Example error:**
```
Error: Cannot read property 'name' of undefined
  at ContactForm (contact-form.tsx:45)
```

**This means:**
- Error type: Cannot read property
- File: contact-form.tsx
- Line: 45
- Problem: Trying to access 'name' of something that doesn't exist

---

### Common Error Types

**1. "Cannot read property X of undefined"**
- Trying to access something that doesn't exist
- Need to check if value exists first

**2. "X is not defined"**
- Using a variable that wasn't created
- Missing import or declaration

**3. "Unexpected token"**
- Syntax error in code
- Missing bracket, quote, or semicolon

**4. "Failed to fetch"**
- API call failed
- Network issue or wrong URL

**5. "Module not found"**
- Missing file or import
- File doesn't exist or wrong path

---

## Using Cursor to Fix Errors

### Step 1: Identify the Error

**Gather information:**
- Copy the error message
- Note the file name
- Note the line number
- Describe what you were doing
- Take a screenshot if helpful

---

### Step 2: Describe to Cursor

**Good error description includes:**
- The exact error message
- What you were trying to do
- Where the error appears
- Any relevant context

**Example prompt:**
```
I'm getting an error in my contact form. The error message says:
"Error: Cannot read property 'email' of undefined at ContactForm (contact-form.tsx:45)"

The form is on the contact page and when I try to submit it, I get this error. 
The form has fields for name, email, and message. Help me fix this error.
```

---

### Step 3: Review Cursor's Solution

**Cursor will:**
- Explain the error
- Show what's wrong
- Provide fix
- Explain the solution

**You should:**
- Read the explanation
- Understand the fix
- Ask questions if unclear
- Review the code changes

---

### Step 4: Apply the Fix

**Implement changes:**
- Cursor will show code changes
- Review the changes
- Apply if correct
- Test after fixing

---

## Common Error Scenarios

### Error 1: Form Not Submitting

**Problem:**
- Form doesn't submit
- No error message visible
- Button doesn't work

**How to fix with Cursor:**
```
My contact form isn't submitting. When I click the submit button, nothing happens.
The form is in app/contact/page.tsx. Help me debug why the form submission isn't working.
```

**Cursor can help:**
- Check form handler
- Verify event handlers
- Check validation
- Fix submission logic

---

### Error 2: Page Not Loading

**Problem:**
- Page shows error
- Blank page
- 404 error

**How to fix with Cursor:**
```
My services page isn't loading. I get a 404 error when I try to visit /services.
The file is at app/services/page.tsx. Help me figure out why the page isn't accessible.
```

**Cursor can help:**
- Check file location
- Verify routing
- Check exports
- Fix file structure

---

### Error 3: Images Not Displaying

**Problem:**
- Images don't show
- Broken image icons
- Wrong images display

**How to fix with Cursor:**
```
The images on my homepage aren't displaying. They show as broken image icons.
The images are in the public/images folder. Help me fix the image paths.
```

**Cursor can help:**
- Check image paths
- Verify file locations
- Fix import statements
- Update image references

---

### Error 4: Styling Issues

**Problem:**
- Layout looks wrong
- Colors not applying
- Spacing incorrect

**How to fix with Cursor:**
```
The spacing on my homepage looks wrong. The sections are too close together
and the padding doesn't match the design. Help me fix the CSS styling.
```

**Cursor can help:**
- Check CSS classes
- Verify styling
- Fix layout issues
- Update spacing

---

### Error 5: API Errors

**Problem:**
- API calls fail
- Data doesn't load
- Network errors

**How to fix with Cursor:**
```
My booking form can't connect to the API. I get a "Failed to fetch" error.
The API route is at app/api/booking/route.ts. Help me debug the API connection.
```

**Cursor can help:**
- Check API routes
- Verify endpoints
- Check environment variables
- Fix connection issues

---

## Error Fixing Process

### Complete Workflow

**1. Find the error:**
- Check browser console
- Check Netlify logs
- Test functionality
- Identify problem

**2. Gather information:**
- Copy error message
- Note file and line
- Describe what happened
- Take screenshots

**3. Ask Cursor:**
- Describe the error clearly
- Provide context
- Include error message
- Ask for help

**4. Review solution:**
- Read explanation
- Understand fix
- Ask questions
- Review code

**5. Apply fix:**
- Make code changes
- Save files
- Test the fix
- Verify it works

**6. Test thoroughly:**
- Test the specific feature
- Test related features
- Check for new errors
- Verify everything works

---

## Best Practices for Error Fixing

### 1. Don't Panic

**Stay calm:**
- Errors are normal
- Most are fixable
- Cursor can help
- You'll learn from fixing

---

### 2. Read Error Messages Carefully

**Understand the error:**
- Read full message
- Note file and line
- Understand what it means
- Don't skip details

---

### 3. Describe Clearly to Cursor

**Good descriptions:**
- Include error message
- Explain what you were doing
- Provide file names
- Give context

**Bad descriptions:**
- "It's broken"
- "Doesn't work"
- "Fix it"
- No details

---

### 4. Test After Fixing

**Always verify:**
- Test the specific fix
- Test related features
- Check for new issues
- Don't assume it works

---

### 5. Learn from Errors

**Understand fixes:**
- Ask Cursor to explain
- Understand why it broke
- Learn how to prevent
- Build knowledge

---

## Using Cursor Effectively

### Good Error Prompts

**Example 1:**
```
I'm getting this error in the browser console:
"Error: Cannot read property 'submit' of null at handleSubmit (booking-form.tsx:32)"

This happens when I try to submit the booking form. The form has an id of "booking-form".
Help me fix this error.
```

**Example 2:**
```
My homepage isn't loading correctly. The hero section is missing and I see this error in Netlify logs:
"Module not found: Can't resolve './components/Hero'"

I have a Hero component at components/Hero.tsx. Help me fix the import path.
```

**Example 3:**
```
The contact form sends emails but the email content is empty. The form submission works
but the email body is blank. The form handler is in app/api/contact/route.ts.
Help me debug why the email content isn't being included.
```

---

### What Makes a Good Prompt

**Include:**
- Exact error message
- File name and line number
- What you were trying to do
- Relevant context
- What you expect to happen

**Be specific:**
- Don't be vague
- Include details
- Provide examples
- Show what's wrong

---

## Real-World Error Fixing Example

### Scenario: Booking Form Error

**Step 1: Identify error**
- User reports booking form doesn't work
- Check browser console
- See error: "Cannot read property 'date' of undefined"

**Step 2: Gather information**
- Error in booking-form.tsx line 28
- Happens when selecting date
- Form has date picker component

**Step 3: Ask Cursor**
```
My booking form has an error. When users try to select a date, they get this error:
"Cannot read property 'date' of undefined at BookingForm (booking-form.tsx:28)"

The date picker component is working, but when the date is selected, this error appears.
Help me fix this issue.
```

**Step 4: Review solution**
- Cursor explains the issue
- Shows the problem code
- Provides fix
- Explains the solution

**Step 5: Apply fix**
- Update the code
- Fix the date handling
- Save the file
- Test the form

**Step 6: Verify**
- Test date selection
- Test form submission
- Check for other errors
- Confirm it works

**Result:**
- Error fixed
- Form works correctly
- Users can book appointments
- No more errors

---

## Key Takeaways

1. **Errors are normal** - Everyone gets errors, they're fixable
2. **Read error messages** - They tell you what's wrong
3. **Describe clearly to Cursor** - Include error message, file, and context
4. **Test after fixing** - Always verify the fix works
5. **Learn from errors** - Understand why it broke and how to prevent
6. **Don't panic** - Most errors are simple to fix with Cursor's help
7. **Be specific** - Good descriptions lead to better solutions
8. **Check multiple places** - Browser console, Netlify logs, visual display

---

## What's Next?

Excellent! You now know how to fix errors using Cursor. The next lesson covers how to improve your website's design over time, making it better as you learn and grow.

**Ready?** Let's move to Lesson 12.3: Improving Design Over Time!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand what errors are (problems in code)
- ✅ Know where errors appear (browser console, Netlify logs, display)
- ✅ Can read error messages (understand file, line, description)
- ✅ Know how to describe errors to Cursor (include message, context, file)
- ✅ Can implement fixes (apply Cursor's solutions)
- ✅ Know how to verify fixes (test after making changes)
- ✅ Understand common error types and how to fix them
- ✅ Feel confident fixing errors with Cursor's help

If anything is unclear, review this lesson or ask questions!

