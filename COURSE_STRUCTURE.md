# Course Structure - Lesson-Based System

## Overview

The course has been restructured into a **lesson-based system** where each lesson is displayed on a separate page. This makes the course easier to navigate and prevents long scrolling sessions.

## Structure

### URL Structure

- **Course Overview**: `/course` - Lists all modules
- **Module Overview**: `/course/module-{id}` - Lists all lessons in a module
- **Individual Lesson**: `/course/module-{id}/lesson-{id}` - Displays a single lesson

### File Structure

```
course-content/
  module-1/
    lesson-1.md
    lesson-2.md
    ...
  module-2/
    lesson-1.md
    lesson-2.md
    ...
  ...
```

### Course Definition

The course structure is defined in `lib/course-structure.ts`. This file contains:
- Module information (title, description, estimated time)
- Lesson information for each module (title, description, estimated time)
- Status tracking (completed/pending)

## How It Works

1. **Course Page** (`app/course/page.tsx`)
   - Displays all modules
   - Links to module overview pages

2. **Module Overview Page** (`app/course/module-[moduleId]/page.tsx`)
   - Displays module information
   - Lists all lessons in the module
   - Links to individual lesson pages

3. **Lesson Page** (`app/course/module-[moduleId]/lesson-[lessonId]/page.tsx`)
   - Reads lesson content from `course-content/module-{id}/lesson-{id}.md`
   - Displays markdown content as HTML
   - Provides navigation to previous/next lessons

## Adding New Lessons

### Method 1: Manual Creation

1. Create a markdown file: `course-content/module-{id}/lesson-{id}.md`
2. Write detailed lesson content
3. Update `lib/course-structure.ts` to include the lesson

### Method 2: Extract from Module Files

Use the extraction script:
```bash
node scripts/extract-lessons.js [module-number]
```

This will extract lessons from existing module markdown files and create individual lesson files.

## Content Guidelines

### Lesson Structure

Each lesson should include:

1. **Title** - Clear, descriptive title
2. **Introduction** - Brief overview of what will be covered
3. **Estimated Time** - How long the lesson takes
4. **Main Content** - Detailed explanations, code examples, step-by-step instructions
5. **Key Takeaways** - Summary of important points
6. **Reflection Questions** - Questions to help students think about the content
7. **What's Next** - Link to next lesson

### Writing Style

- **Be Detailed**: Explain concepts thoroughly
- **Use Examples**: Provide real-world examples and code snippets
- **Be Clear**: Use simple language, avoid jargon
- **Be Practical**: Focus on actionable steps
- **Be Encouraging**: Support beginners throughout

## Benefits of This Structure

1. **Better Navigation**: Students can easily jump to specific lessons
2. **Reduced Scrolling**: Each lesson is on its own page
3. **Progress Tracking**: Can track which lessons are completed
4. **Easier Updates**: Update individual lessons without affecting others
5. **Better Mobile Experience**: Shorter pages load faster on mobile

## Current Status

- ✅ Course structure defined (all 10 modules)
- ✅ Module overview pages created
- ✅ Lesson pages created
- ✅ Navigation system implemented
- ⏳ Lesson content being created (starting with Module 1)

## Next Steps

1. Create detailed lesson content for all modules
2. Extract lessons from existing module files where possible
3. Enhance lesson content with more detail and examples
4. Add progress tracking (optional)
5. Add lesson completion checkmarks (optional)

