# Lesson 7: Adding Animations and Interactions

## Introduction

Smooth animations and interactions make your website feel polished and professional. Let's add them to enhance user experience.

**Estimated Time**: 25 minutes

---

## Why Animations Matter

### Benefits

- **Professional feel**: Smooth, polished experience
- **User feedback**: Visual response to actions
- **Engagement**: More interesting and interactive
- **Guidance**: Draw attention to important elements

### Best Practices

- **Subtle**: Don't overdo it
- **Fast**: Keep animations quick (200-300ms)
- **Purposeful**: Each animation should have a reason

---

## CSS Transitions

### Basic Transitions

Tailwind makes transitions easy:

```typescript
<button className="bg-blue-600 hover:bg-blue-700 transition">
  Button
</button>
```

### Transition Properties

```typescript
// All properties
className="transition"

// Specific duration
className="transition duration-300"

// Specific property
className="transition-colors"

// Easing
className="transition ease-in-out"
```

---

## Common Animations

### Hover Effects

```typescript
// Button hover
<button className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition">
  Click me
</button>

// Card hover
<div className="hover:shadow-lg hover:-translate-y-1 transition">
  Card content
</div>
```

### Fade In

```typescript
<div className="opacity-0 animate-fade-in">
  Content
</div>
```

### Slide In

```typescript
<div className="transform translate-x-full animate-slide-in">
  Content
</div>
```

---

## Using Framer Motion (Optional)

### Install

```bash
npm install framer-motion
```

### Basic Usage

```typescript
'use client'

import { motion } from 'framer-motion'

export default function AnimatedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      Content
    </motion.div>
  )
}
```

---

## Custom Animations

### Add to tailwind.config.ts

```typescript
module.exports = {
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
      },
    },
  },
}
```

### Use in Components

```typescript
<div className="animate-fadeIn">
  Content
</div>
```

---

## Interactive Elements

### Loading States

```typescript
<button disabled={loading} className="disabled:opacity-50">
  {loading ? 'Loading...' : 'Submit'}
</button>
```

### Focus States

```typescript
<input className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
```

### Active States

```typescript
<button className="active:scale-95 transition">
  Click
</button>
```

---

## Animation Examples

### Service Cards

```typescript
<div className="transform hover:scale-105 hover:shadow-xl transition duration-300">
  Service card
</div>
```

### Navigation Links

```typescript
<Link className="hover:text-blue-600 transition-colors duration-200">
  Link
</Link>
```

### Buttons

```typescript
<button className="hover:bg-blue-700 active:scale-95 transition-all duration-200">
  Button
</button>
```

---

## Key Takeaways

✅ **Animations** enhance user experience

✅ **Keep it subtle** - don't overdo it

✅ **Fast transitions** (200-300ms)

✅ **Hover effects** provide feedback

✅ **Framer Motion** for complex animations

---

## What's Next?

Excellent! Your website now has smooth animations. Module 3 is complete! Next module: Building the Booking System Core.

**Ready to continue?** Click "Next Module" to proceed!

---

## Additional Resources

- [Framer Motion Documentation](https://www.framer.com/motion/) - Advanced animations
- [Tailwind Transitions](https://tailwindcss.com/docs/transition-property) - Transition utilities

**Remember**: Animations should enhance, not distract. Keep them subtle and purposeful! 🚀

