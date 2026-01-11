import { NextRequest, NextResponse } from 'next/server'
import { sendEmailViaZoho, FROM_EMAIL, EMAIL_FROM_NAME, BUSINESS_NOTIFICATION_EMAIL } from '@/lib/email/zoho-config'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

interface HighValueTicket {
  id: string
  name: string
  email: string
  phoneNumber: string
  orderDetails: {
    items: Array<{
      name: string
      price: number
      quantity: number
      setupFee?: number
      billingPeriod?: string
    }>
  }
  totalAmount: number
  createdAt: string
}

interface HighValueTicketsData {
  tickets: HighValueTicket[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phoneNumber, orderDetails, totalAmount } = body

    // Validate required fields
    if (!name || !email || !phoneNumber) {
      return NextResponse.json(
        { error: 'Name, email, and phone number are required' },
        { status: 400 }
      )
    }

    // Format order details for email
    const orderItemsText = orderDetails?.items?.map((item: any) => {
      const itemTotal = item.price * item.quantity
      const setupFeeText = item.setupFee ? ` (Setup: KSH ${item.setupFee.toLocaleString()} × ${item.quantity})` : ''
      return `• ${item.name} - KSH ${item.price.toLocaleString()} × ${item.quantity}${setupFeeText} = KSH ${itemTotal.toLocaleString()}`
    }).join('\n') || 'No items specified'

    // Save high-value ticket
    const ticketsData = await readDataFile<HighValueTicketsData>('high-value-tickets.json', { tickets: [] })
    const ticket: HighValueTicket = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      orderDetails,
      totalAmount,
      createdAt: new Date().toISOString(),
    }
    ticketsData.tickets.push(ticket)
    await writeDataFile('high-value-tickets.json', ticketsData)

    // Email to admin
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #733D26; margin-bottom: 20px;">High-Value Order Contact Request</h2>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0;">Customer Information</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone Number:</strong> ${phoneNumber}</p>
        </div>

        <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0;">Order Summary</h3>
          <p><strong>Total Amount:</strong> KSH ${totalAmount?.toLocaleString() || 'N/A'}</p>
          
          <h4 style="color: #333; margin-top: 15px; margin-bottom: 10px;">Order Items:</h4>
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; margin: 0;">${orderItemsText}</pre>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; color: #856404;">
            <strong>Action Required:</strong> Please contact this customer to discuss their high-value order and provide personalized service.
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p>This email was sent from the LashDiary Labs checkout system.</p>
          <p>Order details were automatically generated from the customer's cart.</p>
        </div>
      </div>
    `

    const adminEmailText = `
High-Value Order Contact Request

Customer Information:
- Name: ${name}
- Email: ${email}
- Phone Number: ${phoneNumber}

Order Summary:
- Total Amount: KSH ${totalAmount?.toLocaleString() || 'N/A'}

Order Items:
${orderItemsText}

Action Required: Please contact this customer to discuss their high-value order and provide personalized service.

---
This email was sent from the LashDiary Labs checkout system.
    `.trim()

    // Email to client
    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #733D26; margin-bottom: 20px;">Thank You for Your Interest!</h2>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Dear ${name},
        </p>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Thank you for your interest in our high-value order. We have received your order request and it is currently under review.
        </p>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Our team will contact you within 24 hours via email or phone call to discuss your requirements and provide a customized quote.
        </p>

        <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Order Summary</h3>
          <p><strong>Total Amount:</strong> KSH ${totalAmount?.toLocaleString() || 'N/A'}</p>
          
          <h4 style="color: #333; margin-top: 15px; margin-bottom: 10px;">Order Items:</h4>
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; margin: 0;">${orderItemsText}</pre>
        </div>

        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          If you have any questions or need to make changes to your order, please don't hesitate to contact us at <a href="mailto:hello@lashdiary.co.ke" style="color: #733D26;">hello@lashdiary.co.ke</a>.
        </p>

        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Best regards,<br>
          The LashDiary Labs Team
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p>This email was sent from the LashDiary Labs checkout system.</p>
        </div>
      </div>
    `

    const clientEmailText = `
Thank You for Your Interest!

Dear ${name},

Thank you for your interest in our high-value order. We have received your order request and it is currently under review.

Our team will contact you within 24 hours via email or phone call to discuss your requirements and provide a customized quote.

Order Summary:
- Total Amount: KSH ${totalAmount?.toLocaleString() || 'N/A'}

Order Items:
${orderItemsText}

If you have any questions or need to make changes to your order, please don't hesitate to contact us at hello@lashdiary.co.ke.

Best regards,
The LashDiary Labs Team

---
This email was sent from the LashDiary Labs checkout system.
    `.trim()

    // Send email to admin
    await sendEmailViaZoho({
      to: BUSINESS_NOTIFICATION_EMAIL,
      subject: `High-Value Order Contact Request - ${name} (KSH ${totalAmount?.toLocaleString() || 'N/A'})`,
      html: adminEmailHtml,
      text: adminEmailText,
      replyTo: email, // Allow replying directly to customer
    })

    // Send email to client
    await sendEmailViaZoho({
      to: email.trim(),
      subject: 'Thank You for Your High-Value Order Request - LashDiary Labs',
      html: clientEmailHtml,
      text: clientEmailText,
      replyTo: BUSINESS_NOTIFICATION_EMAIL,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Your request has been sent successfully. We will contact you shortly.' 
    })
  } catch (error: any) {
    console.error('Error sending high-value order contact email:', error)
    return NextResponse.json(
      { error: 'Failed to send contact request', details: error.message },
      { status: 500 }
    )
  }
}
