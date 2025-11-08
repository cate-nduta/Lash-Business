'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface InviteDetails {
  id: string
  email: string
  name: string
  expiresAt: string
}

export default function AdminInviteAcceptPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const token = params?.token
    if (!token) {
      setError('Invalid invite link.')
      setLoading(false)
      return
    }

    const validateInvite = async () => {
      try {
        const response = await fetch(`/api/admin/manage-admins/invite/validate?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (response.ok && data.success) {
          setInvite(data.invite)
          setError(null)
          if (data.invite?.name) {
            const suggestedUsername = data.invite.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
            if (suggestedUsername.length >= 3) {
              setUsername(suggestedUsername.slice(0, 20))
            }
          }
        } else {
          setError(data.error || 'This invite is invalid or has expired.')
        }
      } catch (err) {
        console.error('Error validating invite:', err)
        setError('We were unable to verify this invite. Please contact the business owner for a new link.')
      } finally {
        setLoading(false)
      }
    }

    validateInvite()
  }, [params?.token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const token = params?.token

    if (!token) {
      setError('Missing invite token.')
      return
    }

    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/manage-admins/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username: username.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/admin/login')
        }, 2500)
      } else {
        setError(data.error || 'Failed to accept invite. Please try again.')
      }
    } catch (err) {
      console.error('Error accepting invite:', err)
      setError('An unexpected error occurred. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Verifying your invite…</div>
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center px-4">
        <div className="max-w-md bg-white rounded-3xl shadow-xl p-8 border border-pink-light text-center">
          <h1 className="text-2xl font-display text-brown-dark mb-4">Invite Issue</h1>
          <p className="text-brown mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Ask the Lash Diary owner to send you a fresh invitation link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl border border-pink-light p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display text-brown-dark mb-2">Set Up Your Admin Access</h1>
          <p className="text-brown">
            Welcome {invite?.name || ''}! Complete the form below to activate your Lash Diary admin account.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-6 text-center text-green-700">
            <p className="font-semibold mb-2">🎉 You’re all set!</p>
            <p className="text-sm">
              Your admin account is ready. Redirecting you to the login page…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">Invite Email</label>
              <input
                type="email"
                value={invite?.email || ''}
                readOnly
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-gray-100 text-brown-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">Choose a Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={24}
                required
                placeholder="e.g., janewanjiku"
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
              <p className="text-xs text-gray-500 mt-1">3–24 characters, letters and numbers only.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">Create Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">Confirm Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 rounded-lg font-semibold text-white transition-colors bg-gradient-to-r from-[#9b1c31] via-[#b82c42] to-[#9b1c31] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating account…' : 'Create Admin Account'}
            </button>
            <p className="text-center text-xs text-gray-500">
              Need help? Contact the Lash Diary owner to resend your invite.
            </p>
            <div className="text-center text-sm">
              <Link href="/admin/login" className="text-brown hover:text-brown-dark">
                Back to admin login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

