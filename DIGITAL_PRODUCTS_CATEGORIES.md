# Digital Products Categories

## Overview

Digital products now support categories for better organization and filtering. Customers can browse products by category, making it easier to find what they're looking for.

## Features

### 1. Category Filtering
- Category filter buttons at the top of the shop page
- "All Products" button to show everything
- Click any category to filter products
- Works for both digital and physical products

### 2. Product Organization
- Products are automatically separated into:
  - **Digital Products** section (with 📥 icon)
  - **Physical Products** section (with 📦 icon)
- Categories are shown as badges on product cards
- Digital products have a special "Digital" badge

### 3. Category Display
- Category badges appear on product cards
- Categories are sorted alphabetically
- Empty categories are automatically hidden

## How to Use Categories

### For Admins

When creating/editing a product, add a `category` field:

```json
{
  "id": "product-123",
  "name": "Lash Care Guide PDF",
  "type": "digital",
  "category": "Guides",
  "price": 500,
  "downloadUrl": "https://...",
  "downloadFileName": "LashCareGuide.pdf"
}
```

### Example Categories

- **Guides**: How-to guides, tutorials, instruction manuals
- **Templates**: Design templates, planning sheets
- **Tutorials**: Video tutorials, step-by-step courses
- **Resources**: Checklists, worksheets, reference materials
- **E-books**: Digital books, comprehensive guides

## Product Structure

```typescript
interface Product {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  type?: 'physical' | 'digital'
  category?: string  // NEW: Category for filtering
  downloadUrl?: string
  downloadFileName?: string
  // ... other fields
}
```

## UI Features

### Category Filter Buttons
- Located at the top of the shop page
- Styled with brown theme
- Active category is highlighted
- Smooth transitions

### Product Cards
- Category badge in top-left corner
- Digital badge in top-right corner (for digital products)
- Clear visual distinction between product types

### Sections
- Digital products shown first (if any)
- Physical products shown below
- Each section has its own heading
- Category name shown in section heading when filtered

## Benefits

1. **Better Organization**: Products grouped by category
2. **Easy Navigation**: Quick filtering by category
3. **Visual Clarity**: Clear badges and sections
4. **Flexible**: Works for both digital and physical products
5. **User-Friendly**: Intuitive filtering system

## Next Steps

1. **Add Categories**: Set categories for your digital products
2. **Test Filtering**: Try filtering by different categories
3. **Organize Products**: Group related products under same category

## Example Setup

```json
{
  "products": [
    {
      "id": "guide-1",
      "name": "Complete Lash Care Guide",
      "type": "digital",
      "category": "Guides",
      "price": 500,
      "downloadUrl": "https://..."
    },
    {
      "id": "template-1",
      "name": "Lash Mapping Template",
      "type": "digital",
      "category": "Templates",
      "price": 300,
      "downloadUrl": "https://..."
    },
    {
      "id": "tutorial-1",
      "name": "Volume Lash Tutorial",
      "type": "digital",
      "category": "Tutorials",
      "price": 800,
      "downloadUrl": "https://..."
    }
  ]
}
```

