# Lesson 7.3: Pricing & Currency

**Estimated Time**: 40 minutes

---

## Introduction

Clear, transparent pricing is essential for building trust and helping visitors make decisions. This lesson shows you how to display prices effectively, handle multiple currencies if needed, and ensure your pricing is clear and professional across your website.

**What You'll Learn:**
- How to display prices clearly
- Formatting prices consistently
- Handling multiple currencies
- Making pricing transparent
- Best practices for pricing display

---

## Why Clear Pricing Matters

### Transparency Builds Trust

**Clear pricing:**
- Builds trust (no surprises)
- Helps visitors make decisions
- Reduces hesitation
- Shows professionalism
- Prevents confusion

**Unclear pricing:**
- Creates suspicion
- Causes hesitation
- Loses potential customers
- Looks unprofessional
- Leads to questions

**Transparent pricing = More bookings!**

---

## Displaying Prices Effectively

### Price Format Standards

**Consistent format:**
- Currency symbol placement
- Decimal places (if needed)
- Thousands separators
- Clear, readable font

**Examples:**
- `$60` (US dollars)
- `$60.00` (with decimals)
- `KSH 6,000` (Kenyan shillings with separator)
- `€50` (Euros)

---

### Making Prices Prominent

**Price should be:**
- Easy to see
- Large enough to read
- Clear and bold
- Not hidden or small

**Good price display:**
```jsx
<div className="text-3xl font-bold text-[#D4AF37]">
  $60
</div>
```

**Bad price display:**
```jsx
<div className="text-xs text-gray-400">
  $60
</div>
```

---

## Single Currency Display

### If You Only Accept One Currency

**Best practices:**
- Show currency symbol clearly
- Use consistent format
- Make it prominent
- Include in service cards

**Example:**
```
Service: Classic Lashes
Price: $60
Duration: 2 hours
```

**Or:**
```
$60
2 hours
```

---

## Multiple Currency Display

### If You Accept Multiple Currencies

**Options:**

**Option 1: Currency Selector**
- Dropdown or toggle
- User selects currency
- Prices update automatically
- Shows both currencies

**Option 2: Show Both**
- Display prices in both currencies
- Side by side or stacked
- Clear labeling

**Option 3: Primary + Secondary**
- Primary currency prominent
- Secondary currency smaller
- Clear indication

---

## Implementing Currency Display

### Simple Approach: Show One Currency

**If you only need one currency:**

**In your service cards:**
```jsx
<div className="service-card">
  <h3>Classic Lashes</h3>
  <p>Description...</p>
  <div className="price">$60</div>
  <div className="duration">2 hours</div>
</div>
```

**Cursor prompt:**
```
Display prices clearly on the Services page. Use format: $XX for each service.
Make prices prominent with large, bold text. Use gold color (#D4AF37) for prices.
```

---

### Advanced Approach: Multiple Currencies

**If you need multiple currencies:**

**Option 1: Currency Toggle**

**Prompt:**
```
Add a currency selector to the Services page. Allow users to switch between 
USD ($) and KES (KSH). When currency changes, update all prices accordingly.
Display the current currency clearly.
```

**Option 2: Show Both Currencies**

**Prompt:**
```
Display prices in both USD and KES on the Services page. Show format:
"$60 / KSH 6,000" for each service. Make both currencies clear and readable.
```

---

## Currency Conversion

### Handling Exchange Rates

**If you need conversion:**

**Static conversion:**
- Set fixed exchange rate
- Update manually when needed
- Simple to implement

**Dynamic conversion:**
- Fetch current rates
- Update automatically
- More complex

**For beginners:**
- Start with static conversion
- Update manually monthly
- Keep it simple

---

## Price Display Best Practices

### 1. Be Consistent

**Use the same format everywhere:**
- Same currency symbol placement
- Same decimal handling
- Same font size/style
- Same color

---

### 2. Make It Clear

**Price should be:**
- Easy to find
- Easy to read
- Not ambiguous
- Clearly labeled

---

### 3. Include Context

**Show what's included:**
- Service name
- Duration
- What's included
- Any additional fees

---

### 4. Be Transparent

**No hidden fees:**
- Show full price
- Note any additional costs
- Be upfront
- Build trust

---

## Real-World Example: Pricing Display

### Example 1: Single Currency (USD)

**Service Card:**
```
┌─────────────────────┐
│ Classic Lashes      │
│                     │
│ Natural, elegant    │
│ look with one       │
│ extension per lash │
│                     │
│ $60                 │
│ 2 hours             │
│                     │
│ [Book Now]          │
└─────────────────────┘
```

---

### Example 2: Multiple Currencies

**Service Card:**
```
┌─────────────────────┐
│ Classic Lashes      │
│                     │
│ Natural, elegant    │
│ look                │
│                     │
│ $60                 │
│ KSH 6,000           │
│                     │
│ 2 hours             │
│                     │
│ [Book Now]          │
└─────────────────────┘
```

---

### Example 3: Currency Selector

**Page header:**
```
[USD $] [KES KSH]  ← Currency toggle
```

**Service cards update based on selection**

---

## Using Cursor for Pricing Display

### Step 1: Define Your Pricing

**List all services with prices:**
- Service 1: $60
- Service 2: $75
- Service 3: $70
- etc.

---

### Step 2: Generate/Update Services Page

**Single currency prompt:**
```
Update the Services page to display prices clearly. Format: $XX for each service.
Make prices prominent with:
- Large, bold text (text-3xl)
- Gold color (#D4AF37)
- Clear positioning in each service card
```

**Multiple currencies prompt:**
```
Add currency display to the Services page. Show prices in both USD and KES:
- Format: "$60 / KSH 6,000"
- Make both currencies clear and readable
- Use consistent formatting for all services
```

---

### Step 3: Add Currency Selector (If Needed)

**Prompt:**
```
Add a currency selector to the Services page header. Allow users to toggle 
between USD ($) and KES (KSH). When selected, update all service prices 
to show the selected currency. Include clear visual indication of current 
currency selection.
```

---

## Handling Price Updates

### When Prices Change

**How to update:**
- Find price in service card
- Update the number
- Keep format consistent
- Test display

**Or use a prompt:**
```
Update the price for [Service Name] from $XX to $YY on the Services page.
Ensure the new price is displayed clearly and consistently.
```

---

## Common Pricing Mistakes

### 1. Unclear Format

**Bad:**
```
60
$ 60
60 dollars
```

**Good:**
```
$60
```

---

### 2. Hidden or Small Prices

**Bad:**
```
Tiny price in corner, hard to see
```

**Good:**
```
Large, bold, prominent price
```

---

### 3. Inconsistent Format

**Bad:**
```
Service 1: $60
Service 2: 75 dollars
Service 3: $70.00
```

**Good:**
```
Service 1: $60
Service 2: $75
Service 3: $70
```

---

### 4. Missing Currency Symbol

**Bad:**
```
60
75
70
```

**Good:**
```
$60
$75
$70
```

---

## Your Pricing Display Exercise

### Practice: Set Up Your Pricing

**1. List your services and prices:**
- Service 1: $___________
- Service 2: $___________
- Service 3: $___________

**2. Choose currency display:**
- [ ] Single currency (USD)
- [ ] Multiple currencies (USD + KES)
- [ ] Currency selector

**3. Write your pricing prompt:**
```
[Write a prompt to display prices on your Services page]
```

---

## Key Takeaways

1. **Clear pricing builds trust** - Be transparent, no hidden fees
2. **Consistent format** - Use same format everywhere
3. **Make it prominent** - Large, bold, easy to see
4. **Include context** - Show what's included with price
5. **Single or multiple** - Choose based on your needs
6. **Update easily** - Keep prices current and accurate
7. **Test display** - Ensure prices show correctly on all devices

---

## What's Next?

Great! Your Services page now has clear pricing. Next, you'll learn how to create a Contact page with a functional form that visitors can use to reach you. The next lesson covers building contact forms with Cursor.

**Ready?** Let's move to Lesson 7.4: Contact Page Form!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand why clear pricing matters (builds trust)
- ✅ Know how to format prices consistently
- ✅ Can display single or multiple currencies
- ✅ Understand best practices for price display
- ✅ Know how to update prices when needed
- ✅ Can implement pricing display with Cursor

If anything is unclear, review this lesson or ask questions!
