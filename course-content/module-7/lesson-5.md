# Lesson 7.5: Page Navigation

**Estimated Time**: 30 minutes

---

## Introduction

Now that you have multiple pages (Homepage, About, Services, Contact), you need to connect them with clear navigation. This lesson shows you how to create navigation that makes it easy for visitors to move between pages, find what they're looking for, and take action.

**What You'll Learn:**
- Types of navigation (header, footer, mobile menu)
- How to create navigation links
- Mobile navigation (hamburger menu)
- Navigation best practices
- How to make navigation consistent across pages

---

## Why Navigation Matters

### Easy Movement Between Pages

**Good navigation:**
- Makes it easy to find pages
- Shows what's available
- Works on all devices
- Looks professional
- Guides visitors

**Bad navigation:**
- Confusing or hidden
- Hard to find pages
- Doesn't work on mobile
- Looks unprofessional
- Visitors get lost

**Clear navigation = Better user experience!**

---

## Types of Navigation

### 1. Header Navigation

**What it is:**
- Navigation bar at top of page
- Always visible
- Main pages listed
- Usually horizontal

**Best for:**
- Main pages (Home, Services, About, Contact)
- Always accessible
- Primary navigation

---

### 2. Footer Navigation

**What it is:**
- Links at bottom of page
- Secondary pages
- Additional information
- Usually vertical list

**Best for:**
- Secondary pages (FAQ, Policies)
- Social media links
- Contact information
- Legal pages

---

### 3. Mobile Navigation

**What it is:**
- Hamburger menu on mobile
- Hidden menu that opens
- Full-screen or dropdown
- Touch-friendly

**Best for:**
- Mobile devices
- Saving space
- Better mobile experience

---

## Header Navigation Structure

### Recommended Navigation Items

**For a booking website:**
- Home
- Services
- About
- Contact
- Book Now (CTA button)

**Keep it simple:**
- 4-6 items maximum
- Most important pages
- Clear labels

---

### Navigation Layout

**Standard layout:**
```
┌─────────────────────────────────────┐
│ Logo    Home  Services  About  Contact  [Book Now] │
└─────────────────────────────────────┘
```

**Or:**
```
┌─────────────────────────────────────┐
│ [Logo]                               │
│         Home  Services  About  Contact  [Book Now] │
└─────────────────────────────────────┘
```

---

## Building Navigation with Cursor

### Step 1: Create Navigation Component

**Prompt:**
```
Create a navigation component for my website using React and Tailwind CSS.

Navigation items:
- Home (links to /)
- Services (links to /services)
- About (links to /about)
- Contact (links to /contact)
- Book Now button (links to /booking, styled as CTA)

Layout: Horizontal navigation bar at top of page
- Logo on left
- Navigation items in center or right
- Book Now button on right (prominent, styled as CTA)

Color palette: [Your colors]
Typography: [Your fonts]
Style: [Your style]

Make it responsive. On mobile, use hamburger menu.
```

---

### Step 2: Add to All Pages

**Prompt:**
```
Add the navigation component to all pages:
- Homepage (/)
- Services page (/services)
- About page (/about)
- Contact page (/contact)

Ensure navigation is consistent across all pages and shows the current page as active.
```

---

### Step 3: Mobile Navigation

**Prompt:**
```
Make the navigation mobile-friendly:
- On desktop: Horizontal navigation bar
- On mobile: Hamburger menu icon
- When hamburger clicked: Show full navigation menu
- Menu should be easy to tap
- Include all navigation items
- Close menu when item is clicked
```

---

## Active Page Indication

### Show Current Page

**Help visitors know where they are:**

**Visual indication:**
- Highlight current page
- Different color
- Underline or background
- Bold text

**Prompt:**
```
Add active page indication to navigation:
- Highlight the current page in navigation
- Use accent color (#D4AF37) for active page
- Make it clear which page user is on
- Update active state based on current route
```

---

## Footer Navigation

### Footer Links

**Footer typically includes:**
- Secondary pages (FAQ, Policies)
- Contact information
- Social media links
- Copyright/legal

**Prompt:**
```
Create a footer component with:
- Contact information (address, phone, email)
- Quick links (FAQ, Privacy Policy, Terms)
- Social media links (if applicable)
- Copyright notice

Add footer to all pages. Use same design style as rest of website.
```

---

## Real-World Example: Complete Navigation

### Step 1: Header Navigation

**Prompt:**
```
Create a header navigation component using React and Tailwind CSS.

Structure:
- Logo on left (or site name)
- Navigation items: Home, Services, About, Contact
- "Book Now" button on right (prominent CTA)

Styling:
- Background: White or cream (#FFF8F0)
- Text: Dark brown (#3E2A20)
- Active page: Gold (#D4AF37)
- Book Now button: Gold background, dark text
- Clean, modern design

Make it sticky (stays at top when scrolling) and responsive.
```

---

### Step 2: Mobile Menu

**Prompt:**
```
Add mobile navigation:
- Hamburger icon (3 lines) on mobile
- When clicked, show full navigation menu
- Menu slides down or overlays
- Include all navigation items
- Close button or click outside to close
- Smooth animation
- Easy to tap on mobile
```

---

### Step 3: Add to Pages

**Prompt:**
```
Add the navigation component to all pages:
- Homepage
- Services page
- About page
- Contact page

Ensure:
- Navigation appears on all pages
- Active page is highlighted
- Navigation is consistent
- Works on all devices
```

---

### Step 4: Footer

**Prompt:**
```
Create a footer component and add to all pages:

Content:
- Contact: Address, Phone, Email
- Quick Links: FAQ, Privacy Policy
- Social Media: Instagram, Facebook (if applicable)
- Copyright: "© 2025 [Your Business Name]. All rights reserved."

Styling: Match website design, clean layout, readable text.
```

---

## Navigation Best Practices

### 1. Keep It Simple

**Don't:**
- Too many items (10+)
- Confusing labels
- Overwhelming menu

**Do:**
- 4-6 main items
- Clear, simple labels
- Easy to scan

---

### 2. Make It Visible

**Navigation should be:**
- Always accessible
- Easy to find
- Clear and obvious
- Not hidden

---

### 3. Mobile-Friendly

**On mobile:**
- Hamburger menu
- Easy to open/close
- Large tap targets
- Full navigation available

---

### 4. Consistent

**Across all pages:**
- Same navigation
- Same position
- Same styling
- Same items

---

### 5. Clear Labels

**Use:**
- Simple, clear words
- Common terms (Home, About, Contact)
- No jargon
- Obvious what each link does

---

## Testing Navigation

### Checklist

**Test on all devices:**
- [ ] All links work correctly
- [ ] Active page is highlighted
- [ ] Mobile menu opens/closes properly
- [ ] Navigation is visible on all pages
- [ ] Links go to correct pages
- [ ] CTA button is prominent
- [ ] Footer links work
- [ ] Navigation is consistent

---

## Common Navigation Mistakes

### 1. Too Many Items

**Bad:**
```
Home, Services, About, Team, Gallery, Blog, FAQ, 
Testimonials, Contact, Book Now, Location, Hours...
```

**Good:**
```
Home, Services, About, Contact, Book Now
```

---

### 2. Hidden Navigation

**Bad:**
```
Navigation hidden, hard to find, small text
```

**Good:**
```
Prominent navigation, always visible, clear and obvious
```

---

### 3. No Mobile Menu

**Bad:**
```
Navigation doesn't work on mobile, items overlap, can't tap
```

**Good:**
```
Hamburger menu on mobile, easy to use, full navigation available
```

---

### 4. Inconsistent

**Bad:**
```
Different navigation on each page, different styling, confusing
```

**Good:**
```
Same navigation everywhere, consistent styling, clear
```

---

## Your Navigation Exercise

### Practice: Plan Your Navigation

**1. Header navigation items:**
- [ ] Home
- [ ] Services
- [ ] About
- [ ] Contact
- [ ] Book Now (CTA)
- [ ] Other: ___________

**2. Footer links:**
- [ ] FAQ
- [ ] Privacy Policy
- [ ] Terms
- [ ] Social Media
- [ ] Other: ___________

**3. Write your navigation prompt:**
```
[Write a complete prompt to create navigation for your website]
```

---

## Key Takeaways

1. **Navigation connects pages** - Makes it easy to move between pages
2. **Keep it simple** - 4-6 main items, clear labels
3. **Always visible** - Header navigation should be accessible
4. **Mobile-friendly** - Hamburger menu for mobile devices
5. **Show active page** - Highlight current page in navigation
6. **Consistent** - Same navigation on all pages
7. **Footer for secondary** - Additional links and information
8. **Test thoroughly** - Ensure all links work on all devices

---

## Module 7 Summary

**Congratulations! You've completed Module 7: Building Additional Pages!**

**You've learned:**
1. ✅ How to structure an effective About page
2. ✅ How to create a clear Services page layout
3. ✅ How to display pricing and handle currencies
4. ✅ How to build a functional Contact form
5. ✅ How to connect all pages with navigation

**You now have:**
- A complete multi-page website
- Homepage, About, Services, and Contact pages
- Clear navigation between pages
- Professional, cohesive design
- All pages working together

**Your website structure is complete!** 🎉

---

## What's Next?

Excellent work! You've built all the essential pages for your website. The next modules will cover more advanced features like booking functionality, database integration, and deployment. You now have a solid foundation with all your main pages connected and working.

**Ready to continue?** Move to the next module to add booking functionality!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand different types of navigation (header, footer, mobile)
- ✅ Know how to create navigation links between pages
- ✅ Can build mobile-friendly navigation (hamburger menu)
- ✅ Understand navigation best practices
- ✅ Know how to make navigation consistent across pages
- ✅ Have all pages connected with working navigation

If anything is unclear, review this lesson or the entire module!
