import nodemailer from 'nodemailer'

const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
const OWNER_EMAIL = BUSINESS_NOTIFICATION_EMAIL
const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com'
const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465)
const ZOHO_SMTP_USER =
  process.env.ZOHO_SMTP_USER || process.env.ZOHO_SMTP_USERNAME || process.env.ZOHO_USERNAME || ''
const ZOHO_SMTP_PASS =
  process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_APP_PASSWORD || ''
const ZOHO_FROM_EMAIL =
  process.env.ZOHO_FROM_EMAIL ||
  process.env.ZOHO_FROM ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : '') ||
  BUSINESS_NOTIFICATION_EMAIL
const FROM_EMAIL =
  process.env.FROM_EMAIL ||
  ZOHO_FROM_EMAIL ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : BUSINESS_NOTIFICATION_EMAIL)
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'The LashDiary'

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

const zohoTransporter =
  ZOHO_SMTP_USER && ZOHO_SMTP_PASS
    ? nodemailer.createTransport({
        host: ZOHO_SMTP_HOST,
        port: ZOHO_SMTP_PORT,
        secure: ZOHO_SMTP_PORT === 465,
        auth: {
          user: ZOHO_SMTP_USER,
          pass: ZOHO_SMTP_PASS,
        },
      })
    : null

function createOrderReadyEmailTemplate(data: {
  productName: string
  orderId: string
  pickupLocation: string
  pickupDays: string[]
}) {
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const pickupDaysText =
    data.pickupDays.length === 1
      ? data.pickupDays[0]
      : data.pickupDays.length === 2
      ? `${data.pickupDays[0]} and ${data.pickupDays[1]}`
      : `${data.pickupDays.slice(0, -1).join(', ')}, and ${data.pickupDays[data.pickupDays.length - 1]}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your order is ready for pickup</title>
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'Helvetica Neue', Arial, sans-serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${card}; border-radius:18px; border:1px solid ${accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:32px 32px 24px 32px; background:${card}; text-align:center;">
              <h1 style="margin:0; font-size:28px; color:${brand}; font-weight:600;">Your order is ready! 🥰</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px; background:${card};">
              <p style="margin:0 0 18px 0; font-size:16px; color:${textPrimary}; line-height:1.6;">
                🥰 Great news! Your order for <strong>${data.productName}</strong> is ready for pickup. 💋
              </p>

              <div style="background:${background}; border-radius:12px; padding:20px; margin:20px 0; border:1px solid ${accent};">
                <h2 style="margin:0 0 12px 0; font-size:18px; color:${brand}; font-weight:600;">Pickup Information</h2>
                <p style="margin:0 0 10px 0; font-size:15px; color:${textPrimary};">
                  <strong>Location:</strong> ${data.pickupLocation}
                </p>
                <p style="margin:0; font-size:15px; color:${textPrimary};">
                  <strong>Available on:</strong> ${pickupDaysText}
                </p>
                <p style="margin:10px 0 0 0; font-size:14px; color:${textSecondary};">
                  Please bring a valid ID when picking up your order.
                </p>
              </div>

              <p style="margin:18px 0 0 0; font-size:14px; color:${textSecondary};">
                Order ID: <strong>${data.orderId}</strong>
              </p>

              <p style="margin:18px 0 0 0; font-size:14px; color:${textSecondary};">
                If you have any questions, feel free to reply to this email or contact us at <a href="mailto:${OWNER_EMAIL}" style="color:${brand}; text-decoration:none; font-weight:600;">${OWNER_EMAIL}</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:13px; color:${textSecondary};">🥰 We're so excited to see you! 💋</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 The LashDiary Team 🥰</p>
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

function createOrderConfirmationEmailTemplate(data: {
  productName: string
  orderId: string
  amount: number
  subtotal: number
  transportationFee: number
  deliveryOption: 'pickup' | 'delivery'
  deliveryAddress?: string
  pickupLocation: string
  pickupDays: string[]
}) {
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const pickupDaysText =
    data.pickupDays.length === 1
      ? data.pickupDays[0]
      : data.pickupDays.length === 2
      ? `${data.pickupDays[0]} and ${data.pickupDays[1]}`
      : `${data.pickupDays.slice(0, -1).join(', ')}, and ${data.pickupDays[data.pickupDays.length - 1]}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'Helvetica Neue', Arial, sans-serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${card}; border-radius:18px; border:1px solid ${accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:32px 32px 24px 32px; background:${card}; text-align:center;">
              <h1 style="margin:0; font-size:28px; color:${brand}; font-weight:600;">Order Confirmed! 🌈</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px; background:${card};">
              <p style="margin:0 0 18px 0; font-size:16px; color:${textPrimary}; line-height:1.6;">
                🥰 Thank you for your purchase! Your order for <strong>${data.productName}</strong> has been confirmed. 💋
              </p>

              <div style="background:${background}; border-radius:12px; padding:20px; margin:20px 0; border:1px solid ${accent};">
                <h2 style="margin:0 0 16px 0; font-size:18px; color:${brand}; font-weight:600;">Order Details</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.8;">
                  <tr>
                    <td style="padding:4px 0; color:${textSecondary}; width:140px;">Order ID:</td>
                    <td style="padding:4px 0; color:${textPrimary}; font-weight:600;">${data.orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; color:${textSecondary};">Product:</td>
                    <td style="padding:4px 0; color:${textPrimary};">${data.productName}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; color:${textSecondary};">Subtotal:</td>
                    <td style="padding:4px 0; color:${textPrimary};">${data.subtotal.toLocaleString()} KES</td>
                  </tr>
                  ${data.deliveryOption === 'pickup'
                    ? `<tr>
                        <td style="padding:4px 0; color:${textSecondary};">Pickup Fee:</td>
                        <td style="padding:4px 0; color:${textPrimary};">${data.transportationFee.toLocaleString()} KES</td>
                      </tr>`
                    : ''}
                  <tr style="border-top:1px solid ${accent};">
                    <td style="padding:8px 0 4px 0; color:${brand}; font-weight:600; font-size:16px;">Total:</td>
                    <td style="padding:8px 0 4px 0; color:${brand}; font-weight:600; font-size:16px;">${data.amount.toLocaleString()} KES</td>
                  </tr>
                </table>
              </div>

              ${data.deliveryOption === 'pickup'
                ? `<div style="background:${background}; border-radius:12px; padding:20px; margin:20px 0; border:1px solid ${accent};">
                    <h2 style="margin:0 0 16px 0; font-size:18px; color:${brand}; font-weight:600;">Pickup Information</h2>
                    <p style="margin:0 0 12px 0; font-size:15px; color:${textPrimary};">
                      <strong>Pickup Location:</strong> ${data.pickupLocation}
                    </p>
                    <p style="margin:0 0 12px 0; font-size:15px; color:${textPrimary};">
                      <strong>Available for Pickup:</strong> ${pickupDaysText}
                    </p>
                    <p style="margin:12px 0 0 0; font-size:14px; color:${textSecondary}; line-height:1.6;">
                      You'll receive another email when your order is ready for pickup at the location. Please bring a valid ID when collecting your order.
                    </p>
                  </div>`
                : `<div style="background:${background}; border-radius:12px; padding:20px; margin:20px 0; border:1px solid ${accent};">
                    <h2 style="margin:0 0 16px 0; font-size:18px; color:${brand}; font-weight:600;">Delivery Information</h2>
                    <p style="margin:0 0 12px 0; font-size:15px; color:${textPrimary};">
                      <strong>Delivery Address:</strong> ${data.deliveryAddress || 'Not provided'}
                    </p>
                    <p style="margin:12px 0 0 0; font-size:14px; color:${textSecondary}; line-height:1.6;">
                      We'll deliver your order directly to your home address. You'll receive another email when your order is ready for delivery. Our delivery partner (Pick up Mtaani) will coordinate the delivery with you.
                    </p>
                  </div>`}

              <p style="margin:20px 0 0 0; font-size:14px; color:${textSecondary};">
                If you have any questions, feel free to reply to this email or contact us at <a href="mailto:${OWNER_EMAIL}" style="color:${brand}; text-decoration:none; font-weight:600;">${OWNER_EMAIL}</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:13px; color:${textSecondary};">🥰 Thank you for shopping with us! 💋</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 The LashDiary Team 🥰</p>
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

export async function sendShopOrderConfirmationEmail(data: {
  email?: string
  phoneNumber?: string
  productName: string
  orderId: string
  amount: number
  subtotal: number
  transportationFee: number
  deliveryOption: 'pickup' | 'delivery'
  deliveryAddress?: string
  pickupLocation: string
  pickupDays: string[]
}): Promise<void> {
  if (!zohoTransporter) {
    console.warn('Email transporter not configured. Cannot send order confirmation email.')
    return
  }

  // Only send email if email address is provided
  if (!data.email) {
    console.log('No email address provided, skipping order confirmation email')
    return
  }

  try {
    const htmlContent = createOrderConfirmationEmailTemplate(data)

    await zohoTransporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.email,
      subject: `Thank You for Your Purchase! Order #${data.orderId} 🤎`,
      html: htmlContent,
      text: `Thank you for your purchase! Order ID: ${data.orderId}, Product: ${data.productName}, Total: ${data.amount.toLocaleString()} KES. ${data.deliveryOption === 'pickup' ? `Pickup Location: ${data.pickupLocation}. Available for pickup: ${data.pickupDays.join(', ')}.` : `Delivery Address: ${data.deliveryAddress || 'Not provided'}.`} You'll receive another email when your order is ready.`,
    })

    console.log(`✅ Order confirmation email sent to ${data.email} for order ${data.orderId}`)
  } catch (error) {
    console.error('Error sending order confirmation email:', error)
    throw error
  }
}

export async function sendShopOrderReadyEmail(data: {
  email: string
  productName: string
  orderId: string
  pickupLocation: string
  pickupDays: string[]
}): Promise<void> {
  if (!zohoTransporter) {
    console.warn('Email transporter not configured. Cannot send order ready email.')
    return
  }

  try {
    const htmlContent = createOrderReadyEmailTemplate(data)

    await zohoTransporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.email,
      subject: `Great News! Your Order is Ready for Collection 🤎`,
      html: htmlContent,
      text: `Your order for ${data.productName} is ready for pickup at ${data.pickupLocation}. Available on: ${data.pickupDays.join(', ')}. Order ID: ${data.orderId}`,
    })

    console.log(`✅ Order ready email sent to ${data.email} for order ${data.orderId}`)
  } catch (error) {
    console.error('Error sending order ready email:', error)
    throw error
  }
}

