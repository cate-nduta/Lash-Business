# Lesson 12.4: Updating Content

**Estimated Time**: 20 minutes

---

## Introduction

Your website's content needs to stay fresh and up-to-date. This lesson shows you how to update content on your website, from simple text changes to adding new pages. You'll learn how to use Cursor to make content updates easily, even if you're not comfortable editing code directly.

**What You'll Learn:**
- Why content updates matter
- How to find content in your code
- How to update text and images
- How to add new content
- How to maintain consistency
- Best practices for content updates

---

## Why Content Updates Matter

### Fresh Content = Better Results

**Updated content helps:**
- Keep information current
- Improve search rankings
- Show business is active
- Better user experience
- Reflect current offerings

**Stale content hurts:**
- Outdated information
- Lower search rankings
- Looks unprofessional
- Confuses visitors
- Missed opportunities

**Think of it like:**
- Updating a menu (prices and items change)
- Refreshing a storefront (keep it current)
- Updating a resume (reflects current skills)
- Maintaining a garden (needs regular care)

**Content updates = Keep website relevant!**

---

## Types of Content Updates

### Text Updates

**Common text updates:**
- Service descriptions
- Pricing information
- Business hours
- Contact information
- About page content
- Service offerings

---

### Image Updates

**Common image updates:**
- New photos
- Updated product images
- Better quality images
- Seasonal images
- New portfolio items

---

### Page Updates

**Common page updates:**
- Add new services
- Update existing pages
- Add new pages
- Remove outdated content
- Reorganize content

---

## Finding Content in Your Code

### Where Content Lives

**Content is in:**
- Page files (`.tsx` or `.tsx` files)
- Component files
- Data files (JSON, if using)
- Markdown files (if using)
- Database (if using)

**Common locations:**
- `app/[page-name]/page.tsx` - Page content
- `components/[component-name].tsx` - Component content
- `data/` folder - Data files
- `public/` folder - Images and assets

---

### How to Find Specific Content

**Method 1: Search in Cursor**
- Use Cursor's search (Ctrl+F or Cmd+F)
- Search for text you see on website
- Find where it's defined
- Edit that location

**Method 2: Ask Cursor**
```
Where is the text "Book Your Appointment" located in my codebase?
I want to update it to say something different.
```

**Method 3: Browse files**
- Look in page files
- Check component files
- Review data files
- Find content location

---

## Updating Text Content

### Simple Text Updates

**Step 1: Find the text**
- Search for the text
- Or ask Cursor to find it
- Note the file location

**Step 2: Update the text**
- Edit directly in file
- Or ask Cursor to update it
- Make the change
- Save the file

**Step 3: Verify**
- Check the website
- See the updated text
- Verify it's correct
- Test on different pages

---

### Using Cursor for Text Updates

**Good update prompts:**

**Example 1: Simple text change**
```
Update the heading on my homepage from "Welcome to Our Studio" to
"Welcome to [Your Business Name] - Professional Lash Services"
```

**Example 2: Service description**
```
Update the service description for "Classic Lash Extensions" on the services page.
Change it to: "Our classic lash extensions provide a natural, beautiful look
that enhances your eyes with individual lashes applied with precision."
```

**Example 3: Contact information**
```
Update the contact email on the contact page from "info@example.com" to
"hello@yourbusiness.com"
```

---

## Updating Images

### Replacing Images

**Step 1: Add new image**
- Save image to `public/images/` folder
- Use descriptive filename
- Optimize image size
- Ensure good quality

**Step 2: Update image reference**
- Find where old image is used
- Update to new image path
- Or ask Cursor to update it

**Step 3: Verify**
- Check image displays
- Verify it looks good
- Test on different devices
- Check file size

---

### Using Cursor for Image Updates

**Good image update prompts:**

**Example 1: Replace image**
```
Replace the hero image on my homepage. The current image is at
public/images/hero.jpg. I've added a new image at public/images/hero-new.jpg.
Update the homepage to use the new image.
```

**Example 2: Add new image**
```
Add a new image to my services page. The image is at public/images/service-new.jpg.
Display it in the "Premium Services" section with appropriate styling.
```

---

## Adding New Content

### Adding New Sections

**Step 1: Decide what to add**
- New section on existing page
- New page entirely
- New service offering
- New content block

**Step 2: Describe to Cursor**
- Explain what to add
- Where to add it
- What it should look like
- Include content

**Step 3: Review and apply**
- See what Cursor creates
- Review the code
- Apply if correct
- Test the result

---

### Using Cursor to Add Content

**Good content addition prompts:**

**Example 1: New section**
```
Add a new "Testimonials" section to my homepage. Include 3 customer testimonials
with names and photos. Style it consistently with the rest of the homepage.
```

**Example 2: New service**
```
Add a new service called "Lash Lift & Tint" to my services page. Include a
description, price, and duration. Style it consistently with existing services.
```

**Example 3: New page**
```
Create a new "Gallery" page for my website. Display a grid of images from the
public/images/gallery folder. Add it to the navigation menu.
```

---

## Maintaining Content Consistency

### Style and Tone

**Keep consistent:**
- Writing style
- Tone of voice
- Formatting
- Terminology
- Brand voice

**Why it matters:**
- Professional appearance
- Builds trust
- Clear communication
- Better user experience

---

### Formatting Consistency

**Maintain formatting:**
- Headings use same style
- Paragraphs formatted consistently
- Lists use same format
- Links styled the same
- Buttons consistent

---

## Content Update Workflow

### Complete Process

**1. Plan the update:**
- Decide what to update
- Gather new content
- Prepare images (if needed)
- Plan the changes

**2. Find the content:**
- Search for existing content
- Or ask Cursor to find it
- Note file locations
- Understand structure

**3. Make the update:**
- Edit directly or use Cursor
- Update text/images
- Add new content if needed
- Save changes

**4. Test the update:**
- View on website
- Check different pages
- Test on mobile
- Verify formatting

**5. Deploy:**
- Push to GitHub
- Netlify auto-deploys
- Verify live site
- Check for issues

---

## Common Content Updates

### 1. Updating Pricing

**How to update:**
```
Update the pricing for "Classic Lash Extensions" from $150 to $175
on the services page. Also update any other references to this price.
```

---

### 2. Changing Business Hours

**How to update:**
```
Update the business hours on the contact page to:
Monday - Friday: 9am - 6pm
Saturday: 10am - 4pm
Sunday: Closed
```

---

### 3. Adding New Services

**How to add:**
```
Add a new service to my services page:
- Service name: "Lash Removal"
- Description: "Professional removal of lash extensions"
- Price: $30
- Duration: 30 minutes
Style it consistently with existing services.
```

---

### 4. Updating About Page

**How to update:**
```
Update the About page with new information about my business.
Include: [your new content]. Keep the existing style and format.
```

---

### 5. Adding Testimonials

**How to add:**
```
Add a testimonials section to my homepage with 3 customer reviews.
Include customer names and make it look professional and trustworthy.
```

---

## Best Practices

### 1. Keep Content Current

**Regular updates:**
- Review content monthly
- Update outdated information
- Add new content regularly
- Remove old content

---

### 2. Maintain Quality

**Quality standards:**
- Check for typos
- Ensure accuracy
- Use good grammar
- Keep it professional

---

### 3. Test After Updates

**Always verify:**
- Check website after updates
- Test on different devices
- Verify formatting
- Check for errors

---

### 4. Backup Before Major Changes

**Safety first:**
- Commit changes to Git
- Test before deploying
- Keep backups
- Can revert if needed

---

### 5. Document Changes

**Keep track:**
- Note what you changed
- When you changed it
- Why you changed it
- Results of changes

---

## Using Cursor Effectively

### Good Content Update Prompts

**Be specific:**
- Include exact text to change
- Specify file or page
- Describe desired outcome
- Include context

**Example good prompt:**
```
Update the hero section text on my homepage. Change "Welcome to Our Studio"
to "Welcome to [Business Name] - Where Beauty Meets Excellence". Also update
the subtitle to "Professional lash extension services in [Your City]".
```

---

### Finding Content with Cursor

**Ask Cursor to find:**
```
Where is the text "[specific text]" located in my codebase?
I want to update it.
```

**Cursor will:**
- Search the codebase
- Find the location
- Show you the file
- Help you update it

---

## Real-World Content Update Example

### Updating Services Page

**Step 1: Plan update**
- Add new service
- Update pricing for existing
- Improve descriptions

**Step 2: Find content**
- Locate services page
- Find service listings
- Note structure

**Step 3: Make updates**
- Ask Cursor to add new service
- Update pricing
- Improve descriptions
- Save changes

**Step 4: Test**
- View services page
- Check formatting
- Verify new service
- Test on mobile

**Step 5: Deploy**
- Push to GitHub
- Verify deployment
- Check live site
- Confirm updates

**Result:**
- Services page updated
- New service added
- Pricing current
- Better descriptions
- Professional appearance

---

## Key Takeaways

1. **Content needs regular updates** - Keep information current and relevant
2. **Find content easily** - Use search or ask Cursor to locate text
3. **Update text simply** - Edit directly or use Cursor prompts
4. **Update images** - Replace files and update references
5. **Add new content** - Use Cursor to add sections, pages, services
6. **Maintain consistency** - Keep style, tone, and formatting consistent
7. **Test after updates** - Always verify changes work correctly
8. **Regular maintenance** - Review and update content regularly

---

## What's Next?

Perfect! You now know how to update and maintain your website's content. The final lesson covers next steps, building confidence, and how to continue growing your skills as a website owner.

**Ready?** Let's move to Lesson 12.5: Next Steps & Confidence!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand why content updates matter (keep website current)
- ✅ Know how to find content in your code (search, ask Cursor, browse files)
- ✅ Can update text content (edit directly or use Cursor)
- ✅ Know how to update images (replace files, update references)
- ✅ Can add new content (sections, pages, services)
- ✅ Understand how to maintain consistency (style, tone, formatting)
- ✅ Know the content update workflow (plan, find, update, test, deploy)
- ✅ Feel confident updating content with Cursor's help

If anything is unclear, review this lesson or ask questions!

