# Lesson 4.4: Writing Effective Cursor Prompts

**Estimated Time**: 30 minutes

---

## Introduction

The key to getting great results from Cursor AI is writing good prompts. A good prompt gets you exactly what you want. A bad prompt gets you something generic or wrong. This lesson teaches you how to write prompts that get excellent results.

**What You'll Learn:**
- What makes a good prompt
- How to be specific
- How to provide context
- Prompt structure and format
- Examples of good vs bad prompts
- Advanced prompting techniques

---

## Why Good Prompts Matter

### The Difference

**Bad Prompt:**
- "Make a form"
- Generic result
- Doesn't match your needs
- Requires many iterations

**Good Prompt:**
- "Create a booking form component with name, email, phone, date, and time fields. Include validation for email format and require all fields. Use Tailwind CSS for styling and match the design of the homepage."
- Specific result
- Matches your needs
- Works first time (or close to it)

**Good prompts = Better results = Less time = Less frustration!**

---

## Elements of a Good Prompt

### 1. Be Specific

**What to specify:**
- What you want to build
- What it should include
- How it should look
- What it should do

**Bad:**
- "Add a button"

**Good:**
- "Add a 'Book Now' button to the homepage hero section. The button should be large, use the primary brand color (purple-600), have white text, rounded corners, and link to /booking page."

### 2. Provide Context

**What context to include:**
- Where it should go
- What it should match
- Existing patterns
- Your project setup

**Bad:**
- "Create a page"

**Good:**
- "Create a services page at /services route. Follow the same design pattern as the homepage, use the same color scheme and typography. Display services in a grid layout with cards showing service name, description, price, and a 'Book Now' button."

### 3. Include Requirements

**What requirements to mention:**
- Functionality needed
- Validation rules
- Styling requirements
- Technical constraints

**Bad:**
- "Make it work"

**Good:**
- "The booking form should validate that email is in correct format, all fields are required, date must be in the future, and time must be during business hours (9 AM - 6 PM). Show error messages below each field if validation fails."

### 4. Reference Existing Code

**How to reference:**
- Mention specific files
- Reference components
- Point to patterns
- Link to existing code

**Bad:**
- "Style this"

**Good:**
- "Style the booking form to match the homepage design. Use the same button styles, form input styles, and spacing as seen in the ContactForm component."

---

## Prompt Structure

### The Formula

**Good prompt structure:**
1. **Action:** What to do (Create, Add, Update, Fix)
2. **What:** What to build/modify
3. **Where:** Location/context
4. **Details:** Specific requirements
5. **Style:** Design/styling requirements

**Example:**
```
Create [WHAT] at [WHERE] with [DETAILS] using [STYLE].

Create a booking form component in the booking page 
with name, email, phone, date, and time fields, 
validation for all fields, 
using Tailwind CSS and matching the homepage design.
```

### Breaking It Down

**Action:**
- Create, Add, Update, Fix, Refactor, Remove
- Be clear about what you want

**What:**
- Component, page, feature, function
- Be specific about the thing

**Where:**
- File path, component, page
- Context matters

**Details:**
- Fields, functionality, behavior
- What it should do

**Style:**
- Design, colors, layout
- How it should look

---

## Examples: Good vs Bad

### Example 1: Creating a Component

**Bad:**
```
Make a form
```

**Why it's bad:**
- Too vague
- No context
- No requirements
- Generic result

**Good:**
```
Create a booking form component in app/booking/page.tsx.
Include fields for: name (text, required), email (email format, required), 
phone (tel format, required), date (date picker, required), 
time (time picker, required), and service (dropdown with options: 
Classic Lashes, Volume Lashes, Hybrid Lashes).
Add validation: email must be valid format, all fields required, 
date must be future date.
Use Tailwind CSS for styling with a clean, professional design.
Match the color scheme of the homepage (purple-600 for primary, 
gray-900 for text).
Include a submit button that says "Book Appointment" 
and shows a loading state when submitting.
```

**Why it's good:**
- Specific about what to create
- Lists all fields and types
- Includes validation requirements
- Specifies styling
- References existing design
- Includes functionality details

### Example 2: Adding a Feature

**Bad:**
```
Add email sending
```

**Why it's bad:**
- Doesn't say where
- Doesn't say when
- Doesn't say what email
- Too vague

**Good:**
```
Add email sending functionality to the booking form submission.
When a booking is successfully created, send a confirmation email 
to the customer using the email address from the form.
The email should include: customer name, booking date, booking time, 
service type, and a confirmation message.
Use the Resend API (already configured in the project).
Send the email from the API route at app/api/booking/route.ts 
after the booking is saved to the database.
Include error handling if email sending fails.
```

**Why it's good:**
- Specific about when to send
- Lists email content
- Mentions technical details
- Includes error handling
- References existing setup

### Example 3: Styling

**Bad:**
```
Make it look better
```

**Why it's bad:**
- Subjective
- No direction
- No specifics

**Good:**
```
Update the services page styling to improve the layout.
Change the service cards to have:
- Better spacing (gap-6 between cards)
- Hover effects (scale-105 and shadow-lg on hover)
- Improved typography (larger service names, better description text)
- Better mobile responsiveness (stack on mobile, grid on desktop)
- Add a subtle border (border border-gray-200)
- Match the card style used on the homepage
Use Tailwind CSS classes.
```

**Why it's good:**
- Specific styling changes
- Lists exact requirements
- Includes responsive design
- References existing patterns
- Uses specific Tailwind classes

---

## Advanced Prompting Techniques

### 1. Step-by-Step Instructions

**For complex features:**
```
Create a booking system with the following steps:
1. Create a booking form component with all required fields
2. Add validation for all fields
3. Create an API route to handle form submission
4. Save booking to Supabase database
5. Send confirmation email
6. Show success message to user
```

**Breaks down complex task into manageable steps.**

### 2. Reference Existing Patterns

**Point to similar code:**
```
Create a services page following the same pattern as the homepage.
Use the same component structure, styling approach, and layout 
as seen in app/page.tsx.
The services should be displayed in a grid similar to the 
features section on the homepage.
```

**AI sees your existing code and matches the pattern.**

### 3. Include Examples

**Show what you want:**
```
Create a button component that looks like this:
- Large size (px-8 py-3)
- Purple background (bg-purple-600)
- White text (text-white)
- Rounded (rounded-lg)
- Hover effect (hover:bg-purple-700)
Similar to the "Book Now" button on the homepage.
```

**Gives AI a clear example to follow.**

### 4. Specify Constraints

**Set boundaries:**
```
Create a navigation component that:
- Must be responsive (mobile menu on small screens)
- Must not exceed 100px height
- Must use existing color scheme
- Must not use any external libraries beyond what's already installed
- Must be accessible (proper ARIA labels)
```

**Prevents AI from going in wrong direction.**

---

## Prompting for Different Scenarios

### Creating New Features

**Structure:**
- What to create
- Where to create it
- What it should include
- How it should work
- How it should look

**Example:**
```
Create a client dashboard page at app/account/dashboard/page.tsx.
Include:
- Display of upcoming bookings (date, time, service)
- Display of past bookings (same info)
- Profile information section
- Edit profile button
Use the same layout and styling as the rest of the site.
Fetch data from Supabase using the user's email.
```

### Fixing Bugs

**Structure:**
- What's broken
- What should happen
- Error message (if any)
- Where the issue is

**Example:**
```
Fix the booking form submission error.
The form is not submitting and shows error: "Cannot read property 'email' of undefined".
The issue is in app/booking/page.tsx around line 45.
The form data should be sent to /api/booking route.
Make sure the form data is properly formatted before sending.
```

### Refactoring Code

**Structure:**
- What to refactor
- Why (improve, simplify, etc.)
- What pattern to use
- What to maintain

**Example:**
```
Refactor the homepage component to use React hooks instead of class components.
Convert app/page.tsx to use functional component with useState and useEffect.
Maintain all existing functionality and styling.
Make the code cleaner and more modern.
```

### Adding Styling

**Structure:**
- What to style
- Design direction
- Colors, spacing, layout
- Responsive requirements

**Example:**
```
Update the booking form styling to be more modern and professional.
Use:
- Larger input fields (py-3 instead of py-2)
- Better spacing (gap-4 between fields)
- Softer colors (gray-50 background, gray-700 text)
- Better focus states (ring-2 ring-purple-500)
- Improved mobile layout (full width on mobile)
Use Tailwind CSS.
```

---

## Common Prompt Mistakes

### Mistake 1: Too Vague

**Bad:**
- "Make it better"
- "Fix this"
- "Add stuff"

**Fix:**
- Be specific about what to improve
- Explain what's broken
- List what to add

### Mistake 2: Too Many Things at Once

**Bad:**
- "Create the entire booking system with form, validation, database, emails, and admin panel"

**Fix:**
- Break into smaller prompts
- One feature at a time
- Build incrementally

### Mistake 3: No Context

**Bad:**
- "Add a button" (where? what for? what style?)

**Fix:**
- Include location
- Explain purpose
- Specify styling

### Mistake 4: Unrealistic Expectations

**Bad:**
- "Make it perfect"
- "Make it like Amazon"

**Fix:**
- Be realistic
- Specify what "perfect" means
- Give concrete requirements

---

## Iterative Prompting

### The Process

**1. Start with basic prompt:**
- Get initial version
- See what AI creates

**2. Review and refine:**
- Check what you got
- Identify what to change

**3. Ask for specific changes:**
- "Make the button larger"
- "Change the color to purple"
- "Add hover effect"

**4. Iterate until perfect:**
- Keep refining
- Small changes
- Build up to perfect

**Example:**
```
Prompt 1: "Create a homepage with hero section"
Review: Good, but button is too small

Prompt 2: "Make the hero button larger and more prominent"
Review: Good, but color doesn't match

Prompt 3: "Change button color to purple-600 to match brand"
Review: Perfect!
```

---

## Tips for Better Prompts

### 1. Start Broad, Then Narrow

**First prompt:**
- Get basic structure
- See what AI creates

**Then refine:**
- Make specific changes
- Adjust details
- Perfect it

### 2. Use Technical Terms

**When appropriate:**
- Component names
- File paths
- Framework terms
- Library names

**AI understands technical language!**

### 3. Include "Don'ts"

**Sometimes helpful:**
- "Don't use inline styles"
- "Don't add external libraries"
- "Don't change existing functionality"

**Prevents unwanted changes.**

### 4. Reference Documentation

**If needed:**
- "Following Next.js 14 App Router patterns"
- "Using React hooks as per React documentation"
- "Following Tailwind CSS best practices"

**Guides AI to use correct patterns.**

---

## Key Takeaways

1. **Be specific** - Clear requirements = better results
2. **Provide context** - Where, what, why helps AI understand
3. **Structure your prompt** - Action + What + Where + Details + Style
4. **Reference existing code** - AI sees your project, use that
5. **Break down complex tasks** - Smaller prompts = better results
6. **Iterate and refine** - Start basic, then perfect
7. **Learn from results** - See what works, adjust your prompting style

---

## What's Next?

Now that you know how to write effective prompts, let's learn how to use Cursor to fix errors! The next lesson shows you how to identify, understand, and fix errors using Cursor's AI features.

**Ready?** Let's move to Lesson 4.5: Fixing Errors Using Cursor!

---

## Quick Check

Before moving on, make sure you understand:
- ✅ What makes a good prompt (specific, contextual, detailed)
- ✅ How to structure prompts (Action + What + Where + Details + Style)
- ✅ Examples of good vs bad prompts
- ✅ Advanced prompting techniques (step-by-step, references, examples)
- ✅ How to iterate and refine prompts
- ✅ Common mistakes to avoid

If anything is unclear, review this lesson or practice writing prompts in Cursor!
