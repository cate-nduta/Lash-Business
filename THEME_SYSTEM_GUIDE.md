# Seasonal Theme System Guide

## Overview
Your website now has a powerful seasonal theme system that lets you change the entire color scheme across all pages (admin + client) with a single click!

## Available Themes

### 🌸 Default (Pink & Brown)
The original LashDiary palette - elegant pink and brown tones.

### ☀️ Summer Vibes
- Primary: #037F8C (Teal)
- Secondary: #FEBAED (Pink)
- Accent: #79DCF2 (Sky Blue)
- Background: Light blue tones
- Perfect for: June - August

### ❄️ Winter Elegance
- Primary: #6B212C (Deep Wine)
- Secondary: #DCE0E8 (Cool Gray)
- Accent: #868859 (Olive)
- Background: Soft gray tones
- Perfect for: December - February

### 🌷 Spring Blossom
- Primary: #83513E (Warm Brown)
- Secondary: #FAD6D3 (Blush Pink)
- Accent: #E7AE75 (Peach)
- Background: Soft peach/pink tones
- Perfect for: March - May

### 🍂 Autumn Warmth
- Primary: #4C1208 (Deep Burgundy)
- Secondary: #E4CDDD (Mauve)
- Accent: #893A49 (Rose)
- Background: Soft mauve tones
- Perfect for: September - November

## How to Use

### Changing Themes

1. Go to Admin Dashboard → **Seasonal Themes** (🎨)
2. Preview all available themes with color swatches
3. Click "Apply This Theme" on your chosen season
4. The page will refresh automatically
5. **Done!** Your entire website now uses the new colors

### What Changes

When you switch themes, the following elements update automatically:

**Client-Side:**
- All buttons and call-to-action elements
- Background colors
- Text colors (headings, paragraphs)
- Borders and dividers
- Cards and panels
- Navigation elements
- Footer

**Admin-Side:**
- Dashboard cards
- All form inputs
- Tables and data displays
- Buttons and actions
- Navigation and headers

**Email Templates:**
- Header gradients
- Content boxes
- CTA buttons
- Footer sections

### What Stays the Same

- Your content (text, images, services, prices)
- Layout and structure
- Functionality and features
- Service offerings
- Booking system
- Gallery images

## Technical Details

### How It Works

1. **Theme Storage**: Current theme selection is stored in `data/theme.json`
2. **CSS Variables**: Theme colors are injected as CSS variables in the root HTML
3. **Tailwind Integration**: All Tailwind color classes reference these variables
4. **Dynamic Updates**: Colors update across the entire site without code changes

### Color Mapping

The system maps your brand colors to CSS variables:

| Tailwind Class | CSS Variable | Usage |
|----------------|-------------|--------|
| `text-brown` | `--color-primary` | Main text, borders |
| `bg-brown-dark` | `--color-primary-dark` | Dark accents, buttons |
| `border-brown-light` | `--color-primary-light` | Light borders, hovers |
| `bg-pink-light` | `--color-secondary` | Backgrounds, cards |
| `bg-pink` | `--color-secondary-dark` | Medium accents |
| `bg-pink-dark` | `--color-accent` | Primary actions |
| `bg-baby-pink-light` | `--color-background` | Page backgrounds |

## Best Practices

### When to Change Themes

- **Summer (June-Aug)**: Bright, vibrant colors for energy
- **Fall (Sep-Nov)**: Warm, cozy tones for comfort
- **Winter (Dec-Feb)**: Elegant, sophisticated palette
- **Spring (Mar-May)**: Fresh, blooming colors

### Testing

Before switching themes permanently:
1. Apply the new theme
2. Check key pages:
   - Homepage
   - Booking page
   - Services page
   - Admin dashboard
   - Email previews (send test email)
3. Ensure readability and accessibility
4. Verify all buttons are visible and distinct

### Reverting

To go back to the original pink & brown:
1. Go to Seasonal Themes
2. Click "Apply This Theme" on "Default (Pink & Brown)"
3. Done!

## For Deployment

The theme system works perfectly on Vercel:
- No environment variables needed
- Changes apply instantly
- No redeploy required
- Theme persists across page loads

## Need Help?

If you want to:
- Add more themes
- Customize existing colors
- Change which elements are affected
- Add seasonal images or content

You can edit `data/theme.json` directly or ask for help customizing the theme system further.

---

**Enjoy your seasonal transformations! 🎨✨**

