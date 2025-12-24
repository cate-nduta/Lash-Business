# Module 2: Building the Foundation

## Overview

In this module, you'll build the foundation of your booking website. You'll create a beautiful homepage, navigation bar, footer, and learn how to style everything with Tailwind CSS. By the end, you'll have a professional-looking website structure.

**Estimated Time**: 3-4 hours

---

## Lesson 2.1: Understanding Tailwind CSS

### What is Tailwind CSS?

Tailwind CSS is a utility-first CSS framework. Instead of writing custom CSS, you use pre-built utility classes directly in your HTML/JSX.

### Traditional CSS vs Tailwind

**Traditional CSS:**
```css
/* styles.css */
.button {
  background-color: blue;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
}
```

```html
<button class="button">Click me</button>
```

**Tailwind CSS:**
```html
<button class="bg-blue-500 text-white px-6 py-3 rounded-lg">
  Click me
</button>
```

### Common Tailwind Classes

- **Colors**: `bg-blue-500`, `text-white`, `border-gray-300`
- **Spacing**: `p-4` (padding), `m-2` (margin), `px-6` (horizontal padding)
- **Sizing**: `w-full`, `h-64`, `max-w-4xl`
- **Typography**: `text-xl`, `font-bold`, `text-center`
- **Layout**: `flex`, `grid`, `hidden`, `block`
- **Effects**: `rounded-lg`, `shadow-md`, `hover:bg-blue-600`

### Tailwind Configuration

Your `tailwind.config.js` file controls Tailwind's behavior. It's already set up, but you can customize colors, fonts, and more here.

---

## Lesson 2.2: Creating the Navigation Bar

The navigation bar (navbar) appears at the top of every page. Let's build it step by step.

### Step 1: Create the Navbar Component

1. Create a new folder: `components` (in your project root)
2. Create a new file: `components/Navbar.tsx`

### Step 2: Basic Navbar Structure

Open `components/Navbar.tsx` and add:

```typescript
'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Your Business Name
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-700 hover:text-gray-900">
              Home
            </Link>
            <Link href="/services" className="text-gray-700 hover:text-gray-900">
              Services
            </Link>
            <Link href="/booking" className="text-gray-700 hover:text-gray-900">
              Book Now
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-gray-900">
              Contact
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-gray-900"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/" className="block px-3 py-2 text-gray-700 hover:bg-gray-100">
                Home
              </Link>
              <Link href="/services" className="block px-3 py-2 text-gray-700 hover:bg-gray-100">
                Services
              </Link>
              <Link href="/booking" className="block px-3 py-2 text-gray-700 hover:bg-gray-100">
                Book Now
              </Link>
              <Link href="/contact" className="block px-3 py-2 text-gray-700 hover:bg-gray-100">
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
```

### Step 3: Understanding the Code

**`'use client'`** - This tells Next.js this is a client component (needed for useState)

**`useState(false)`** - Tracks whether mobile menu is open

**`Link`** - Next.js component for navigation (better than `<a>` tags)

**Classes explained:**
- `bg-white` - White background
- `shadow-md` - Medium shadow
- `sticky top-0` - Sticks to top when scrolling
- `z-50` - High z-index (stays on top)
- `max-w-7xl mx-auto` - Max width with center alignment
- `hidden md:flex` - Hidden on mobile, flex on desktop
- `hover:text-gray-900` - Darker text on hover

### Step 4: Add Navbar to Layout

Open `app/layout.tsx` and import/add the Navbar:

```typescript
import Navbar from '@/components/Navbar'

// ... existing code ...

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
```

### Step 5: Test Your Navbar

1. Save all files
2. Check your browser - you should see the navbar at the top!
3. Try clicking the mobile menu button (resize browser to mobile size)

✅ **Checkpoint**: Your navbar should be visible and working!

---

## Lesson 2.3: Creating the Footer

The footer appears at the bottom of every page with links and contact information.

### Step 1: Create Footer Component

Create `components/Footer.tsx`:

```typescript
import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">About Us</h3>
            <p className="text-gray-400 text-sm">
              Your business description goes here. Tell visitors about your services and what makes you special.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-gray-400 hover:text-white">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/booking" className="text-gray-400 hover:text-white">
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Email: hello@yourbusiness.com</li>
              <li>Phone: (123) 456-7890</li>
              <li>Address: Your Address Here</li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>&copy; {currentYear} Your Business Name. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
```

### Step 2: Add Footer to Layout

Update `app/layout.tsx`:

```typescript
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

// ... existing code ...

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

✅ **Checkpoint**: Footer should appear at the bottom of every page!

---

## Lesson 2.4: Building the Homepage Hero Section

The hero section is the first thing visitors see - make it impressive!

### Step 1: Update Homepage

Open `app/page.tsx` and replace with:

```typescript
import Link from 'next/link'

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to Your Business
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Professional services you can trust
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Book Now
              </Link>
              <Link
                href="/services"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
              <p className="text-gray-600">Book your appointment online in minutes</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
              <p className="text-gray-600">Safe and secure payment processing</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Expert Team</h3>
              <p className="text-gray-600">Experienced professionals at your service</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100">Book your appointment today</p>
          <Link
            href="/booking"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition inline-block"
          >
            Book Now
          </Link>
        </div>
      </section>
    </div>
  )
}
```

### Step 2: Understanding the Code

**Hero Section:**
- `bg-gradient-to-r` - Gradient background (left to right)
- `from-blue-600 to-purple-600` - Gradient colors
- `py-24` - Large vertical padding
- `text-center` - Center-aligned text

**Features Section:**
- `grid grid-cols-1 md:grid-cols-3` - 1 column on mobile, 3 on desktop
- `gap-8` - Space between grid items
- SVG icons for visual appeal

**CTA Section:**
- Call-to-action to encourage bookings
- Prominent button

✅ **Checkpoint**: Your homepage should look professional and inviting!

---

## Lesson 2.5: Making It Responsive

Responsive design ensures your website looks great on all devices.

### Key Responsive Classes

- `sm:` - Small screens (640px+)
- `md:` - Medium screens (768px+)
- `lg:` - Large screens (1024px+)
- `xl:` - Extra large (1280px+)

### Examples

```typescript
// Text size: small on mobile, large on desktop
<h1 className="text-2xl md:text-4xl lg:text-6xl">Title</h1>

// Grid: 1 column on mobile, 3 on desktop
<div className="grid grid-cols-1 md:grid-cols-3">

// Padding: small on mobile, large on desktop
<div className="p-4 md:p-8 lg:p-12">

// Hidden on mobile, visible on desktop
<div className="hidden md:block">
```

### Test Responsiveness

1. Open your browser's developer tools (F12)
2. Click the device toggle icon
3. Test different screen sizes
4. Make sure everything looks good!

---

## Lesson 2.6: Customizing Colors and Theme

Let's customize the colors to match your brand.

### Step 1: Update Tailwind Config

Open `tailwind.config.js` and add custom colors:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        secondary: {
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
}
```

### Step 2: Use Custom Colors

Now you can use `bg-primary-500` instead of `bg-blue-500`:

```typescript
<button className="bg-primary-500 hover:bg-primary-600">
  Click me
</button>
```

---

## Module 2 Checkpoint

Before moving to Module 3, make sure you have:

✅ Created a working Navbar component  
✅ Created a Footer component  
✅ Built a beautiful homepage with hero section  
✅ Made everything responsive  
✅ Customized colors to match your brand  
✅ Tested on mobile and desktop  

### Common Issues & Solutions

**Problem**: Navbar/Footer not showing  
**Solution**: Make sure you imported and added them to `layout.tsx`

**Problem**: Styles not applying  
**Solution**: Check that Tailwind is properly configured in `globals.css`

**Problem**: Mobile menu not working  
**Solution**: Make sure you have `'use client'` at the top of Navbar component

---

## What's Next?

Congratulations! You've built the foundation of your website. You now have:
- ✅ Professional navigation
- ✅ Beautiful homepage
- ✅ Responsive footer
- ✅ Understanding of Tailwind CSS

**Ready for Module 3?**  
Open `MODULE_03_BOOKING_SYSTEM_CORE.md` to start building the booking system!

---

## Practice Exercise

Before moving on, try these exercises:

1. **Customize the hero section** - Change colors, text, and add your business name
2. **Add more features** - Add 2-3 more feature cards to the homepage
3. **Update footer** - Add your actual contact information
4. **Add a logo** - Create or find a logo and add it to the navbar
5. **Create a Services page** - Create `app/services/page.tsx` with a basic layout

