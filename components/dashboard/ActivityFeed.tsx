import Link from 'next/link'
import { useEffect, useState } from 'react'

interface ActivityFeedProps {
  limit?: number
  showViewAll?: boolean
}

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

export default function ActivityFeed({ limit = 50, showViewAll = false }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch(`/api/admin/activity?limit=${limit}`)
        const data = await response.json()
        if (response.ok) {
          setEntries(data.entries || [])
          setError(null)
        } else {
          setError(data.error || 'Failed to load activity log.')
        }
      } catch (err) {
        console.error('Error loading activity feed:', err)
        setError('Failed to load activity log.')
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [limit])

  return (
    <div className="bg-pink-light/40 border border-pink-light rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-display text-brown-dark">Recent Activity</h2>
          <p className="text-sm text-brown">Track key changes across bookings, expenses, and settings.</p>
        </div>
        {showViewAll && (
          <Link
            href="/admin/activity"
            className="text-sm font-semibold text-brown-dark hover:text-brown underline"
          >
            View full history →
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-brown">Loading activity…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-brown">No activity recorded yet.</div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="bg-white border border-pink-light rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brown-dark">{entry.summary}</p>
                  <p className="text-xs text-gray-500">
                    {ACTION_LABELS[entry.action] || entry.action} · {MODULE_LABELS[entry.module] || entry.module}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(entry.performedAt)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                By <span className="font-semibold text-brown-dark">{entry.performedBy}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
