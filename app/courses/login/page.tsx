'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CourseStudentLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/courses/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store email for course access
      localStorage.setItem('courseAccessEmail', email.trim())
      
      // Redirect to courses page
      router.push('/courses')
    } catch (error) {
      console.error('Login error:', error)
      setError(error instanceof Error ? error.message : 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Course Student Login</h1>
            <p className="text-gray-600">
              Log in to access your courses and track your progress
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your password was sent to your email when you purchased the course
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Don't have an account?{' '}
              <Link href="/courses" className="text-blue-600 hover:text-blue-700 font-semibold">
                Browse Courses
              </Link>
            </p>
            <p className="text-xs text-gray-500 text-center mt-2">
              Forgot your password? Check your email - your password was sent when you purchased the course. Passwords cannot be changed.
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> This login is specifically for course students. It's separate from the main LashDiary client account login. Use this login to access your courses and track your progress across all devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

