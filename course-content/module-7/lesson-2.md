# Lesson 7.2: Services Page Layout

**Estimated Time**: 45 minutes

---

## Introduction

Your Services page is where visitors see exactly what you offer and how much it costs. This lesson shows you how to create a clear, organized Services page that makes it easy for visitors to understand your services, compare options, and decide what to book.

**What You'll Learn:**
- How to organize services effectively
- Different layout options for services
- How to display service information clearly
- How to make services easy to compare
- How to guide visitors to booking

---

## Why a Good Services Page Matters

### Clear Information = More Bookings

**Your Services page should:**
- Show all your services clearly
- Make it easy to compare options
- Display pricing transparently
- Help visitors choose what's right for them
- Guide them to book

**A good Services page:**
- Reduces confusion
- Builds trust (transparent pricing)
- Helps visitors make decisions
- Increases bookings
- Answers common questions

**A bad Services page:**
- Confusing or unclear
- Hard to compare services
- Missing information
- No clear path to booking

---

## Organizing Your Services

### Option 1: Simple List

**Best for:**
- Few services (3-5)
- Simple offerings
- Clear categories

**Layout:**
- Each service in a card
- Service name, description, price
- Simple, clean design

---

### Option 2: Categorized Grid

**Best for:**
- Multiple services
- Different categories
- Grouped offerings

**Layout:**
- Services grouped by category
- Grid layout within categories
- Clear category headers

**Example categories:**
- Full Sets
- Infills
- Additional Services

---

### Option 3: Detailed Cards

**Best for:**
- Services needing more explanation
- Multiple details per service
- Visual emphasis

**Layout:**
- Large service cards
- Detailed descriptions
- Multiple details (duration, price, etc.)

---

## Essential Service Information

### What Each Service Should Include

**1. Service Name:**
- Clear, descriptive name
- Easy to understand

**2. Description:**
- What the service includes
- What to expect
- Who it's for

**3. Price:**
- Clear pricing
- Currency displayed
- Any additional fees noted

**4. Duration:**
- How long it takes
- Time commitment

**5. Image/Icon (Optional):**
- Visual representation
- Helps recognition

**6. CTA Button:**
- "Book This Service" or similar
- Links to booking

---

## Service Card Layout

### Recommended Card Structure

**Each service card should have:**

```
┌─────────────────────────┐
│   Service Name           │
│   (Large, bold)          │
├─────────────────────────┤
│   Description            │
│   (What's included)      │
│                          │
│   Duration: 2 hours     │
│   Price: $XXX           │
│                          │
│   [Book This Service]   │
└─────────────────────────┘
```

---

## Real-World Example: Services Page

### Example for Lash Studio

**Category: Full Sets**

**Service 1: Classic Lashes**
- Description: "Natural, elegant look with one extension per natural lash"
- Duration: 2 hours
- Price: $60
- [Book Now]

**Service 2: Volume Lashes**
- Description: "Full, dramatic appearance with multiple lightweight extensions"
- Duration: 2.5 hours
- Price: $75
- [Book Now]

**Service 3: Hybrid Lashes**
- Description: "Perfect balance of classic and volume for natural fullness"
- Duration: 2.5 hours
- Price: $70
- [Book Now]

---

## Using Cursor to Build Your Services Page

### Step 1: Prepare Your Service List

**List all your services:**
- Service name
- Description
- Duration
- Price
- Category (if applicable)

---

### Step 2: Generate the Page

**Prompt template:**
```
Create a Services page for my [business type] using React and Tailwind CSS.

Services to include:
1. [Service Name]
   - Description: [Description]
   - Duration: [Duration]
   - Price: [Price]

2. [Service Name]
   - Description: [Description]
   - Duration: [Duration]
   - Price: [Price]

3. [Service Name]
   - Description: [Description]
   - Duration: [Duration]
   - Price: [Price]

[Add more services as needed]

Layout: [Simple list / Categorized grid / Detailed cards]
Color palette: [Your colors]
Typography: [Your fonts]
Style: [Your style]

Make it easy to compare services. Include "Book This Service" buttons for each.
Use the same design style as my homepage.
```

---

### Step 3: Organize by Categories (If Needed)

**If you have categories:**

```
Organize the services page into categories:
- Category 1: [Service 1, Service 2, Service 3]
- Category 2: [Service 4, Service 5]
- Category 3: [Service 6]

Add clear category headers and group services accordingly.
```

---

### Step 4: Enhance the Layout

**Improve the design:**
```
Improve the services page layout:
- Make service cards more visually appealing
- Ensure proper spacing between cards
- Make pricing prominent and clear
- Ensure "Book This Service" buttons are easy to find
- Make the page scannable and easy to compare services
```

---

## Displaying Pricing Effectively

### Best Practices

**1. Be Transparent:**
- Show prices clearly
- No hidden fees
- Be upfront about costs

**2. Make It Prominent:**
- Large, clear price display
- Easy to see
- Not hidden

**3. Include Context:**
- Show what's included
- Duration information
- Value proposition

**4. Use Consistent Format:**
- Same currency format
- Same price display style
- Consistent across all services

---

## Service Comparison Features

### Help Visitors Compare

**You can include:**
- Comparison table
- Side-by-side cards
- "Most Popular" badges
- "Best Value" indicators

**Example prompt:**
```
Add a comparison feature to help visitors choose:
- Highlight the "Most Popular" service
- Make it easy to compare prices and durations
- Add visual indicators for recommended services
```

---

## Mobile Responsiveness

### Ensure It Works on All Devices

**Important for Services page:**
- Cards stack on mobile
- Prices are readable
- Buttons are tappable
- Easy to scroll through

**Prompt:**
```
Make the Services page fully responsive:
- Service cards should stack vertically on mobile
- Ensure all text is readable on small screens
- Make "Book This Service" buttons easy to tap (44px+ height)
- Ensure proper spacing on all devices
```

---

## Real-World Example: Complete Services Page

### Step 1: List Services

**Services:**
1. Classic Lashes - $60 - 2 hours
2. Volume Lashes - $75 - 2.5 hours
3. Hybrid Lashes - $70 - 2.5 hours
4. Classic Infill - $40 - 1 hour
5. Volume Infill - $45 - 1.5 hours

---

### Step 2: Generate Page

**Prompt:**
```
Create a Services page for my lash studio using React and Tailwind CSS.

Services:
1. Classic Lashes
   - Description: "Natural, elegant look with one extension per natural lash"
   - Duration: 2 hours
   - Price: $60

2. Volume Lashes
   - Description: "Full, dramatic appearance with multiple lightweight extensions"
   - Duration: 2.5 hours
   - Price: $75

3. Hybrid Lashes
   - Description: "Perfect balance of classic and volume for natural fullness"
   - Duration: 2.5 hours
   - Price: $70

4. Classic Infill
   - Description: "Maintain your classic lash set with a fill appointment"
   - Duration: 1 hour
   - Price: $40

5. Volume Infill
   - Description: "Refresh your volume lashes to maintain their full appearance"
   - Duration: 1.5 hours
   - Price: $45

Layout: Categorized grid
- Category 1: Full Sets (Classic, Volume, Hybrid)
- Category 2: Infills (Classic Infill, Volume Infill)

Color palette: Soft pink (#F5D7D7), cream (#FFF8F0), gold (#D4AF37)
Typography: Poppins headings, Inter body
Style: Minimal, modern, clean

Include "Book This Service" buttons for each service.
Make pricing clear and prominent.
```

---

### Step 3: Refine

**After generation:**
- Check all services are included
- Verify prices are correct
- Ensure buttons work
- Test on mobile

---

## Common Mistakes to Avoid

### 1. Unclear Service Names

**Bad:**
```
"Service A"
"Premium Package"
```

**Good:**
```
"Classic Lashes"
"Volume Lashes"
"Hybrid Lashes"
```

---

### 2. Missing Information

**Bad:**
```
Service name only, no description or price
```

**Good:**
```
Service name, clear description, duration, price, CTA button
```

---

### 3. Hard to Compare

**Bad:**
```
Services in different formats, inconsistent layout
```

**Good:**
```
Consistent card layout, easy to scan and compare
```

---

### 4. No Clear Path to Booking

**Bad:**
```
Services listed but no way to book
```

**Good:**
```
Clear "Book This Service" button for each service
```

---

## Your Services Page Planning Exercise

### Exercise: Plan Your Services Page

**1. List your services:**
- Service 1: ___________
- Service 2: ___________
- Service 3: ___________
- [Add more as needed]

**2. For each service, note:**
- Name: ___________
- Description: ___________
- Duration: ___________
- Price: ___________

**3. Organize by categories (if applicable):**
- Category 1: ___________
- Category 2: ___________

**4. Write your generation prompt:**
```
[Write a complete prompt to generate your Services page]
```

---

## Key Takeaways

1. **Clear organization matters** - Make it easy to find and compare services
2. **Include all essential info** - Name, description, duration, price, CTA
3. **Consistent layout** - Use the same card format for all services
4. **Transparent pricing** - Show prices clearly, no hidden fees
5. **Easy to compare** - Consistent format helps visitors choose
6. **Clear path to booking** - "Book This Service" button for each
7. **Mobile-friendly** - Ensure it works on all devices
8. **Match your brand** - Use same colors, fonts, style as homepage

---

## What's Next?

Excellent! You've created your Services page. Now you need to make sure pricing is displayed clearly and handle multiple currencies if needed. The next lesson covers pricing display and currency handling.

**Ready?** Let's move to Lesson 7.3: Pricing & Currency!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand how to organize services effectively
- ✅ Know what information each service should include
- ✅ Can create service cards with all essential details
- ✅ Understand different layout options (list, grid, cards)
- ✅ Know how to make services easy to compare
- ✅ Can generate a Services page with Cursor

If anything is unclear, review this lesson or ask questions!
