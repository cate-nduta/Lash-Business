# Prompt: Creating Booking API Endpoints

## Introduction

Hey! This is where the magic happens behind the scenes. API endpoints are like the "workers" that handle requests from your website. When someone submits a booking form, the API endpoint receives it, saves it, and sends confirmations.

**Don't worry if this sounds technical** - Cursor is going to build it all for us! You just need to describe what you want.

## What is an API Endpoint?

**Think of it like this:**
- Your website (frontend) = The restaurant dining room (where customers are)
- API endpoint (backend) = The kitchen (where the work happens)
- When customer orders (submits form), kitchen (API) prepares it (saves booking)

**API stands for "Application Programming Interface"** - but you don't need to remember that! Just think of it as the "worker" that handles requests.

## What We're Building

An API endpoint that:
- ✅ Receives booking information from the form
- ✅ Validates the data (checks if everything is correct)
- ✅ Saves the booking to your data file
- ✅ Creates a calendar event (if Google Calendar is set up)
- ✅ Sends confirmation emails
- ✅ Returns success or error message

**That's a lot, but Cursor will build it all!**

## Step 1: Create the API Route File

First, let's create the file where our API will live.

### Ask Cursor:

```
Create a new API route file at app/api/booking/route.ts. This will handle booking submissions.
```

**What happens:** Cursor creates the API route file. In Next.js, files in the `app/api` folder automatically become API endpoints!

## Step 2: The Big Prompt - Building the API

Now for the exciting part! We're going to ask Cursor to build the entire booking API.

### Here's the EXACT prompt we used (Copy the whole thing):

```
Create a Next.js API route at /api/booking that handles POST requests for booking submissions. It should:

1. Accept booking data in the request body:
   - Customer name, email, phone
   - Selected date and time
   - Selected service(s)
   - Special requests (optional)

2. Validate all required fields:
   - Name is required and not empty
   - Email is required and valid format
   - Phone is required and valid format
   - Date and time are required
   - At least one service is selected

3. Check availability:
   - Verify the selected time slot is still available
   - Check that the date is not in the past
   - Check that it's within business hours

4. Save the booking:
   - Generate a unique booking ID
   - Save to data/bookings.json
   - Include timestamp, status (confirmed), and all booking details

5. Create calendar event (if Google Calendar is configured):
   - Use the Google Calendar API to create an event
   - Include customer name, service, date, time
   - Add to the calendar automatically

6. Send confirmation emails:
   - Send email to customer with booking confirmation
   - Send notification email to business owner
   - Include all booking details in emails

7. Return appropriate responses:
   - Return success (200) with booking ID if everything works
   - Return error (400) with error message if validation fails
   - Return error (500) if something goes wrong

8. Handle errors gracefully:
   - Don't crash if something fails
   - Return helpful error messages
   - Log errors for debugging

9. Use TypeScript for type safety
10. Use proper error handling
```

### What to Do:

1. **Copy the ENTIRE prompt above** (all 10 points)
2. **Paste it into Cursor's chat**
3. **Press Enter**
4. **Watch Cursor build your API!** 🎉

**This will take 3-5 minutes** - Cursor is writing a lot of code!

## Step 3: Understanding What Cursor Created

After Cursor finishes, let's understand what it built!

### Ask Cursor to Explain:

```
Can you explain this API route in simple terms? What happens when someone submits a booking? How does it validate data? How does it save the booking?
```

### Simple Explanation:

Think of the API like a smart assistant:

1. **Receives the booking** - Gets all the information from the form
2. **Checks everything** - Makes sure all information is correct
3. **Checks availability** - Makes sure the time is still available
4. **Saves the booking** - Writes it to your bookings file
5. **Creates calendar event** - Adds it to Google Calendar
6. **Sends emails** - Emails customer and you
7. **Says "success!"** - Tells the website it worked

**It's like having a super organized assistant that handles everything!**

## Step 4: Connect the Form to the API

Now let's connect your booking form to this API!

### Open Your Booking Form Component

1. **Open** `components/BookingForm.tsx` (or wherever your form is)

### Ask Cursor:

```
Connect the booking form to the /api/booking endpoint. When the form is submitted:
- Send all form data to the API
- Show loading state while submitting
- Show success message if booking is created
- Show error message if something goes wrong
- Clear the form after successful submission
```

### Test It:

1. **Save all files**
2. **Go to:** http://localhost:3000/booking
3. **Fill out the form**
4. **Click submit**
5. **Watch it work!** 🎉

**If it works, your booking system is functional!**

## Step 5: Test the API

Let's make sure everything works correctly!

### Test Scenarios:

**Test 1: Valid Booking**
- Fill out form completely
- Submit
- Should see success message
- Check `data/bookings.json` - booking should be there!

**Test 2: Missing Information**
- Leave a field empty
- Submit
- Should see error message
- Booking should NOT be saved

**Test 3: Invalid Email**
- Enter bad email (like "notanemail")
- Submit
- Should see error about email format

**Test 4: Past Date**
- Select a date in the past
- Submit
- Should see error about date

**If all tests pass, your API is working perfectly!** ✅

## Step 6: Add More Features

Let's make it even better! Here are some features you can add:

### Feature 1: Booking Confirmation Number

**Ask Cursor:**

```
Add a booking confirmation number to each booking. Generate a unique code like "BK-2025-001234" and include it in the confirmation email.
```

### Feature 2: Duplicate Booking Check

**Ask Cursor:**

```
Add a check to prevent duplicate bookings. If someone tries to book the same date and time that's already booked, show an error message.
```

### Feature 3: Booking Limits

**Ask Cursor:**

```
Add a feature to limit how many bookings can be made per day. For example, maximum 10 bookings per day. Show an error if the limit is reached.
```

## Common Issues and Fixes

### Issue: API Not Receiving Data

**Ask Cursor:**
```
The API endpoint isn't receiving the form data. Can you check the request handling and fix any issues?
```

### Issue: Validation Not Working

**Ask Cursor:**
```
The form validation isn't working properly. It's accepting invalid data. Can you fix the validation logic?
```

### Issue: Booking Not Saving

**Ask Cursor:**
```
Bookings aren't being saved to the bookings.json file. Can you check the file writing code and fix it?
```

### Issue: Error Messages Not Showing

**Ask Cursor:**
```
When there's an error, the error message isn't showing to the user. Can you fix the error handling and display?
```

**Remember:** Cursor is your helper - just ask it to fix things!

## What You've Learned

✅ How API endpoints work  
✅ How to validate data  
✅ How to save bookings  
✅ How to handle errors  
✅ How to connect forms to APIs  

## Real Talk: This is Backend Development!

**Think about it:**
- You just built an API endpoint
- It handles data validation
- It saves information
- It sends emails
- It creates calendar events
- This is what professional developers do!

**A 13-year-old just built a backend API. That's incredible!** 🎉

## Key Takeaways

✅ API endpoints handle requests from your website  
✅ Validation ensures data is correct  
✅ Error handling prevents crashes  
✅ Always test your API thoroughly  
✅ Cursor can build complex APIs from descriptions  
✅ You're doing real backend development!  

---

**Estimated Time**: 70 minutes  
**Difficulty**: Intermediate (but Cursor makes it manageable!)  
**Next Lesson**: Prompt: Adding Booking Confirmation
