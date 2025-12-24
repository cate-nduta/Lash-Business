# Lesson 4.3: How Cursor Uses AI

**Estimated Time**: 25 minutes

---

## Introduction

Cursor's power comes from its AI integration. This lesson explains how Cursor uses AI, the different AI features available, and when to use each one. Understanding these features will make you much more productive.

**What You'll Learn:**
- How Cursor integrates AI
- Different AI features (Chat, Composer, Inline)
- When to use each feature
- How AI understands your code
- Best practices for AI features

---

## How Cursor's AI Works

### The Magic Behind It

**Cursor's AI:**
- Sees your entire project
- Understands your codebase
- Reads your files
- Knows your context
- Provides relevant help

**Unlike ChatGPT:**
- ChatGPT doesn't see your files
- Generic responses
- No project context

**Cursor AI:**
- Sees all your files
- Context-aware responses
- Understands your project
- Much more helpful!

---

## Main AI Features

### 1. AI Chat (`Ctrl+L` / `Cmd+L`)

**What it is:**
- Chat with AI about your code
- Ask questions
- Get explanations
- Like ChatGPT but with context

**When to use:**
- Ask "What does this code do?"
- "How do I add X feature?"
- "Why is this error happening?"
- "Explain this concept"

**Example:**
- You: "What does this function do?"
- AI: *Explains the function, sees your code, gives context-specific answer*

**Best for:** Questions, explanations, learning

### 2. Composer (`Ctrl+I` / `Cmd+I`)

**What it is:**
- Multi-file editing
- AI writes code across files
- Creates new features
- Most powerful feature

**When to use:**
- "Create a booking form"
- "Add a new page"
- "Refactor this code"
- "Build a feature"

**Example:**
- You: "Create a homepage with hero section and services preview"
- AI: *Creates multiple files, writes all code, shows you changes before applying*

**Best for:** Building features, creating code, major changes

### 3. Inline Suggestions

**What it is:**
- AI suggests code as you type
- Appears automatically
- Press Tab to accept
- Like autocomplete but smarter

**When it appears:**
- As you type code
- AI predicts what you want
- Suggests completions
- Context-aware

**How to use:**
- Type code
- See gray suggestion
- Press `Tab` to accept
- Or keep typing to ignore

**Best for:** Quick completions, speeding up coding

### 4. Right-Click AI Options

**What it is:**
- AI options in context menu
- Right-click on code
- Various AI actions

**Options:**
- Explain code
- Refactor code
- Generate tests
- Fix issues
- And more

**When to use:**
- Select code
- Right-click
- Choose AI action
- Get help

**Best for:** Quick AI help on specific code

---

## AI Chat in Detail

### Opening AI Chat

**Methods:**
1. Click AI icon in left sidebar
2. Press `Ctrl+L` (Windows) / `Cmd+L` (Mac)
3. Command palette → "Chat"

**Chat panel opens:**
- On left or right side
- Can type questions
- AI responds with context

### What You Can Ask

**Questions about code:**
- "What does this function do?"
- "Why is this code here?"
- "How does this work?"
- "What's the purpose of this file?"

**How-to questions:**
- "How do I add a button?"
- "How do I style this component?"
- "How do I connect to a database?"
- "How do I deploy my website?"

**Debugging questions:**
- "Why is this error happening?"
- "What's wrong with this code?"
- "How do I fix this bug?"
- "Why isn't this working?"

**Learning questions:**
- "Explain React hooks"
- "What is this pattern called?"
- "How does this technology work?"
- "What's the best practice here?"

### Chat Best Practices

**1. Be specific:**
- ❌ "Fix this"
- ✅ "Fix the button alignment on mobile devices"

**2. Provide context:**
- ❌ "Add validation"
- ✅ "Add email validation to the booking form"

**3. Ask one thing at a time:**
- ❌ "Fix the form and add styling and make it responsive"
- ✅ "Fix the form validation" (then ask about styling separately)

**4. Reference your code:**
- "In the BookingForm component, add..."
- "Looking at this file, how do I..."
- AI sees your files, reference them

---

## Composer in Detail

### Opening Composer

**Methods:**
1. Press `Ctrl+I` (Windows) / `Cmd+I` (Mac)
2. Command palette → "Composer"
3. Sometimes appears automatically

**Composer panel opens:**
- Large input area
- Can describe what to build
- AI will create code

### What Composer Can Do

**Create new features:**
- "Create a booking form component"
- "Add a services page"
- "Build an admin dashboard"
- "Create a login page"

**Modify existing code:**
- "Update the homepage to include testimonials"
- "Add dark mode to the website"
- "Refactor this component to use hooks"
- "Add error handling to this function"

**Work across files:**
- Creates multiple files if needed
- Updates related files
- Maintains consistency
- Shows all changes before applying

### Composer Workflow

**Step 1: Describe what you want**
- Type your request
- Be specific and clear
- Include requirements

**Step 2: AI generates code**
- AI reads your project
- Understands context
- Generates appropriate code
- Shows you the changes

**Step 3: Review changes**
- See what will change
- Review the code
- Check if it's what you want

**Step 4: Accept or modify**
- Accept if good
- Ask for changes if needed
- Iterate until perfect

### Composer Best Practices

**1. Be very specific:**
- ❌ "Make a form"
- ✅ "Create a booking form with name, email, phone, date, and time fields. Include validation for email format and require all fields. Use Tailwind CSS for styling."

**2. Include context:**
- "In the booking page, add..."
- "Following the existing design pattern, create..."
- "Match the style of the homepage, add..."

**3. Break down complex requests:**
- ❌ "Build the entire booking system"
- ✅ "Create the booking form component" (then build other parts separately)

**4. Review before accepting:**
- Always review generated code
- Make sure it's what you want
- Ask for changes if needed

---

## Inline Suggestions

### How They Work

**As you type:**
- AI watches what you're typing
- Predicts what comes next
- Suggests code completion
- Appears in gray text

**Example:**
- You type: `const handleClick = ()`
- AI suggests: ` => { console.log('clicked'); }`
- Press Tab to accept
- Or keep typing your own code

### When They're Most Useful

**Repetitive code:**
- Similar patterns
- AI recognizes pattern
- Suggests completion
- Saves time

**Common patterns:**
- React components
- Function definitions
- Import statements
- Common code structures

### Using Inline Suggestions

**Accept suggestion:**
- Press `Tab`
- Suggestion becomes your code
- Continue coding

**Ignore suggestion:**
- Keep typing
- Suggestion disappears
- Your code takes priority

**See more options:**
- Sometimes multiple suggestions
- Arrow keys to choose
- Tab to accept selected

---

## Right-Click AI Options

### Available Options

**Explain:**
- Explains selected code
- What it does
- How it works
- Very helpful for learning

**Refactor:**
- Improves code
- Makes it cleaner
- Better patterns
- Maintains functionality

**Generate Tests:**
- Creates test code
- For selected function
- Helps with testing
- Advanced feature

**Fix Issues:**
- Fixes errors
- Resolves problems
- Improves code
- Quick fixes

### How to Use

**1. Select code:**
- Highlight code you want help with
- Can be a few lines or entire function

**2. Right-click:**
- Context menu appears
- See AI options

**3. Choose option:**
- Click what you want
- AI processes
- Shows result

**4. Apply or modify:**
- Accept if good
- Ask for changes
- Iterate

---

## Understanding AI Context

### What AI Sees

**Your entire project:**
- All files
- Project structure
- Existing code
- Patterns you use

**Current file:**
- What you're working on
- Surrounding code
- Context of changes

**Your request:**
- What you're asking for
- Your description
- Your requirements

**AI uses all of this to help you!**

### How Context Helps

**Better suggestions:**
- Matches your style
- Uses your patterns
- Follows your structure
- Consistent with project

**Smarter code:**
- Understands your setup
- Uses your libraries
- Matches your patterns
- Integrates well

**Relevant answers:**
- Specific to your code
- Context-aware
- Actually helpful
- Not generic

---

## Best Practices Summary

### For AI Chat

**✅ Do:**
- Ask specific questions
- Reference your code
- Ask one thing at a time
- Use for learning and debugging

**❌ Don't:**
- Ask vague questions
- Ask multiple things at once
- Expect it to write entire features (use Composer)

### For Composer

**✅ Do:**
- Be very specific
- Include requirements
- Break down complex tasks
- Review before accepting

**❌ Don't:**
- Be vague
- Ask for everything at once
- Accept without reviewing
- Expect perfection first try

### For Inline Suggestions

**✅ Do:**
- Use for quick completions
- Accept when helpful
- Ignore when not needed
- Trust your judgment

**❌ Don't:**
- Accept blindly
- Rely on it completely
- Ignore your own knowledge

---

## Common Questions

### "Which AI feature should I use?"

**Answer:**
- **Chat:** Questions, explanations, learning
- **Composer:** Building features, creating code
- **Inline:** Quick completions while typing
- **Right-click:** Help with specific code

### "Why doesn't AI understand what I want?"

**Answer:** You might need to be more specific. Include:
- What you want to build
- Where it should go
- What it should look like
- Any requirements

### "Can I use multiple AI features together?"

**Answer:** Yes! Use Chat to understand, then Composer to build, then Inline for quick edits. They work together.

### "How accurate is the AI code?"

**Answer:** Usually very good, but always review! AI can make mistakes. Review, test, and iterate.

---

## Key Takeaways

1. **AI Chat = Questions** - Ask questions, get explanations, learn
2. **Composer = Building** - Create features, write code, major changes
3. **Inline = Quick help** - Suggestions as you type, speed up coding
4. **Right-click = Context help** - Help with specific code selections
5. **AI sees your project** - Context-aware, understands your codebase
6. **Be specific** - Better descriptions = better results
7. **Always review** - AI is helpful but not perfect, review generated code

---

## What's Next?

Now that you understand how Cursor uses AI, let's learn how to write effective prompts! The next lesson teaches you how to communicate with AI to get the best results.

**Ready?** Let's move to Lesson 4.4: Writing Effective Cursor Prompts!

---

## Quick Check

Before moving on, make sure you understand:
- ✅ How Cursor integrates AI (sees your project, context-aware)
- ✅ Different AI features (Chat, Composer, Inline, Right-click)
- ✅ When to use each feature (Chat for questions, Composer for building)
- ✅ How AI understands your code (reads files, sees context)
- ✅ Best practices for each feature

If anything is unclear, review this lesson or try the features in Cursor!
