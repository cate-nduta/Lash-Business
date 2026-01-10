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
 * Includes timeout handling to prevent hanging API calls
 */
export async function getCalendarClient() {
  // Check if credentials are available and extract to variables for TypeScript
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  const projectId = process.env.GOOGLE_PROJECT_ID
  
  if (!clientEmail || !privateKey || !projectId) {
    return null
  }

  try {
    // Add timeout to prevent hanging during initialization
    const initPromise = (async () => {
      // Lazy load googleapis
      const { google } = await loadGoogleApis()

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
          project_id: projectId,
        },
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      })

      return google.calendar({ version: 'v3', auth })
    })()

    // 10 second timeout for calendar client initialization
    return await Promise.race([
      initPromise,
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Calendar client initialization timed out')), 10000)
      ),
    ])
  } catch (error) {
    console.error('Error initializing calendar client:', error)
    return null
  }
}

/**
 * Get Google Calendar client with write access
 * Includes timeout handling to prevent hanging API calls
 */
export async function getCalendarClientWithWrite() {
  // Check if credentials are available and extract to variables for TypeScript
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  const projectId = process.env.GOOGLE_PROJECT_ID
  
  if (!clientEmail || !privateKey || !projectId) {
    return null
  }

  try {
    // Add timeout to prevent hanging during initialization
    const initPromise = (async () => {
      // Lazy load googleapis
      const { google } = await loadGoogleApis()

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
          project_id: projectId,
        },
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ],
      })

      return google.calendar({ version: 'v3', auth })
    })()

    // 10 second timeout for calendar client initialization
    return await Promise.race([
      initPromise,
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Calendar client initialization timed out')), 10000)
      ),
    ])
  } catch (error) {
    console.error('Error initializing calendar client with write access:', error)
    return null
  }
}

