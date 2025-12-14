import { sendEmailViaZoho, FROM_EMAIL, EMAIL_FROM_NAME, BUSINESS_NOTIFICATION_EMAIL } from '@/lib/email/zoho-config'
import { sendBusinessEmail } from '@/lib/labs-email-utils'

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

export interface PaymentReceiptData {
  // Recipient info
  recipientEmail: string
  recipientName: string
  
  // Payment details
  amount: number
  currency: string
  paymentMethod: string
  transactionId: string
  transactionDate: string
  
  // Business/Order info
  businessName?: string
  orderId?: string
  bookingId?: string
  serviceName?: string
  
  // For Labs orders
  labsOrderId?: string
  tierName?: string
  
  // Additional details
  description?: string
  mpesaReceiptNumber?: string
}

function createReceiptEmailTemplate(data: PaymentReceiptData, isLabsOrder: boolean = false): string {
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const friendlyName = data.recipientName?.split(' ')[0] || 'Customer'
  const formattedAmount = data.currency === 'USD' 
    ? `$${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `KSH ${data.amount.toLocaleString('en-US')}`
  
  const formattedDate = new Date(data.transactionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Serif+Text&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'DM Serif Text', Georgia, serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${card}; border-radius:18px; border:1px solid ${accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${card};">
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">💰 Payment Receipt</p>
              <h1 style="margin:12px 0 0 0; font-size:36px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600; line-height:1.3; letter-spacing:0.5px;">Payment Confirmed</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                Hi ${friendlyName},<br><br>
                Thank you for your payment! This is your receipt for the transaction below.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <div style="background:${accent}; border-radius:12px; padding:24px; margin:0 0 24px 0;">
                <h2 style="margin:0 0 20px 0; font-size:24px; color:${brand}; font-family:'Playfair Display', Georgia, serif; font-weight:600;">
                  Payment Details
                </h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px; line-height:1.8;">
                  <tr>
                    <td style="padding:8px 0; color:${textSecondary}; width:140px;">Amount Paid</td>
                    <td style="padding:8px 0; color:${textPrimary}; font-weight:600; font-size:18px;">${formattedAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; color:${textSecondary};">Payment Method</td>
                    <td style="padding:8px 0; color:${textPrimary};">${data.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; color:${textSecondary};">Transaction ID</td>
                    <td style="padding:8px 0; color:${textPrimary}; font-family:monospace; font-size:14px;">${data.transactionId}</td>
                  </tr>
                  ${data.mpesaReceiptNumber ? `
                  <tr>
                    <td style="padding:8px 0; color:${textSecondary};">M-Pesa Receipt</td>
                    <td style="padding:8px 0; color:${textPrimary}; font-family:monospace; font-size:14px;">${data.mpesaReceiptNumber}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding:8px 0; color:${textSecondary};">Date & Time</td>
                    <td style="padding:8px 0; color:${textPrimary};">${formattedDate}</td>
                  </tr>
                  ${data.orderId ? `
                  <tr>
                    <td style="padding:8px 0; color:${textSecondary};">Order ID</td>
                    <td style="padding:8px 0; color:${textPrimary}; font-family:monospace; font-size:14px;">${data.orderId}</td>
                  </tr>
                  ` : ''}
                  ${data.bookingId ? `
                  <tr>
                    <td style="padding:8px 0; color:${textSecondary};">Booking ID</td>
                    <td style="padding:8px 0; color:${textPrimary}; font-family:monospace; font-size:14px;">${data.bookingId}</td>
                  </tr>
                  ` : ''}
                  ${data.serviceName ? `
                  <tr>
                    <td style="padding:8px 0; color:${textSecondary};">Service</td>
                    <td style="padding:8px 0; color:${textPrimary};">${data.serviceName}</td>
                  </tr>
                  ` : ''}
                  ${isLabsOrder && data.tierName ? `
                  <tr>
                    <td style="padding:8px 0; color:${textSecondary};">Package</td>
                    <td style="padding:8px 0; color:${textPrimary};">${data.tierName}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </td>
          </tr>

          ${data.description ? `
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:${textPrimary};">
                <strong>Description:</strong> ${data.description}
              </p>
            </td>
          </tr>
          ` : ''}

          <tr>
            <td style="padding:0 32px 32px 32px;">
              <div style="border-top:1px solid ${accent}; padding-top:24px;">
                <p style="margin:0 0 12px 0; font-size:14px; color:${textSecondary};">
                  <strong>What's Next?</strong>
                </p>
                ${isLabsOrder ? `
                <p style="margin:0; font-size:14px; color:${textSecondary}; line-height:1.6;">
                  Your account is being set up. You'll receive a separate email with setup instructions shortly.
                </p>
                ` : `
                <p style="margin:0; font-size:14px; color:${textSecondary}; line-height:1.6;">
                  ${data.serviceName ? 'Your booking is confirmed! You should have received a booking confirmation email with all the details.' : 'Your payment has been processed successfully.'}
                </p>
                `}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px 32px; text-align:center; border-top:1px solid ${accent};">
              <p style="margin:0; font-size:12px; color:${textSecondary};">
                This is an automated receipt. Please save this email for your records.<br>
                ${data.businessName ? `From: ${data.businessName}` : 'From: The LashDiary'}
              </p>
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

/**
 * Send payment receipt email
 */
export async function sendPaymentReceipt(data: PaymentReceiptData, labsOrderId?: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const isLabsOrder = !!labsOrderId
    const html = createReceiptEmailTemplate(data, isLabsOrder)
    
    const textVersion = `
Payment Receipt

Hi ${data.recipientName?.split(' ')[0] || 'Customer'},

Thank you for your payment! This is your receipt for the transaction below.

Payment Details:
- Amount Paid: ${data.currency === 'USD' ? `$${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `KSH ${data.amount.toLocaleString('en-US')}`}
- Payment Method: ${data.paymentMethod}
- Transaction ID: ${data.transactionId}
${data.mpesaReceiptNumber ? `- M-Pesa Receipt: ${data.mpesaReceiptNumber}\n` : ''}
- Date & Time: ${new Date(data.transactionDate).toLocaleString('en-US')}
${data.orderId ? `- Order ID: ${data.orderId}\n` : ''}
${data.bookingId ? `- Booking ID: ${data.bookingId}\n` : ''}
${data.serviceName ? `- Service: ${data.serviceName}\n` : ''}
${isLabsOrder && data.tierName ? `- Package: ${data.tierName}\n` : ''}

${data.description ? `Description: ${data.description}\n\n` : ''}
This is an automated receipt. Please save this email for your records.
${data.businessName ? `From: ${data.businessName}` : 'From: The LashDiary'}
    `.trim()

    // For Labs orders, try to use business email config
    if (isLabsOrder && labsOrderId) {
      const result = await sendBusinessEmail({
        orderId: labsOrderId,
        to: data.recipientEmail,
        subject: `Payment Receipt - ${data.currency === 'USD' ? `$${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `KSH ${data.amount.toLocaleString('en-US')}`}`,
        html,
        text: textVersion,
      })

      if (result.success) {
        return { success: true }
      }
      // If business email fails, fall through to default
      console.warn('Failed to send receipt via business email, using default:', result.error)
    }

    // Use default email (for regular bookings or if business email fails)
    const result = await sendEmailViaZoho({
      to: data.recipientEmail,
      subject: `Payment Receipt - ${data.currency === 'USD' ? `$${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `KSH ${data.amount.toLocaleString('en-US')}`}`,
      html,
      text: textVersion,
    })

    if (!result.success) {
      console.error('Failed to send payment receipt:', result.error)
      return {
        success: false,
        error: result.error || 'Failed to send receipt email',
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error sending payment receipt:', error)
    return {
      success: false,
      error: error.message || 'Unknown error sending receipt email',
    }
  }
}

