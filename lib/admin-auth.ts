import { cookies } from 'next/headers'
import { readDataFile } from './data-utils'

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('admin-auth')
  return authCookie?.value === 'authenticated'
}

export async function getAdminUser(): Promise<{ username: string; role: string; canManageAdmins: boolean } | null> {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('admin-auth')
  const userCookie = cookieStore.get('admin-user')
  
  if (authCookie?.value !== 'authenticated') {
    return null
  }

  // If no username cookie, it's the legacy owner account
  if (!userCookie) {
    return { username: 'owner', role: 'owner', canManageAdmins: true }
  }

  try {
    const data = await readDataFile<{ admins: any[] }>('admins.json', { admins: [] })
    const admin = data.admins?.find(a => a.username === userCookie.value)
    
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

