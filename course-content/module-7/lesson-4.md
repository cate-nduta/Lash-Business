# Lesson 7.4: Contact Page Form

**Estimated Time**: 45 minutes

---

## Introduction

A contact form makes it easy for visitors to reach you without leaving your website. This lesson shows you how to create a functional contact form using Cursor, including form fields, validation, and basic submission handling. You'll learn to build a form that looks professional and works reliably.

**What You'll Learn:**
- Essential contact form fields
- How to structure a contact form
- Form validation basics
- How to style forms effectively
- Basic form submission handling

---

## Why a Contact Form Matters

### Easy Communication

**A contact form:**
- Makes it easy to reach you
- Captures visitor information
- Provides alternative to phone/email
- Looks professional
- Works 24/7

**Visitors prefer forms when:**
- They have questions
- They want to inquire
- They're not ready to book
- They need information
- They want to contact you privately

**A good contact form:**
- Easy to fill out
- Clear and simple
- Professional appearance
- Works on all devices
- Gets responses to you

---

## Essential Contact Form Fields

### Must-Have Fields

**1. Name:**
- Full name or first name
- Required field
- Text input

**2. Email:**
- Contact email
- Required field
- Email validation

**3. Message:**
- Their question/inquiry
- Required field
- Textarea (multi-line)

---

### Optional but Recommended Fields

**4. Phone:**
- Contact number
- Optional field
- Phone input

**5. Subject:**
- What they're asking about
- Optional dropdown
- Helps organize inquiries

---

## Contact Form Structure

### Recommended Layout

```
┌─────────────────────────────┐
│   Contact Us                │
│   Get in touch with us       │
├─────────────────────────────┤
│   Name *                    │
│   [________________]        │
│                             │
│   Email *                   │
│   [________________]        │
│                             │
│   Phone                     │
│   [________________]        │
│                             │
│   Subject                   │
│   [Select subject ▼]        │
│                             │
│   Message *                 │
│   [________________]        │
│   [________________]        │
│   [________________]        │
│                             │
│   [Send Message]            │
└─────────────────────────────┘
```

---

## Building Your Contact Form

### Step 1: Plan Your Fields

**Decide what you need:**
- Name: ✅ Required
- Email: ✅ Required
- Phone: ⚪ Optional
- Subject: ⚪ Optional
- Message: ✅ Required

---

### Step 2: Generate the Form

**Prompt template:**
```
Create a Contact page with a contact form using React and Tailwind CSS.

Form fields:
- Name (required, text input)
- Email (required, email input with validation)
- Phone (optional, phone input)
- Subject (optional, dropdown: General Inquiry, Booking Question, Other)
- Message (required, textarea)

Form styling:
- Clean, modern design
- Proper spacing and padding
- Clear labels
- Required fields marked with *
- Submit button: "Send Message"

Color palette: [Your colors]
Typography: [Your fonts]
Style: [Your style]

Make the form responsive and user-friendly. Include basic validation.
```

---

### Step 3: Add Validation

**Basic validation prompt:**
```
Add form validation to the contact form:
- Name: Required, minimum 2 characters
- Email: Required, valid email format
- Message: Required, minimum 10 characters
- Show error messages below each field
- Disable submit button until form is valid
- Display success message after submission
```

---

## Form Styling Best Practices

### 1. Clear Labels

**Labels should be:**
- Above or beside input
- Clear and descriptive
- Required fields marked with *

**Example:**
```jsx
<label className="block text-sm font-medium mb-2">
  Name <span className="text-red-500">*</span>
</label>
```

---

### 2. Proper Input Styling

**Inputs should be:**
- Easy to see and click
- Adequate padding
- Clear borders
- Focus states

**Example:**
```jsx
<input 
  className="w-full px-4 py-2 border border-gray-300 rounded-md 
             focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
/>
```

---

### 3. Button Styling

**Submit button should be:**
- Prominent and clear
- Easy to click/tap
- Loading state when submitting
- Disabled when form invalid

---

### 4. Error Messages

**Error messages should be:**
- Clear and helpful
- Below the field
- Red or warning color
- Visible when needed

---

## Form Validation

### Client-Side Validation

**What to validate:**
- Required fields filled
- Email format correct
- Minimum length met
- Phone format (if applicable)

**Basic validation example:**
```jsx
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateForm = () => {
  if (!name || name.length < 2) {
    setError('Name is required (minimum 2 characters)');
    return false;
  }
  if (!email || !validateEmail(email)) {
    setError('Valid email is required');
    return false;
  }
  if (!message || message.length < 10) {
    setError('Message is required (minimum 10 characters)');
    return false;
  }
  return true;
};
```

---

## Form Submission Handling

### Basic Submission

**Simple approach:**
- Collect form data
- Validate
- Show success message
- Reset form

**Prompt:**
```
Add form submission handling to the contact form:
- When "Send Message" is clicked, validate the form
- If valid, show success message: "Thank you! Your message has been sent."
- Reset the form after successful submission
- If invalid, show error messages
- Add loading state during submission
```

---

### Advanced: Email Integration

**For later (not in this lesson):**
- Send email via API
- Store submissions in database
- Email notifications

**For now:**
- Focus on form structure
- Basic validation
- Success/error messages

---

## Real-World Example: Complete Contact Form

### Step 1: Generate Basic Form

**Prompt:**
```
Create a Contact page with a contact form using React and Tailwind CSS.

Page structure:
- Hero section: "Contact Us" headline and brief description
- Contact form with fields:
  * Name (required)
  * Email (required)
  * Phone (optional)
  * Subject (optional dropdown: General Inquiry, Booking Question, Other)
  * Message (required, textarea)
- Submit button: "Send Message"

Color palette: Soft pink (#F5D7D7), cream (#FFF8F0), gold (#D4AF37)
Typography: Poppins headings, Inter body
Style: Minimal, modern, clean

Make the form responsive and user-friendly.
```

---

### Step 2: Add Validation

**Prompt:**
```
Add form validation to the contact form:
- Name: Required, minimum 2 characters
- Email: Required, must be valid email format
- Message: Required, minimum 10 characters
- Show error messages in red below each invalid field
- Disable submit button if form is invalid
- Show validation on blur (when user leaves field)
```

---

### Step 3: Add Submission Handling

**Prompt:**
```
Add form submission handling:
- When form is submitted and valid, show success message: 
  "Thank you! Your message has been sent. We'll get back to you soon."
- Reset the form after successful submission
- Add loading state to button during submission
- Handle errors gracefully
```

---

### Step 4: Enhance Styling

**Prompt:**
```
Improve the contact form styling:
- Make inputs more visually appealing
- Add focus states (highlight border when focused)
- Improve spacing and padding
- Make submit button more prominent
- Ensure form looks professional and matches homepage style
```

---

## Mobile Responsiveness

### Ensure Form Works on Mobile

**Important for forms:**
- Inputs are easy to tap
- Text is readable
- Form fits on screen
- Keyboard works properly
- Submit button accessible

**Prompt:**
```
Make the contact form fully responsive:
- Ensure all inputs are easy to tap on mobile (minimum 44px height)
- Text is readable on small screens
- Form fits within viewport
- Proper spacing on all devices
- Submit button is prominent and easy to tap
```

---

## Common Form Mistakes

### 1. Too Many Fields

**Bad:**
```
Name, Email, Phone, Address, City, State, Zip, Country, 
Company, Job Title, How did you hear about us, 
Preferred contact method, Best time to call, 
Message, Newsletter signup, Terms acceptance...
```

**Good:**
```
Name, Email, Phone (optional), Message
```

---

### 2. Unclear Labels

**Bad:**
```
Field 1
Input
```

**Good:**
```
Name *
[Input field]
```

---

### 3. No Validation

**Bad:**
```
Form submits even with invalid email or empty required fields
```

**Good:**
```
Validation on all fields, clear error messages, 
submit disabled until valid
```

---

### 4. Poor Mobile Experience

**Bad:**
```
Tiny inputs, hard to tap, keyboard covers form
```

**Good:**
```
Large inputs, easy to tap, proper mobile keyboard handling
```

---

## Your Contact Form Exercise

### Practice: Plan Your Form

**1. Choose your fields:**
- [ ] Name (required)
- [ ] Email (required)
- [ ] Phone (optional)
- [ ] Subject (optional)
- [ ] Message (required)
- [ ] Other: ___________

**2. Write your generation prompt:**
```
[Write a complete prompt to create your contact form]
```

**3. Plan validation:**
- Name: Minimum ___ characters
- Email: Valid format required
- Message: Minimum ___ characters

---

## Key Takeaways

1. **Keep it simple** - Only essential fields, don't overwhelm
2. **Clear labels** - Make it obvious what each field is for
3. **Required fields marked** - Use * to show required fields
4. **Validation is essential** - Validate on client side before submit
5. **Error messages help** - Show clear, helpful error messages
6. **Mobile-friendly** - Ensure form works on all devices
7. **Professional styling** - Match your brand, look polished
8. **Success feedback** - Show confirmation when submitted

---

## What's Next?

Excellent! You've created a functional contact form. The final step is connecting all your pages together with clear navigation so visitors can easily move between your homepage, services, about, and contact pages. The next lesson covers page navigation.

**Ready?** Let's move to Lesson 7.5: Page Navigation!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand essential contact form fields (Name, Email, Message)
- ✅ Know how to structure a contact form effectively
- ✅ Understand form validation basics
- ✅ Can style forms to match your brand
- ✅ Know how to handle form submission
- ✅ Understand mobile responsiveness for forms

If anything is unclear, review this lesson or ask questions!
