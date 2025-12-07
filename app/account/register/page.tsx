'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PasswordInput from '@/components/PasswordInput'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthday: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showBenefitsModal, setShowBenefitsModal] = useState(false)

  // Show benefits modal on mount
  useEffect(() => {
    setShowBenefitsModal(true)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/client/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          birthday: formData.birthday,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      // Refresh router to update navbar auth state
      router.refresh()
      // Redirect to dashboard
      router.push('/account/dashboard')
    } catch (err: any) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {/* Benefits Modal Popup */}
      {showBenefitsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={() => setShowBenefitsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-display text-brown-dark">Why Create a LashDiary Account?</h2>
              <button
                onClick={() => setShowBenefitsModal(false)}
                className="text-brown/70 hover:text-brown-dark text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gradient-to-br from-pink-50 to-amber-50 rounded-xl p-5 border-2 border-pink-200">
                <h3 className="text-lg font-semibold text-brown-dark mb-2">Lash Maps</h3>
                <p className="text-sm text-brown/80">View and save your personalized lash mapping styles for future appointments. Your lash technician creates custom maps showing exactly how your lashes are styled.</p>
              </div>
              
              <div className="bg-gradient-to-br from-pink-50 to-amber-50 rounded-xl p-5 border-2 border-pink-200">
                <h3 className="text-lg font-semibold text-brown-dark mb-2">Track Appointments & Refill Dates</h3>
                <p className="text-sm text-brown/80">Keep track of all your appointments and know exactly when you should schedule your next refill. Get reminders so you never miss an appointment.</p>
              </div>
              
              <div className="bg-gradient-to-br from-pink-50 to-amber-50 rounded-xl p-5 border-2 border-pink-200">
                <h3 className="text-lg font-semibold text-brown-dark mb-2">Personalized Recommendations</h3>
                <p className="text-sm text-brown/80">Receive personalized recommendations from your lash technician to improve retention. Get tips and advice tailored to your specific lash care needs. <strong>Plus, enjoy special birthday discounts when you provide your date of birth!</strong></p>
              </div>
            </div>
            
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">Important: Account Activation Required</p>
                  <p className="text-xs text-amber-800">
                    To keep your account active, you must book your first appointment within <strong>7 days</strong> of creating your account. 
                    Accounts that don't have a booking within this timeframe will be automatically deleted.
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowBenefitsModal(false)}
              className="w-full mt-6 bg-brown-dark hover:bg-brown text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              Continue to Registration
            </button>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display text-brown-dark mb-2">Join LashDiary</h1>
          <p className="text-brown/70">Create your exclusive account for personalized lash care</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-brown/10 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brown-dark mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brown-dark mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-brown-dark mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
                placeholder="+254 700 000 000"
              />
            </div>

            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-brown-dark mb-2">
                Date of Birth
              </label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                value={formData.birthday}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
              />
              <p className="text-xs text-brown/60 mt-1">
                We'll send you a special birthday discount!
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brown-dark mb-2">
                Password
              </label>
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-brown-dark mb-2">
                Confirm Password
              </label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brown-dark hover:bg-brown text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-brown/70">
              Already have an account?{' '}
              <Link href="/account/login" className="text-brown-dark font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-brown/60 hover:text-brown-dark transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
    </>
  )
}

