# Lesson 1.3: What AI Can and Cannot Do

**Estimated Time**: 20 minutes

---

## Introduction

AI is powerful, but it's not magic. Understanding what AI can and cannot do will make you a better developer and help you avoid frustration. This lesson sets realistic expectations and teaches you how to work effectively with AI.

**What You'll Learn:**
- What AI excels at (and why)
- What AI struggles with (and why)
- Your role vs. AI's role
- How to work effectively with AI
- Realistic expectations for building websites

---

## What AI Can Do: The Superpowers

### 1. Write Code Quickly and Accurately

**AI is excellent at:**
- Writing correct syntax
- Following coding patterns
- Using the right functions and methods
- Structuring code properly
- Following best practices

**Example:**
You: "Create a booking form with name, email, phone, date, and time fields"

AI writes:
```typescript
<form>
  <input type="text" name="name" placeholder="Name" required />
  <input type="email" name="email" placeholder="Email" required />
  <input type="tel" name="phone" placeholder="Phone" required />
  <input type="date" name="date" required />
  <input type="time" name="time" required />
  <button type="submit">Book Appointment</button>
</form>
```

**Why AI is good at this:**
- Has seen millions of code examples
- Knows syntax rules
- Understands patterns
- Can generate quickly

### 2. Understand Context

**AI can:**
- See your entire project
- Understand what you've already built
- Match your existing code style
- Connect new code with existing code
- Maintain consistency

**Example:**
You: "Add a button to my homepage"

AI:
- Looks at your homepage file
- Sees you're using Tailwind CSS
- Matches your existing button styles
- Uses your color scheme
- Follows your code structure

**Why this matters:**
- Code fits seamlessly
- Consistent design
- No conflicts
- Professional result

### 3. Fix Errors and Debug

**AI is excellent at:**
- Reading error messages
- Understanding what went wrong
- Suggesting fixes
- Explaining why errors occurred
- Preventing similar errors

**Example:**
Error: `Cannot read property 'name' of undefined`

AI: "This error means you're trying to access the 'name' property on something that doesn't exist. The issue is on line 15 where you're accessing `user.name` but `user` is undefined. Let me fix this by adding a check..."

**Why AI is good at this:**
- Has seen many error patterns
- Understands common mistakes
- Can trace through code
- Knows solutions

### 4. Explain Complex Concepts

**AI can:**
- Break down complex topics
- Explain code line by line
- Answer "why" questions
- Teach as you build
- Adapt explanations to your level

**Example:**
You: "What does `useState` do?"

AI: "`useState` is a React hook that lets you add state to your component. State is data that can change over time. When state changes, React automatically re-renders your component to show the new data. Here's how it works..."

**Why this is valuable:**
- Learn as you build
- Understand what you're creating
- Build knowledge over time
- Ask questions anytime

### 5. Suggest Improvements

**AI can:**
- Identify potential issues
- Suggest better approaches
- Recommend best practices
- Optimize code
- Enhance functionality

**Example:**
AI: "I notice you're using inline styles. For better maintainability, consider using Tailwind CSS classes instead. Also, this form could benefit from validation. Would you like me to add that?"

**Why this helps:**
- Better code quality
- Fewer bugs
- More maintainable
- Professional results

### 6. Work Across Multiple Files

**AI can:**
- See your entire project structure
- Update multiple files at once
- Maintain consistency across files
- Understand relationships between files
- Make coordinated changes

**Example:**
You: "Add a new service to the services page and update the booking form to include it"

AI:
- Updates services page
- Updates booking form
- Updates database schema if needed
- Maintains consistency
- All in one operation

**Why this is powerful:**
- Saves time
- Reduces errors
- Maintains consistency
- Professional workflow

---

## What AI Cannot Do: The Limitations

### 1. Make Business Decisions

**AI cannot decide:**
- What features your website needs
- How your booking flow should work
- What information to collect
- How pricing should be structured
- What your business goals are

**You must decide:**
- What your business needs
- What your customers want
- What makes sense for your industry
- What your vision is

**Example:**
❌ **Don't ask AI**: "What should my booking website do?"

✅ **Do tell AI**: "Create a booking form that collects name, email, phone, preferred date, and service type. The form should validate email format and require all fields."

**Why this matters:**
- You know your business best
- You understand your customers
- You have the context
- AI provides tools, you provide direction

### 2. Know Your Exact Vision

**AI cannot:**
- Read your mind
- Know your brand identity
- Understand your aesthetic preferences
- Know what "looks good" to you
- Understand your target audience

**You must:**
- Describe your vision clearly
- Provide specific details
- Give examples or references
- Explain your preferences
- Iterate until it's right

**Example:**
❌ **Don't ask AI**: "Make my website look good"

✅ **Do tell AI**: "Create a homepage with a clean, professional design. Use soft beige (#F5F5DC) and white colors. The tone should be calm and confident. Make the 'Book Now' button prominent and easy to find. Use a modern sans-serif font."

**Why this matters:**
- First attempts might not match your vision
- Specificity leads to better results
- Iteration is normal
- You guide the design

### 3. Test Your Website

**AI cannot:**
- Open your browser and test
- Click buttons and fill forms
- Check if everything works
- Verify on different devices
- Know if something feels wrong

**You must:**
- Test all features
- Check on different devices
- Verify everything works
- Test user flows
- Ensure data is saved correctly

**Example workflow:**
1. AI generates booking form
2. You test it in your browser
3. You try different scenarios
4. You check mobile responsiveness
5. You verify data is saved
6. If issues, you ask AI to fix

**Why this matters:**
- AI generates code, you verify it works
- Testing catches issues early
- You ensure quality
- You validate functionality

### 4. Understand Your Users

**AI cannot:**
- Know your customers' needs
- Understand user behavior
- Know what will convert
- Understand your market
- Know your competition

**You must:**
- Understand your users
- Know what they need
- Design for them
- Test with them
- Iterate based on feedback

**Example:**
- You know your customers prefer phone calls over online booking
- You know they need flexible scheduling
- You know they want to see prices upfront
- You design accordingly
- AI implements your design

**Why this matters:**
- You have user insights
- You understand the market
- You make user-focused decisions
- AI implements your decisions

### 5. Guarantee Perfect Code

**AI cannot:**
- Always write perfect code on first try
- Guarantee no bugs
- Know all edge cases
- Always use best practices
- Predict all issues

**You must:**
- Review generated code
- Test thoroughly
- Ask for improvements
- Fix issues as they arise
- Iterate until it's right

**Example:**
- AI generates code
- You review it
- You test it
- You find a small issue
- You ask AI to fix it
- You test again
- Perfect!

**Why this matters:**
- First attempts might need refinement
- Review catches issues
- Testing validates functionality
- Iteration leads to quality

### 6. Replace Your Judgment

**AI cannot:**
- Know if something feels right
- Understand your business context
- Make judgment calls
- Know when to stop
- Know what's "good enough"

**You must:**
- Use your judgment
- Make decisions
- Know when it's done
- Understand quality
- Trust your instincts

**Example:**
- AI generates a homepage
- You review it
- Something feels off
- You ask for changes
- You iterate
- You decide when it's done

**Why this matters:**
- You're the final judge
- Your judgment matters
- You know your business
- You ensure quality

---

## The Partnership: You + AI

### What You Bring

**Vision and Goals:**
- What you want to build
- Your business objectives
- Your target audience
- Your brand identity

**Business Knowledge:**
- Your industry
- Your customers
- Your market
- Your competition

**Decision Making:**
- What features to include
- How things should work
- Design direction
- Content and messaging

**Quality Control:**
- Review code
- Test functionality
- Ensure quality
- Make final decisions

### What AI Brings

**Code Writing:**
- Generates code quickly
- Follows best practices
- Uses correct syntax
- Structures properly

**Technical Knowledge:**
- Programming languages
- Frameworks and tools
- Patterns and practices
- Solutions to problems

**Efficiency:**
- Works quickly
- Handles repetitive tasks
- Processes information fast
- Never gets tired

**Learning Support:**
- Explains concepts
- Answers questions
- Teaches as you build
- Provides guidance

### Together You:

**Build Faster:**
- AI writes code
- You make decisions
- Much faster than traditional methods

**Learn as You Go:**
- AI explains
- You understand
- Build knowledge over time

**Create Professional Results:**
- AI provides technical expertise
- You provide business expertise
- Combined = professional website

**Maintain Control:**
- You own the code
- You make decisions
- You control the outcome
- You understand what you built

---

## How to Work Effectively with AI

### 1. Be Specific

**Bad prompt:**
"Make a booking form"

**Good prompt:**
"Create a booking form with the following fields: name (text, required), email (email format, required), phone (tel format, required), service (dropdown with options: Basic, Premium, Deluxe), date (date picker, required), time (time picker, required). Include validation for all fields and a submit button. Use Tailwind CSS for styling."

**Why specificity matters:**
- Better results
- Less iteration
- Matches your vision
- Saves time

### 2. Provide Context

**Good context includes:**
- What you've already built
- Your design preferences
- Your technical stack
- Your business type
- Your target audience

**Example:**
"I'm building a booking website for a luxury spa. I've already created a homepage with soft beige and white colors. Now I need a booking form that matches this aesthetic and collects..."

**Why context matters:**
- AI understands your project
- Maintains consistency
- Better integration
- Professional results

### 3. Iterate and Refine

**The process:**
1. Ask AI to create something
2. Review the result
3. Test it
4. Ask for specific changes
5. Test again
6. Repeat until perfect

**Example:**
1. "Create a booking form"
2. Review: "The button is too small"
3. "Make the submit button larger and more prominent"
4. Review: "Perfect!"

**Why iteration matters:**
- First attempts might need refinement
- Normal part of the process
- Leads to better results
- Don't expect perfection immediately

### 4. Review and Test

**Always:**
- Read generated code
- Test in browser
- Check functionality
- Verify on mobile
- Look for errors

**Why this matters:**
- Catches issues early
- Ensures quality
- Builds understanding
- Prevents problems

### 5. Ask Questions

**When unclear:**
- "Can you explain this code?"
- "Why did you do it this way?"
- "How does this work?"
- "What does this mean?"

**Why questions matter:**
- Builds understanding
- Helps you learn
- Improves future prompts
- Creates better results

---

## Realistic Expectations

### What to Expect

**AI will:**
- Write code quickly
- Follow your instructions
- Generate working code
- Help you learn
- Save you time

**AI might:**
- Need iteration to get it right
- Require clarification
- Need refinement
- Not be perfect on first try

**You will:**
- Make decisions
- Review code
- Test functionality
- Iterate and refine
- Learn as you build

### What NOT to Expect

**Don't expect:**
- Perfect code every time
- No need to review or test
- AI to know everything
- No iteration needed
- Zero learning required

**This is normal:**
- First attempts need refinement
- Review is necessary
- Testing is essential
- Learning is part of the process
- Iteration leads to quality

---

## Key Takeaways

1. **AI excels at code writing** - Syntax, patterns, structure, best practices
2. **AI struggles with decisions** - Business logic, design vision, user understanding
3. **You make decisions** - Features, design, content, direction
4. **AI implements decisions** - Writes code, follows instructions, provides expertise
5. **Partnership works best** - You + AI = professional results
6. **Be specific** - Better prompts = better results
7. **Iterate and refine** - First attempts might need changes
8. **Review and test** - Always verify what AI generates
9. **Realistic expectations** - AI is powerful but not perfect
10. **You're in control** - You own the code and make decisions

---

## What's Next?

Now that you understand AI's capabilities and limitations, let's talk about why Cursor is the right tool for this journey. The next lesson explains why Cursor (not ChatGPT alone) is ideal for building websites.

**Ready?** Let's move to Lesson 1.4: Why Cursor (Not ChatGPT Alone)!

---

## Quick Check

Before moving on, make sure you understand:
- ✅ What AI excels at (code writing, debugging, explaining)
- ✅ What AI struggles with (decisions, vision, testing)
- ✅ Your role vs. AI's role
- ✅ How to work effectively with AI
- ✅ Realistic expectations

If anything is unclear, review this lesson or ask questions!
