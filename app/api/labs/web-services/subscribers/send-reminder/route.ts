import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { sendYearlySubscriptionReminderEmail } from '@/app/api/labs/web-services/email-utils'

export const dynamic = 'force-dynamic'

interface YearlySubscriber {
  id: string
  name: string
  email: string
  phoneNumber?: string
  totalAnnualAmount: number
  yearlyItems: Array<{
    productId: string
    productName: string
    quantity: number
    annualPrice: number
  }>
  orderIds: string[]
  createdAt: string
  lastRenewalDate?: string
  nextRenewalDate?: string
  paymentStatus: 'active' | 'pending' | 'overdue'
}

// Send reminder email or WhatsApp
export async function POST(request: NextRequest) {
  try {
    const { subscriberId, method } = await request.json()
    
    if (!subscriberId) {
      return NextResponse.json({ error: 'Subscriber ID is required' }, { status: 400 })
    }
    
    if (!method || !['email', 'whatsapp'].includes(method)) {
      return NextResponse.json({ error: 'Method must be "email" or "whatsapp"' }, { status: 400 })
    }
    
    const subscribers = await readDataFile<YearlySubscriber[]>('labs-yearly-subscribers.json', [])
    const subscriber = subscribers.find((s) => s.id === subscriberId)
    
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }
    
    // Generate payment link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const paymentLinkResponse = await fetch(new URL('/api/labs/web-services/subscribers/payment-link', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriberId }),
    })
    
    if (!paymentLinkResponse.ok) {
      const errorData = await paymentLinkResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: 'Failed to generate payment link', details: errorData.error },
        { status: 500 }
      )
    }
    
    const { paymentLink, amount } = await paymentLinkResponse.json()
    
    if (method === 'email') {
      // Send email reminder
      try {
        await sendYearlySubscriptionReminderEmail({
          name: subscriber.name,
          email: subscriber.email,
          amount: subscriber.totalAnnualAmount,
          paymentLink,
          yearlyItems: subscriber.yearlyItems,
        })
        
        return NextResponse.json({
          success: true,
          message: 'Reminder email sent successfully',
          method: 'email',
        })
      } catch (error: any) {
        console.error('Error sending email:', error)
        return NextResponse.json(
          { error: 'Failed to send email', details: error.message },
          { status: 500 }
        )
      }
    } else if (method === 'whatsapp') {
      // For WhatsApp, return the message and link
      // You can integrate with WhatsApp Business API or Twilio here
      const whatsappMessage = `Hi ${subscriber.name},\n\nYour annual subscription renewal is due.\n\nTotal Amount: KES ${subscriber.totalAnnualAmount.toLocaleString()}\n\nPlease pay using this link: ${paymentLink}\n\nThank you!`
      
      // Format phone number for WhatsApp (remove + if present, add country code if missing)
      let phoneNumber = subscriber.phoneNumber || ''
      if (phoneNumber) {
        phoneNumber = phoneNumber.replace(/^\+/, '')
        if (!phoneNumber.startsWith('254')) {
          phoneNumber = '254' + phoneNumber.replace(/^0/, '')
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'WhatsApp message prepared',
        method: 'whatsapp',
        phoneNumber: phoneNumber ? `+${phoneNumber}` : null,
        whatsappMessage,
        paymentLink,
        whatsappUrl: phoneNumber ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}` : null,
      })
    }
    
    return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
  } catch (error: any) {
    console.error('Error sending reminder:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder', details: error.message },
      { status: 500 }
    )
  }
}

