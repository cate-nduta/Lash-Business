import { Resend } from 'resend'

const OWNER_EMAIL = process.env.CALENDAR_EMAIL || 'catherinenkuria@gmail.com'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev' // Default Resend email for testing

// Initialize Resend
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// Service price mapping for deposit calculation
const servicePrices: { [key: string]: number } = {
  'Classic Lashes': 6000,
  'Subtle Hybrid Lashes': 6000,
  'Hybrid Lashes': 6500,
  'Volume Lashes': 6500,
  'Mega Volume Lashes': 7500,
  'Wispy Lashes': 7000,
  'Classic Infill': 4000,
  'Subtle Hybrid Infill': 4000,
  'Hybrid Infill': 4000,
  'Volume Infill': 4500,
  'Mega Volume Infill': 5000,
  'Wispy Infill': 4500,
  'Lash Lift': 4500,
}

// Service duration mapping in minutes
const serviceDurations: { [key: string]: number } = {
  'Classic Lashes': 90,
  'Subtle Hybrid Lashes': 120,
  'Hybrid Lashes': 120,
  'Volume Lashes': 150,
  'Mega Volume Lashes': 180,
  'Wispy Lashes': 150,
  'Classic Infill': 60,
  'Subtle Hybrid Infill': 75,
  'Hybrid Infill': 75,
  'Volume Infill': 90,
  'Mega Volume Infill': 120,
  'Wispy Infill': 90,
  'Lash Lift': 60,
}

// Calculate deposit amount (35% of service price)
function calculateDeposit(service: string): { amount: number; formatted: string; servicePrice: number } {
  if (!service || !servicePrices[service]) {
    return { amount: 0, formatted: 'N/A', servicePrice: 0 }
  }
  const servicePrice = servicePrices[service]
  const deposit = Math.round(servicePrice * 0.35)
  return {
    amount: deposit,
    formatted: `KSH ${deposit.toLocaleString()}`,
    servicePrice,
  }
}

// Create HTML email template for customer
function createCustomerEmailTemplate(bookingData: {
  name: string
  email?: string
  service: string
  formattedDate: string
  formattedTime: string
  formattedEndTime: string
  location: string
  deposit: string
  servicePrice: string
}) {
  const { name, email, service, formattedDate, formattedTime, formattedEndTime, location, deposit, servicePrice } = bookingData
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmation - LashDiary</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F9D0DE;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9D0DE; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #F9D0DE; padding: 40px 30px; text-align: center; border-bottom: 2px solid #733D26;">
              <h1 style="color: #733D26; margin: 0; font-size: 32px; font-weight: bold;">LashDiary</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #733D26; margin: 0 0 20px 0; font-size: 24px;">Thank you for your booking, ${name}!</h2>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                We're excited to have you! Your appointment has been received and we'll confirm it shortly.
              </p>
              
              <div style="background-color: #F9D0DE; border-left: 4px solid #733D26; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #733D26; margin: 0 0 15px 0; font-size: 18px;">Appointment Details</h3>
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Date:</strong></td>
                    <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Time:</strong></td>
                    <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${formattedTime} - ${formattedEndTime}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Appointment ends:</strong></td>
                    <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">Your appointment will be over by ${formattedEndTime}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Service:</strong></td>
                    <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${service || 'Lash Service'}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Service Price:</strong></td>
                    <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${servicePrice}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Location:</strong></td>
                    <td style="color: #333333; font-size: 14px; padding: 8px 0;">${location}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #FFF0F7; border-left: 4px solid #733D26; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #733D26; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">💰 Payment Required</h3>
                <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                  <strong>Deposit Required (35%):</strong> <span style="color: #733D26; font-size: 16px; font-weight: bold;">${deposit}</span>
                </p>
                <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
                  To secure your appointment, please pay the deposit amount. You will receive payment instructions separately. The remaining balance will be paid on the day of your appointment.
                </p>
              </div>
              
              <div style="background-color: #F9D0DE; border-left: 4px solid #733D26; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #733D26; margin: 0 0 15px 0; font-size: 18px;">Important Reminders</h3>
                <ul style="color: #333333; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Please ensure you have a clean, well-lit space ready for the appointment</li>
                  <li>If you live in a gated community or apartment, please notify your security/gateman in advance to allow access</li>
                  <li>Make sure the room is accessible and free from distractions</li>
                  <li>Have a comfortable seating area prepared for the service</li>
                </ul>
              </div>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
                If you have any questions or need to make changes to your appointment, please contact us at 
                <a href="mailto:${OWNER_EMAIL}" style="color: #733D26; text-decoration: none;">${OWNER_EMAIL}</a>.
              </p>
              
              <div style="background-color: #FFF0F7; border: 2px solid #733D26; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <h3 style="color: #733D26; margin: 0 0 15px 0; font-size: 18px;">Share Your Experience!</h3>
                <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                  After your appointment, we'd love to hear about your experience! Share your feedback and photos with us.
                </p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/testimonials?email=${encodeURIComponent(bookingData.email || '')}" 
                   style="display: inline-block; background-color: #733D26; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; margin: 10px 0;">
                  Leave a Testimonial
                </a>
              </div>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                We look forward to seeing you!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9D0DE; padding: 30px; text-align: center; border-top: 2px solid #733D26;">
              <p style="color: #733D26; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Best regards,</p>
              <p style="color: #733D26; font-size: 16px; font-weight: bold; margin: 0;">The LashDiary Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// Create HTML email template for business owner
function createOwnerEmailTemplate(bookingData: {
  name: string
  email: string
  phone: string
  service: string
  formattedDate: string
  formattedTime: string
  formattedEndTime: string
  location: string
  deposit: string
  servicePrice: string
  originalPrice?: string
  discount?: string
  isFirstTimeClient?: boolean
}, customerEmailError?: string | null, customerEmail?: string) {
  const { name, email, phone, service, formattedDate, formattedTime, formattedEndTime, location, deposit, servicePrice, originalPrice, discount, isFirstTimeClient } = bookingData
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Request - LashDiary</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F9D0DE;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9D0DE; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #F9D0DE; padding: 40px 30px; text-align: center; border-bottom: 2px solid #733D26;">
              <h1 style="color: #733D26; margin: 0; font-size: 32px; font-weight: bold;">You have a new appointment booking!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background-color: #F9D0DE; border-left: 4px solid #733D26; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #733D26; margin: 0 0 15px 0; font-size: 18px;">Client Information</h3>
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Name:</strong></td>
                    <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${name}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Email:</strong></td>
                    <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><a href="mailto:${email}" style="color: #733D26; text-decoration: none;">${email}</a></td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Phone:</strong></td>
                    <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><a href="tel:${phone}" style="color: #733D26; text-decoration: none;">${phone}</a></td>
                  </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Service:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${service || 'Not specified'}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Service Price:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${servicePrice}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Date:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Time:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${formattedTime} - ${formattedEndTime}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Appointment ends:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">Appointment will be over by ${formattedEndTime}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;"><strong>Location:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #F9D0DE;">${location}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Deposit Required (35%):</strong></td>
                        <td style="color: #733D26; font-size: 16px; font-weight: bold; padding: 8px 0;">${deposit}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style="background-color: #FFF0F7; border-left: 4px solid #733D26; padding: 20px; border-radius: 8px; margin: 30px 0;">
                    <h3 style="color: #733D26; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">💰 Payment Information</h3>
                    <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0;">
                      The customer needs to pay a deposit of <strong>${deposit}</strong> to secure this booking. Please send payment instructions to the customer and confirm receipt of payment.
                    </p>
                  </div>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
                Please confirm this appointment and add it to your calendar if it hasn't been added automatically.
              </p>
              
              ${customerEmailError && customerEmail ? `
              <div style="background-color: #FFF0F7; border-left: 4px solid #733D26; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #733D26; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">⚠️ Customer Email Not Sent Automatically</h3>
                <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                  The customer confirmation email could not be sent automatically. Please manually send a confirmation email to:
                </p>
                <p style="color: #733D26; font-size: 14px; font-weight: bold; margin: 0 0 15px 0;">
                  ${customerEmail}
                </p>
                <div style="background-color: #F9D0DE; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p style="color: #733D26; font-size: 13px; font-weight: bold; margin: 0 0 10px 0;">Suggested Email Content:</p>
                  <p style="color: #333333; font-size: 12px; line-height: 1.6; margin: 0 0 5px 0;"><strong>Subject:</strong> Appointment Confirmation - LashDiary</p>
                  <p style="color: #333333; font-size: 12px; line-height: 1.6; margin: 0; white-space: pre-wrap;">Dear ${name},

Thank you for booking with LashDiary!

Your appointment details:
- Date: ${formattedDate}
- Time: ${formattedTime}
- Service: ${service || 'Lash Service'}
- Service Price: ${servicePrice}
- Deposit Required (35%): ${deposit}
- Location: ${location}

Important Reminders:
- Please ensure you have a clean, well-lit space ready
- If you live in a gated community, please notify security/gateman in advance
- Make sure the room is accessible and free from distractions
- Have a comfortable seating area prepared

If you have any questions, please contact us at ${OWNER_EMAIL}.

We look forward to seeing you!

Best regards,
The LashDiary Team</p>
                </div>
                <p style="color: #666666; font-size: 12px; margin: 15px 0 0 0;">
                  <strong>Note:</strong> To enable automatic customer emails, verify your domain in Resend (resend.com/domains) and update the FROM_EMAIL in your .env.local file to use your verified domain email.
                </p>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9D0DE; padding: 30px; text-align: center; border-top: 2px solid #733D26;">
              <p style="color: #733D26; font-size: 14px; margin: 0; font-weight: 600;">LashDiary Booking System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// Send email notification using Resend
export async function sendEmailNotification(bookingData: {
  name: string
  email: string
  phone: string
  service: string
  date: string
  timeSlot: string
  location: string
  isFirstTimeClient?: boolean
  originalPrice?: number
  discount?: number
  finalPrice?: number
  deposit?: number
}) {
  const { name, email, phone, service, date, timeSlot, location, isFirstTimeClient, originalPrice, discount, finalPrice, deposit } = bookingData
  let customerEmailError: string | null = null
  
  // Use provided pricing or calculate from service
  let servicePrice = originalPrice || 0
  let discountAmount = discount || 0
  let finalServicePrice = finalPrice || 0
  let depositAmount = deposit || 0

  // If pricing not provided, calculate from service
  if (!originalPrice || !deposit) {
    const depositInfo = calculateDeposit(service)
    servicePrice = depositInfo.servicePrice
    finalServicePrice = servicePrice
    if (isFirstTimeClient) {
      discountAmount = Math.round(servicePrice * 0.10)
      finalServicePrice = servicePrice - discountAmount
    }
    depositAmount = Math.round(finalServicePrice * 0.35)
  }
  
  // Format the date and time
  const appointmentDate = new Date(date)
  const appointmentTime = new Date(timeSlot)
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = appointmentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  // Calculate end time based on service duration
  const serviceDuration = serviceDurations[service] || 90 // Default to 90 minutes
  const endTime = new Date(appointmentTime)
  endTime.setMinutes(endTime.getMinutes() + serviceDuration)
  const formattedEndTime = endTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  // Format prices
  const servicePriceFormatted = servicePrice > 0 
    ? `KSH ${servicePrice.toLocaleString()}` 
    : 'Not specified'
  const discountFormatted = discountAmount > 0
    ? `KSH ${discountAmount.toLocaleString()}`
    : 'KSH 0'
  const finalPriceFormatted = finalServicePrice > 0
    ? `KSH ${finalServicePrice.toLocaleString()}`
    : servicePriceFormatted
  const depositFormatted = depositAmount > 0
    ? `KSH ${depositAmount.toLocaleString()}`
    : 'N/A'

  // If Resend is not configured, log and return
  if (!resend) {
    console.warn('⚠️ Resend API key not configured. Email notifications will not be sent.')
    console.warn('Please add RESEND_API_KEY to your .env.local file')
    console.log('=== NEW BOOKING REQUEST (Email not sent) ===')
    console.log('To:', OWNER_EMAIL)
    console.log('Subject: New Booking Request -', name)
    console.log('Client:', name, email, phone)
    console.log('Date:', formattedDate, formattedTime)
    console.log('==========================================')
    return { success: false, error: 'Email service not configured. Please add RESEND_API_KEY to .env.local' }
  }

  try {
    console.log('📧 Attempting to send emails via Resend...')
    console.log('From:', FROM_EMAIL)
    console.log('To Owner:', OWNER_EMAIL)
    console.log('To Customer:', email)
    
    // Send email to business owner (will include customer email details if customer email fails)
    let ownerEmailHtml = createOwnerEmailTemplate({
      name,
      email,
      phone,
      service: service || 'Not specified',
      formattedDate,
      formattedTime,
      formattedEndTime,
      location,
      deposit: depositFormatted,
      servicePrice: finalPriceFormatted,
      originalPrice: servicePriceFormatted,
      discount: discountFormatted,
      isFirstTimeClient: isFirstTimeClient === true,
    })
    
    // Try to send customer email first to check if it will fail
    let customerEmailId = null
    try {
      console.log('📧 Sending customer email to:', email)
      const customerEmailResult = await resend.emails.send({
        from: `LashDiary <${FROM_EMAIL}>`,
        to: email,
        subject: 'Appointment Confirmation - LashDiary',
        html: createCustomerEmailTemplate({
          name,
          email,
          service: service || 'Lash Service',
          formattedDate,
          formattedTime,
          formattedEndTime,
          location,
          deposit: depositFormatted,
          servicePrice: finalPriceFormatted,
        }),
      })
      
      // Log the full response to debug
      console.log('Customer email full response:', JSON.stringify(customerEmailResult, null, 2))
      
      // Check for error in response (Resend returns error as a property)
      if ((customerEmailResult as any).error) {
        customerEmailError = typeof (customerEmailResult as any).error === 'string' 
          ? (customerEmailResult as any).error 
          : JSON.stringify((customerEmailResult as any).error)
        console.error('❌ Customer email error from Resend:', (customerEmailResult as any).error)
        
        // Update owner email to include customer email details
        ownerEmailHtml = createOwnerEmailTemplate({
          name,
          email,
          phone,
          service: service || 'Not specified',
          formattedDate,
          formattedTime,
          formattedEndTime,
          location,
          deposit: depositFormatted,
          servicePrice: finalPriceFormatted,
          originalPrice: servicePriceFormatted,
          discount: discountFormatted,
          isFirstTimeClient: isFirstTimeClient === true,
        }, customerEmailError, email)
      } 
      // Check for data.id (success case)
      else if (customerEmailResult.data?.id) {
        customerEmailId = customerEmailResult.data.id
        console.log('✅ Customer email sent successfully! ID:', customerEmailId)
      } 
      // Check if response has id directly (alternative response structure)
      else if ((customerEmailResult as any).id) {
        customerEmailId = (customerEmailResult as any).id
        console.log('✅ Customer email sent successfully! ID (direct):', customerEmailId)
      }
      // No ID and no error - might be a silent failure
      else {
        const responseAny = customerEmailResult as any
        console.warn('⚠️ Customer email response missing ID and no error:', {
          hasData: !!customerEmailResult.data,
          hasError: !!responseAny.error,
          responseKeys: Object.keys(customerEmailResult),
          fullResponse: responseAny,
        })
        customerEmailError = 'Email sent but no confirmation ID received. Email may be queued or failed silently. Check Resend dashboard for delivery status.'
      }
    } catch (customerError: any) {
      customerEmailError = customerError.message || 'Unknown error'
      console.error('❌ Exception sending customer email:', customerError)
      console.error('Customer email error details:', {
        message: customerError.message,
        name: customerError.name,
        statusCode: customerError.statusCode,
        email: email,
        stack: customerError.stack,
      })
      
      // Update owner email to include customer email details
      ownerEmailHtml = createOwnerEmailTemplate({
        name,
        email,
        phone,
        service: service || 'Not specified',
        formattedDate,
        formattedTime,
          location,
          deposit: depositFormatted,
          servicePrice: finalPriceFormatted,
          originalPrice: servicePriceFormatted,
          discount: discountFormatted,
          isFirstTimeClient: isFirstTimeClient === true,
        }, customerEmailError, email)
    }
    
    // Send email to business owner
    const ownerEmailResult = await resend.emails.send({
      from: `LashDiary <${FROM_EMAIL}>`,
      to: OWNER_EMAIL,
      subject: `New Booking Request - ${name}`,
      html: ownerEmailHtml,
    })

    console.log('✅ Owner email sent:', ownerEmailResult.data?.id)

    console.log('🎉 Email sending completed!')
    console.log('Owner email ID:', ownerEmailResult.data?.id)
    console.log('Customer email ID:', customerEmailId)
    if (customerEmailError) {
      console.error('Customer email failed with error:', customerEmailError)
    }

    return { 
      success: true, 
      ownerEmailId: ownerEmailResult.data?.id,
      customerEmailId: customerEmailId,
      customerEmailError: customerEmailError,
      ownerEmailSent: !!ownerEmailResult.data?.id,
      customerEmailSent: !!customerEmailId,
    }
  } catch (error: any) {
    console.error('❌ Error sending emails:', error)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      statusCode: error.statusCode,
    })
    
    // Return more detailed error information
    return {
      success: false,
      error: error.message || 'Failed to send emails',
      details: `Resend API error: ${error.message || 'Unknown error'}`,
    }
  }
}

