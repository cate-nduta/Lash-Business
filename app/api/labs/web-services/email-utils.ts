import { sendEmailViaZoho, BUSINESS_NOTIFICATION_EMAIL, FROM_EMAIL, EMAIL_FROM_NAME } from '@/lib/email/zoho-config'

interface BuildNotificationEmailData {
  email: string
  name: string
  orderId: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
  }>
  total: number
  initialPayment: number
  remainingPayment: number
  timeline?: '10' | '21' | 'urgent' // Timeline selection from order
  consultationDate?: string // Consultation date (ISO string)
  consultationTimeSlot?: string // Consultation time slot (ISO string)
  consultationMeetingType?: 'google-meet' | 'phone-whatsapp' // Meeting type
}

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

export async function sendLabsBuildNotificationEmail(data: BuildNotificationEmailData) {
  const { email, name, orderId, items, total, initialPayment, remainingPayment, timeline, consultationDate, consultationTimeSlot, consultationMeetingType } = data
  
  // Determine timeline message based on selection
  let timelineMessage = '10-21 days'
  let timelineDescription = 'Standard delivery time'
  if (timeline === 'urgent') {
    timelineMessage = 'less than 10 days'
    timelineDescription = 'Urgent delivery (Priority)'
  } else if (timeline === '10') {
    timelineMessage = '10 days'
    timelineDescription = 'Fast Track delivery'
  } else if (timeline === '21') {
    timelineMessage = '21 days'
    timelineDescription = 'Standard delivery time'
  }

  const itemsList = items
    .map((item) => `• ${item.productName} (${item.quantity}x) - KES ${item.price.toLocaleString()}`)
    .join('<br>')

  // Format consultation time slot
  const formatConsultationTime = (timeSlot: string | undefined): string => {
    if (!timeSlot) return ''
    try {
      const timeDate = new Date(timeSlot)
      return timeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } catch {
      return timeSlot
    }
  }

  const consultationTimeLabel = formatConsultationTime(consultationTimeSlot)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Website Build Order Confirmed</title>
</head>
<body style="margin:0; padding:0; background:${EMAIL_STYLES.background}; font-family: Arial, sans-serif; color:${EMAIL_STYLES.textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${EMAIL_STYLES.background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${EMAIL_STYLES.card}; border-radius:18px; border:1px solid ${EMAIL_STYLES.accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${EMAIL_STYLES.card};">
              <h1 style="margin:0; font-size:32px; color:${EMAIL_STYLES.brand}; font-weight:600; line-height:1.3;">
                🎉 Your Order is Confirmed!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Hi ${name},
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Thank you for your order! We've received your payment and your order is now being worked on. Your website build has been queued and we're starting on it right away.
              </p>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">📋 Order Details</h2>
                <p style="margin:0 0 12px 0; font-size:14px; color:${EMAIL_STYLES.textSecondary};">
                  <strong>Order ID:</strong> ${orderId}
                </p>
                <div style="margin:12px 0; font-size:14px; color:${EMAIL_STYLES.textPrimary};">
                  <strong>Services Ordered:</strong><br>
                  <div style="margin-top:8px; line-height:1.8;">
                    ${itemsList}
                  </div>
                </div>
                <div style="margin-top:16px; padding-top:16px; border-top:1px solid ${EMAIL_STYLES.accent};">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:4px 0; color:${EMAIL_STYLES.textSecondary};">Total Order Value:</td>
                      <td style="padding:4px 0; color:${EMAIL_STYLES.textPrimary}; text-align:right; font-weight:600;">
                        KES ${total.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0; color:${EMAIL_STYLES.textSecondary};">Amount Paid:</td>
                      <td style="padding:4px 0; color:${EMAIL_STYLES.textPrimary}; text-align:right; font-weight:600;">
                        KES ${initialPayment.toLocaleString()}
                      </td>
                    </tr>
                    ${remainingPayment > 0 ? `
                    <tr>
                      <td style="padding:4px 0; color:${EMAIL_STYLES.textSecondary};">Remaining Balance:</td>
                      <td style="padding:4px 0; color:${EMAIL_STYLES.textPrimary}; text-align:right; font-weight:600;">
                        KES ${remainingPayment.toLocaleString()}
                      </td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
              </div>

              <div style="border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.accent}; margin-bottom:24px; border:2px solid ${EMAIL_STYLES.brand};">
                <h2 style="margin:0 0 12px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  ⏰ Build Timeline
                </h2>
                <p style="margin:0 0 8px 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  Your website build will be completed in <strong>${timelineMessage}</strong>${timeline ? ` (${timelineDescription})` : ''}.
                </p>
                <p style="margin:8px 0 0 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  We'll send you an email with your website details, login credentials, and a link to join a meeting 
                  where we'll walk you through everything once it's ready.
                </p>
              </div>
              
              ${consultationDate && consultationTimeSlot ? `
              <div style="border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.accent}; margin-bottom:24px; border:2px solid ${EMAIL_STYLES.brand};">
                <h2 style="margin:0 0 12px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  📞 Consultation Call Scheduled
                </h2>
                <p style="margin:0 0 8px 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  We'll be calling you on <strong>${new Date(consultationDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong> at the time you selected during checkout.
                </p>
                ${consultationTimeLabel ? `<p style="margin:0 0 8px 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;"><strong>Time:</strong> ${consultationTimeLabel}</p>` : ''}
                ${consultationMeetingType === 'google-meet' ? `
                <p style="margin:8px 0 0 0; color:${EMAIL_STYLES.textPrimary}; font-size:14px; line-height:1.7;">
                  This will be a <strong>Google Meet</strong> call. You'll receive a meeting link closer to the date.
                </p>
                ` : consultationMeetingType === 'phone-whatsapp' ? `
                <p style="margin:8px 0 0 0; color:${EMAIL_STYLES.textPrimary}; font-size:14px; line-height:1.7;">
                  This will be a <strong>phone or WhatsApp</strong> call. We'll call you directly at the number you provided.
                </p>
                ` : ''}
                <p style="margin:12px 0 0 0; color:${EMAIL_STYLES.textPrimary}; font-size:14px; line-height:1.7;">
                  During this call, we'll discuss your website requirements and answer any questions you may have.
                </p>
              </div>
              ` : ''}

              ${remainingPayment > 0 ? `
              <div style="border-radius:14px; padding:18px 20px; background:#FFF3CD; border:2px solid #FFC107; margin-bottom:24px;">
                <p style="margin:0; color:${EMAIL_STYLES.textPrimary}; font-size:14px; line-height:1.7;">
                  <strong>Note:</strong> You have a remaining balance of <strong>KES ${remainingPayment.toLocaleString()}</strong>. 
                  This will need to be paid before we send you your website details and meeting link.
                </p>
              </div>
              ` : ''}

              <p style="margin:24px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                If you have any questions, feel free to reach out to us. We're here to help!
              </p>
              <p style="margin:12px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                Best regards,<br>
                <strong>The LashDiary Labs Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await sendEmailViaZoho({
      to: email,
      subject: `Your Website Build Order Received - Order #${orderId}`,
      html,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error sending labs build notification email:', error)
    return { success: false, error: error.message }
  }
}

interface WebsiteDeliveryEmailData {
  email: string
  name: string
  orderId: string
  websiteName: string
  websiteUrl: string
  meetingLink: string
  items: Array<{
    productName: string
    quantity: number
  }>
}

export async function sendWebsiteDeliveryEmail(data: WebsiteDeliveryEmailData) {
  const { email, name, orderId, websiteName, websiteUrl, meetingLink, items } = data

  const itemsList = items.map((item) => `• ${item.productName} (${item.quantity}x)`).join('<br>')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Website is Ready!</title>
</head>
<body style="margin:0; padding:0; background:${EMAIL_STYLES.background}; font-family: Arial, sans-serif; color:${EMAIL_STYLES.textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${EMAIL_STYLES.background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${EMAIL_STYLES.card}; border-radius:18px; border:1px solid ${EMAIL_STYLES.accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${EMAIL_STYLES.card};">
              <h1 style="margin:0; font-size:32px; color:${EMAIL_STYLES.brand}; font-weight:600; line-height:1.3;">
                🎉 Your Website is Ready!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Hi ${name},
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Great news! Your website build is complete and ready for you. Here are all the details:
              </p>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">🌐 Website Details</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.6;">
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary}; width:140px;">Website Name:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textPrimary}; font-weight:600;">${websiteName}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary};">Website URL:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.brand};">
                      <a href="${websiteUrl}" style="color:${EMAIL_STYLES.brand}; text-decoration:underline;">${websiteUrl}</a>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">📋 Services Included</h2>
                <div style="font-size:14px; line-height:1.8; color:${EMAIL_STYLES.textPrimary};">
                  ${itemsList}
                </div>
              </div>

              <div style="border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.accent}; margin-bottom:24px; border:2px solid ${EMAIL_STYLES.brand}; text-align:center;">
                <h2 style="margin:0 0 12px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  🎥 Join Your Walkthrough Meeting
                </h2>
                <p style="margin:0 0 20px 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  We've scheduled a meeting to walk you through your new website and answer any questions you have.
                </p>
                <a href="${meetingLink}" style="display:inline-block; background:${EMAIL_STYLES.brand}; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
                  Join Meeting
                </a>
              </div>

              <p style="margin:24px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                If you have any questions or need assistance, don't hesitate to reach out!
              </p>
              <p style="margin:12px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                Best regards,<br>
                <strong>The LashDiary Labs Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await sendEmailViaZoho({
      to: email,
      subject: `Your Website is Ready! - ${websiteName}`,
      html,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error sending website delivery email:', error)
    return { success: false, error: error.message }
  }
}

interface ReferralCodeEmailData {
  email: string
  referralCode: string
  businessName: string
  orderTotal: number
  referralDiscountPercentage?: number
  referrerRewardPercentage?: number
}

export async function sendReferralCodeEmail(data: ReferralCodeEmailData) {
  const { email, referralCode, businessName, orderTotal, referralDiscountPercentage = 10, referrerRewardPercentage = 5 } = data

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'
  const referralLink = `${baseUrl}/labs/refer?code=${referralCode}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Referral Code - Share & Earn!</title>
</head>
<body style="margin:0; padding:0; background:${EMAIL_STYLES.background}; font-family: Arial, sans-serif; color:${EMAIL_STYLES.textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${EMAIL_STYLES.background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${EMAIL_STYLES.card}; border-radius:18px; border:1px solid ${EMAIL_STYLES.accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${EMAIL_STYLES.card};">
              <h1 style="margin:0; font-size:32px; color:${EMAIL_STYLES.brand}; font-weight:600; line-height:1.3;">
                🎁 Your Referral Code is Ready!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Hi ${businessName},
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Thank you for choosing LashDiary Labs! As a valued customer, you now have a special referral code to share with friends and colleagues.
              </p>

              <div style="border-radius:14px; padding:24px; background:${EMAIL_STYLES.accent}; margin-bottom:24px; border:2px solid ${EMAIL_STYLES.brand}; text-align:center;">
                <h2 style="margin:0 0 12px 0; font-size:20px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  Your Referral Code
                </h2>
                <div style="background:${EMAIL_STYLES.card}; border:2px dashed ${EMAIL_STYLES.brand}; border-radius:8px; padding:16px; margin:16px 0;">
                  <p style="margin:0; font-size:28px; font-weight:700; color:${EMAIL_STYLES.brand}; letter-spacing:2px; font-family:monospace;">
                    ${referralCode}
                  </p>
                </div>
                <p style="margin:16px 0 0 0; color:${EMAIL_STYLES.textPrimary}; font-size:14px; line-height:1.7;">
                  Share this code with anyone who needs web services. They get ${referralDiscountPercentage}% off the total price, and you earn ${referrerRewardPercentage}% of the total price as a reward!
                </p>
              </div>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">💰 Rewards & Benefits</h2>
                <div style="margin-bottom:16px; padding:12px; background:${EMAIL_STYLES.accent}; border-radius:8px;">
                  <p style="margin:0 0 8px 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; font-weight:600;">
                    For Your Friends:
                  </p>
                  <p style="margin:0; color:${EMAIL_STYLES.textPrimary}; font-size:14px;">
                    They get <strong>${referralDiscountPercentage}% off the total price</strong> of their order when they use your code!
                  </p>
                </div>
                <div style="padding:12px; background:${EMAIL_STYLES.accent}; border-radius:8px;">
                  <p style="margin:0 0 8px 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; font-weight:600;">
                    For You:
                  </p>
                  <p style="margin:0; color:${EMAIL_STYLES.textPrimary}; font-size:14px;">
                    You earn <strong>${referrerRewardPercentage}% of the total price</strong> they paid as a reward! (Reward will be processed after their payment is completed)
                  </p>
                </div>
              </div>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">📋 How It Works</h2>
                <ol style="margin:0; padding-left:20px; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.8;">
                  <li style="margin-bottom:8px;">Share your referral code with friends, family, or colleagues</li>
                  <li style="margin-bottom:8px;">They can use it when booking any tier on our <a href="${baseUrl}/labs" style="color:${EMAIL_STYLES.brand}; text-decoration:underline;">Labs page</a> or on the <a href="${baseUrl}/labs/custom-website-builds" style="color:${EMAIL_STYLES.brand}; text-decoration:underline;">Custom Website Builds</a> page</li>
                  <li style="margin-bottom:8px;">During checkout, they enter your referral code</li>
                  <li style="margin-bottom:8px;">They get ${referralDiscountPercentage}% off the total price they pay, and you earn ${referrerRewardPercentage}% of the total price as a reward!</li>
                </ol>
              </div>

              <div style="text-align:center; margin:24px 0;">
                <a href="${referralLink}" style="display:inline-block; background:${EMAIL_STYLES.brand}; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
                  View Referral Page
                </a>
              </div>

              <p style="margin:24px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                Thank you for being part of the LashDiary Labs community!
              </p>
              <p style="margin:12px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                Best regards,<br>
                <strong>The LashDiary Labs Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await sendEmailViaZoho({
      to: email,
      subject: `Your LashDiary Labs Referral Code - Share & Earn!`,
      html,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error sending referral code email:', error)
    return { success: false, error: error.message }
  }
}

interface ReferralCodeUsedNotificationData {
  referrerEmail: string
  referralCode: string
  customerEmail: string
  orderTotal: number
  rewardPercentage: number
  rewardAmount: number
}

export async function sendReferralCodeUsedNotification(data: ReferralCodeUsedNotificationData) {
  const { referrerEmail, referralCode, customerEmail, orderTotal, rewardPercentage, rewardAmount } = data

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Referral Code Was Used!</title>
</head>
<body style="margin:0; padding:0; background:${EMAIL_STYLES.background}; font-family: Arial, sans-serif; color:${EMAIL_STYLES.textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${EMAIL_STYLES.background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${EMAIL_STYLES.card}; border-radius:18px; border:1px solid ${EMAIL_STYLES.accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${EMAIL_STYLES.card};">
              <h1 style="margin:0; font-size:32px; color:${EMAIL_STYLES.brand}; font-weight:600; line-height:1.3;">
                🎉 Your Referral Code Was Used!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Great news! Someone used your referral code and completed their payment.
              </p>

              <div style="border-radius:14px; padding:24px; background:${EMAIL_STYLES.accent}; margin-bottom:24px; border:2px solid ${EMAIL_STYLES.brand};">
                <h2 style="margin:0 0 16px 0; font-size:20px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  Referral Details
                </h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.8;">
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary}; width:160px;">Referral Code:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textPrimary}; font-weight:600; font-family:monospace;">${referralCode}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary};">Customer Email:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textPrimary};">${customerEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary};">Total Order Value:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textPrimary}; font-weight:600;">KES ${orderTotal.toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              <div style="border-radius:14px; padding:24px; background:#E8F5E9; margin-bottom:24px; border:2px solid #4CAF50;">
                <h2 style="margin:0 0 16px 0; font-size:20px; color:#2E7D32; font-weight:600;">
                  💰 Your Reward
                </h2>
                <p style="margin:0 0 12px 0; color:${EMAIL_STYLES.textPrimary}; font-size:16px;">
                  <strong>You earned ${rewardPercentage}% of the total price they paid!</strong>
                </p>
                <div style="background:${EMAIL_STYLES.card}; border-radius:8px; padding:16px; margin-top:12px; text-align:center;">
                  <p style="margin:0; font-size:32px; font-weight:700; color:#2E7D32;">
                    KES ${rewardAmount.toLocaleString()}
                  </p>
                  <p style="margin:8px 0 0 0; font-size:14px; color:${EMAIL_STYLES.textSecondary};">
                    Reward Amount
                  </p>
                </div>
                <p style="margin:16px 0 0 0; color:${EMAIL_STYLES.textPrimary}; font-size:14px; line-height:1.7;">
                  Your compensation will be processed and sent to you. We'll contact you with the details on how you'll receive your reward.
                </p>
              </div>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <p style="margin:0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  <strong>Payment Status:</strong> ✅ Payment completed successfully
                </p>
                <p style="margin:12px 0 0 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  <strong>Referral Code Status:</strong> ✅ Code has been used
                </p>
              </div>

              <p style="margin:24px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                Thank you for referring customers to LashDiary Labs! Your support helps us grow and serve more businesses.
              </p>
              <p style="margin:12px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                Best regards,<br>
                <strong>The LashDiary Labs Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await sendEmailViaZoho({
      to: referrerEmail,
      subject: `🎉 Your Referral Code Was Used - You Earned KES ${rewardAmount.toLocaleString()}!`,
      html,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error sending referral code used notification:', error)
    return { success: false, error: error.message }
  }
}

interface WaitlistNotificationEmailData {
  email: string
  monthlyCapacity: number
}

export async function sendWaitlistNotificationEmail(data: WaitlistNotificationEmailData) {
  const { email, monthlyCapacity } = data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'
  const buildPageLink = `${baseUrl}/labs/custom-website-builds`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Services Are Now Available!</title>
</head>
<body style="margin:0; padding:0; background:${EMAIL_STYLES.background}; font-family: Arial, sans-serif; color:${EMAIL_STYLES.textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${EMAIL_STYLES.background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${EMAIL_STYLES.card}; border-radius:18px; border:1px solid ${EMAIL_STYLES.accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${EMAIL_STYLES.card};">
              <h1 style="margin:0; font-size:32px; color:${EMAIL_STYLES.brand}; font-weight:600; line-height:1.3;">
                🎉 Web Services Are Now Available!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Great news! We're now accepting new web service orders for this month.
              </p>

              <div style="border-radius:14px; padding:24px; background:${EMAIL_STYLES.accent}; margin-bottom:24px; border:2px solid ${EMAIL_STYLES.brand};">
                <h2 style="margin:0 0 16px 0; font-size:20px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  Limited Slots Available
                </h2>
                <p style="margin:0 0 12px 0; color:${EMAIL_STYLES.textPrimary}; font-size:16px; font-weight:600;">
                  We have <strong>${monthlyCapacity} slots</strong> available this month!
                </p>
                <p style="margin:0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  Don't miss out - secure your spot now by building your custom website.
                </p>
              </div>

              <div style="text-align:center; margin:24px 0;">
                <a href="${buildPageLink}" style="display:inline-block; background:${EMAIL_STYLES.brand}; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
                  Start Building Your Website
                </a>
              </div>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  What You Can Build
                </h2>
                <ul style="margin:0; padding-left:20px; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.8;">
                  <li style="margin-bottom:8px;">Custom websites tailored to your business needs</li>
                  <li style="margin-bottom:8px;">Domain and hosting services</li>
                  <li style="margin-bottom:8px;">Professional email accounts</li>
                  <li style="margin-bottom:8px;">Contact forms and interactive features</li>
                  <li>And much more!</li>
                </ul>
              </div>

              <p style="margin:24px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                We take on a limited number of projects each month to ensure quality delivery. 
                Slots fill up quickly, so we recommend securing your spot soon.
              </p>
              <p style="margin:12px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                Best regards,<br>
                <strong>The LashDiary Labs Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await sendEmailViaZoho({
      to: email,
      subject: `🎉 Web Services Are Now Available - ${monthlyCapacity} Slots Open!`,
      html,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error sending waitlist notification email:', error)
    return { success: false, error: error.message }
  }
}

interface CheckoutReminderEmailData {
  recipientEmail: string
  recipientName: string
  checkoutLink: string
  items: Array<{
    productName: string
    quantity: number
    price: number
  }>
  totalAmount: number
  orderId: string
}

export async function sendCheckoutReminderEmail(data: CheckoutReminderEmailData) {
  const { recipientEmail, recipientName, checkoutLink, items, totalAmount, orderId } = data

  const itemsHtml = items.map(item => `
    <li style="margin-bottom: 8px; font-size: 15px; color: ${EMAIL_STYLES.textPrimary};">
      ${item.productName} (x${item.quantity}) - KES ${item.price.toLocaleString()}
    </li>
  `).join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You were almost set up — need help finishing your order?</title>
</head>
<body style="margin:0; padding:0; background:${EMAIL_STYLES.background}; font-family: Arial, sans-serif; color:${EMAIL_STYLES.textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${EMAIL_STYLES.background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${EMAIL_STYLES.card}; border-radius:18px; border:1px solid ${EMAIL_STYLES.accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${EMAIL_STYLES.card};">
              <h1 style="margin:0; font-size:32px; color:${EMAIL_STYLES.brand}; font-weight:600; line-height:1.3;">
                🤎 Oops! You were almost set up!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Hi ${recipientName},
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                I noticed you were in the process of booking a service on LashDiary Labs but didn't complete checkout.
              </p>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  Your Cart Summary:
                </h2>
                <ul style="margin:0; padding:0 0 0 20px; list-style-type:disc;">
                  ${itemsHtml}
                </ul>
                <p style="margin:20px 0 0 0; font-size:16px; font-weight:bold; color:${EMAIL_STYLES.brand};">
                  Total: KES ${totalAmount.toLocaleString()}
                </p>
              </div>

              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                If you had a question, hit a snag, or weren't sure which option to choose, I'm happy to help clarify before you proceed.
              </p>
              <p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Your selected service is still available, and you can complete your checkout here:
              </p>

              <div style="text-align:center; margin-bottom:24px;">
                <a href="${checkoutLink}" style="display:inline-block; background:${EMAIL_STYLES.brand}; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px;">
                  Complete Your Order
                </a>
              </div>

              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                If your needs changed or you're looking for something slightly different, you can also book a short consultation at <a href="https://lashdiary.co.ke/labs/book-appointment" style="color:${EMAIL_STYLES.brand}; text-decoration:underline;">https://lashdiary.co.ke/labs/book-appointment</a> and we'll scope it properly.
              </p>

              <div style="border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.accent}; margin-bottom:24px; border:2px solid ${EMAIL_STYLES.brand};">
                <h2 style="margin:0 0 12px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  Why Build Your Own Website?
                </h2>
                <ul style="margin:0; padding:0 0 0 20px; list-style-type:disc; font-size:15px; line-height:1.7; color:${EMAIL_STYLES.textPrimary};">
                  <li style="margin-bottom:10px;">
                    <strong>Professional Presence:</strong> Establish credibility and showcase your brand 24/7.
                  </li>
                  <li style="margin-bottom:10px;">
                    <strong>Reach More Clients:</strong> Expand your reach beyond social media and local searches.
                  </li>
                  <li style="margin-bottom:10px;">
                    <strong>Streamline Operations:</strong> Integrate booking, payments, and client management.
                  </li>
                  <li>
                    <strong>Own Your Platform:</strong> Full control over your content, data, and customer experience.
                  </li>
                </ul>
              </div>

              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                No pressure — just making sure you have what you need to move forward smoothly.
              </p>
              <p style="margin:12px 0 0 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Warm regards,<br>
                <strong>Catherine</strong><br>
                Founder, LashDiary Labs
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await sendEmailViaZoho({
      to: recipientEmail,
      subject: `You were almost set up — need help finishing your order?`,
      html,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error sending checkout reminder email:', error)
    return { success: false, error: error.message }
  }
}

interface YearlySubscriptionReminderData {
  name: string
  email: string
  amount: number
  paymentLink: string
  yearlyItems: Array<{
    productId: string
    productName: string
    quantity: number
    annualPrice: number
  }>
}

export async function sendYearlySubscriptionReminderEmail(data: YearlySubscriptionReminderData) {
  const { name, email, amount, paymentLink, yearlyItems } = data

  const itemsList = yearlyItems
    .map((item) => `• ${item.productName} (${item.quantity}x) - KES ${item.annualPrice.toLocaleString()}/year`)
    .join('<br>')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Annual Subscription Renewal</title>
</head>
<body style="margin:0; padding:0; background-color:${EMAIL_STYLES.background}; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${EMAIL_STYLES.background}; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:${EMAIL_STYLES.card}; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg, ${EMAIL_STYLES.brand} 0%, #8B5A3C 100%); padding:32px; text-align:center;">
              <h1 style="margin:0; color:#FFFFFF; font-size:28px; font-weight:600;">
                Annual Subscription Renewal
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Hi ${name},
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Your annual subscription renewal is due. Please complete your payment to continue enjoying our services.
              </p>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">📋 Your Annual Subscriptions</h2>
                <div style="font-size:14px; line-height:1.8; color:${EMAIL_STYLES.textPrimary}; margin-bottom:16px;">
                  ${itemsList}
                </div>
                <div style="border-top:2px solid ${EMAIL_STYLES.accent}; padding-top:16px; margin-top:16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:16px; font-weight:600; color:${EMAIL_STYLES.textPrimary};">Total Annual Amount:</span>
                    <span style="font-size:20px; font-weight:700; color:${EMAIL_STYLES.brand};">KES ${amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div style="border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.accent}; margin-bottom:24px; border:2px solid ${EMAIL_STYLES.brand}; text-align:center;">
                <h2 style="margin:0 0 12px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  💳 Complete Your Payment
                </h2>
                <p style="margin:0 0 20px 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  Click the button below to pay your annual subscription using our secure payment gateway.
                </p>
                <a href="${paymentLink}" style="display:inline-block; background:${EMAIL_STYLES.brand}; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
                  Pay KES ${amount.toLocaleString()}
                </a>
              </div>

              <p style="margin:24px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                If you have any questions or need assistance, please don't hesitate to reach out to us.
              </p>
              <p style="margin:12px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                Best regards,<br>
                <strong>Catherine</strong><br>
                Founder, LashDiary Labs
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:${EMAIL_STYLES.accent}; padding:20px 32px; text-align:center; border-top:1px solid ${EMAIL_STYLES.accent};">
              <p style="margin:0; font-size:12px; color:${EMAIL_STYLES.textSecondary};">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await sendEmailViaZoho({
      to: email,
      subject: `Annual Subscription Renewal - KES ${amount.toLocaleString()}`,
      html,
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error sending yearly subscription reminder email:', error)
    throw error
  }
}

interface OnboardingEmailData {
  email: string
  name: string
  orderId: string
  websiteName: string
  websiteUrl: string
  emailDomain: string
  emailPassword: string
  showcaseBookingUrl: string
  items: Array<{
    productName: string
    quantity: number
  }>
}

export async function sendOnboardingEmail(data: OnboardingEmailData) {
  const { email, name, orderId, websiteName, websiteUrl, emailDomain, emailPassword, showcaseBookingUrl, items } = data

  const itemsList = items
    .map((item) => `• ${item.productName} (${item.quantity}x)`)
    .join('<br>')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Your New Website - Onboarding Guide</title>
</head>
<body style="margin:0; padding:0; background:${EMAIL_STYLES.background}; font-family: Arial, sans-serif; color:${EMAIL_STYLES.textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${EMAIL_STYLES.background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${EMAIL_STYLES.card}; border-radius:18px; border:1px solid ${EMAIL_STYLES.accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${EMAIL_STYLES.card};">
              <h1 style="margin:0; font-size:32px; color:${EMAIL_STYLES.brand}; font-weight:600; line-height:1.3;">
                🎉 Welcome to Your New Website!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Hi ${name},
              </p>
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Great news! Your website build is complete and ready for you. We're excited to help you get started!
              </p>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">🌐 Website Details</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.6;">
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary}; width:140px;">Website Name:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textPrimary}; font-weight:600;">${websiteName}</td>
                  </tr>
                  ${websiteUrl ? `
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary};">Website URL:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.brand};">
                      <a href="${websiteUrl}" style="color:${EMAIL_STYLES.brand}; text-decoration:underline;">${websiteUrl}</a>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">📧 Email Account Details</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.6;">
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary}; width:140px;">Email Domain:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textPrimary}; font-weight:600;">${emailDomain}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary};">Email Password:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textPrimary}; font-weight:600; font-family:monospace; background:${EMAIL_STYLES.accent}; padding:4px 8px; border-radius:4px; display:inline-block;">${emailPassword}</td>
                  </tr>
                </table>
                <p style="margin:16px 0 0 0; font-size:13px; color:${EMAIL_STYLES.textSecondary}; line-height:1.5;">
                  <strong>💡 How to Access Your Email:</strong><br>
                  You can access your email through your email client (Outlook, Gmail app, Apple Mail, etc.) or through your email provider's webmail interface. Use the domain and password above to set up your email account.
                </p>
              </div>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">📋 Services Included</h2>
                <div style="font-size:14px; line-height:1.8; color:${EMAIL_STYLES.textPrimary};">
                  ${itemsList}
                </div>
              </div>

              <div style="border:1px solid ${EMAIL_STYLES.accent}; border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.background}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">📚 How to Use Your Website</h2>
                <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                  Your website is fully functional and ready to use! Here's a guide to help you get started:
                </p>
                <ul style="margin:12px 0; padding-left:20px; font-size:14px; line-height:1.8; color:${EMAIL_STYLES.textPrimary};">
                  <li><strong>Access Your Website:</strong> Visit ${websiteUrl || 'your website URL'} to view your live website. All your services and features are active and ready to use.</li>
                  <li><strong>Admin Dashboard:</strong> Log in to your website's admin panel using your credentials to manage content, add new pages, update existing information, and customize your website settings.</li>
                  <li><strong>Email Setup:</strong> Use the email domain (${emailDomain}) and password provided above to configure your business email on any email client (Outlook, Gmail app, Apple Mail, Thunderbird, etc.) or access it through your email provider's webmail interface.</li>
                  <li><strong>Content Updates:</strong> You can easily update your website content, add blog posts, manage products/services, and modify any information directly from your admin dashboard.</li>
                  <li><strong>Domain & Hosting:</strong> Your domain is already configured and pointing to your website. All hosting services are active and managed for you.</li>
                  <li><strong>Getting Help:</strong> If you have any questions or need assistance with your website, don't hesitate to reach out to us at hello@lashdiary.co.ke. We're here to help!</li>
                </ul>
                <p style="margin:16px 0 0 0; font-size:13px; color:${EMAIL_STYLES.textSecondary}; line-height:1.6; font-style:italic;">
                  💡 <strong>Tip:</strong> During your showcase meeting, we'll walk you through all these features in detail and show you exactly how to use everything!
                </p>
              </div>

              <div style="border-radius:14px; padding:20px 24px; background:${EMAIL_STYLES.accent}; margin-bottom:24px; border:2px solid ${EMAIL_STYLES.brand}; text-align:center;">
                <h2 style="margin:0 0 12px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  🎥 Book Your Showcase Meeting
                </h2>
                <p style="margin:0 0 20px 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  We'd love to schedule a personalized walkthrough of your new website! During this meeting, we'll cover:
                </p>
                <ul style="margin:0 0 20px 0; padding-left:20px; text-align:left; display:inline-block; font-size:14px; line-height:1.8; color:${EMAIL_STYLES.textPrimary};">
                  <li>Complete walkthrough of your website features</li>
                  <li>How to manage and update your content</li>
                  <li>Email setup and configuration</li>
                  <li>Best practices and tips for your website</li>
                  <li>Answer any questions you may have</li>
                </ul>
                <p style="margin:0 0 20px 0; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.7;">
                  You can choose between an <strong>online meeting</strong> or a <strong>physical meeting</strong> at our studio, and select a time that works best for you.
                </p>
                <a href="${showcaseBookingUrl}" style="display:inline-block; background:${EMAIL_STYLES.brand}; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px; margin-top:12px;">
                  Book Your Showcase Meeting
                </a>
              </div>

              <p style="margin:24px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                If you have any questions or need assistance, don't hesitate to reach out!
              </p>
              <p style="margin:12px 0 0 0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textSecondary};">
                Best regards,<br>
                <strong>Catherine, Founder</strong><br>
                <strong>LashDiary Labs</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await sendEmailViaZoho({
      to: email,
      subject: `Welcome to ${websiteName} - Your Website is Ready!`,
      html,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error sending onboarding email:', error)
    return { success: false, error: error.message }
  }
}
