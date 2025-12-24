# Lesson 6.2: Generating Homepage Layout

**Estimated Time**: 45 minutes

---

## Introduction

Now that you understand what sections your homepage needs, it's time to actually build it! This lesson shows you how to use Cursor to generate your homepage layout. You'll learn the exact prompts to use, how to structure your request, and how to get Cursor to create a professional homepage for you.

**What You'll Learn:**
- How to write effective Cursor prompts for homepage generation
- The exact prompt structure that works
- How to generate the initial layout
- What to expect from Cursor's output
- How to refine and improve the generated code

---

## Before You Start

### What You Need

**From Module 5, you should have:**
- ✅ Your website type chosen
- ✅ Your pages planned
- ✅ Your color palette selected
- ✅ Your typography chosen
- ✅ Your design style defined

**You'll use all of this in your Cursor prompt!**

---

## The Complete Homepage Prompt

### Example Prompt Structure

**A good homepage prompt includes:**
1. What you want to build
2. The sections you need
3. Your design choices (colors, fonts, style)
4. Technical requirements
5. Specific details

**Here's the template:**

```
Create a responsive homepage using React and Tailwind CSS.

Include:
- Hero section with headline and button
- Services preview (3 cards)
- Call-to-action section

Use soft neutral colors and clean spacing.
```

---

## Step-by-Step: Generating Your Homepage

### Step 1: Open Your Project in Cursor

**1. Open Cursor**
- Launch the Cursor application
- Open your project folder

**2. Navigate to your pages directory**
- Usually `app/page.tsx` or `pages/index.tsx`
- This is where your homepage will live

**3. Make sure you're ready**
- Project is set up
- Dependencies installed
- Ready to add code

---

### Step 2: Write Your Prompt

**Use this complete prompt template:**

```
Create a responsive homepage for my [website type] using React and Tailwind CSS.

Target audience: [your target audience]

Pages needed:
- Homepage with the following sections:
  1. Hero section: [headline], [subheadline], [CTA button text]
  2. Services preview: [list 3-4 services]
  3. Trust indicators: [what to show]
  4. About section: [key message]
  5. Call-to-action section: [action text]
  6. Footer: Contact info, links

Color palette:
- Primary: [color name] (#hexcode)
- Secondary: [color name] (#hexcode)
- Accent: [color name] (#hexcode)
- Text: [color name] (#hexcode)
- Background: [color name] (#hexcode)

Typography:
- Headings: [font name] ([category], [weight])
- Body: [font name] ([category], [weight])

Overall style: [your style description]
Mood: [your mood description]

Please create a clean, modern, responsive layout with proper spacing and visual hierarchy.
```

---

### Step 3: Customize for Your Website

**Replace the placeholders with your actual information:**

**Example for a lash studio:**

```
Create a responsive homepage for my lash extension booking website using React and Tailwind CSS.

Target audience: Women 25-45 interested in beauty and self-care

Pages needed:
- Homepage with the following sections:
  1. Hero section: "Professional Lash Extensions", "Transform your look with our premium lash services", "Book Appointment" button
  2. Services preview: Classic Lashes, Volume Lashes, Hybrid Lashes
  3. Trust indicators: Testimonials and "500+ Happy Clients"
  4. About section: "5 years of experience, premium quality lash extensions"
  5. Call-to-action section: "Ready to Transform Your Look? Book Your Appointment"
  6. Footer: Contact info, hours, social links

Color palette:
- Primary: Soft pink (#F5D7D7)
- Secondary: Cream (#FFF8F0)
- Accent: Gold (#D4AF37)
- Text: Dark brown (#3E2A20)
- Background: White (#FFFFFF)

Typography:
- Headings: Poppins (sans-serif, semi-bold)
- Body: Inter (sans-serif, regular)

Overall style: Minimal, modern, soft colors, elegant
Mood: Warm, inviting, luxurious, professional

Please create a clean, modern, responsive layout with proper spacing and visual hierarchy.
```

---

### Step 4: Send the Prompt to Cursor

**How to use the prompt:**

**1. Select where to add code:**
- Click in `app/page.tsx` (or your homepage file)
- Or create a new component file

**2. Open Cursor's AI chat:**
- Press `Ctrl+L` (Windows/Linux) or `Cmd+L` (Mac)
- Or click the chat icon

**3. Paste your prompt:**
- Copy your complete prompt
- Paste it into the chat
- Press Enter

**4. Wait for Cursor to generate:**
- Cursor will analyze your request
- Generate the code
- Show you the result

---

## What Cursor Will Generate

### Expected Output

**Cursor will create:**
- React component structure
- Tailwind CSS styling
- All the sections you requested
- Responsive layout
- Proper spacing and hierarchy

**The code will include:**
- Hero section with headline and button
- Services preview cards
- Trust indicators section
- About section
- CTA section
- Footer

**It should be:**
- Clean and organized
- Properly formatted
- Using your colors and fonts
- Responsive (mobile-friendly)

---

## Reviewing the Generated Code

### What to Check

**1. Structure:**
- ✅ All sections are present
- ✅ Proper React component structure
- ✅ Clean code organization

**2. Styling:**
- ✅ Your colors are applied
- ✅ Your fonts are used
- ✅ Spacing looks good

**3. Content:**
- ✅ Headlines are correct
- ✅ Button text is right
- ✅ Services are listed

**4. Functionality:**
- ✅ Links work (if added)
- ✅ Buttons are clickable
- ✅ Layout is responsive

---

## Common Issues and Fixes

### Issue 1: Missing Sections

**Problem:**
Cursor didn't include all sections you requested.

**Fix:**
```
Add a [missing section name] section to the homepage with [what it should contain].
```

**Example:**
```
Add a trust indicators section to the homepage with testimonials and client count.
```

---

### Issue 2: Wrong Colors

**Problem:**
Colors don't match your palette.

**Fix:**
```
Update the color scheme to use:
- Primary: Soft pink (#F5D7D7)
- Secondary: Cream (#FFF8F0)
- Accent: Gold (#D4AF37)
Replace all color references in the homepage.
```

---

### Issue 3: Layout Issues

**Problem:**
Sections don't look right or are misaligned.

**Fix:**
```
Improve the layout spacing and alignment. Make sure sections have proper padding 
and are centered. Ensure visual hierarchy is clear.
```

---

### Issue 4: Not Responsive

**Problem:**
Homepage doesn't look good on mobile.

**Fix:**
```
Make the homepage fully responsive. Ensure all sections stack properly on mobile 
devices and text is readable on small screens.
```

---

## Refining Your Homepage

### Iterative Improvement

**Don't expect perfection on first try:**
- Generate initial layout
- Review what you got
- Refine specific sections
- Improve styling
- Test responsiveness

**Use targeted prompts:**
- "Make the hero section more prominent"
- "Improve spacing between sections"
- "Make the services cards more visually appealing"
- "Enhance the CTA button styling"

---

## Real-World Example: Complete Process

### Step 1: Initial Prompt

```
Create a responsive homepage for my lash studio using React and Tailwind CSS.
Include hero section, services preview (3 cards), trust indicators, about section, 
CTA, and footer. Use soft pink (#F5D7D7), cream (#FFF8F0), and gold (#D4AF37) colors.
Style: minimal, modern, elegant.
```

### Step 2: Review Generated Code

**Check:**
- All sections present? ✅
- Colors correct? ✅
- Layout good? ⚠️ (needs improvement)

### Step 3: Refinement Prompt

```
Improve the spacing and layout of the homepage. Make sections have more breathing 
room and ensure proper visual hierarchy. Center the content and add better padding.
```

### Step 4: Final Review

**Check again:**
- All sections present? ✅
- Colors correct? ✅
- Layout good? ✅
- Responsive? ✅

**Homepage is ready!**

---

## Best Practices

### 1. Be Specific

**Bad:**
```
Create a homepage.
```

**Good:**
```
Create a responsive homepage with hero section (headline: "Professional Lash Extensions", 
button: "Book Now"), services preview (3 cards), trust indicators, about section, CTA, 
and footer. Use soft pink, cream, and gold colors.
```

---

### 2. Include All Design Details

**Don't forget:**
- Colors (with hex codes)
- Fonts
- Style description
- Target audience

---

### 3. Start Broad, Then Refine

**First prompt:**
- Get the basic structure
- All sections included
- Basic styling

**Follow-up prompts:**
- Refine specific sections
- Improve styling
- Fix issues

---

### 4. Test as You Go

**After each generation:**
- Check the result
- Test in browser
- See how it looks
- Identify improvements

---

## Your Homepage Generation Exercise

### Practice: Write Your Prompt

**Fill in this template with your information:**

```
Create a responsive homepage for my [website type] using React and Tailwind CSS.

Target audience: [your target audience]

Sections needed:
1. Hero: [headline], [subheadline], [button]
2. Services: [list services]
3. Trust: [what to show]
4. About: [key message]
5. CTA: [action text]
6. Footer: [info]

Colors: [your colors with hex codes]
Fonts: [your fonts]
Style: [your style]

Create a clean, modern, responsive layout.
```

---

## Key Takeaways

1. **Use complete prompts** - Include all your design decisions (colors, fonts, style)
2. **Be specific** - List exactly what sections you need
3. **Start with structure** - Get all sections first, refine later
4. **Iterate** - Don't expect perfection on first try
5. **Test immediately** - Check the result in your browser
6. **Refine with targeted prompts** - Improve specific sections as needed
7. **Use your Module 5 planning** - All your design decisions go into the prompt

---

## What's Next?

Great! You've generated your homepage layout. Now you need to customize the content - update the text, refine the colors, and make sure everything matches your brand. The next lesson shows you how to edit text and colors effectively.

**Ready?** Let's move to Lesson 6.3: Editing Text & Colors!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand how to write a complete homepage prompt
- ✅ Know what information to include (sections, colors, fonts, style)
- ✅ Can generate the initial homepage layout with Cursor
- ✅ Know how to review and refine the generated code
- ✅ Understand the iterative improvement process

If anything is unclear, review this lesson or ask questions!
