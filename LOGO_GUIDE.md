# Logo Management Guide

## Overview
You can now manage your website logo directly from the admin panel without touching any code!

## Logo Options

### 1. Text Logo (Default)
- Uses your brand font (Playfair Display)
- Customizable text
- Adapts to all seasonal themes
- Always looks professional
- **Best for**: Simple, elegant branding

### 2. Image Logo
- Upload your own logo image
- Supports: PNG, JPG, SVG, WebP
- Max file size: 2MB
- **Recommended format**: SVG or PNG with transparent background
- **Ideal dimensions**: 200px wide x 60px tall
- **Best for**: Custom designed logos, established brands

## How to Change Your Logo

### Via Admin Panel:

1. Go to **Admin Dashboard** → **Settings** (⚙️)
2. Scroll to **Logo Settings** section
3. Choose your logo type:
   - **Text Logo**: Enter your business name
   - **Image Logo**: Upload your logo file

#### For Text Logo:
1. Click "Text Logo" button
2. Enter your business name in "Logo Text" field
3. See live preview below the input
4. Click "Save Changes"
5. Done! Logo updates across the entire site

#### For Image Logo:
1. Click "Image Logo" button
2. Click "Choose File" and select your logo
3. Wait for upload to complete
4. Preview appears automatically
5. Click "Save Changes"
6. Done! Logo appears everywhere

## Logo File Recommendations

### Best Formats:

**1. SVG (Scalable Vector Graphics) - BEST**
- ✅ Scales perfectly at any size
- ✅ Crisp on all screens (including retina)
- ✅ Small file size
- ✅ Works with transparent backgrounds
- ✅ Recommended for professional logos

**2. PNG - GREAT**
- ✅ Supports transparency
- ✅ High quality
- ⚠️ Export at 2x size for retina displays (400x120px)
- Use for: Detailed logos with gradients/effects

**3. WebP - GOOD**
- ✅ Modern format, smaller files
- ✅ Good quality
- ⚠️ Less universal support

**4. JPG - OK**
- ⚠️ No transparency (will have white/colored background)
- Only use if your logo has a solid background

### Design Tips:

- **Simple is better**: Clean, readable logos work best
- **Horizontal orientation**: Fits better in navigation
- **High contrast**: Make sure logo is visible on white backgrounds
- **Professional**: Get it designed or use Canva/Figma
- **Test it**: Preview on different devices after upload

### Dimensions:

- **Width**: 150-250px (200px ideal)
- **Height**: 40-80px (60px ideal)
- **Aspect ratio**: 3:1 or 4:1 (wider than tall)
- **Export at 2x** for retina screens if using PNG

## Where Logo Appears

Your logo (text or image) automatically shows on:

✅ **Navigation bar** (top of every page)
✅ **Footer** (bottom of every page)
✅ **Email templates** (in the email header - currently text only)
✅ **Admin dashboard**

## Logo Best Practices

### For Lash Businesses:

1. **Keep it feminine and elegant**
   - Cursive or serif fonts
   - Soft, rounded shapes
   - Beauty industry aesthetics

2. **Colors**:
   - Match your seasonal themes OR
   - Use neutral colors (black, white, gold) that work with all themes

3. **Include**:
   - Business name clearly
   - Optional: small tagline or icon
   - Keep it simple - avoid clutter

4. **Avoid**:
   - Too many colors (2-3 max)
   - Tiny details that disappear when small
   - Complex fonts that are hard to read

## Switching Between Text and Image

You can switch anytime:
- Start with text, upload image later
- Remove image, go back to text
- Test both to see what looks better
- No code changes needed!

## Technical Details

- **Storage**: Logos are saved to `/public/uploads/logo/`
- **Naming**: Auto-generated with timestamp (logo-1234567890.png)
- **Loading**: Logos load dynamically from settings.json
- **Fallback**: If image fails to load, shows text logo
- **Performance**: Images are optimized and cached by browser

## Troubleshooting

**Logo not appearing?**
- Check file size (must be under 2MB)
- Verify file format (PNG, JPG, SVG, WebP only)
- Make sure you clicked "Save Changes"
- Refresh your browser (Ctrl+F5)

**Logo too big/small?**
- Text logos: Adjust by changing theme if needed (all themes use same size)
- Image logos: Re-export at different dimensions (200x60px recommended)

**Logo quality poor?**
- Export at 2x dimensions for PNG (400x120px)
- Use SVG for perfect quality at any size
- Check original file quality

---

**Your logo is your brand identity - make it beautiful! 💫**

