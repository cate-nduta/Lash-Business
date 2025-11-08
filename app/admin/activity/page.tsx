'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ActivityEntry {
  id: string
  module: string
  action: string
  performedBy: string
  performedAt: string
  summary: string
  details?: Record<string, unknown> | null
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  cancel: 'Cancelled',
  reschedule: 'Rescheduled',
  login: 'Login',
  invite: 'Invite',
  export: 'Export',
  apply: 'Applied',
  send: 'Sent',
  schedule: 'Scheduled',
}

const MODULE_LABELS: Record<string, string> = {
  bookings: 'Bookings',
  expenses: 'Expenses',
  email: 'Email Marketing',
  themes: 'Themes',
  settings: 'Settings',
  admins: 'Admin Management',
  analytics: 'Analytics',
  services: 'Service Catalog',
  promo_codes: 'Promo Codes',
  discounts: 'Discounts',
  email_marketing: 'Email Marketing',
  general: 'System',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function ActivityHistoryPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string>('admin')
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const checkAccess = async () => {
      try {
        const response = await fetch('/api/admin/current-user', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Unauthorized')
        }

        const data = await response.json()
        if (!isMounted) return

        if (!data.authenticated) {
          setAuthenticated(false)
          router.replace('/admin/login')
          return
        }

        setAuthenticated(true)
        setUserRole(data.role || 'admin')

        if (data.role !== 'owner') {
          setLoading(false)
          return
        }

        await loadEntries()
      } catch (err) {
        if (!isMounted) return
        setAuthenticated(false)
        router.replace('/admin/login')
      }
    }

    const loadEntries = async () => {
      try {
        const response = await fetch('/api/admin/activity?limit=250', {
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load activity log')
        }
        setEntries(data.entries || [])
        setError(null)
      } catch (err: any) {
        console.error('Error loading activity history:', err)
        setError(err?.message || 'Failed to load activity log')
      } finally {
        setLoading(false)
      }
    }

    checkAccess()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  if (userRole !== 'owner') {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg text-center">
          <h1 className="text-2xl font-display text-brown-dark mb-2">Access Restricted</h1>
          <p className="text-brown mb-6">Only the owner account can view the complete activity history.</p>
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            ← Back to Dashboard
          </Link>
          <span className="text-sm text-gray-500">Showing latest {entries.length} actions</span>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-4">Activity History</h1>
          <p className="text-brown mb-6">
            A complete audit trail of recent actions across bookings, expenses, themes, settings, and more.
          </p>

          {loading ? (
            <div className="text-brown">Loading full activity history…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          ) : entries.length === 0 ? (
            <div className="text-brown">No activity recorded yet.</div>
          ) : (
            <ul className="space-y-4">
              {entries.map((entry) => (
                <li key={entry.id} className="border border-pink-light rounded-xl p-4 bg-pink-light/40">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <p className="text-base font-semibold text-brown-dark">{entry.summary}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {ACTION_LABELS[entry.action] || entry.action} · {MODULE_LABELS[entry.module] || entry.module}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(entry.performedAt)}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    By <span className="font-semibold text-brown-dark">{entry.performedBy}</span>
                  </div>
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <details className="mt-2 text-xs bg-white rounded-lg border border-pink-light px-3 py-2">
                      <summary className="cursor-pointer text-gray-600">View details</summary>
                      <pre className="mt-2 text-[11px] text-gray-500 whitespace-pre-wrap break-words">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

