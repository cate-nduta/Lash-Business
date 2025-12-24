# Testing Your Booking System

## Introduction

Hey! Now that we've built the booking system, we need to test it to make sure everything works! Testing is like checking your homework - you want to make sure there are no mistakes before you turn it in.

**Don't worry** - testing is actually fun! You get to use your own website and see it work!

## Why Testing is Important

**Testing helps you find:**
- ✅ Things that don't work
- ✅ Things that look wrong
- ✅ Things that are confusing
- ✅ Things that need improvement

**It's better to find problems now** than when real customers are trying to use it!

## What We're Testing

We need to test:
1. **Calendar** - Does it work? Can you select dates?
2. **Time Slots** - Do they show? Can you select times?
3. **Service Selection** - Can you pick services?
4. **Booking Form** - Does it validate? Does it submit?
5. **API** - Does it save bookings? Does it send emails?
6. **Confirmation** - Does it show after booking?
7. **Mobile** - Does everything work on phones?

**That's a lot, but we'll test it all!**

## Step 1: Test the Calendar

### What to Test:

1. **Go to:** http://localhost:3000/booking
2. **Try these things:**
   - ✅ Can you see the calendar?
   - ✅ Can you click on dates?
   - ✅ Does it highlight the selected date?
   - ✅ Are past dates disabled (can't click)?
   - ✅ Can you navigate to next/previous month?
   - ✅ Does it work on mobile?

### If Something Doesn't Work:

**Ask Cursor:**
```
The calendar [describe the problem]. Can you check the code and fix it?
```

**Example:**
```
The calendar doesn't highlight the selected date. Can you check the code and fix it?
```

## Step 2: Test Time Slot Selection

### What to Test:

1. **Select a date** on the calendar
2. **Try these things:**
   - ✅ Do time slots appear?
   - ✅ Can you click on time slots?
   - ✅ Does the selected time get highlighted?
   - ✅ Are past times disabled?
   - ✅ Are booked times disabled?
   - ✅ Does it work on mobile?

### If Something Doesn't Work:

**Ask Cursor:**
```
The time slot selector [describe the problem]. Can you check the code and fix it?
```

## Step 3: Test Service Selection

### What to Test:

1. **Look for service selection** on the booking page
2. **Try these things:**
   - ✅ Can you see the services?
   - ✅ Can you select services?
   - ✅ Does it show prices?
   - ✅ Does it show durations?
   - ✅ Can you select multiple services?
   - ✅ Does it calculate total correctly?

### If Something Doesn't Work:

**Ask Cursor:**
```
The service selection [describe the problem]. Can you check the code and fix it?
```

## Step 4: Test the Booking Form

### What to Test:

1. **Fill out the booking form**
2. **Try these things:**

**Test Valid Submission:**
- ✅ Fill everything correctly
- ✅ Submit the form
- ✅ Does it show loading?
- ✅ Does it redirect to confirmation?
- ✅ Is the booking saved?

**Test Validation:**
- ✅ Leave name empty - should show error
- ✅ Enter invalid email - should show error
- ✅ Leave phone empty - should show error
- ✅ Try to submit with errors - should not submit

### If Something Doesn't Work:

**Ask Cursor:**
```
The booking form [describe the problem]. Can you check the validation and submission code and fix it?
```

## Step 5: Test the API

### What to Test:

1. **Submit a valid booking**
2. **Check these things:**

**Check Data File:**
- ✅ Open `data/bookings.json`
- ✅ Is your booking there?
- ✅ Is all the information correct?
- ✅ Is there a booking ID?

**Check Console:**
- ✅ Open browser console (F12)
- ✅ Look for any errors
- ✅ Check network tab - did API call succeed?

### If Something Doesn't Work:

**Ask Cursor:**
```
The booking API [describe the problem]. Can you check the code and fix it?
```

## Step 6: Test Email Sending

### What to Test:

1. **Submit a booking with your real email**
2. **Check these things:**
   - ✅ Did you receive confirmation email?
   - ✅ Is all information in the email correct?
   - ✅ Check spam folder if not in inbox
   - ✅ Did business owner receive notification?

### If Emails Don't Send:

**Ask Cursor:**
```
Emails aren't being sent after bookings. Can you check the email configuration and sending code?
```

**Common issues:**
- Zoho credentials not set up correctly
- Environment variables not configured
- Email service not connected

## Step 7: Test Mobile Experience

### What to Test:

1. **Open your website on your phone** (or resize browser to mobile size)
2. **Try these things:**
   - ✅ Does everything fit on screen?
   - ✅ Can you tap buttons easily?
   - ✅ Is text readable?
   - ✅ Can you fill out the form?
   - ✅ Can you select dates and times?
   - ✅ Does it look good?

### If Mobile Doesn't Work:

**Ask Cursor:**
```
The booking page doesn't work well on mobile. Can you improve the responsive design?
```

## Step 8: Test Error Handling

### What to Test:

**Try to break things!** (It's fun, I promise!)

1. **Submit form with no date selected**
2. **Submit form with no time selected**
3. **Submit form with no service selected**
4. **Try to book a past date**
5. **Try to book an already-booked time**

**All of these should:**
- ✅ Show helpful error messages
- ✅ Not crash the website
- ✅ Not save invalid bookings

### If Errors Don't Work:

**Ask Cursor:**
```
Error handling isn't working properly. When I [describe the error scenario], it should [describe expected behavior] but it [describe actual behavior]. Can you fix it?
```

## Step 9: Create a Testing Checklist

Let's create a checklist you can use!

### Ask Cursor:

```
Create a testing checklist document that lists all the things to test in the booking system. Make it easy to check off items as I test them.
```

**Or create it yourself:**

**Booking System Testing Checklist:**
- [ ] Calendar displays correctly
- [ ] Can select dates
- [ ] Past dates are disabled
- [ ] Time slots appear for selected date
- [ ] Can select time slots
- [ ] Booked times are disabled
- [ ] Services can be selected
- [ ] Form validation works
- [ ] Form submits successfully
- [ ] Booking is saved to file
- [ ] Confirmation page shows
- [ ] Email is sent
- [ ] Works on mobile
- [ ] Error messages show correctly
- [ ] Everything looks good

## Step 10: Fix Any Issues

**If you find problems:**

1. **Write down what's wrong**
2. **Ask Cursor to fix it**
3. **Test again**
4. **Repeat until everything works!**

**Don't get frustrated** - finding and fixing problems is part of building websites!

## Common Issues and How to Fix

### Issue: Nothing Works

**Ask Cursor:**
```
I'm having multiple issues with the booking system. Can you help me debug? Here are the problems: [list them]
```

### Issue: Can't Figure Out What's Wrong

**Ask Cursor:**
```
Something isn't working but I'm not sure what. Can you help me check the browser console for errors and debug the issue?
```

### Issue: Everything Works But Looks Bad

**Ask Cursor:**
```
The booking system works but doesn't look good. Can you improve the design, styling, and user experience?
```

## What You've Learned

✅ How to test a booking system thoroughly  
✅ How to find and report bugs  
✅ How to test on different devices  
✅ How to test error handling  
✅ How to create testing checklists  

## Real Talk: Testing is Important!

**Think about it:**
- You just tested a complete booking system
- You found problems (if any) before customers do
- You made sure everything works
- This is what professional developers do!

**A 13-year-old just learned professional testing. That's valuable!** 🎉

## Key Takeaways

✅ Test everything before going live  
✅ Test on different devices  
✅ Test error scenarios  
✅ Fix problems as you find them  
✅ Create checklists to stay organized  
✅ Testing makes your website better!  

---

**Estimated Time**: 45 minutes  
**Difficulty**: Beginner (just using your website!)  
**Next Module**: Integrating Google Calendar

