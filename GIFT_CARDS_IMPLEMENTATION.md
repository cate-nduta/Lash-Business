# Gift Cards/Vouchers Implementation Guide

## Overview
A complete gift card system has been implemented for LashDiary, allowing customers to purchase digital gift cards that can be redeemed during booking.

## Features Implemented

### 1. **Public Gift Card Purchase Page** (`/gift-cards`)
- Customers can purchase gift cards with preset or custom amounts
- Configurable minimum/maximum amounts
- Optional recipient information (name, email, personal message)
- Gift card codes are automatically generated (12-character format: XXXX-XXXX-XXXX)
- Email notifications sent to purchaser and recipient (if provided)

### 2. **Admin Management** (`/admin/gift-cards`)
- View all gift cards with filtering and search
- Manage gift card settings:
  - Enable/disable gift cards
  - Set minimum/maximum amounts
  - Configure default preset amounts
  - Set expiration period (default: 365 days)
  - Allow/disallow custom amounts
- Track gift card status: Active, Redeemed, Expired, Cancelled
- View purchase history and redemption details

### 3. **Gift Card Redemption** (To be integrated in booking flow)
- Gift cards can be validated and redeemed during booking
- Partial redemption supported (remaining balance stays on card)
- Automatic status updates when fully redeemed

### 4. **Data Structure**
- Gift cards stored in `data/gift-cards.json`
- Each card includes:
  - Unique code
  - Original and current balance
  - Purchaser information
  - Optional recipient information
  - Purchase and expiration dates
  - Redemption history

## How to Use

### For Customers:
1. Visit `/gift-cards` page
2. Select or enter an amount
3. Fill in purchaser information
4. Optionally add recipient details
5. Complete purchase
6. Receive gift card code via email
7. Use code during booking to redeem

### For Admin:
1. Go to Admin Dashboard → Gift Cards
2. Configure settings (amounts, expiration, etc.)
3. View all gift cards and their status
4. Search and filter by status, code, or customer
5. Monitor redemptions and balances

## Future Expansion Ideas

### Additional Services You Can Add:
1. **Lash Care Products**
   - Lash cleansers
   - Brushes and spoolies
   - Lash serums
   - Aftercare kits

2. **Service Packages**
   - Multi-appointment packages
   - VIP membership tiers
   - Monthly subscription plans

3. **Add-On Services**
   - Lash tinting
   - Brow services
   - Lash lift
   - Consultation sessions

4. **Merchandise**
   - Branded items
   - Gift sets
   - Accessories

### How to Edit/Expand:
- **Add new services**: Edit `data/services.json` via Admin Dashboard → Services
- **Add products**: Use Admin Dashboard → Shop
- **Modify gift card settings**: Admin Dashboard → Gift Cards → Settings
- **Customize amounts**: Edit default amounts in gift card settings
- **Change expiration**: Update expiration days in settings

## Integration Points

### Payment Integration:
- Gift cards can be purchased via existing payment methods (M-Pesa, Card)
- Redemption happens during booking checkout

### Email Integration:
- Purchase confirmation emails
- Gift card delivery to recipient
- Redemption notifications

### Booking Integration:
- Gift card redemption field in booking form (to be added)
- Automatic balance deduction
- Remaining balance tracking

## Technical Details

### API Endpoints:
- `GET /api/gift-cards` - Public settings
- `POST /api/gift-cards/purchase` - Create gift card
- `POST /api/gift-cards/validate` - Validate code
- `POST /api/gift-cards/redeem` - Redeem gift card
- `GET /api/admin/gift-cards` - Admin view
- `POST /api/admin/gift-cards` - Admin management

### Files Created:
- `data/gift-cards.json` - Data storage
- `lib/gift-card-utils.ts` - Utility functions
- `app/gift-cards/page.tsx` - Public purchase page
- `app/admin/gift-cards/page.tsx` - Admin management
- API routes for all operations

## Next Steps

1. **Add to Navigation**: Add "Gift Cards" link to main navigation
2. **Integrate with Booking**: Add gift card redemption field in booking form
3. **Email Templates**: Create purchase and redemption email templates
4. **Payment Processing**: Connect gift card purchase to payment system
5. **Analytics**: Track gift card sales and redemption rates

## Revenue Opportunities

- **Prepaid Revenue**: Customers pay upfront for future services
- **Gift Purchases**: Others buying for clients increases customer base
- **Upselling**: Encourage higher-value gift cards
- **Customer Retention**: Gift cards ensure return visits

