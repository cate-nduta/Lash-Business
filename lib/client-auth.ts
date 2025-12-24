import { cookies } from 'next/headers'

export const CLIENT_AUTH_COOKIE = 'client-auth'
export const CLIENT_USER_COOKIE = 'client-user-id'
export const CLIENT_LAST_ACTIVE_COOKIE = 'client-last-active'
export const CLIENT_SESSION_MAX_IDLE_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

type ClientSession = {
  userId: string
  lastActive: number
}

const loadClientSession = (): ClientSession | null => {
  try {
    const cookieStore = cookies()
    const authCookie = cookieStore.get(CLIENT_AUTH_COOKIE)?.value
    if (authCookie !== 'authenticated') {
      return null
    }

    const userId = cookieStore.get(CLIENT_USER_COOKIE)?.value
    if (!userId) {
      return null
    }

    const lastActiveRaw = cookieStore.get(CLIENT_LAST_ACTIVE_COOKIE)?.value
    const lastActive = lastActiveRaw ? Number(lastActiveRaw) : NaN
    if (!Number.isFinite(lastActive)) {
      return null
    }

    if (Date.now() - lastActive > CLIENT_SESSION_MAX_IDLE_MS) {
      return null
    }

    return {
      userId,
      lastActive,
    }
  } catch (error) {
    // Cookies API might not be available in all contexts
    console.error('Error loading client session:', error)
    return null
  }
}

export async function isClientAuthenticated(): Promise<boolean> {
  return Boolean(loadClientSession())
}

export async function getClientUserId(): Promise<string | null> {
  const session = loadClientSession()
  return session?.userId || null
}

export async function requireClientAuth() {
  const authenticated = await isClientAuthenticated()
  if (!authenticated) {
    throw new Error('Unauthorized')
  }
}

