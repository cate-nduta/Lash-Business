import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'

// Search index for all admin panel content
interface SearchItem {
  id: string
  title: string
  description: string
  panel: string
  panelHref: string
  location: string
  keywords: string[]
  category: 'panel' | 'feature' | 'workflow' | 'setting'
}

const searchIndex: SearchItem[] = [
  // Analytics & Reports
  {
    id: 'analytics-revenue',
    title: 'Total Revenue',
    description: 'View total revenue from all paid bookings',
    panel: 'Analytics & Reports',
    panelHref: '/admin/analytics',
    location: 'Summary Cards - Total Revenue card',
    keywords: ['revenue', 'income', 'money', 'earnings', 'sales', 'total revenue'],
    category: 'feature'
  },
  {
    id: 'analytics-taxes',
    title: 'Taxes Calculation',
    description: 'View calculated taxes based on profit',
    panel: 'Analytics & Reports',
    panelHref: '/admin/analytics',
    location: 'Summary Cards - Total Taxes card, Detailed Stats Table - Taxes column',
    keywords: ['tax', 'taxes', 'vat', 'tax percentage', 'tax calculation'],
    category: 'feature'
  },
  {
    id: 'analytics-savings',
    title: 'Savings',
    description: 'View savings after expenses and taxes',
    panel: 'Analytics & Reports',
    panelHref: '/admin/analytics',
    location: 'Summary Cards - Savings card, Detailed Stats Table - Savings column',
    keywords: ['savings', 'net', 'profit after tax', 'remaining'],
    category: 'feature'
  },
  {
    id: 'analytics-profit',
    title: 'Net Profit',
    description: 'View profit (revenue minus expenses)',
    panel: 'Analytics & Reports',
    panelHref: '/admin/analytics',
    location: 'Summary Cards - Net Profit card, Detailed Stats Table - Profit column',
    keywords: ['profit', 'net profit', 'earnings', 'income'],
    category: 'feature'
  },
  {
    id: 'analytics-expenses',
    title: 'Total Expenses',
    description: 'View all business expenses',
    panel: 'Analytics & Reports',
    panelHref: '/admin/analytics',
    location: 'Summary Cards - Total Expenses card, Detailed Stats Table - Expenses column',
    keywords: ['expenses', 'costs', 'spending', 'outgoings'],
    category: 'feature'
  },
  {
    id: 'analytics-date-range',
    title: 'Date Range Filter',
    description: 'Filter analytics by date range',
    panel: 'Analytics & Reports',
    panelHref: '/admin/analytics',
    location: 'Date Range Selector - Start Date and End Date fields',
    keywords: ['date range', 'filter dates', 'start date', 'end date', 'period'],
    category: 'feature'
  },
  {
    id: 'analytics-period',
    title: 'Period View',
    description: 'View analytics by day, week, month, or year',
    panel: 'Analytics & Reports',
    panelHref: '/admin/analytics',
    location: 'Period Selector - Daily, Weekly, Monthly, Yearly buttons',
    keywords: ['daily', 'weekly', 'monthly', 'yearly', 'period', 'breakdown'],
    category: 'feature'
  },

  // Bookings
  {
    id: 'bookings-mark-paid',
    title: 'Mark Booking as Paid',
    description: 'Record payment for a booking',
    panel: 'Bookings',
    panelHref: '/admin/bookings',
    location: 'Booking Details Modal - Mark as Paid section',
    keywords: ['mark paid', 'payment', 'record payment', 'cash payment', 'card payment', 'paid'],
    category: 'workflow'
  },
  {
    id: 'bookings-cancel',
    title: 'Cancel Booking',
    description: 'Cancel a booking and handle refunds',
    panel: 'Bookings',
    panelHref: '/admin/bookings',
    location: 'Booking Details Modal - Cancel Booking button',
    keywords: ['cancel', 'cancellation', 'refund', 'cancel booking'],
    category: 'workflow'
  },
  {
    id: 'bookings-reschedule',
    title: 'Reschedule Booking',
    description: 'Change booking date and time',
    panel: 'Bookings',
    panelHref: '/admin/bookings',
    location: 'Booking Details Modal - Reschedule Booking button',
    keywords: ['reschedule', 'change date', 'change time', 'move appointment'],
    category: 'workflow'
  },
  {
    id: 'bookings-testimonial',
    title: 'Send Testimonial Request',
    description: 'Request feedback from clients',
    panel: 'Bookings',
    panelHref: '/admin/bookings',
    location: 'Booking Details Modal - Testimonial Request section',
    keywords: ['testimonial', 'review', 'feedback', 'client feedback'],
    category: 'workflow'
  },
  {
    id: 'bookings-send-payment',
    title: 'Send Payment Request',
    description: 'Send M-Pesa payment request for balance',
    panel: 'Bookings',
    panelHref: '/admin/bookings',
    location: 'Booking Details Modal - Send Payment Request button',
    keywords: ['payment request', 'mpesa', 'send payment', 'balance payment'],
    category: 'workflow'
  },
  {
    id: 'bookings-filter',
    title: 'Filter Bookings',
    description: 'Filter bookings by date, status, or search',
    panel: 'Bookings',
    panelHref: '/admin/bookings',
    location: 'Bookings page - Filter and search controls',
    keywords: ['filter', 'search bookings', 'find booking', 'date filter'],
    category: 'feature'
  },
  {
    id: 'bookings-calendar',
    title: 'Booking Calendar View',
    description: 'View bookings in calendar format',
    panel: 'Bookings',
    panelHref: '/admin/bookings',
    location: 'Bookings page - Calendar view tab',
    keywords: ['calendar', 'calendar view', 'monthly view', 'date view'],
    category: 'feature'
  },
  {
    id: 'bookings-fully-booked',
    title: 'Mark Dates as Fully Booked',
    description: 'Block dates from accepting new bookings',
    panel: 'Bookings',
    panelHref: '/admin/bookings',
    location: 'Bookings page - Fully Booked Dates section',
    keywords: ['fully booked', 'block date', 'unavailable', 'closed'],
    category: 'feature'
  },

  // Services
  {
    id: 'services-add',
    title: 'Add New Service',
    description: 'Create a new service with pricing',
    panel: 'Service Prices',
    panelHref: '/admin/services',
    location: 'Services page - Add Service button in category',
    keywords: ['add service', 'new service', 'create service', 'service pricing'],
    category: 'workflow'
  },
  {
    id: 'services-edit',
    title: 'Edit Service',
    description: 'Update service name, price, or duration',
    panel: 'Service Prices',
    panelHref: '/admin/services',
    location: 'Services page - Service form fields',
    keywords: ['edit service', 'update service', 'change price', 'modify service'],
    category: 'workflow'
  },
  {
    id: 'services-category',
    title: 'Manage Categories',
    description: 'Create or edit service categories',
    panel: 'Service Prices',
    panelHref: '/admin/services',
    location: 'Services page - Category management',
    keywords: ['category', 'service category', 'add category', 'edit category'],
    category: 'workflow'
  },
  {
    id: 'services-price',
    title: 'Service Pricing',
    description: 'Set KES and USD prices for services',
    panel: 'Service Prices',
    panelHref: '/admin/services',
    location: 'Services page - Price fields (KES and USD)',
    keywords: ['price', 'pricing', 'cost', 'service cost', 'kes price', 'usd price'],
    category: 'feature'
  },
  {
    id: 'services-duration',
    title: 'Service Duration',
    description: 'Set how long a service takes',
    panel: 'Service Prices',
    panelHref: '/admin/services',
    location: 'Services page - Duration field',
    keywords: ['duration', 'time', 'length', 'how long', 'minutes'],
    category: 'feature'
  },

  // Expenses
  {
    id: 'expenses-add',
    title: 'Add Expense',
    description: 'Record a business expense',
    panel: 'Expenses',
    panelHref: '/admin/expenses',
    location: 'Expenses page - Add Expense form',
    keywords: ['add expense', 'record expense', 'new expense', 'expense entry'],
    category: 'workflow'
  },
  {
    id: 'expenses-category',
    title: 'Expense Categories',
    description: 'Categorize expenses (Supplies, Rent, Marketing, etc.)',
    panel: 'Expenses',
    panelHref: '/admin/expenses',
    location: 'Expenses page - Category dropdown',
    keywords: ['category', 'expense category', 'supplies', 'rent', 'marketing'],
    category: 'feature'
  },
  {
    id: 'expenses-receipt',
    title: 'Upload Receipt',
    description: 'Attach receipt image or PDF to expense',
    panel: 'Expenses',
    panelHref: '/admin/expenses',
    location: 'Expenses page - Receipt upload field',
    keywords: ['receipt', 'upload receipt', 'proof', 'invoice'],
    category: 'feature'
  },
  {
    id: 'expenses-recurring',
    title: 'Recurring Expenses',
    description: 'Mark expenses as recurring (weekly, monthly, etc.)',
    panel: 'Expenses',
    panelHref: '/admin/expenses',
    location: 'Expenses page - Recurring expense checkbox',
    keywords: ['recurring', 'repeating', 'monthly expense', 'weekly expense'],
    category: 'feature'
  },
  {
    id: 'expenses-budget',
    title: 'Set Budgets',
    description: 'Set monthly budget limits by category',
    panel: 'Expenses',
    panelHref: '/admin/expenses',
    location: 'Expenses page - Set Budgets button',
    keywords: ['budget', 'budget limit', 'spending limit', 'budget alert'],
    category: 'feature'
  },
  {
    id: 'expenses-filter',
    title: 'Filter Expenses',
    description: 'Filter by category, status, payment method, or period',
    panel: 'Expenses',
    panelHref: '/admin/expenses',
    location: 'Expenses page - Filter controls',
    keywords: ['filter expenses', 'search expenses', 'filter by category'],
    category: 'feature'
  },
  {
    id: 'expenses-export',
    title: 'Export Expenses',
    description: 'Export expenses to CSV file',
    panel: 'Expenses',
    panelHref: '/admin/expenses',
    location: 'Expenses page - Export to CSV button',
    keywords: ['export', 'csv', 'download', 'export expenses'],
    category: 'feature'
  },

  // Settings
  {
    id: 'settings-tax',
    title: 'Tax Percentage',
    description: 'Set tax percentage for analytics calculations',
    panel: 'Settings',
    panelHref: '/admin/settings',
    location: 'Settings page - Business Information - Tax Percentage field',
    keywords: ['tax', 'tax percentage', 'vat', 'tax rate', 'tax setting'],
    category: 'setting'
  },
  {
    id: 'settings-business',
    title: 'Business Information',
    description: 'Update business name, phone, email, address',
    panel: 'Settings',
    panelHref: '/admin/settings',
    location: 'Settings page - Business Information section',
    keywords: ['business name', 'phone', 'email', 'address', 'business info'],
    category: 'setting'
  },
  {
    id: 'settings-logo',
    title: 'Logo Settings',
    description: 'Upload logo image or set text logo',
    panel: 'Settings',
    panelHref: '/admin/settings',
    location: 'Settings page - Logo Settings section',
    keywords: ['logo', 'upload logo', 'logo image', 'logo text'],
    category: 'setting'
  },
  {
    id: 'settings-password',
    title: 'Change Password',
    description: 'Update admin account password',
    panel: 'Settings',
    panelHref: '/admin/settings',
    location: 'Settings page - Change Password button',
    keywords: ['password', 'change password', 'update password', 'reset password'],
    category: 'setting'
  },
  {
    id: 'settings-social',
    title: 'Social Media Links',
    description: 'Update Instagram, Facebook, TikTok, Twitter links',
    panel: 'Settings',
    panelHref: '/admin/settings',
    location: 'Settings page - Social Media Links section',
    keywords: ['social media', 'instagram', 'facebook', 'tiktok', 'twitter'],
    category: 'setting'
  },

  // Promo Codes
  {
    id: 'promo-create',
    title: 'Create Promo Code',
    description: 'Create a new promotional discount code',
    panel: 'Promo Codes',
    panelHref: '/admin/promo-codes',
    location: 'Promo Codes page - Add New Promo Code button',
    keywords: ['promo code', 'create promo', 'discount code', 'coupon'],
    category: 'workflow'
  },
  {
    id: 'promo-discount',
    title: 'Discount Settings',
    description: 'Set percentage or fixed amount discount',
    panel: 'Promo Codes',
    panelHref: '/admin/promo-codes',
    location: 'Promo Codes page - Discount Type and Value fields',
    keywords: ['discount', 'percentage', 'fixed amount', 'discount value'],
    category: 'feature'
  },
  {
    id: 'promo-validity',
    title: 'Promo Code Validity',
    description: 'Set start and end dates for promo codes',
    panel: 'Promo Codes',
    panelHref: '/admin/promo-codes',
    location: 'Promo Codes page - Valid From and Valid Until fields',
    keywords: ['valid from', 'valid until', 'expiry', 'expiration date'],
    category: 'feature'
  },
  {
    id: 'promo-limit',
    title: 'Usage Limit',
    description: 'Set how many times a promo code can be used',
    panel: 'Promo Codes',
    panelHref: '/admin/promo-codes',
    location: 'Promo Codes page - Usage Limit field',
    keywords: ['usage limit', 'use limit', 'max uses', 'usage count'],
    category: 'feature'
  },
  {
    id: 'promo-referral',
    title: 'Referral Promo Codes',
    description: 'Create referral codes for partners',
    panel: 'Promo Codes',
    panelHref: '/admin/promo-codes',
    location: 'Promo Codes page - Referral code settings',
    keywords: ['referral', 'referral code', 'partner code', 'salon referral'],
    category: 'feature'
  },

  // Availability
  {
    id: 'availability-hours',
    title: 'Business Hours',
    description: 'Set opening and closing times for each day',
    panel: 'Availability & Hours',
    panelHref: '/admin/availability',
    location: 'Availability page - Business Hours section',
    keywords: ['business hours', 'opening hours', 'closing time', 'open time'],
    category: 'setting'
  },
  {
    id: 'availability-slots',
    title: 'Time Slots',
    description: 'Configure available time slots for bookings',
    panel: 'Availability & Hours',
    panelHref: '/admin/availability',
    location: 'Availability page - Time Slots section',
    keywords: ['time slots', 'appointment times', 'available times', 'booking slots'],
    category: 'setting'
  },
  {
    id: 'availability-window',
    title: 'Booking Window',
    description: 'Set when clients can book appointments',
    panel: 'Availability & Hours',
    panelHref: '/admin/availability',
    location: 'Availability page - Booking Window section',
    keywords: ['booking window', 'booking period', 'booking dates', 'availability window'],
    category: 'setting'
  },
  {
    id: 'availability-saturday',
    title: 'Saturday Availability',
    description: 'Enable or disable Saturday bookings',
    panel: 'Availability & Hours',
    panelHref: '/admin/availability',
    location: 'Availability page - Saturday settings',
    keywords: ['saturday', 'weekend', 'saturday hours'],
    category: 'setting'
  },

  // Gallery
  {
    id: 'gallery-upload',
    title: 'Upload Gallery Image',
    description: 'Add new images to the public gallery',
    panel: 'Gallery Management',
    panelHref: '/admin/gallery',
    location: 'Gallery page - Upload New Image button',
    keywords: ['upload image', 'add image', 'gallery image', 'upload photo'],
    category: 'workflow'
  },
  {
    id: 'gallery-edit',
    title: 'Edit Gallery Image',
    description: 'Update image name or remove image',
    panel: 'Gallery Management',
    panelHref: '/admin/gallery',
    location: 'Gallery page - Image edit controls',
    keywords: ['edit image', 'remove image', 'delete image', 'update image'],
    category: 'workflow'
  },

  // Shop
  {
    id: 'shop-add-product',
    title: 'Add Shop Product',
    description: 'Create a new product for the online shop',
    panel: 'Shop',
    panelHref: '/admin/shop',
    location: 'Shop page - Add New Product button',
    keywords: ['add product', 'new product', 'create product', 'shop product'],
    category: 'workflow'
  },
  {
    id: 'shop-edit-product',
    title: 'Edit Product',
    description: 'Update product details, price, or stock',
    panel: 'Shop',
    panelHref: '/admin/shop',
    location: 'Shop page - Product edit form',
    keywords: ['edit product', 'update product', 'change price', 'stock'],
    category: 'workflow'
  },
  {
    id: 'shop-images',
    title: 'Product Images',
    description: 'Upload up to 3 images per product',
    panel: 'Shop',
    panelHref: '/admin/shop',
    location: 'Shop page - Product image upload',
    keywords: ['product image', 'upload image', 'product photo'],
    category: 'feature'
  },
  {
    id: 'shop-orders',
    title: 'View Orders',
    description: 'See all shop orders and their status',
    panel: 'Shop',
    panelHref: '/admin/shop',
    location: 'Shop page - Orders tab',
    keywords: ['orders', 'shop orders', 'purchases', 'order status'],
    category: 'feature'
  },
  {
    id: 'shop-shipping',
    title: 'Shipping Settings',
    description: 'Set transportation fee and pickup location',
    panel: 'Shop',
    panelHref: '/admin/shop',
    location: 'Shop page - Shipping Settings section',
    keywords: ['shipping', 'transportation', 'pickup', 'delivery', 'fee'],
    category: 'setting'
  },

  // Homepage
  {
    id: 'homepage-hero',
    title: 'Hero Section',
    description: 'Edit homepage hero title and subtitle',
    panel: 'Homepage Content',
    panelHref: '/admin/homepage',
    location: 'Homepage page - Hero Section',
    keywords: ['hero', 'title', 'subtitle', 'homepage hero', 'main title'],
    category: 'setting'
  },
  {
    id: 'homepage-intro',
    title: 'Intro Section',
    description: 'Edit introduction text and features',
    panel: 'Homepage Content',
    panelHref: '/admin/homepage',
    location: 'Homepage page - Intro Section',
    keywords: ['intro', 'introduction', 'features', 'about'],
    category: 'setting'
  },
  {
    id: 'homepage-artist',
    title: 'Meet Artist Section',
    description: 'Update artist bio and photo',
    panel: 'Homepage Content',
    panelHref: '/admin/homepage',
    location: 'Homepage page - Meet Artist Section',
    keywords: ['artist', 'bio', 'about artist', 'meet artist'],
    category: 'setting'
  },
  {
    id: 'homepage-studio',
    title: 'Our Studio Section',
    description: 'Edit studio description and images',
    panel: 'Homepage Content',
    panelHref: '/admin/homepage',
    location: 'Homepage page - Our Studio Section',
    keywords: ['studio', 'studio images', 'location', 'space'],
    category: 'setting'
  },
  {
    id: 'homepage-massage',
    title: 'Tsuboki Massage Section',
    description: 'Configure complimentary massage information',
    panel: 'Homepage Content',
    panelHref: '/admin/homepage',
    location: 'Homepage page - Tsuboki Massage Section',
    keywords: ['massage', 'tsuboki', 'facial massage', 'complimentary'],
    category: 'setting'
  },
  {
    id: 'homepage-banner',
    title: 'Countdown Banner',
    description: 'Set up event countdown banner',
    panel: 'Homepage Content',
    panelHref: '/admin/homepage',
    location: 'Homepage page - Countdown Banner Section',
    keywords: ['banner', 'countdown', 'event', 'promotion banner'],
    category: 'setting'
  },

  // Discounts
  {
    id: 'discounts-first-time',
    title: 'First-Time Client Discount',
    description: 'Configure automatic discount for first-time clients',
    panel: 'Discounts',
    panelHref: '/admin/discounts',
    location: 'Discounts page - First-Time Client Discount section',
    keywords: ['first time', 'first-time discount', 'new client', 'welcome discount'],
    category: 'setting'
  },
  {
    id: 'discounts-returning',
    title: 'Returning Client Discount',
    description: 'Set loyalty discounts for returning clients',
    panel: 'Discounts',
    panelHref: '/admin/discounts',
    location: 'Discounts page - Returning Client Discount section',
    keywords: ['returning', 'loyalty', 'returning discount', 'repeat client'],
    category: 'setting'
  },
  {
    id: 'discounts-deposit',
    title: 'Deposit Percentage',
    description: 'Set required deposit percentage for bookings',
    panel: 'Discounts',
    panelHref: '/admin/discounts',
    location: 'Discounts page - Deposit Percentage field',
    keywords: ['deposit', 'deposit percentage', 'booking deposit', 'down payment'],
    category: 'setting'
  },

  // Policies
  {
    id: 'policies-cancellation',
    title: 'Cancellation Policy',
    description: 'Set cancellation window and refund rules',
    panel: 'Client Policies',
    panelHref: '/admin/policies',
    location: 'Policies page - Cancellation Policy section',
    keywords: ['cancellation', 'cancellation policy', 'refund', 'cancel window'],
    category: 'setting'
  },
  {
    id: 'policies-deposit',
    title: 'Deposit Policy',
    description: 'Configure deposit requirements and rules',
    panel: 'Client Policies',
    panelHref: '/admin/policies',
    location: 'Policies page - Deposit Policy section',
    keywords: ['deposit policy', 'deposit rules', 'booking deposit'],
    category: 'setting'
  },
  {
    id: 'policies-referral',
    title: 'Referral Policy',
    description: 'Set referral discount rules',
    panel: 'Client Policies',
    panelHref: '/admin/policies',
    location: 'Policies page - Referral Policy section',
    keywords: ['referral', 'referral policy', 'referral discount'],
    category: 'setting'
  },

  // Contact
  {
    id: 'contact-phone',
    title: 'Update Phone Number',
    description: 'Change business phone number',
    panel: 'Contact Information',
    panelHref: '/admin/contact',
    location: 'Contact page - Phone Number field',
    keywords: ['phone', 'phone number', 'contact number', 'telephone'],
    category: 'setting'
  },
  {
    id: 'contact-email',
    title: 'Update Email',
    description: 'Change business email address',
    panel: 'Contact Information',
    panelHref: '/admin/contact',
    location: 'Contact page - Email Address field',
    keywords: ['email', 'email address', 'contact email'],
    category: 'setting'
  },
  {
    id: 'contact-location',
    title: 'Update Location',
    description: 'Change studio location address',
    panel: 'Contact Information',
    panelHref: '/admin/contact',
    location: 'Contact page - Location field',
    keywords: ['location', 'address', 'studio location', 'where'],
    category: 'setting'
  },
  {
    id: 'contact-social',
    title: 'Update Social Media',
    description: 'Change Instagram, Facebook, TikTok links',
    panel: 'Contact Information',
    panelHref: '/admin/contact',
    location: 'Contact page - Social Media fields',
    keywords: ['social media', 'instagram', 'facebook', 'tiktok'],
    category: 'setting'
  },

  // Testimonials
  {
    id: 'testimonials-approve',
    title: 'Approve Testimonial',
    description: 'Review and publish client testimonials',
    panel: 'Testimonials',
    panelHref: '/admin/testimonials',
    location: 'Testimonials page - Approve button',
    keywords: ['approve', 'testimonial', 'review', 'publish testimonial'],
    category: 'workflow'
  },
  {
    id: 'testimonials-reject',
    title: 'Reject Testimonial',
    description: 'Remove unwanted testimonials',
    panel: 'Testimonials',
    panelHref: '/admin/testimonials',
    location: 'Testimonials page - Reject button',
    keywords: ['reject', 'remove testimonial', 'delete testimonial'],
    category: 'workflow'
  },

  // Email Marketing
  {
    id: 'email-campaign',
    title: 'Send Email Campaign',
    description: 'Send marketing emails to subscribers',
    panel: 'Email Marketing',
    panelHref: '/admin/email-marketing',
    location: 'Email Marketing page - Create Campaign',
    keywords: ['email campaign', 'send email', 'newsletter', 'marketing email'],
    category: 'workflow'
  },
  {
    id: 'email-subscribers',
    title: 'Manage Subscribers',
    description: 'View and manage email subscribers',
    panel: 'Email Marketing',
    panelHref: '/admin/email-marketing',
    location: 'Email Marketing page - Subscribers section',
    keywords: ['subscribers', 'email list', 'subscriber list'],
    category: 'feature'
  },
  {
    id: 'email-analytics',
    title: 'Email Analytics',
    description: 'Track email opens and clicks',
    panel: 'Email Marketing',
    panelHref: '/admin/email-marketing',
    location: 'Email Marketing page - Analytics section',
    keywords: ['email analytics', 'opens', 'clicks', 'engagement'],
    category: 'feature'
  },

  // Calendar
  {
    id: 'calendar-view',
    title: 'Calendar View',
    description: 'View all bookings in calendar format',
    panel: 'Calendar',
    panelHref: '/admin/calendar',
    location: 'Calendar page - Monthly calendar view',
    keywords: ['calendar', 'calendar view', 'monthly calendar', 'bookings calendar'],
    category: 'feature'
  },
  {
    id: 'calendar-sync',
    title: 'Google Calendar Sync',
    description: 'View bookings synced with Google Calendar',
    panel: 'Calendar',
    panelHref: '/admin/calendar',
    location: 'Calendar page - Synced events',
    keywords: ['google calendar', 'sync', 'calendar sync', 'google sync'],
    category: 'feature'
  },

  // Theme
  {
    id: 'theme-select',
    title: 'Select Theme',
    description: 'Choose seasonal or custom theme colors',
    panel: 'Seasonal Themes',
    panelHref: '/admin/theme',
    location: 'Theme page - Theme selector',
    keywords: ['theme', 'colors', 'seasonal theme', 'website colors'],
    category: 'setting'
  },
  {
    id: 'theme-custom',
    title: 'Custom Theme',
    description: 'Create custom color theme',
    panel: 'Seasonal Themes',
    panelHref: '/admin/theme',
    location: 'Theme page - Custom Theme section',
    keywords: ['custom theme', 'custom colors', 'color picker'],
    category: 'setting'
  },

  // Terms
  {
    id: 'terms-edit',
    title: 'Edit Terms & Conditions',
    description: 'Update client agreement text',
    panel: 'Terms & Conditions',
    panelHref: '/admin/terms',
    location: 'Terms page - Terms editor',
    keywords: ['terms', 'terms and conditions', 'agreement', 'client agreement'],
    category: 'setting'
  },

  // Social Media Calendar
  {
    id: 'social-schedule',
    title: 'Schedule Post',
    description: 'Schedule Instagram or TikTok posts',
    panel: 'Social Media Calendar',
    panelHref: '/admin/social-media-calendar',
    location: 'Social Media Calendar page - Schedule Post',
    keywords: ['schedule post', 'instagram', 'tiktok', 'social media', 'schedule'],
    category: 'workflow'
  },
  {
    id: 'social-calendar',
    title: 'Content Calendar',
    description: 'View scheduled posts in calendar',
    panel: 'Social Media Calendar',
    panelHref: '/admin/social-media-calendar',
    location: 'Social Media Calendar page - Calendar view',
    keywords: ['content calendar', 'post calendar', 'scheduled posts'],
    category: 'feature'
  },

  // Referrals Tracking
  {
    id: 'referrals-view',
    title: 'View Referrals',
    description: 'See all partner referral bookings',
    panel: 'Referrals Tracking',
    panelHref: '/admin/referrals-tracking',
    location: 'Referrals Tracking page - Referrals list',
    keywords: ['referrals', 'partner referrals', 'referral bookings'],
    category: 'feature'
  },
  {
    id: 'referrals-commission',
    title: 'Commission Tracking',
    description: 'Track and pay partner commissions',
    panel: 'Referrals Tracking',
    panelHref: '/admin/referrals-tracking',
    location: 'Referrals Tracking page - Commission section',
    keywords: ['commission', 'commission payout', 'partner commission'],
    category: 'feature'
  },
  {
    id: 'referrals-mark-paid',
    title: 'Mark Commission as Paid',
    description: 'Record commission payments to partners',
    panel: 'Referrals Tracking',
    panelHref: '/admin/referrals-tracking',
    location: 'Referrals Tracking page - Mark as paid button',
    keywords: ['mark paid', 'commission paid', 'pay commission'],
    category: 'workflow'
  },

  // Partner Onboarding
  {
    id: 'partner-send',
    title: 'Send Partner Agreement',
    description: 'Onboard new salon or influencer partners',
    panel: 'Partner Onboarding',
    panelHref: '/admin/partner-onboarding',
    location: 'Partner Onboarding page - Send Agreement form',
    keywords: ['partner', 'partner agreement', 'salon partner', 'influencer'],
    category: 'workflow'
  },
  {
    id: 'partner-type',
    title: 'Partner Type',
    description: 'Select salon, beautician, or influencer',
    panel: 'Partner Onboarding',
    panelHref: '/admin/partner-onboarding',
    location: 'Partner Onboarding page - Partner Type selector',
    keywords: ['partner type', 'salon', 'beautician', 'influencer'],
    category: 'feature'
  },

  // Newsletters
  {
    id: 'newsletter-upload',
    title: 'Upload Newsletter PDF',
    description: 'Upload Canva newsletter PDF',
    panel: 'Newsletters',
    panelHref: '/admin/newsletters',
    location: 'Newsletters page - Upload Newsletter',
    keywords: ['newsletter', 'upload newsletter', 'pdf newsletter', 'canva'],
    category: 'workflow'
  },

  // Manage Admins
  {
    id: 'admins-add',
    title: 'Add Admin User',
    description: 'Invite new admin user (Owner Only)',
    panel: 'Manage Admins',
    panelHref: '/admin/manage-admins',
    location: 'Manage Admins page - Add Admin form',
    keywords: ['add admin', 'new admin', 'invite admin', 'admin user'],
    category: 'workflow'
  },
  {
    id: 'admins-remove',
    title: 'Remove Admin',
    description: 'Remove admin user access (Owner Only)',
    panel: 'Manage Admins',
    panelHref: '/admin/manage-admins',
    location: 'Manage Admins page - Remove button',
    keywords: ['remove admin', 'delete admin', 'revoke access'],
    category: 'workflow'
  },

  // Activity
  {
    id: 'activity-log',
    title: 'Activity Log',
    description: 'View all admin actions and changes (Owner Only)',
    panel: 'Recent Activity',
    panelHref: '/admin/activity',
    location: 'Activity page - Activity log list',
    keywords: ['activity', 'activity log', 'admin actions', 'changes', 'history'],
    category: 'feature'
  }
]

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (!query.trim()) {
      return NextResponse.json({ results: [] })
    }

    const queryLower = query.toLowerCase()
    const results = searchIndex
      .filter(item => {
        const matchesTitle = item.title.toLowerCase().includes(queryLower)
        const matchesDescription = item.description.toLowerCase().includes(queryLower)
        const matchesPanel = item.panel.toLowerCase().includes(queryLower)
        const matchesLocation = item.location.toLowerCase().includes(queryLower)
        const matchesKeywords = item.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))
        
        return matchesTitle || matchesDescription || matchesPanel || matchesLocation || matchesKeywords
      })
      .map(item => ({
        ...item,
        relevance: calculateRelevance(item, queryLower)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 20) // Limit to top 20 results

    return NextResponse.json({ results })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error searching:', error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}

function calculateRelevance(item: SearchItem, query: string): number {
  let score = 0
  const queryLower = query.toLowerCase()
  
  // Exact title match gets highest score
  if (item.title.toLowerCase() === queryLower) score += 100
  else if (item.title.toLowerCase().startsWith(queryLower)) score += 50
  else if (item.title.toLowerCase().includes(queryLower)) score += 30
  
  // Panel match
  if (item.panel.toLowerCase().includes(queryLower)) score += 20
  
  // Description match
  if (item.description.toLowerCase().includes(queryLower)) score += 15
  
  // Location match
  if (item.location.toLowerCase().includes(queryLower)) score += 10
  
  // Keyword match
  item.keywords.forEach(keyword => {
    if (keyword.toLowerCase() === queryLower) score += 25
    else if (keyword.toLowerCase().includes(queryLower)) score += 5
  })
  
  return score
}

