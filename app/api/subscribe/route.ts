import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { normalizePromoCatalog, type PromoCode } from '@/lib/promo-utils'
import { sendWelcomeEmail } from './welcome-email'
import crypto from 'crypto'

interface ManualSubscriber {
  email: string
  name?: string
  source?: string
  createdAt?: string
  promoCode?: string
}

interface UnsubscribeRecord {
  email: string
  name?: string
  reason?: string
  token: string
  unsubscribedAt: string
}

// Generate a unique unsubscribe token
function generateUnsubscribeToken(email: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(email + Date.now().toString() + Math.random().toString())
  return hash.digest('hex').substring(0, 32)
}

// Generate a unique promo code
function generatePromoCode(email: string): string {
  // Create a code based on email and timestamp
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase()
  const emailPrefix = email.split('@')[0].slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '')
  const code = `WELCOME${emailPrefix}${timestamp}`.slice(0, 15)
  return code
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, source } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Load existing subscribers
    const data = await readDataFile<{ subscribers: ManualSubscriber[] }>('email-subscribers.json', {
      subscribers: [],
    })

    const normalizedEmail = email.toLowerCase().trim()
    const existingSubscriber = data.subscribers.find(
      (sub) => sub.email.toLowerCase() === normalizedEmail
    )

    // Check if already subscribed - CRITICAL: No duplicate emails allowed
    // If email already exists, do NOT create a new subscriber or generate a new promo code
    if (existingSubscriber) {
      return NextResponse.json({
        success: true,
        message: 'You are already subscribed! Thank you for being part of our community.',
        alreadySubscribed: true,
      })
    }

    const subscriberName = name?.trim() || 'Beautiful Soul'
    const subscriberSource = source || 'website'
    let promoCode: string | undefined = undefined
    let unsubscribeToken: string | undefined = undefined

    // Generate unsubscribe token for new signups only
    unsubscribeToken = generateUnsubscribeToken(normalizedEmail)

    // Create unsubscribe record for new subscribers
    const unsubscribeData = await readDataFile<{ unsubscribes: UnsubscribeRecord[] }>(
      'email-unsubscribes.json',
      { unsubscribes: [] }
    )
    
    const existingUnsubscribeIndex = unsubscribeData.unsubscribes.findIndex(
      (record) => record.email.toLowerCase() === normalizedEmail
    )

    if (existingUnsubscribeIndex >= 0) {
      // Update existing record with new token if needed (shouldn't happen for new signups, but just in case)
      unsubscribeData.unsubscribes[existingUnsubscribeIndex].token = unsubscribeToken
      unsubscribeData.unsubscribes[existingUnsubscribeIndex].name = subscriberName
    } else {
      // Create new unsubscribe record for this new subscriber
      unsubscribeData.unsubscribes.push({
        email: normalizedEmail,
        name: subscriberName,
        token: unsubscribeToken,
        unsubscribedAt: '',
      })
    }
    await writeDataFile('email-unsubscribes.json', unsubscribeData)

    // SECURITY: Check if email has already received a welcome discount
    // Load welcome discount recipients tracking file
    const welcomeDiscountData = await readDataFile<{ recipients: Array<{ email: string; receivedAt: string; promoCode?: string }> }>(
      'welcome-discount-recipients.json',
      { recipients: [] }
    )
    
    const hasReceivedWelcomeDiscount = welcomeDiscountData.recipients.some(
      (recipient) => recipient.email.toLowerCase() === normalizedEmail
    )

    // Generate promo code ONLY for NEW popup signups who haven't received welcome discount before
    // This ensures each email gets exactly ONE welcome discount, ever - no exceptions
    if (source === 'popup' && !existingSubscriber && !hasReceivedWelcomeDiscount) {
      // Load settings to get the discount percentage
      const settings = await readDataFile<any>('settings.json', {})
      const discountPercentage = typeof settings?.newsletter?.discountPercentage === 'number' 
        ? Math.max(0, Math.min(100, settings.newsletter.discountPercentage)) // Clamp between 0-100
        : 10 // Default to 10% if not set
      
      // Load existing promo codes to check for duplicates
      const promoData = await readDataFile<any>('promo-codes.json', { promoCodes: [] })
      const { catalog } = normalizePromoCatalog(promoData)
      
      let attempts = 0
      let newCode: string
      do {
        newCode = generatePromoCode(normalizedEmail)
        attempts++
      } while (
        catalog.promoCodes.some((p: PromoCode) => p.code === newCode) && 
        attempts < 10
      )

      promoCode = newCode

      // Create promo code entry
      const validUntil = new Date()
      validUntil.setFullYear(validUntil.getFullYear() + 1) // Valid for 1 year

      const newPromoCode: PromoCode = {
        code: promoCode,
        description: `Welcome discount for new newsletter subscribers - ${discountPercentage}% off first appointment`,
        discountType: 'percentage',
        discountValue: discountPercentage,
        minPurchase: 0,
        maxDiscount: null,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: validUntil.toISOString().split('T')[0],
        usageLimit: 1, // One-time use
        usedCount: 0,
        active: true,
        allowFirstTimeClient: true,
        autoGenerated: true,
        usedByEmails: [], // Track which email used it
      }

      catalog.promoCodes.push(newPromoCode)
      await writeDataFile('promo-codes.json', catalog)

      // CRITICAL: Immediately record that this email has received a welcome discount
      // This prevents them from getting another one, even if they try to sign up again
      welcomeDiscountData.recipients.push({
        email: normalizedEmail,
        receivedAt: new Date().toISOString(),
        promoCode: promoCode,
      })
      await writeDataFile('welcome-discount-recipients.json', welcomeDiscountData)
    } else if (source === 'popup' && hasReceivedWelcomeDiscount) {
      // They've already received a welcome discount - don't give them another one
      // Still allow them to subscribe, but no promo code
      console.log(`Email ${normalizedEmail} attempted to get another welcome discount but already received one`)
    }

    // Add new subscriber - only if email doesn't already exist
    // Double check to prevent duplicates (shouldn't happen due to earlier check, but extra safety)
    const duplicateCheck = data.subscribers.find(
      (sub) => sub.email.toLowerCase() === normalizedEmail
    )
    
    if (!duplicateCheck) {
      const newSubscriber: ManualSubscriber = {
        email: normalizedEmail,
        name: subscriberName,
        source: subscriberSource,
        createdAt: new Date().toISOString(),
        promoCode,
      }

      data.subscribers.push(newSubscriber)
      await writeDataFile('email-subscribers.json', data)
    } else {
      // Email somehow already exists - don't create duplicate or generate new promo code
      return NextResponse.json({
        success: true,
        message: 'You are already subscribed! Thank you for being part of our community.',
        alreadySubscribed: true,
      })
    }

    // Send welcome email with promo code if from popup
    if (source === 'popup' && promoCode && unsubscribeToken) {
      try {
        // Get discount percentage from settings for the email
        const settings = await readDataFile<any>('settings.json', {})
        const discountPercentage = typeof settings?.newsletter?.discountPercentage === 'number' 
          ? Math.max(0, Math.min(100, settings.newsletter.discountPercentage))
          : 10
        
        await sendWelcomeEmail({
          email: normalizedEmail,
          name: subscriberName,
          promoCode,
          unsubscribeToken,
          discountPercentage,
        })
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError)
        // Don't fail the subscription if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! You will receive updates about new services and special offers.',
      promoCode: source === 'popup' ? promoCode : undefined,
    })
  } catch (error) {
    console.error('Error subscribing user:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again later.' },
      { status: 500 }
    )
  }
}

