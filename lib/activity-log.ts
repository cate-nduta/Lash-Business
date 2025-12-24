import { writeDataFile, readDataFile } from '@/lib/data-utils'

export type ActivityModule =
  | 'bookings'
  | 'expenses'
  | 'email'
  | 'themes'
  | 'settings'
  | 'admins'
  | 'analytics'
  | 'services'
  | 'promo_codes'
  | 'discounts'
  | 'email_marketing'
  | 'partner_onboarding'
  | 'courses'
  | 'general'

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'cancel'
  | 'reschedule'
  | 'login'
  | 'invite'
  | 'export'
  | 'apply'
  | 'send'
  | 'schedule'
  | 'accept'

export interface ActivityLogEntry {
  id: string
  module: ActivityModule
  action: ActivityAction
  performedBy: string
  performedAt: string
  summary: string
  details?: Record<string, unknown> | null
  targetId?: string | null
  targetType?: string | null
}

interface ActivityLogFile {
  entries: ActivityLogEntry[]
}

const MAX_ENTRIES = 500
const RETENTION_DAYS = 35

export async function recordActivity(entry: Omit<ActivityLogEntry, 'id' | 'performedAt'> & { performedAt?: string }) {
  try {
    const data = await readDataFile<ActivityLogFile>('activity-log.json', { entries: [] })
    const existingEntries = data?.entries || []

    const fullEntry: ActivityLogEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      performedAt: entry.performedAt || new Date().toISOString(),
      module: entry.module,
      action: entry.action,
      performedBy: entry.performedBy,
      summary: entry.summary,
      details: entry.details ?? null,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType ?? null,
    }

    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    const updatedEntries = [fullEntry, ...existingEntries]
      .filter((entry) => {
        const performedTime = new Date(entry.performedAt).getTime()
        return !Number.isNaN(performedTime) && performedTime >= cutoff
      })
      .slice(0, MAX_ENTRIES)
    await writeDataFile<ActivityLogFile>('activity-log.json', { entries: updatedEntries })

    return fullEntry
  } catch (error) {
    console.error('Failed to record activity log entry:', error)
    return null
  }
}

export async function loadRecentActivity(limit = 25) {
  try {
    const data = await readDataFile<ActivityLogFile>('activity-log.json', { entries: [] })
    const entries = data?.entries || []
    return entries.slice(0, limit)
  } catch (error) {
    console.error('Failed to load activity log:', error)
    return []
  }
}

export async function clearActivityLog() {
  try {
    await writeDataFile<ActivityLogFile>('activity-log.json', { entries: [] })
    return true
  } catch (error) {
    console.error('Failed to clear activity log:', error)
    return false
  }
}

export async function deleteActivityEntry(entryId: string) {
  try {
    const data = await readDataFile<ActivityLogFile>('activity-log.json', { entries: [] })
    const existingEntries = data?.entries || []
    
    const updatedEntries = existingEntries.filter(entry => entry.id !== entryId)
    await writeDataFile<ActivityLogFile>('activity-log.json', { entries: updatedEntries })
    
    return true
  } catch (error) {
    console.error('Failed to delete activity log entry:', error)
    return false
  }
}

