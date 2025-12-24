# Lesson 6.3: Editing Text & Colors

**Estimated Time**: 40 minutes

---

## Introduction

Once Cursor generates your homepage layout, you'll need to customize it. This lesson shows you how to edit text content and apply your color palette to make the homepage truly yours. You'll learn how to update headlines, descriptions, and ensure your brand colors are applied correctly throughout.

**What You'll Learn:**
- How to find and edit text in the generated code
- How to update headlines and descriptions
- How to apply your color palette
- How to ensure consistency across sections
- How to refine content to match your brand voice

---

## Understanding the Generated Code

### What Cursor Creates

**When Cursor generates your homepage, it creates:**
- React component with JSX
- Tailwind CSS classes for styling
- Text content (headlines, descriptions)
- Color references
- Structure and layout

**You'll need to:**
- Update placeholder text
- Apply your actual colors
- Refine the content
- Make it match your brand

---

## Editing Text Content

### Step 1: Find Text in the Code

**Text appears in JSX like this:**

```jsx
<h1>Professional Lash Extensions</h1>
<p>Transform your look with our premium lash services</p>
<button>Book Appointment</button>
```

**Look for:**
- Text between HTML tags (`<h1>`, `<p>`, `<span>`, etc.)
- Content in quotes
- Button text
- Headlines and descriptions

---

### Step 2: Update Headlines

**Hero section headline:**

**Find:**
```jsx
<h1 className="text-4xl font-bold">Your Headline Here</h1>
```

**Update to your actual headline:**
```jsx
<h1 className="text-4xl font-bold">Professional Lash Extensions</h1>
```

**Or use a prompt:**
```
Update the hero section headline to "Professional Lash Extensions" 
and the subheadline to "Transform your look with our premium lash services".
```

---

### Step 3: Update Descriptions

**Service descriptions:**

**Find:**
```jsx
<p>Service description goes here</p>
```

**Update to your actual descriptions:**
```jsx
<p>Natural, elegant look with one extension per lash</p>
```

**Or use a prompt:**
```
Update the service descriptions:
- Classic Lashes: "Natural, elegant look with one extension per lash"
- Volume Lashes: "Full, dramatic appearance with multiple extensions"
- Hybrid Lashes: "Perfect balance of natural and volume"
```

---

### Step 4: Update Button Text

**Call-to-action buttons:**

**Find:**
```jsx
<button>Click Here</button>
```

**Update to your actual button text:**
```jsx
<button>Book Your Appointment</button>
```

**Or use a prompt:**
```
Change all "Book Now" buttons to "Book Your Appointment" 
and make them more prominent.
```

---

## Applying Your Color Palette

### Step 1: Understand Tailwind Color Classes

**Tailwind uses classes like:**
- `bg-pink-200` - Background color
- `text-gray-800` - Text color
- `border-blue-500` - Border color

**For custom colors, you can:**
- Use Tailwind's color system
- Add custom colors to Tailwind config
- Use inline styles with hex codes

---

### Step 2: Update Background Colors

**Find background color classes:**

**Example:**
```jsx
<div className="bg-white">...</div>
```

**Update to your color:**
```jsx
<div className="bg-[#F5D7D7]">...</div>
```

**Or use a prompt:**
```
Update all background colors to use soft pink (#F5D7D7) for the hero section 
and cream (#FFF8F0) for other sections.
```

---

### Step 3: Update Text Colors

**Find text color classes:**

**Example:**
```jsx
<h1 className="text-gray-900">...</h1>
```

**Update to your color:**
```jsx
<h1 className="text-[#3E2A20]">...</h1>
```

**Or use a prompt:**
```
Change all text colors to dark brown (#3E2A20) for better readability 
and brand consistency.
```

---

### Step 4: Update Accent Colors

**Buttons and highlights:**

**Example:**
```jsx
<button className="bg-blue-500">...</button>
```

**Update to your accent color:**
```jsx
<button className="bg-[#D4AF37]">...</button>
```

**Or use a prompt:**
```
Update all button and accent colors to gold (#D4AF37) 
and ensure hover states use a darker shade.
```

---

## Using Cursor Prompts for Editing

### Effective Editing Prompts

**1. Update specific text:**
```
Update the hero section headline to "Professional Lash Extensions" 
and subheadline to "Transform your look with our premium lash services".
```

**2. Update colors:**
```
Apply my color palette throughout the homepage:
- Primary: Soft pink (#F5D7D7) for backgrounds
- Secondary: Cream (#FFF8F0) for section backgrounds
- Accent: Gold (#D4AF37) for buttons and highlights
- Text: Dark brown (#3E2A20) for all text
```

**3. Update multiple elements:**
```
Update all service card titles and descriptions to match my actual services:
- Classic Lashes: "Natural, elegant look"
- Volume Lashes: "Full, dramatic appearance"
- Hybrid Lashes: "Perfect balance"
```

---

## Ensuring Consistency

### Check Color Usage

**Make sure:**
- ✅ Primary color used consistently
- ✅ Secondary color for backgrounds
- ✅ Accent color for buttons/CTAs
- ✅ Text color readable everywhere
- ✅ No random colors left over

**Use this prompt:**
```
Review the entire homepage and ensure all colors match my palette:
- Primary: #F5D7D7
- Secondary: #FFF8F0
- Accent: #D4AF37
- Text: #3E2A20
Replace any colors that don't match.
```

---

### Check Text Consistency

**Make sure:**
- ✅ Headlines match your brand voice
- ✅ Descriptions are accurate
- ✅ Button text is consistent
- ✅ No placeholder text remains
- ✅ Tone matches throughout

**Use this prompt:**
```
Review all text on the homepage and ensure it matches my brand voice: 
[describe your brand voice - e.g., "warm, professional, inviting"]. 
Update any text that doesn't match this tone.
```

---

## Real-World Example: Complete Editing Process

### Step 1: Initial Review

**After generation, check:**
- Text: Some placeholder text ✅ (needs updating)
- Colors: Generic colors ⚠️ (needs your palette)
- Content: Basic structure ✅

---

### Step 2: Update Text

**Prompt:**
```
Update all text content on the homepage:
- Hero headline: "Professional Lash Extensions"
- Hero subheadline: "Transform your look with our premium lash services"
- Service 1: "Classic Lashes - Natural, elegant look"
- Service 2: "Volume Lashes - Full, dramatic appearance"
- Service 3: "Hybrid Lashes - Perfect balance"
- CTA button: "Book Your Appointment"
- About text: "With 5 years of experience, we specialize in creating beautiful, natural-looking lash extensions"
```

---

### Step 3: Apply Colors

**Prompt:**
```
Apply my complete color palette to the homepage:
- Hero section background: Soft pink (#F5D7D7)
- Section backgrounds: Cream (#FFF8F0)
- All buttons and CTAs: Gold (#D4AF37)
- All text: Dark brown (#3E2A20)
- Accent elements: Gold (#D4AF37)
Ensure consistent color usage throughout.
```

---

### Step 4: Final Refinement

**Prompt:**
```
Review the homepage and ensure:
1. All text matches my brand voice (warm, professional, inviting)
2. All colors match my palette exactly
3. No placeholder text remains
4. Content is accurate and compelling
Make any final adjustments needed.
```

---

## Common Editing Tasks

### Task 1: Update Hero Section

**Prompt:**
```
Update the hero section:
- Headline: "[Your headline]"
- Subheadline: "[Your subheadline]"
- Button text: "[Your button text]"
- Background color: [Your primary color]
```

---

### Task 2: Update Service Cards

**Prompt:**
```
Update the service preview cards with my actual services:
1. [Service name]: [Description]
2. [Service name]: [Description]
3. [Service name]: [Description]
Include icons or images if possible.
```

---

### Task 3: Update Trust Indicators

**Prompt:**
```
Add trust indicators to the homepage:
- Testimonial: "[Quote]" - [Name]
- Stat: "[Number] Happy Clients"
- Rating: "5-Star Rated"
Style them to match my color palette.
```

---

### Task 4: Update Footer

**Prompt:**
```
Update the footer with my contact information:
- Phone: [Your phone]
- Email: [Your email]
- Address: [Your address]
- Hours: [Your hours]
- Social media links: [Your social links]
```

---

## Best Practices

### 1. Edit in Stages

**Don't try to do everything at once:**
- First: Update all text
- Second: Apply colors
- Third: Refine and polish

---

### 2. Be Specific

**Bad:**
```
Update the colors.
```

**Good:**
```
Apply my color palette: Primary #F5D7D7, Secondary #FFF8F0, 
Accent #D4AF37, Text #3E2A20. Update all color references.
```

---

### 3. Test After Each Change

**After updating:**
- Save the file
- Check in browser
- See how it looks
- Verify colors are correct

---

### 4. Keep Brand Consistency

**Ensure:**
- All text matches your brand voice
- All colors match your palette
- Tone is consistent throughout
- No conflicting styles

---

## Your Editing Exercise

### Practice: Update Your Homepage

**1. Update text:**
- Hero headline: ___________
- Service descriptions: ___________
- Button text: ___________

**2. Apply colors:**
- Primary: ___________
- Secondary: ___________
- Accent: ___________
- Text: ___________

**3. Write your editing prompt:**
```
[Write a complete prompt to update text and colors on your homepage]
```

---

## Key Takeaways

1. **Text is easy to edit** - Find text between HTML tags and update it
2. **Colors use Tailwind classes** - Update `bg-`, `text-`, `border-` classes
3. **Use specific prompts** - Tell Cursor exactly what to change
4. **Edit in stages** - Text first, then colors, then refine
5. **Test after changes** - Always check in browser
6. **Maintain consistency** - Ensure colors and tone match throughout
7. **No placeholder text** - Replace all generic content with your actual content

---

## What's Next?

Great! Your homepage now has your actual content and colors. But there's one more critical step - making sure it looks great on mobile devices. The next lesson shows you how to ensure your homepage is fully responsive and mobile-friendly.

**Ready?** Let's move to Lesson 6.4: Making It Mobile-Friendly!

---

## Quick Check

Before moving on, make sure you:
- ✅ Know how to find and edit text in the code
- ✅ Understand how to update colors using Tailwind classes
- ✅ Can write effective prompts to update content and colors
- ✅ Know how to ensure consistency across the homepage
- ✅ Understand the importance of testing after each change

If anything is unclear, review this lesson or ask questions!
