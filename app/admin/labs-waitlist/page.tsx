'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminBackButton from '@/components/AdminBackButton'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

interface WaitlistSettings {
  enabled: boolean
  openDate: string | null
  closeDate: string | null
  countdownTargetDate: string | null
  discountPercentage: number
  discountCodePrefix: string
  createdAt: string
  updatedAt: string
}

interface WaitlistEntry {
  email: string
  signedUpAt: string
  discountCode?: string
}

export default function AdminLabsWaitlist() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settings, setSettings] = useState<WaitlistSettings>({
    enabled: false,
    openDate: null,
    closeDate: null,
    countdownTargetDate: null,
    discountPercentage: 0,
    discountCodePrefix: 'WAITLIST',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [totalSignups, setTotalSignups] = useState(0)
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user')
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        loadData()
      } catch (error) {
        router.replace('/admin/login')
      }
    }

    checkAuth()
  }, [router])

  const loadData = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs-waitlist')
      if (!response.ok) {
        throw new Error('Failed to load waitlist data')
      }
      const data = await response.json()
      setSettings(data.settings)
      setEntries(data.entries || [])
      setTotalSignups(data.totalSignups || 0)
    } catch (error) {
      console.error('Error loading waitlist data:', error)
      setMessage({ type: 'error', text: 'Failed to load waitlist data' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/labs-waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const data = await response.json()
      setSettings(data.settings)
      setMessage({ type: 'success', text: 'Waitlist settings saved successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the waitlist?`)) {
      return
    }

    try {
      const response = await authorizedFetch(`/api/admin/labs-waitlist?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete entry')
      }

      setMessage({ type: 'success', text: 'Entry removed successfully' })
      loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete entry' })
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear ALL waitlist entries? This cannot be undone.')) {
      return
    }

    try {
      const response = await authorizedFetch('/api/admin/labs-waitlist?clearAll=true', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear entries')
      }

      setMessage({ type: 'success', text: 'All entries cleared successfully' })
      loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to clear entries' })
    }
  }

  const handleSendEmail = async () => {
    if (!confirm(`Send email to all ${totalSignups} waitlist members?`)) {
      return
    }

    setSendingEmail(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/labs-waitlist/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: entries.map(e => e.email),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send emails')
      }

      setMessage({ type: 'success', text: `Email sent to ${totalSignups} waitlist members!` })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send emails' })
    } finally {
      setSendingEmail(false)
    }
  }

  const exportCSV = () => {
    const headers = ['Email', 'Signed Up At', 'Discount Code']
    const rows = entries.map(entry => [
      entry.email,
      new Date(entry.signedUpAt).toLocaleString(),
      entry.discountCode || 'N/A',
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C4B31] mx-auto"></div>
          <p className="mt-4 text-[#6B4A3B]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF9F4] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <AdminBackButton href="/admin/labs" />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#7C4B31] mb-2">Labs Waitlist Management</h1>
          <p className="text-[#6B4A3B]">Manage waitlist settings, view signups, and send emails to waitlist members.</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Settings Section */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-[#D4A574] p-6 mb-6">
          <h2 className="text-2xl font-bold text-[#7C4B31] mb-4">Waitlist Settings</h2>

          <div className="space-y-6">
            {/* Enable Waitlist */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enabled"
                checked={settings.enabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="w-5 h-5 text-[#7C4B31] border-2 border-[#D4A574] rounded focus:ring-2 focus:ring-[#7C4B31] cursor-pointer"
              />
              <label htmlFor="enabled" className="font-semibold text-gray-700 cursor-pointer">
                Enable Waitlist
              </label>
            </div>

            {/* Open Date */}
            <div>
              <label htmlFor="openDate" className="block font-semibold text-gray-700 mb-2">
                Open Date (when waitlist becomes available)
              </label>
              <input
                type="datetime-local"
                id="openDate"
                value={settings.openDate ? new Date(settings.openDate).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    openDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  }))
                }
                className="w-full px-4 py-2 border-2 border-[#D4A574] rounded-lg focus:outline-none focus:border-[#7C4B31]"
              />
              <p className="text-sm text-gray-500 mt-1">Leave empty to open immediately when enabled</p>
            </div>

            {/* Close Date */}
            <div>
              <label htmlFor="closeDate" className="block font-semibold text-gray-700 mb-2">
                Close Date (when waitlist closes)
              </label>
              <input
                type="datetime-local"
                id="closeDate"
                value={settings.closeDate ? new Date(settings.closeDate).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    closeDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  }))
                }
                className="w-full px-4 py-2 border-2 border-[#D4A574] rounded-lg focus:outline-none focus:border-[#7C4B31]"
              />
              <p className="text-sm text-gray-500 mt-1">Leave empty to keep open indefinitely</p>
            </div>

            {/* Discount Percentage */}
            <div>
              <label htmlFor="discountPercentage" className="block font-semibold text-gray-700 mb-2">
                Discount Percentage (0-100)
              </label>
              <input
                type="number"
                id="discountPercentage"
                value={settings.discountPercentage}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    discountPercentage: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                  }))
                }
                className="w-full px-4 py-2 border-2 border-[#D4A574] rounded-lg focus:outline-none focus:border-[#7C4B31]"
                min="0"
                max="100"
              />
              <p className="text-sm text-gray-500 mt-1">
                Discount percentage given to waitlist signups (e.g., 10 for 10% off)
              </p>
            </div>

            {/* Discount Code Prefix */}
            <div>
              <label htmlFor="discountCodePrefix" className="block font-semibold text-gray-700 mb-2">
                Discount Code Prefix
              </label>
              <input
                type="text"
                id="discountCodePrefix"
                value={settings.discountCodePrefix}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    discountCodePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                  }))
                }
                className="w-full px-4 py-2 border-2 border-[#D4A574] rounded-lg focus:outline-none focus:border-[#7C4B31]"
                placeholder="WAITLIST"
              />
              <p className="text-sm text-gray-500 mt-1">
                Prefix for automatically generated discount codes (e.g., "WAITLIST-ABC123")
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-[#7C4B31] text-white rounded-lg font-semibold hover:bg-[#6B3E26] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Waitlist Entries Section */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-[#D4A574] p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-[#7C4B31]">Waitlist Entries</h2>
              <p className="text-[#6B4A3B] mt-1">
                Total signups: <strong>{totalSignups}</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-[#7C4B31] text-white rounded-lg font-semibold hover:bg-[#6B3E26] transition"
              >
                Export CSV
              </button>
              {totalSignups > 0 && (
                <>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {sendingEmail ? 'Sending...' : 'Send Email to All'}
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No waitlist entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F3E6DC]">
                    <th className="border border-[#D4A574] px-4 py-2 text-left font-semibold text-[#7C4B31]">Email</th>
                    <th className="border border-[#D4A574] px-4 py-2 text-left font-semibold text-[#7C4B31]">Signed Up</th>
                    <th className="border border-[#D4A574] px-4 py-2 text-left font-semibold text-[#7C4B31]">Discount Code</th>
                    <th className="border border-[#D4A574] px-4 py-2 text-left font-semibold text-[#7C4B31]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-[#D4A574] px-4 py-2">{entry.email}</td>
                      <td className="border border-[#D4A574] px-4 py-2">
                        {new Date(entry.signedUpAt).toLocaleString()}
                      </td>
                      <td className="border border-[#D4A574] px-4 py-2 font-mono">
                        {entry.discountCode || 'N/A'}
                      </td>
                      <td className="border border-[#D4A574] px-4 py-2">
                        <button
                          onClick={() => handleDeleteEntry(entry.email)}
                          className="text-red-600 hover:text-red-800 font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

