import { cookies } from 'next/headers'

export const ADMIN_AUTH_COOKIE = 'admin-auth'
export const ADMIN_USER_COOKIE = 'admin-user'
export const ADMIN_LAST_ACTIVE_COOKIE = 'admin-last-active'
export const ADMIN_SESSION_MAX_IDLE_MS = 1000 * 60 * 60 * 2 // 2 hours

type AdminUser = { username: string; role: string; canManageAdmins: boolean }

const loadAdminSession = () => {
  const cookieStore = cookies()
  const authCookie = cookieStore.get(ADMIN_AUTH_COOKIE)?.value
  if (authCookie !== 'authenticated') {
    return null
  }

  const lastActiveRaw = cookieStore.get(ADMIN_LAST_ACTIVE_COOKIE)?.value
  const lastActive = lastActiveRaw ? Number(lastActiveRaw) : NaN
  if (!Number.isFinite(lastActive)) {
    return null
  }

  if (Date.now() - lastActive > ADMIN_SESSION_MAX_IDLE_MS) {
    return null
  }

  const username = cookieStore.get(ADMIN_USER_COOKIE)?.value || 'owner'

  return {
    username,
    lastActive,
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return Boolean(loadAdminSession())
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const session = loadAdminSession()
  if (!session) {
    return null
  }

  const edgeRuntimeFlag =
    typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).EdgeRuntime : undefined
  const envRuntime = typeof process !== 'undefined' ? process.env?.NEXT_RUNTIME : undefined
  const isEdgeRuntime = Boolean(edgeRuntimeFlag || envRuntime === 'edge')

  const username = session.username || 'owner'

  if (isEdgeRuntime) {
    return { username, role: username === 'owner' ? 'owner' : 'admin', canManageAdmins: username === 'owner' }
  }

  try {
    const { readDataFile } = await import('./data-utils')
    const data = await readDataFile<{ admins: any[] }>('admins.json', { admins: [] })
    const admin = data.admins?.find((a) => a.username === username)

    if (admin) {
      return {
        username: admin.username,
        role: admin.role,
        canManageAdmins: admin.canManageAdmins || false,
      }
    }
  } catch (error) {
    console.error('Error getting admin user:', error)
  }

  return { username: 'owner', role: 'owner', canManageAdmins: true }
}

export async function requireAdminAuth() {
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    throw new Error('Unauthorized')
  }
}

export async function requireOwnerAuth() {
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    throw new Error('Unauthorized')
  }

  const user = await getAdminUser()
  if (!user || user.role !== 'owner') {
    throw new Error('Owner access required')
  }
}

