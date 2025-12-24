# Prompt: Implementing Password Reset

## Introduction

Hey! Sometimes people forget their passwords. That's totally normal! We need to build a way for them to reset their password so they can get back into their account.

**Don't worry** - Cursor is going to build this for us! It's actually pretty cool how it works.

## What We're Building

A password reset system that:
- ✅ Lets users request password reset
- ✅ Sends them a reset link via email
- ✅ Lets them create a new password
- ✅ Makes the reset link expire after some time (for security)
- ✅ Works securely

**That's what we're building!** Let's do it!

## Step 1: Create Password Reset Request Page

First, let's create a page where users can request a password reset.

### Ask Cursor:

```
Create a password reset request page at app/reset-password/page.tsx. This page should have a form where users enter their email to request a password reset.
```

**What happens:** Cursor creates a new page for password reset requests!

## Step 2: The Big Prompt - Building Password Reset

Now let's ask Cursor to build the entire password reset system!

### Here's the EXACT prompt we used (Copy the whole thing):

```
Create a complete password reset system with these features:

1. Password Reset Request:
   - Create a page where users enter their email
   - Validate that the email exists in the users database
   - Generate a secure reset token (random string)
   - Save the token with expiration time (e.g., 1 hour)
   - Send email with reset link containing the token
   - Show success message (don't reveal if email exists for security)

2. Password Reset API Endpoint:
   - Create API route at /api/auth/reset-password
   - Accept reset token and new password
   - Validate the token (check if it exists and isn't expired)
   - Update the user's password (hash it securely)
   - Delete the used token
   - Return success or error

3. Reset Password Page:
   - Create page at /reset-password/[token]
   - Show form to enter new password
   - Validate password strength (at least 8 characters)
   - Submit new password to API
   - Show success message and redirect to login

4. Email Template:
   - Create password reset email template
   - Include reset link with token
   - Explain that link expires in 1 hour
   - Include security warning if they didn't request it

5. Security:
   - Tokens expire after 1 hour
   - Tokens can only be used once
   - Passwords are hashed before saving
   - Don't reveal if email exists (security)

6. Styling:
   - Use Tailwind CSS
   - Make it look professional
   - Responsive design
   - Clear instructions

7. Use TypeScript for type safety
```

### What to Do:

1. **Copy the ENTIRE prompt above** (all 7 sections)
2. **Paste it into Cursor's chat**
3. **Press Enter**
4. **Watch Cursor build the password reset system!** 🎉

**This will take 3-4 minutes** - Cursor is building a complete system!

## Step 3: Understanding How It Works

After Cursor finishes, let's understand what it built!

### Ask Cursor to Explain:

```
Can you explain how the password reset system works? What is a reset token? How does the security work?
```

### Simple Explanation:

Think of it like a temporary key:

1. **User forgets password** - Can't log in
2. **Requests reset** - Enters their email
3. **System generates token** - Creates a special code
4. **Sends email with link** - Link contains the token
5. **User clicks link** - Goes to reset page
6. **Enters new password** - System verifies token
7. **Password updated** - Token is deleted (can't reuse)
8. **User can log in** - With new password

**It's like getting a temporary key to change your lock!**

## Step 4: Test the Password Reset

Let's make sure it works!

### Test It:

1. **Go to:** http://localhost:3000/reset-password
2. **Enter an email** that exists in your users
3. **Click "Send Reset Link"**
4. **Check your email** for the reset link
5. **Click the link** in the email
6. **Enter a new password**
7. **Submit**
8. **Try logging in** with the new password

**If it all works, password reset is functional!** 🎉

## Step 5: Test Security Features

Let's make sure it's secure!

### Test These:

**Test 1: Expired Token**
- Request reset
- Wait (or manually expire token)
- Try to use old link
- Should show "expired" error

**Test 2: Used Token**
- Request reset
- Use the link to reset password
- Try to use same link again
- Should show "already used" error

**Test 3: Invalid Token**
- Try to use a fake token
- Should show "invalid" error

**Test 4: Email Doesn't Exist**
- Request reset with non-existent email
- Should still show "email sent" (don't reveal if email exists)

**If all tests pass, security is working!** ✅

## Step 6: Improve the Email

Let's make the reset email better!

### Ask Cursor:

```
Improve the password reset email template. Make it:
- More professional and clear
- Include clear instructions
- Show expiration time clearly
- Include security warning
- Better formatting and design
```

## Common Issues and Fixes

### Issue: Reset Link Doesn't Work

**Ask Cursor:**
```
The password reset link isn't working. When I click it, I get an error. Can you check the token validation and fix it?
```

### Issue: Email Not Sending

**Ask Cursor:**
```
The password reset email isn't being sent. Can you check the email sending code in the reset request handler?
```

### Issue: Token Not Expiring

**Ask Cursor:**
```
The reset token isn't expiring after 1 hour. Can you check the expiration logic and fix it?
```

### Issue: Can Reuse Token

**Ask Cursor:**
```
I can use the same reset token multiple times. It should only work once. Can you fix this so tokens are deleted after use?
```

## What You've Learned

✅ How password reset systems work  
✅ How to generate secure tokens  
✅ How to send reset links via email  
✅ How to validate tokens  
✅ How to implement security features  

## Real Talk: This is Advanced Security!

**Think about it:**
- You just built a password reset system
- It includes security features
- It sends emails automatically
- This is what professional websites use!

**A 13-year-old just built a secure password reset system. That's impressive!** 🎉

## Key Takeaways

✅ Password reset uses secure tokens  
✅ Tokens expire for security  
✅ Tokens can only be used once  
✅ Don't reveal if email exists (security)  
✅ Always hash passwords before saving  
✅ Test security features thoroughly  
✅ You're building secure systems!  

---

**Estimated Time**: 50 minutes  
**Difficulty**: Intermediate (but Cursor helps!)  
**Next Module**: Building the Admin Dashboard

