/**
 * Lazy-loaded Google Calendar client
 * This reduces initial bundle size by only loading googleapis when actually needed
 */

const calendarClientPromise: Promise<any> | null = null
let googleModule: any = null

/**
 * Dynamically import googleapis only when needed
 * This reduces the initial serverless function bundle size
 */
async function loadGoogleApis() {
  if (googleModule) {
    return googleModule
  }
  
  // Dynamic import to reduce bundle size
  googleModule = await import('googleapis')
  return googleModule
}

/**
 * Get Google Calendar client - lazy loaded
 * Returns null if credentials are not configured
 */
export async function getCalendarClient() {
  // Check if credentials are available
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
    return null
  }

  // Lazy load googleapis
  const { google } = await loadGoogleApis()

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })

  return google.calendar({ version: 'v3', auth })
}

/**
 * Get Google Calendar client with write access
 */
export async function getCalendarClientWithWrite() {
  // Check if credentials are available
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
    return null
  }

  // Lazy load googleapis
  const { google } = await loadGoogleApis()

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })

  return google.calendar({ version: 'v3', auth })
}

