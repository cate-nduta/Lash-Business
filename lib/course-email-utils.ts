import { sendEmailViaZoho, FROM_EMAIL, EMAIL_FROM_NAME } from '@/lib/email/zoho-config'

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
const LOGIN_URL = `${BASE_URL}/courses/login`

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

/**
 * Send course access email with login credentials
 */
export async function sendCourseAccessEmail(data: {
  email: string
  name?: string
  courseTitle: string
  password: string
  isFree: boolean
}): Promise<{ success: boolean; error?: string }> {
  const { email, name, courseTitle, password, isFree } = data
  const friendlyName = name?.split(' ')[0] || 'Student'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Access - ${courseTitle}</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color:${EMAIL_STYLES.background};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${EMAIL_STYLES.background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:${EMAIL_STYLES.card}; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${EMAIL_STYLES.brand} 0%, #9A6B4F 100%); padding:32px; text-align:center;">
              <h1 style="margin:0; color:#FFFFFF; font-size:28px; font-weight:700;">📚 Course Access Granted!</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                Hi ${friendlyName}! 👋
              </p>
              
              <p style="margin:0 0 20px 0; font-size:16px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                ${isFree ? 'You now have access to' : 'Thank you for purchasing'} <strong>${courseTitle}</strong>!
              </p>

              <!-- Important Notice Box -->
              <div style="background-color:${EMAIL_STYLES.accent}; border-left:4px solid ${EMAIL_STYLES.brand}; padding:20px; margin:24px 0; border-radius:8px;">
                <h2 style="margin:0 0 12px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  🔐 Important: Track Your Progress
                </h2>
                <p style="margin:0; font-size:15px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                  To keep track of your course progress across all devices, please log in to your student account. Your progress will be saved and synced automatically when you're logged in.
                </p>
              </div>

              <!-- Login Credentials Box -->
              <div style="background-color:#F8F9FA; border:2px solid ${EMAIL_STYLES.brand}; border-radius:12px; padding:24px; margin:24px 0;">
                <h3 style="margin:0 0 16px 0; font-size:18px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                  Your Login Credentials
                </h3>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px;">
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary}; font-weight:600; width:100px;">Email:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textPrimary}; font-family:monospace; font-size:14px;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textSecondary}; font-weight:600;">Password:</td>
                    <td style="padding:8px 0; color:${EMAIL_STYLES.textPrimary}; font-family:monospace; font-size:14px; letter-spacing:1px;">${password}</td>
                  </tr>
                </table>
                <p style="margin:16px 0 0 0; font-size:13px; color:${EMAIL_STYLES.textSecondary}; font-style:italic;">
                  ⚠️ Please save this password securely. You'll need it to log in from any device.
                </p>
              </div>

              <!-- Login Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0;">
                <tr>
                  <td align="center" style="padding:0;">
                    <a href="${LOGIN_URL}" style="display:inline-block; padding:14px 32px; background-color:${EMAIL_STYLES.brand}; color:#FFFFFF; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px; text-align:center;">
                      Log In to Your Course Account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <div style="margin-top:32px; padding-top:24px; border-top:1px solid ${EMAIL_STYLES.accent};">
                <h3 style="margin:0 0 12px 0; font-size:16px; color:${EMAIL_STYLES.textPrimary}; font-weight:600;">
                  How to Access Your Course:
                </h3>
                <ol style="margin:0; padding-left:20px; color:${EMAIL_STYLES.textPrimary}; font-size:15px; line-height:1.8;">
                  <li>Click the "Log In" button above or visit <a href="${LOGIN_URL}" style="color:${EMAIL_STYLES.brand}; text-decoration:underline;">${LOGIN_URL}</a></li>
                  <li>Enter your email and password (shown above)</li>
                  <li>Once logged in, navigate to the Courses page</li>
                  <li>Your progress will be automatically saved and synced across all devices</li>
                </ol>
              </div>

              <!-- Note -->
              <div style="margin-top:24px; padding:16px; background-color:#FFF9E6; border-radius:8px; border-left:4px solid #F59E0B;">
                <p style="margin:0; font-size:14px; line-height:1.6; color:${EMAIL_STYLES.textPrimary};">
                  <strong>💡 Tip:</strong> This login is specifically for course students. It's separate from the main LashDiary client account login. Use this login to access your courses and track your progress.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; background-color:${EMAIL_STYLES.background}; text-align:center; border-top:1px solid ${EMAIL_STYLES.accent};">
              <p style="margin:0; font-size:13px; color:${EMAIL_STYLES.textSecondary};">
                Need help? Contact us at <a href="mailto:${FROM_EMAIL}" style="color:${EMAIL_STYLES.brand}; text-decoration:underline;">${FROM_EMAIL}</a>
              </p>
              <p style="margin:8px 0 0 0; font-size:14px; color:${EMAIL_STYLES.brand}; font-weight:600;">
                Happy Learning! 🎓
              </p>
              <p style="margin:8px 0 0 0; font-size:13px; color:${EMAIL_STYLES.textSecondary};">
                ${EMAIL_FROM_NAME}
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

  const text = `
Course Access Granted - ${courseTitle}

Hi ${friendlyName}!

${isFree ? 'You now have access to' : 'Thank you for purchasing'} ${courseTitle}!

IMPORTANT: Track Your Progress
To keep track of your course progress across all devices, please log in to your student account. Your progress will be saved and synced automatically when you're logged in.

Your Login Credentials:
Email: ${email}
Password: ${password}

⚠️ Please save this password securely. You'll need it to log in from any device.

Log in at: ${LOGIN_URL}

How to Access Your Course:
1. Visit ${LOGIN_URL}
2. Enter your email and password (shown above)
3. Once logged in, navigate to the Courses page
4. Your progress will be automatically saved and synced across all devices

💡 Tip: This login is specifically for course students. It's separate from the main LashDiary client account login. Use this login to access your courses and track your progress.

Need help? Contact us at ${FROM_EMAIL}

Happy Learning! 🎓
${EMAIL_FROM_NAME}
  `.trim()

  try {
    const result = await sendEmailViaZoho({
      to: email,
      subject: `Course Access: ${courseTitle} - Login Credentials`,
      html,
      text,
    })

    if (!result.success) {
      console.error('Failed to send course access email:', result.error)
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error sending course access email:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

