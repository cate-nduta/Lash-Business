import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sanitizeEmail, ValidationError } from '@/lib/input-validation'
import {
  getZohoTransporter,
  isZohoConfigured,
  BUSINESS_NOTIFICATION_EMAIL,
  FROM_EMAIL,
  EMAIL_FROM_NAME,
} from '@/lib/email/zoho-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface WaitlistEntry {
  email: string
  signedUpAt: string // ISO date string
  discountCode?: string // Optional discount code assigned
  discountCodeExpiresAt?: string // ISO date string - when discount code expires (28 days from signup)
}

export interface WaitlistData {
  entries: WaitlistEntry[]
  updatedAt: string
}

export interface WaitlistSettings {
  enabled: boolean
  openDate: string | null // ISO date string or null if not set
  closeDate: string | null // ISO date string or null if not set
  countdownTargetDate: string | null // ISO date string for countdown timer
  discountPercentage: number // Discount percentage (0-100)
  discountCodePrefix: string // Prefix for discount codes (e.g., "WAITLIST")
  createdAt: string
  updatedAt: string
}

const DEFAULT_WAITLIST_SETTINGS: WaitlistSettings = {
  enabled: false,
  openDate: null,
  closeDate: null,
  countdownTargetDate: null,
  discountPercentage: 0,
  discountCodePrefix: 'WAITLIST',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const DEFAULT_WAITLIST_DATA: WaitlistData = {
  entries: [],
  updatedAt: new Date().toISOString(),
}

// Check if waitlist is currently open
function isWaitlistOpen(settings: WaitlistSettings): boolean {
  if (!settings.enabled) return false
  
  const now = new Date()
  const openDate = settings.openDate ? new Date(settings.openDate) : null
  const closeDate = settings.closeDate ? new Date(settings.closeDate) : null
  
  // If open date is set and we're before it, waitlist is not open yet
  if (openDate && now < openDate) return false
  
  // If close date is set and we're after it, waitlist is closed
  if (closeDate && now > closeDate) return false
  
  return true
}

// POST - Sign up for waitlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail } = body
    
    if (!rawEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    // Sanitize email
    let email: string
    try {
      email = sanitizeEmail(rawEmail)
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      throw error
    }
    
    // Check waitlist settings
    const settings = await readDataFile<WaitlistSettings>(
      'labs-waitlist-settings.json',
      DEFAULT_WAITLIST_SETTINGS
    )
    
    // Check if waitlist is open
    if (!isWaitlistOpen(settings)) {
      return NextResponse.json(
        { 
          error: 'Waitlist is not currently open',
          enabled: settings.enabled,
          openDate: settings.openDate,
          closeDate: settings.closeDate,
        },
        { status: 403 }
      )
    }
    
    // Load existing waitlist data
    const waitlistData = await readDataFile<WaitlistData>(
      'labs-waitlist.json',
      DEFAULT_WAITLIST_DATA
    )
    
    // Check if email already exists
    const existingEntry = waitlistData.entries.find(
      (entry) => entry.email.toLowerCase() === email.toLowerCase()
    )
    
    if (existingEntry) {
      return NextResponse.json(
        { 
          success: true,
          message: 'You are already on the waitlist!',
          alreadySignedUp: true,
        },
        { status: 200 }
      )
    }
    
    // Generate discount code if discount is enabled
    let discountCode: string | undefined
    let discountCodeExpiresAt: string | undefined
    if (settings.discountPercentage > 0) {
      const timestamp = Date.now().toString(36).toUpperCase()
      discountCode = `${settings.discountCodePrefix}-${timestamp.slice(-6)}`
      // Discount expires 28 days from signup
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + 28)
      discountCodeExpiresAt = expirationDate.toISOString()
    }
    
    // Add new entry
    const newEntry: WaitlistEntry = {
      email,
      signedUpAt: new Date().toISOString(),
      discountCode,
      discountCodeExpiresAt,
    }
    
    waitlistData.entries.push(newEntry)
    waitlistData.updatedAt = new Date().toISOString()
    
    // Save waitlist data
    await writeDataFile('labs-waitlist.json', waitlistData)
    
    // Send welcome email with discount code (if email is configured)
    if (isZohoConfigured()) {
      const transporter = getZohoTransporter()
      if (transporter) {
        try {
          const emailSubject = settings.discountPercentage > 0 && discountCode
            ? `🎉 Your ${settings.discountPercentage}% Discount Code for LashDiary Labs`
            : 'Welcome to the LashDiary Labs Waitlist!'

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 24px; background: #FDF9F4; color: #3E2A20;">
              <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #7C4B31; margin: 0; font-size: 28px;">Welcome to LashDiary Labs!</h1>
                </div>
                
                <p style="color: #6B4A3B; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Thank you for joining our waitlist! You can now book your consultation before we launch and get a special discounted price.
                </p>

                ${settings.discountPercentage > 0 && discountCode ? `
                  <div style="background: #F3E6DC; border: 2px solid #7C4B31; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
                    <h2 style="color: #7C4B31; margin: 0 0 16px 0; font-size: 22px;">🎉 Your Exclusive Discount Code</h2>
                    <p style="color: #6B4A3B; font-size: 16px; margin-bottom: 12px;">
                      As a thank you for joining early, you'll receive <strong>${settings.discountPercentage}% off</strong> your consultation fee when you book!
                    </p>
                    <div style="background: #FFFFFF; border: 2px dashed #7C4B31; border-radius: 6px; padding: 16px; margin: 16px 0;">
                      <p style="color: #3E2A20; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Your Discount Code:</p>
                      <p style="color: #7C4B31; font-size: 24px; font-weight: bold; font-family: monospace; margin: 0; letter-spacing: 2px;">
                        ${discountCode}
                      </p>
                    </div>
                    <p style="color: #6B4A3B; font-size: 14px; margin: 16px 0 0 0;">
                      Use this code when booking your consultation to get ${settings.discountPercentage}% off the consultation fee!
                    </p>
                    <p style="color: #7C4B31; font-size: 13px; margin: 12px 0 0 0; font-weight: 600;">
                      ⏰ This discount code expires when we launch. Be sure to book your consultation before then!
                    </p>
                  </div>
                ` : ''}

                <div style="background: #F3E6DC; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #7C4B31; margin: 0 0 12px 0; font-size: 18px;">What Happens Next?</h3>
                  <ul style="color: #6B4A3B; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Book your consultation now using your discount code to get ${settings.discountPercentage > 0 && discountCode ? `${settings.discountPercentage}% off` : 'special pricing'}</li>
                    <li>Get early access to book consultations before we launch</li>
                    <li>Discuss your business needs and choose the perfect system tier</li>
                    <li>Transform your business with a professional booking website</li>
                    <li>No spam — we'll only email you with important updates</li>
                  </ul>
                </div>

                <div style="text-align: center; margin-top: 32px;">
                  <a href="https://lashdiary.co.ke/labs/book-appointment" 
                     style="display: inline-block; background: #7C4B31; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Book Your Consultation
                  </a>
                </div>

                <p style="color: #6B4A3B; font-size: 14px; line-height: 1.6; margin-top: 32px; padding-top: 24px; border-top: 1px solid #E8D5C4;">
                  If you have any questions, feel free to reach out to us at <a href="mailto:${BUSINESS_NOTIFICATION_EMAIL}" style="color: #7C4B31; text-decoration: none;">${BUSINESS_NOTIFICATION_EMAIL}</a>
                </p>

                <p style="color: #6B4A3B; font-size: 12px; margin-top: 24px; text-align: center;">
                  — The LashDiary Team
                </p>
              </div>
            </div>
          `

          await transporter.sendMail({
            from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: emailSubject,
            html: emailHtml,
          })
        } catch (emailError) {
          // Log error but don't fail the signup if email fails
          console.error('Error sending welcome email:', emailError)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully added to waitlist!',
      discountCode,
      discountPercentage: settings.discountPercentage,
    })
  } catch (error: any) {
    console.error('Error signing up for waitlist:', error)
    return NextResponse.json(
      { error: 'Failed to sign up for waitlist. Please try again.' },
      { status: 500 }
    )
  }
}

// GET - Get waitlist status (public)
export async function GET(request: NextRequest) {
  try {
    const settings = await readDataFile<WaitlistSettings>(
      'labs-waitlist-settings.json',
      DEFAULT_WAITLIST_SETTINGS
    )
    
    const waitlistData = await readDataFile<WaitlistData>(
      'labs-waitlist.json',
      DEFAULT_WAITLIST_DATA
    )
    
    const isOpen = isWaitlistOpen(settings)
    
    return NextResponse.json({
      enabled: settings.enabled,
      isOpen,
      openDate: settings.openDate,
      closeDate: settings.closeDate,
      countdownTargetDate: settings.countdownTargetDate,
      discountPercentage: settings.discountPercentage,
      totalSignups: waitlistData.entries.length,
      // Don't return email addresses or sensitive data in public endpoint
    })
  } catch (error: any) {
    console.error('Error fetching waitlist status:', error)
    return NextResponse.json(
      { 
        enabled: false,
        isOpen: false,
        error: 'Failed to fetch waitlist status' 
      },
      { status: 500 }
    )
  }
}

