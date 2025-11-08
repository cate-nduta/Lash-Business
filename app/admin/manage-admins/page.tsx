'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface Admin {
  id: string
  username: string
  email: string
  role: 'owner' | 'admin'
  createdAt: string
  canManageAdmins: boolean
}

interface AdminInvite {
  id: string
  email: string
  name: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  createdAt: string
  invitedBy: string
  expiresAt: string
  acceptedAt?: string | null
  revokedAt?: string | null
  lastSentAt?: string | null
}

const MAX_ADMINS = 3
const INVITE_EXPIRY_HOURS = 72

export default function ManageAdmins() {
  const router = useRouter()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' })
  const [sendingInvite, setSendingInvite] = useState(false)
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null)

  useEffect(() => {
    const initialize = async () => {
      try {
        const response = await fetch('/api/admin/current-user')
        const data = await response.json()

        if (!data.authenticated) {
          router.push('/admin/login')
          return
        }

        if (data.role !== 'owner') {
          setHasAccess(false)
          setLoading(false)
          return
        }

        setHasAccess(true)
        await Promise.all([loadAdmins(), loadInvites()])
      } catch (error) {
        console.error('Error initializing manage-admins page:', error)
        setMessage({ type: 'error', text: 'Failed to load admin data' })
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [router])

  const loadAdmins = async () => {
    try {
      const response = await fetch('/api/admin/manage-admins')
      if (response.ok) {
        const data = await response.json()
        setAdmins(data.admins || [])
      }
    } catch (error) {
      console.error('Error loading admins:', error)
      setMessage({ type: 'error', text: 'Failed to load admins' })
    }
  }

  const loadInvites = async () => {
    try {
      const response = await fetch('/api/admin/manage-admins/invite')
      if (response.ok) {
        const data = await response.json()
        setInvites(data.invites || [])
      }
    } catch (error) {
      console.error('Error loading invites:', error)
      setMessage({ type: 'error', text: 'Failed to load pending invites' })
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to remove this admin? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/manage-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', adminId }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Admin removed successfully!' })
        await Promise.all([loadAdmins(), loadInvites()])
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to remove admin' })
      }
    } catch (error) {
      console.error('Error removing admin:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    }
  }

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!inviteForm.email.trim()) {
      setMessage({ type: 'error', text: 'Please provide an email address.' })
      return
    }

    setSendingInvite(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/manage-admins/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          email: inviteForm.email,
          name: inviteForm.name,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setInvites(data.invites || [])
        setMessage({ type: 'success', text: data.message || 'Invite sent successfully!' })
        setInviteForm({ name: '', email: '' })
        setShowInviteModal(false)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send invite' })
      }
    } catch (error) {
      console.error('Error sending invite:', error)
      setMessage({ type: 'error', text: 'An error occurred while sending the invite.' })
    } finally {
      setSendingInvite(false)
    }
  }

  const handleInviteAction = async (inviteId: string, action: 'resend' | 'revoke') => {
    setProcessingInviteId(inviteId + action)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/manage-admins/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, inviteId }),
      })

      const data = await response.json()

      if (response.ok) {
        setInvites(data.invites || [])
        setMessage({ type: 'success', text: data.message || 'Invite updated successfully.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update invite.' })
      }
    } catch (error) {
      console.error('Error updating invite:', error)
      setMessage({ type: 'error', text: 'An error occurred while updating the invite.' })
    } finally {
      setProcessingInviteId(null)
    }
  }

  const pendingInvites = invites.filter((invite) => invite.status === 'pending')
  const slotsRemaining = Math.max(0, MAX_ADMINS - (admins.length + pendingInvites.length))
  const canInviteMore = slotsRemaining > 0

  const formatDate = (value?: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const renderInviteStatus = (status: AdminInvite['status']) => {
    const base = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold'
    switch (status) {
      case 'pending':
        return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pending</span>
      case 'accepted':
        return <span className={`${base} bg-green-100 text-green-700`}>Accepted</span>
      case 'revoked':
        return <span className={`${base} bg-gray-200 text-gray-600`}>Revoked</span>
      case 'expired':
        return <span className={`${base} bg-red-100 text-red-700`}>Expired</span>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
              ← Back to Dashboard
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-display text-brown-dark mb-4">Access Restricted</h1>
            <p className="text-brown-dark mb-6">This page is only accessible to the business owner.</p>
            <p className="text-sm text-gray-600">Only the owner can add or remove admin users.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      {message && (
        <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
      )}

      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-display text-brown-dark mb-2">Manage Admins</h1>
              <p className="text-brown">
                Invite trusted team members to help manage bookings and operations. You can have up to {MAX_ADMINS} admins at a time.
              </p>
              <p className="text-sm text-gray-500 mt-3">
                Slots remaining: <span className="font-semibold text-brown-dark">{slotsRemaining}</span>
              </p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={!canInviteMore}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors shadow-md ${
                canInviteMore ? 'bg-brown-dark hover:bg-brown' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              + Invite Admin
            </button>
          </div>

          <div className="space-y-4">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="bg-pink-light/30 rounded-xl p-6 border-2 border-brown-light flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-brown-dark">{admin.username}</h3>
                    {admin.role === 'owner' && (
                      <span className="px-3 py-1 rounded-full bg-[#4F2C1D] !text-white text-xs font-semibold tracking-[0.15em] uppercase border border-white/70 shadow-sm">
                        OWNER
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brown">{admin.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Added: {formatDate(admin.createdAt)}</p>
                </div>

                {admin.role !== 'owner' && (
                  <button
                    onClick={() => handleDeleteAdmin(admin.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {admins.length === 0 && (
            <div className="text-center text-brown py-12">No admins found.</div>
          )}

          {invites.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-display text-brown-dark mb-4">Admin Invites</h2>
              <div className="space-y-4">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-white border-2 border-pink-light rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <p className="text-lg font-semibold text-brown-dark">{invite.name || 'Pending Admin'}</p>
                          <p className="text-sm text-brown">{invite.email}</p>
                        </div>
                        {renderInviteStatus(invite.status)}
                      </div>
                      <p className="text-xs text-gray-500">
                        Invited: {formatDateTime(invite.createdAt)} • Invited by {invite.invitedBy || 'owner'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Expires: {formatDateTime(invite.expiresAt)}
                      </p>
                      {invite.status === 'accepted' && invite.acceptedAt && (
                        <p className="text-xs text-green-700 mt-1">Accepted: {formatDateTime(invite.acceptedAt)}</p>
                      )}
                      {invite.status === 'revoked' && invite.revokedAt && (
                        <p className="text-xs text-gray-500 mt-1">Revoked: {formatDateTime(invite.revokedAt)}</p>
                      )}
                    </div>

                    {invite.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleInviteAction(invite.id, 'resend')}
                          disabled={processingInviteId === invite.id + 'resend'}
                          className="px-4 py-2 border-2 border-brown-light text-brown-dark rounded-lg hover:bg-brown-light/20 transition-colors text-sm font-semibold"
                        >
                          {processingInviteId === invite.id + 'resend' ? 'Sending…' : 'Resend'}
                        </button>
                        <button
                          onClick={() => handleInviteAction(invite.id, 'revoke')}
                          disabled={processingInviteId === invite.id + 'revoke'}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-semibold"
                        >
                          {processingInviteId === invite.id + 'revoke' ? 'Revoking…' : 'Revoke'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!canInviteMore && (
            <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
              <p className="text-sm text-yellow-800">
                <strong>Invite limit reached.</strong> Revoke a pending invite or remove an admin to free up a slot.
              </p>
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-display text-brown-dark mb-6">Invite a New Admin</h2>
            <p className="text-sm text-gray-600 mb-6">
              We’ll send a secure invite link so they can set their own password. Invites expire after {INVITE_EXPIRY_HOURS} hours.
            </p>
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">Name</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Jane Wanjiku"
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">Email *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteForm({ name: '', email: '' })
                  }}
                  className="flex-1 px-4 py-2 text-brown-dark border-2 border-brown-light rounded-lg hover:bg-brown-light/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="flex-1 px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingInvite ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

