import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { type Course, type CoursePurchase, type CourseCatalog } from '@/types/course'
import { getCourseSlug } from '@/lib/courses-utils'
import { getClientUserId } from '@/lib/client-auth'
import { hashPassword } from '@/lib/password-utils'
import { generateStrongPassword } from '@/lib/generate-strong-password'
import { sendCourseAccessEmail } from '@/lib/course-email-utils'
import type { ClientUsersData, ClientProfile } from '@/types/client'
import crypto from 'crypto'

export const revalidate = 0
export const dynamic = 'force-dynamic'

interface PurchasePayload {
  courseId: string
  email: string
  name: string // Required: full name for course access
  createAccount?: boolean // Optional: whether to create account
  password?: string // Optional: password if creating account
}

/**
 * Create or link user account for course purchase
 * Generates a strong password and sets it on the account
 */
async function ensureUserAccount(email: string, name: string): Promise<{ userId: string; isNewAccount: boolean; password: string }> {
  const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
  const normalizedEmail = email.toLowerCase().trim()
  
  // Ensure users array exists
  if (!usersData || !usersData.users || !Array.isArray(usersData.users)) {
    // If file structure is wrong, create proper structure
    const properData: ClientUsersData = { users: [] }
    await writeDataFile('users.json', properData)
    usersData.users = []
  }
  
  // Check if user already exists
  let existingUser = usersData.users.find(
    (u) => u && u.email && u.email.toLowerCase().trim() === normalizedEmail
  )
  
  let password: string
  
  if (existingUser) {
    // User exists - check if they have a password
    if (existingUser.passwordHash && existingUser.passwordHash.length > 0) {
      // User already has password - we can't retrieve it, so generate a new one
      // This handles the case where user purchases another course
      password = generateStrongPassword()
      existingUser.passwordHash = hashPassword(password)
      await writeDataFile('users.json', usersData)
      return { userId: existingUser.id, isNewAccount: false, password }
    } else {
      // User exists but no password - generate one
      password = generateStrongPassword()
      existingUser.passwordHash = hashPassword(password)
      // Update name if provided (name is now required)
      if (name.trim()) {
        existingUser.name = name.trim()
      }
      await writeDataFile('users.json', usersData)
      return { userId: existingUser.id, isNewAccount: false, password }
    }
  }
  
  // Create new user account with generated password
  const userId = crypto.randomBytes(16).toString('hex')
  const now = new Date().toISOString()
  password = generateStrongPassword()
  
  const newProfile: ClientProfile = {
    id: userId,
    email: normalizedEmail,
    name: name.trim(), // Name is now required
    phone: '', // Can be updated later
    passwordHash: hashPassword(password),
    createdAt: now,
    isActive: true,
    emailVerified: true, // Verified since they're purchasing a course
  }
  
  usersData.users.push(newProfile)
  await writeDataFile('users.json', usersData)
  
  return { userId, isNewAccount: true, password }
}

export async function POST(request: NextRequest) {
  try {
    const { courseId, email, name, createAccount, password } = await request.json() as PurchasePayload

    if (!courseId || !email || !name || !name.trim()) {
      return NextResponse.json({ error: 'Course ID, email, and full name are required' }, { status: 400 })
    }
    
    // Check if user is already logged in
    let userId: string | null = null
    try {
      userId = await getClientUserId()
    } catch (error) {
      // Not logged in - that's okay
    }
    
    // If not logged in, create or link account (always generate password for course students)
    let generatedPassword: string | undefined
    if (!userId) {
      const accountResult = await ensureUserAccount(email, name)
      userId = accountResult.userId
      generatedPassword = accountResult.password
    }

    // Load course
    const catalog = await readDataFile<CourseCatalog>('courses.json', { courses: [], discounts: [] })
    let course = catalog.courses.find(c => c.id === courseId && c.isActive)

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Apply active discounts to course
    const now = new Date()
    const activeDiscounts = catalog.discounts.filter(discount => {
      if (!discount.isActive || discount.courseId !== courseId) return false
      
      // Check if discount is within date range
      if (discount.startDate) {
        const startDate = new Date(discount.startDate)
        if (now < startDate) return false
      }
      
      if (discount.endDate) {
        const endDate = new Date(discount.endDate)
        endDate.setHours(23, 59, 59, 999)
        if (now > endDate) return false
      }
      
      return true
    })

    // Apply discount to course if found
    const courseDiscount = activeDiscounts.find(d => d.courseId === courseId)
    if (courseDiscount) {
      course = { ...course }
      if (courseDiscount.type === 'percentage') {
        course.discountPercent = courseDiscount.value
        if (courseDiscount.endDate) {
          course.discountExpiryDate = courseDiscount.endDate
        }
      } else if (courseDiscount.type === 'fixed') {
        const originalPrice = course.originalPriceUSD || course.priceUSD
        if (originalPrice > 0) {
          course.discountPercent = Math.round((courseDiscount.value / originalPrice) * 100)
          if (courseDiscount.endDate) {
            course.discountExpiryDate = courseDiscount.endDate
          }
        }
      }
    }

    // Calculate the actual price to charge (apply discount if set)
    const calculateCoursePrice = (course: Course): number => {
      const basePrice = course.priceUSD || 0
      const originalPrice = course.originalPriceUSD || basePrice
      
      // If discountPercent is set, apply it to original price
      if (course.discountPercent && course.discountPercent > 0) {
        const discounted = originalPrice * (1 - course.discountPercent / 100)
        return Math.round(discounted * 100) / 100
      }
      // If originalPriceUSD is set and higher than priceUSD, priceUSD is already discounted
      if (course.originalPriceUSD && course.originalPriceUSD > basePrice) {
        return basePrice
      }
      return basePrice
    }

    const actualPrice = calculateCoursePrice(course)

    // Store student name for certificate if provided
    if (name && name.trim()) {
      // This will be used when certificate is issued
      // The name is stored in the purchase record
    }

    // If course is free (price === 0), grant access immediately
    if (actualPrice === 0) {
      const purchase: CoursePurchase = {
        id: crypto.randomUUID(),
        courseId,
        userId: userId || undefined, // Link to user account
        email: email.toLowerCase().trim(),
        amountUSD: 0,
        paymentStatus: 'completed',
        paymentMethod: 'free',
        purchasedAt: new Date().toISOString(),
        accessGranted: true,
      }

      const purchases = await readDataFile<{ purchases: CoursePurchase[] }>('course-purchases.json', { purchases: [] })
      purchases.purchases.push(purchase)
      await writeDataFile('course-purchases.json', purchases)

      // Send course access email with login credentials
      if (generatedPassword) {
        try {
          await sendCourseAccessEmail({
            email: email.toLowerCase().trim(),
            name: name?.trim(),
            courseTitle: course.title,
            password: generatedPassword,
            isFree: true,
          })
        } catch (error) {
          console.error('Error sending course access email:', error)
          // Don't fail the purchase if email fails
        }
      }

      // Store student name for certificate (client-side will also store it)
      return NextResponse.json({
        success: true,
        purchaseId: purchase.id,
        accessGranted: true,
        redirectUrl: `/course/${getCourseSlug(course)}/module1`,
        studentName: name?.trim() || undefined,
      })
    }

    // For paid courses, create pending purchase and initialize Paystack payment
    const purchase: CoursePurchase = {
      id: crypto.randomUUID(),
      courseId,
      userId: userId || undefined, // Link to user account
      email: email.toLowerCase().trim(),
      amountUSD: actualPrice,
      paymentStatus: 'pending',
      purchasedAt: new Date().toISOString(),
      accessGranted: false,
    }

    const purchases = await readDataFile<{ purchases: CoursePurchase[] }>('course-purchases.json', { purchases: [] })
    purchases.purchases.push(purchase)
    await writeDataFile('course-purchases.json', purchases)

    // Store password temporarily in purchase for webhook to use
    if (generatedPassword) {
      purchase.tempPassword = generatedPassword
      const tempPurchaseIndex = purchases.purchases.findIndex(p => p.id === purchase.id)
      if (tempPurchaseIndex !== -1) {
        purchases.purchases[tempPurchaseIndex] = purchase
        await writeDataFile('course-purchases.json', purchases)
      }
    }

    // Initialize Paystack payment (REQUIRED - no fallback)
    const { initializeTransaction, getPaystackConfig } = await import('@/lib/paystack-utils')
    
    // Check if Paystack is configured
    const config = getPaystackConfig()
    if (!config.configured) {
      console.error('Paystack not configured - missing secret key')
      return NextResponse.json(
        { 
          error: 'Payment system not configured. Please contact support.',
          requiresPayment: true,
          purchaseId: purchase.id,
        },
        { status: 500 }
      )
    }
    
    const paymentResult = await initializeTransaction({
      email: email.toLowerCase().trim(),
      amount: actualPrice,
      currency: 'USD',
      metadata: {
        payment_type: 'course_purchase',
        purchase_id: purchase.id,
        course_id: courseId,
        course_title: course.title,
      },
      customerName: name,
    })

    if (!paymentResult.success || !paymentResult.authorizationUrl) {
      console.error('Paystack initialization failed:', paymentResult.error)
      return NextResponse.json(
        { 
          error: paymentResult.error || 'Failed to initialize payment. Please try again or contact support.',
          requiresPayment: true,
          purchaseId: purchase.id,
        },
        { status: 400 }
      )
    }

    // Update purchase with transaction reference
    purchase.transactionId = paymentResult.reference
    const purchaseIndex = purchases.purchases.findIndex(p => p.id === purchase.id)
    if (purchaseIndex !== -1) {
      purchases.purchases[purchaseIndex] = purchase
      await writeDataFile('course-purchases.json', purchases)
    }

    return NextResponse.json({
      success: true,
      purchaseId: purchase.id,
      requiresPayment: true,
      amountUSD: actualPrice,
      authorizationUrl: paymentResult.authorizationUrl,
      redirectUrl: paymentResult.authorizationUrl, // Also include for backward compatibility
      reference: paymentResult.reference,
    })
  } catch (error) {
    console.error('Error creating course purchase:', error)
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 })
  }
}

