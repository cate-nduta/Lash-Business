'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Workflow {
  title: string
  description: string
  panel: string
  panelHref: string
  steps: string[]
  relatedPanels?: string[]
}

export default function AdminWorkflows() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string>('admin')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Unauthorized')
        }

        const data = await response.json()
        if (!isMounted) return

        if (data.authenticated) {
          setAuthenticated(true)
          setUserRole(data.role || 'admin')
        } else {
          setAuthenticated(false)
          router.replace('/admin/login')
        }
      } catch (error) {
        if (!isMounted) return
        setAuthenticated(false)
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  const workflows: Workflow[] = [
    {
      title: 'Mark a Booking as Paid',
      description: 'Record payment for a completed booking',
      panel: 'Bookings',
      panelHref: '/admin/bookings',
      steps: [
        'Go to Bookings panel',
        'Click on a booking to view details',
        'In the booking details modal, find the "Mark as Paid" section',
        'Enter the payment amount',
        'Select payment method (Cash or Card)',
        'Click "Mark as Paid" or "Paid in Card"',
        'The amount will be automatically added to total revenue in Analytics'
      ],
      relatedPanels: ['Analytics & Reports']
    },
    {
      title: 'View Revenue and Analytics',
      description: 'Check business performance and financial metrics',
      panel: 'Analytics & Reports',
      panelHref: '/admin/analytics',
      steps: [
        'Go to Analytics & Reports panel (Owner Only)',
        'Select date range using Start Date and End Date',
        'Choose period view: Daily, Weekly, Monthly, or Yearly',
        'View summary cards: Total Services, Revenue, Expenses, Taxes, Savings, Profit',
        'Review detailed breakdown table',
        'Taxes are calculated from profit (only when profit > 0)',
        'Savings = Revenue - Expenses - Taxes'
      ],
      relatedPanels: ['Bookings', 'Expenses', 'Settings']
    },
    {
      title: 'Add a New Service',
      description: 'Create a new service with pricing and duration',
      panel: 'Service Prices',
      panelHref: '/admin/services',
      steps: [
        'Go to Service Prices panel',
        'Select a category or create a new one',
        'Click "Add Service" button',
        'Enter service name, price (KES), price (USD), and duration',
        'Optionally add description and image URL',
        'Click "Save Changes" at the bottom',
        'Changes appear on the booking page immediately'
      ],
      relatedPanels: ['Bookings']
    },
    {
      title: 'Update Service Prices',
      description: 'Modify existing service pricing',
      panel: 'Service Prices',
      panelHref: '/admin/services',
      steps: [
        'Go to Service Prices panel',
        'Find the service you want to update',
        'Edit the price fields (KES and/or USD)',
        'Optionally update duration or description',
        'Click "Save Changes" at the bottom',
        'You can notify subscribers of price changes'
      ],
      relatedPanels: ['Bookings']
    },
    {
      title: 'Record an Expense',
      description: 'Track business expenses for analytics',
      panel: 'Expenses',
      panelHref: '/admin/expenses',
      steps: [
        'Go to Expenses panel',
        'Fill out the expense form:',
        '  - Select category (Supplies, Rent, Marketing, etc.)',
        '  - Enter amount in KSH',
        '  - Select date',
        '  - Add description',
        '  - Select payment method',
        '  - Enter vendor/supplier name',
        '  - Set status (Paid, Pending, Reimbursed)',
        '  - Optionally upload receipt',
        '  - Mark as recurring if applicable',
        'Click "Add Expense"',
        'Expenses are automatically included in Analytics calculations'
      ],
      relatedPanels: ['Analytics & Reports']
    },
    {
      title: 'Set Tax Percentage',
      description: 'Configure tax rate for analytics calculations',
      panel: 'Settings',
      panelHref: '/admin/settings',
      steps: [
        'Go to Settings panel',
        'Scroll to "Business Information" section',
        'Find "Tax Percentage (%)" field',
        'Enter your tax percentage (e.g., 16 for 16% VAT)',
        'Click "Save Changes"',
        'Taxes will be calculated in Analytics based on profit'
      ],
      relatedPanels: ['Analytics & Reports']
    },
    {
      title: 'Cancel a Booking',
      description: 'Cancel a booking and handle refunds',
      panel: 'Bookings',
      panelHref: '/admin/bookings',
      steps: [
        'Go to Bookings panel',
        'Click on the booking to view details',
        'Click "Cancel Booking" button',
        'Enter cancellation reason',
        'Select refund status (if deposit was paid)',
        'Enter refund amount if applicable',
        'Add refund notes if needed',
        'Click "Confirm Cancellation"',
        'Client will receive cancellation email'
      ],
      relatedPanels: []
    },
    {
      title: 'Reschedule a Booking',
      description: 'Change booking date and time',
      panel: 'Bookings',
      panelHref: '/admin/bookings',
      steps: [
        'Go to Bookings panel',
        'Click on the booking to view details',
        'Click "Reschedule Booking" button',
        'Select new date from calendar',
        'Select new time slot',
        'Optionally add reschedule notes',
        'Toggle "Send reschedule email" if needed',
        'Click "Confirm Reschedule"',
        'Client will receive reschedule confirmation email'
      ],
      relatedPanels: ['Availability & Hours']
    },
    {
      title: 'Send Testimonial Request',
      description: 'Request feedback from clients',
      panel: 'Bookings',
      panelHref: '/admin/bookings',
      steps: [
        'Go to Bookings panel',
        'Click on a completed booking',
        'In booking details, find "Testimonial Request" section',
        'Click "Send Testimonial Request"',
        'Client will receive email with testimonial form link'
      ],
      relatedPanels: ['Testimonials']
    },
    {
      title: 'Create a Promo Code',
      description: 'Set up promotional discounts',
      panel: 'Promo Codes',
      panelHref: '/admin/promo-codes',
      steps: [
        'Go to Promo Codes panel',
        'Click "Add New Promo Code"',
        'Enter promo code (e.g., SUMMER20)',
        'Add description',
        'Select discount type: Percentage or Fixed Amount',
        'Enter discount value',
        'Set minimum purchase (optional)',
        'Set maximum discount (optional)',
        'Set valid from and until dates',
        'Set usage limit (optional)',
        'Toggle "Active" to enable',
        'Click "Save Changes"',
        'Code can be used on booking page'
      ],
      relatedPanels: ['Bookings', 'Discounts']
    },
    {
      title: 'Manage Business Hours',
      description: 'Set when you\'re available for bookings',
      panel: 'Availability & Hours',
      panelHref: '/admin/availability',
      steps: [
        'Go to Availability & Hours panel',
        'For each day (Monday-Sunday):',
        '  - Toggle "Enabled" to allow bookings',
        '  - Set opening time',
        '  - Set closing time',
        '  - Add time slots for that day',
        'Configure booking window (when clients can book)',
        'Set booking link and notes',
        'Click "Save Changes"',
        'Changes affect available time slots on booking page'
      ],
      relatedPanels: ['Bookings', 'Calendar']
    },
    {
      title: 'Add Gallery Images',
      description: 'Upload images to the public gallery',
      panel: 'Gallery Management',
      panelHref: '/admin/gallery',
      steps: [
        'Go to Gallery Management panel',
        'Click "Upload New Image"',
        'Select image file from your computer',
        'Enter image name/description',
        'Wait for upload to complete',
        'Click "Save Changes" to publish',
        'Images appear on the public gallery page'
      ],
      relatedPanels: []
    },
    {
      title: 'Add Shop Product',
      description: 'Create a new product for the online shop',
      panel: 'Shop',
      panelHref: '/admin/shop',
      steps: [
        'Go to Shop panel',
        'Click "Add New Product"',
        'Upload product images (up to 3)',
        'Enter product name',
        'Enter description',
        'Set price in KSH',
        'Set quantity/stock',
        'Click "Add Product"',
        'Optionally send announcement email to subscribers',
        'Click "Save Changes" to publish'
      ],
      relatedPanels: []
    },
    {
      title: 'Update Homepage Content',
      description: 'Edit text and sections on the homepage',
      panel: 'Homepage Content',
      panelHref: '/admin/homepage',
      steps: [
        'Go to Homepage Content panel',
        'Edit any section:',
        '  - Hero section (title, subtitle)',
        '  - Intro section',
        '  - Features list',
        '  - Meet Artist section',
        '  - Our Studio section',
        '  - Tsuboki Massage section',
        '  - Countdown banner',
        '  - Call-to-action',
        'Click "Save Changes"',
        'Changes appear on homepage immediately'
      ],
      relatedPanels: []
    },
    {
      title: 'Send Email Campaign',
      description: 'Send marketing emails to subscribers',
      panel: 'Email Marketing',
      panelHref: '/admin/email-marketing',
      steps: [
        'Go to Email Marketing panel',
        'Select campaign type (Newsletter, Announcement, etc.)',
        'Fill in email subject and content',
        'Preview the email',
        'Select recipients (all subscribers or segment)',
        'Click "Send Campaign"',
        'Track opens and clicks in analytics'
      ],
      relatedPanels: ['Newsletters']
    },
    {
      title: 'Approve Testimonial',
      description: 'Review and publish client testimonials',
      panel: 'Testimonials',
      panelHref: '/admin/testimonials',
      steps: [
        'Go to Testimonials panel',
        'View pending testimonials',
        'Read the testimonial content',
        'Click "Approve" to publish on website',
        'Or click "Reject" to remove',
        'Approved testimonials appear on homepage'
      ],
      relatedPanels: ['Bookings']
    },
    {
      title: 'Manage Discounts',
      description: 'Configure automatic discounts for clients',
      panel: 'Discounts',
      panelHref: '/admin/discounts',
      steps: [
        'Go to Discounts panel',
        'Configure First-Time Client Discount:',
        '  - Toggle enabled/disabled',
        '  - Set discount percentage',
        '  - Configure banner message',
        'Configure Returning Client Discount:',
        '  - Toggle enabled/disabled',
        '  - Set discount for 30-day tier',
        '  - Set discount for 45-day tier',
        'Set deposit percentage',
        'Click "Save Changes"',
        'Discounts apply automatically on booking page'
      ],
      relatedPanels: ['Bookings', 'Promo Codes']
    },
    {
      title: 'Update Contact Information',
      description: 'Change phone, email, social media links',
      panel: 'Contact Information',
      panelHref: '/admin/contact',
      steps: [
        'Go to Contact Information panel',
        'Update phone number',
        'Update email address',
        'Update Instagram handle',
        'Update Facebook link',
        'Update TikTok handle',
        'Update Twitter/X handle',
        'Update studio location',
        'Click "Save Changes"',
        'Changes appear on contact page and footer'
      ],
      relatedPanels: ['Settings']
    },
    {
      title: 'Manage Policies',
      description: 'Update cancellation and booking policies',
      panel: 'Client Policies',
      panelHref: '/admin/policies',
      steps: [
        'Go to Client Policies panel',
        'Edit Cancellation Policy:',
        '  - Set cancellation window (hours)',
        '  - Configure refund rules',
        'Edit Deposit Policy:',
        '  - Set deposit percentage',
        '  - Configure deposit rules',
        'Edit Referral Policy:',
        '  - Set referral discounts',
        '  - Configure referral rules',
        'Click "Save Changes"',
        'Policies appear on policies page and booking flow'
      ],
      relatedPanels: ['Bookings', 'Discounts']
    },
    {
      title: 'Schedule Social Media Post',
      description: 'Plan Instagram and TikTok content',
      panel: 'Social Media Calendar',
      panelHref: '/admin/social-media-calendar',
      steps: [
        'Go to Social Media Calendar panel',
        'Click "Add New Post"',
        'Select platform (Instagram or TikTok)',
        'Upload image or video',
        'Write caption',
        'Add hashtags',
        'Set scheduled date and time',
        'Click "Schedule Post"',
        'View calendar to see scheduled posts'
      ],
      relatedPanels: []
    },
    {
      title: 'Track Partner Referrals',
      description: 'Monitor salon and influencer referrals',
      panel: 'Referrals Tracking',
      panelHref: '/admin/referrals-tracking',
      steps: [
        'Go to Referrals Tracking panel',
        'View all partner referrals',
        'See commission totals and paid amounts',
        'Mark commissions as paid',
        'Filter by partner type or status',
        'Export referral data'
      ],
      relatedPanels: ['Partner Onboarding', 'Promo Codes']
    },
    {
      title: 'Send Partner Agreement',
      description: 'Onboard new salon or influencer partners',
      panel: 'Partner Onboarding',
      panelHref: '/admin/partner-onboarding',
      steps: [
        'Go to Partner Onboarding panel',
        'Enter partner name and email',
        'Select partner type (Salon, Beautician, or Influencer)',
        'Configure referral settings',
        'Click "Send Agreement"',
        'Partner receives email with agreement and referral code'
      ],
      relatedPanels: ['Referrals Tracking', 'Promo Codes']
    },
    {
      title: 'Change Website Theme',
      description: 'Update colors for seasonal themes',
      panel: 'Seasonal Themes',
      panelHref: '/admin/theme',
      steps: [
        'Go to Seasonal Themes panel',
        'Select a theme (Default, Spring, Summer, etc.)',
        'Or create custom theme:',
        '  - Set primary color',
        '  - Set secondary color',
        '  - Set accent color',
        '  - Preview changes',
        'Click "Save Theme"',
        'Theme applies to entire website'
      ],
      relatedPanels: []
    },
    {
      title: 'Update Terms & Conditions',
      description: 'Modify client agreement shown before deposits',
      panel: 'Terms & Conditions',
      panelHref: '/admin/terms',
      steps: [
        'Go to Terms & Conditions panel',
        'Edit the terms content',
        'Use rich text formatting',
        'Preview how it appears to clients',
        'Click "Save Changes"',
        'Updated terms appear in booking flow before payment'
      ],
      relatedPanels: ['Bookings']
    },
    {
      title: 'View Calendar Sync',
      description: 'See bookings synchronized with Google Calendar',
      panel: 'Calendar',
      panelHref: '/admin/calendar',
      steps: [
        'Go to Calendar panel',
        'View monthly calendar view',
        'See all bookings synchronized with Google Calendar',
        'Click on a booking to view details',
        'Bookings are automatically synced when created'
      ],
      relatedPanels: ['Bookings', 'Availability & Hours']
    },
    {
      title: 'Upload Newsletter PDF',
      description: 'Share Canva newsletters with subscribers',
      panel: 'Newsletters',
      panelHref: '/admin/newsletters',
      steps: [
        'Go to Newsletters panel',
        'Click "Upload Newsletter"',
        'Select PDF file from Canva',
        'Enter newsletter title and description',
        'Click "Upload"',
        'Newsletter appears in list',
        'Send to subscribers via Email Marketing panel'
      ],
      relatedPanels: ['Email Marketing']
    },
    {
      title: 'Add or Remove Admin',
      description: 'Manage admin user accounts (Owner Only)',
      panel: 'Manage Admins',
      panelHref: '/admin/manage-admins',
      steps: [
        'Go to Manage Admins panel (Owner Only)',
        'To add admin:',
        '  - Enter email address',
        '  - Set role (admin or owner)',
        '  - Click "Add Admin"',
        '  - Admin receives invitation email',
        'To remove admin:',
        '  - Find admin in list',
        '  - Click "Remove"',
        '  - Confirm removal',
        'Maximum 3 admins allowed'
      ],
      relatedPanels: []
    },
    {
      title: 'Update Business Settings',
      description: 'Change business name, logo, and basic info',
      panel: 'Settings',
      panelHref: '/admin/settings',
      steps: [
        'Go to Settings panel',
        'Update Business Information:',
        '  - Business name',
        '  - Phone number',
        '  - Email address',
        '  - Address',
        '  - Description',
        '  - Tax percentage',
        'Update Logo:',
        '  - Choose text or image logo',
        '  - Upload logo image or set text',
        'Update Social Links',
        'Change password if needed',
        'Click "Save Changes"'
      ],
      relatedPanels: ['Contact Information', 'Analytics & Reports']
    },
    {
      title: 'View Activity Log',
      description: 'See recent admin actions (Owner Only)',
      panel: 'Recent Activity',
      panelHref: '/admin/activity',
      steps: [
        'Go to Recent Activity panel (Owner Only)',
        'View log of all admin actions',
        'See who made changes and when',
        'Filter by admin user or action type',
        'Track all modifications to the system'
      ],
      relatedPanels: []
    }
  ]

  // Filter workflows based on search query
  const filteredWorkflows = searchQuery.trim() === ''
    ? workflows
    : workflows.filter(workflow =>
        workflow.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.panel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.steps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase()))
      )

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-display text-brown-dark mb-2">Admin Workflows & Help</h1>
              <p className="text-brown">Step-by-step guides for every admin panel</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="text-brown hover:text-brown-dark"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-brown-light"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark focus:ring-2 focus:ring-brown-light text-brown-dark placeholder-brown-light"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-brown-light hover:text-brown-dark transition-colors"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-brown">
                {filteredWorkflows.length === 0 
                  ? 'No workflows found matching your search.' 
                  : `Found ${filteredWorkflows.length} workflow${filteredWorkflows.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          {/* Workflows List */}
          <div className="space-y-6">
            {filteredWorkflows.map((workflow, index) => (
              <div
                key={index}
                className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-display text-brown-dark mb-2">{workflow.title}</h2>
                    <p className="text-brown mb-3">{workflow.description}</p>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-semibold text-brown-dark">Panel:</span>
                      <Link
                        href={workflow.panelHref}
                        className="text-sm text-brown hover:text-brown-dark underline font-medium"
                      >
                        {workflow.panel}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold text-brown-dark mb-3">Steps:</h3>
                  <ol className="list-decimal list-inside space-y-2">
                    {workflow.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="text-brown-dark">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {workflow.relatedPanels && workflow.relatedPanels.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-brown-light">
                    <p className="text-sm font-semibold text-brown-dark mb-2">Related Panels:</p>
                    <div className="flex flex-wrap gap-2">
                      {workflow.relatedPanels.map((panel, panelIndex) => {
                        const panelHref = `/admin/${panel.toLowerCase().replace(/\s+/g, '-').replace('&', '')}`
                        return (
                          <Link
                            key={panelIndex}
                            href={panelHref}
                            className="text-xs px-3 py-1 bg-brown-light text-brown-dark rounded-full hover:bg-brown hover:text-white transition-colors"
                          >
                            {panel}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredWorkflows.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-brown text-lg">No workflows found matching "{searchQuery}"</p>
              <p className="text-brown-dark/70 mt-2">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

