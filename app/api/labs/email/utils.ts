import { sendEmailViaZoho } from '@/lib/email/zoho-config'
import { readDataFile } from '@/lib/data-utils'

function normalizeBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ''

  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  return 'https://lashdiary.co.ke'
}

const BASE_URL = normalizeBaseUrl()

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

export interface LabsSetupEmailData {
  businessName: string
  email: string
  tierName: string
  subdomain: string
  loginUrl: string
  password?: string // Optional password for new accounts
}

function createSetupInstructionsEmail(data: LabsSetupEmailData) {
  const { businessName, tierName, subdomain, loginUrl, password } = data
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to LashDiary Labs - Setup Instructions</title>
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
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">Welcome to LashDiary Labs</p>
              <h1 style="margin:12px 0 0 0; font-size:36px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600; line-height:1.3; letter-spacing:0.5px;">Let's Get Your Business Online!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                Hi ${businessName || 'there'},<br><br>
                Congratulations on choosing <strong>${tierName}</strong>! Your account has been created and you're ready to get started.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <div style="background:${accent}; border-radius:12px; padding:24px; margin:0 0 24px 0;">
                <h2 style="margin:0 0 16px 0; font-size:24px; color:${brand}; font-family:'Playfair Display', Georgia, serif; font-weight:600;">
                  Your Login Credentials
                </h2>
                <p style="margin:0 0 12px 0; font-size:16px; color:${textPrimary};">
                  <strong>Login Email:</strong> ${data.email}<br>
                  ${password ? `<strong>Password:</strong> <code style="background:${card}; padding:4px 8px; border-radius:4px; font-family:monospace; font-size:14px;">${password}</code><br>` : ''}
                  <strong>Subdomain:</strong> ${subdomain}
                </p>
                ${password ? `
                <div style="margin-top:16px; padding:12px; background:${card}; border-left:4px solid ${brand}; border-radius:4px;">
                  <p style="margin:0; font-size:14px; color:${textSecondary};">
                    <strong>⚠️ Important:</strong> Save this password securely. You'll need it to log in to your account.
                  </p>
                </div>
                ` : ''}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <h2 style="margin:0 0 16px 0; font-size:24px; color:${brand}; font-family:'Playfair Display', Georgia, serif; font-weight:600;">
                Getting Started
              </h2>
              <ol style="margin:0; padding-left:20px; color:${textPrimary}; font-size:16px; line-height:1.8;">
                <li style="margin-bottom:12px;">
                  <strong>Access Your Account</strong><br>
                  ${password ? 'Use your login credentials above to log in, or click the button below to access your account directly.' : 'Click the button below to log in. You\'ll receive a separate email with your login credentials.'}
                </li>
                <li style="margin-bottom:12px;">
                  <strong>Your Website is Being Built</strong><br>
                  Your website is being set up according to your tier. You'll receive updates as it's being configured.
                </li>
                <li style="margin-bottom:12px;">
                  <strong>Contact Support</strong><br>
                  If you have any questions or need assistance, contact us at hello@lashdiary.co.ke.
                </li>
              </ol>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <h2 style="margin:0 0 16px 0; font-size:24px; color:${brand}; font-family:'Playfair Display', Georgia, serif; font-weight:600;">
                Important Next Steps
              </h2>
              <ul style="margin:0; padding-left:20px; color:${textPrimary}; font-size:16px; line-height:1.8;">
                ${password ? '' : '<li style="margin-bottom:12px;">Check your email for login credentials (sent separately)</li>'}
                ${password ? '<li style="margin-bottom:12px;">Save your login credentials securely - you\'ll need them to access your account</li>' : ''}
                <li style="margin-bottom:12px;">
                  Save this email for reference - it contains important links to your account
                </li>
                <li style="margin-bottom:12px;">
                  Your website is being set up and you'll receive updates as it's configured
                </li>
              </ul>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px 32px; text-align:center;">
              <a href="${loginUrl}" style="display:inline-block; background:${brand}; color:#FFFFFF; text-decoration:none; padding:16px 32px; border-radius:8px; font-size:18px; font-weight:600; font-family:'Playfair Display', Georgia, serif; letter-spacing:0.5px;">
                Log In to Your Account →
              </a>
              <p style="margin:16px 0 0 0; font-size:14px; color:${textSecondary};">
                Or visit: <a href="${loginUrl}" style="color:${brand}; text-decoration:underline;">${loginUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px 32px;">
              <div style="border-top:1px solid ${accent}; padding-top:24px;">
                <p style="margin:0 0 12px 0; font-size:14px; color:${textSecondary};">
                  <strong>Need Help?</strong>
                </p>
                <p style="margin:0; font-size:14px; color:${textSecondary}; line-height:1.6;">
                  If you have any questions during setup, don't hesitate to reach out. We're here to help you succeed!
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px 32px; text-align:center; border-top:1px solid ${accent};">
              <p style="margin:0; font-size:12px; color:${textSecondary};">
                This email was sent to ${data.email}<br>
                LashDiary Labs - Systems for service providers
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

export async function sendLabsSetupEmail(data: LabsSetupEmailData): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const html = createSetupInstructionsEmail(data)
    
    const result = await sendEmailViaZoho({
      to: data.email,
      subject: `Welcome to LashDiary Labs - Setup Instructions for ${data.businessName}`,
      html,
      text: `
Welcome to LashDiary Labs!

Hi ${data.businessName || 'there'},

Congratulations on choosing ${data.tierName}! Your account has been created and you're ready to get started.

Your Login Credentials:
- Login Email: ${data.email}
${data.password ? `- Password: ${data.password}\n\n⚠️ Important: Save this password securely. You'll need it to log in to your account.\n` : ''}
- Subdomain: ${data.subdomain}

Getting Started:
1. Access Your Account - Visit ${data.loginUrl} to log in
2. Your Website is Being Built - Your website is being set up according to your tier. You'll receive updates as it's being configured
3. Contact Support - If you have any questions or need assistance, contact us at hello@lashdiary.co.ke

Important Next Steps:
- Check your email for login credentials (sent separately)
- Save this email for reference - it contains important links to your account
- Your website is being set up and you'll receive updates as it's configured

Need Help?
If you have any questions during setup, don't hesitate to reach out. We're here to help you succeed!

Visit your account: ${data.loginUrl}

This email was sent to ${data.email}
LashDiary Labs - Systems for service providers
      `.trim(),
    })

    if (!result.success) {
      console.error('Failed to send labs setup email:', result.error)
      return {
        success: false,
        error: result.error || 'Failed to send email',
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error sending labs setup email:', error)
    return {
      success: false,
      error: error.message || 'Unknown error sending email',
    }
  }
}

