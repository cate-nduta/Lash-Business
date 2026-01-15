'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminBackButton from '@/components/AdminBackButton'

interface SpinWheelCode {
  id: string
  code: string
  email: string
  prizeId: string
  prizeLabel: string
  prizeType: string
  prizeValue?: number
  prizeServiceType?: string
  createdAt: string
  expiresAt: string
  used: boolean
  usedAt?: string
  usedFor?: 'consultation' | 'checkout'
  orderId?: string
  consultationId?: string
}

interface SpinWheelCodesData {
  codes: SpinWheelCode[]
}

export default function SpinWheelWinnersPage() {
  const [codes, setCodes] = useState<SpinWheelCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'used' | 'unused' | 'expired'>('all')
  const [searchEmail, setSearchEmail] = useState('')

  useEffect(() => {
    loadWinners()
  }, [])

  const loadWinners = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/labs/spin-wheel/winners', {
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json()
        setCodes(data.codes || [])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load winners')
      }
    } catch (err) {
      console.error('Error loading winners:', err)
      setError('Failed to load winners. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredCodes = codes.filter(code => {
    // Filter by status
    if (filter === 'used' && !code.used) return false
    if (filter === 'unused' && code.used) return false
    if (filter === 'expired') {
      const now = new Date()
      const expiresAt = new Date(code.expiresAt)
      if (now <= expiresAt) return false
    }

    // Filter by email search
    if (searchEmail) {
      const emailLower = code.email.toLowerCase()
      const searchLower = searchEmail.toLowerCase()
      if (!emailLower.includes(searchLower)) return false
    }

    return true
  })

  const sortedCodes = [...filteredCodes].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const deleteAllWinners = async () => {
    if (!confirm('Are you sure you want to delete ALL spin wheel winners? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/labs/spin-wheel/delete-all', {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('All winners have been deleted successfully!')
        loadWinners() // Refresh the list
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete winners')
      }
    } catch (error) {
      console.error('Error deleting winners:', error)
      alert('Failed to delete winners. Please try again.')
    }
  }

  const downloadCSV = () => {
    // Prepare CSV data
    const headers = [
      'Email',
      'Code',
      'Prize Won',
      'Prize Type',
      'Prize Value',
      'Won Date',
      'Expires Date',
      'Status',
      'Used For',
      'Used Date',
      'Consultation ID',
      'Order ID',
    ]

    const rows = sortedCodes.map(code => {
      const now = new Date()
      const expiresAt = new Date(code.expiresAt)
      const isExpired = now > expiresAt && !code.used
      const createdAt = new Date(code.createdAt)
      const usedAt = code.usedAt ? new Date(code.usedAt) : null

      let status = 'Unused'
      if (code.used) {
        status = 'Used'
      } else if (isExpired) {
        status = 'Expired'
      }

      return [
        code.email,
        code.code,
        code.prizeLabel,
        code.prizeType,
        code.prizeValue?.toString() || '',
        createdAt.toLocaleString(),
        expiresAt.toLocaleString(),
        status,
        code.usedFor || '',
        usedAt ? usedAt.toLocaleString() : '',
        code.consultationId || '',
        code.orderId || '',
      ]
    })

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        const cellStr = String(cell || '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `spin-wheel-winners-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const stats = {
    total: codes.length,
    used: codes.filter(c => c.used).length,
    unused: codes.filter(c => c.used === false).length,
    expired: codes.filter(c => {
      const now = new Date()
      const expiresAt = new Date(c.expiresAt)
      return now > expiresAt && !c.used
    }).length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading winners...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <AdminBackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-display text-[var(--color-primary)] mb-2">
            🎉 Spin Wheel Winners
          </h1>
          <p className="text-gray-600">
            View all spin wheel winners, their prizes, and code usage status
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border-2 border-[var(--color-primary)]/20">
            <div className="text-2xl font-bold text-[var(--color-primary)]">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Winners</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-2 border-green-200">
            <div className="text-2xl font-bold text-green-600">{stats.unused}</div>
            <div className="text-sm text-gray-600">Unused Codes</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-2 border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{stats.used}</div>
            <div className="text-sm text-gray-600">Used Codes</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-2 border-red-200">
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <div className="text-sm text-gray-600">Expired (Unused)</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="searchEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                Search by Email
              </label>
              <input
                type="text"
                id="searchEmail"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Enter email to search..."
                className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label htmlFor="filter" className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="all">All Winners</option>
                <option value="unused">Unused Codes</option>
                <option value="used">Used Codes</option>
                <option value="expired">Expired (Unused)</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={loadWinners}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                🔄 Refresh
              </button>
              <button
                onClick={downloadCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                disabled={sortedCodes.length === 0}
              >
                📥 Download CSV
              </button>
              <button
                onClick={deleteAllWinners}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                disabled={codes.length === 0}
              >
                🗑️ Delete All Winners
              </button>
            </div>
          </div>
        </div>

        {/* Winners Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-primary)] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Prize Won</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Won Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Expires</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Used For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {searchEmail || filter !== 'all' 
                        ? 'No winners found matching your filters.' 
                        : 'No winners yet. Winners will appear here once users spin the wheel.'}
                    </td>
                  </tr>
                ) : (
                  sortedCodes.map((code) => {
                    const now = new Date()
                    const expiresAt = new Date(code.expiresAt)
                    const isExpired = now > expiresAt && !code.used
                    const createdAt = new Date(code.createdAt)
                    const usedAt = code.usedAt ? new Date(code.usedAt) : null

                    return (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{code.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-semibold text-[var(--color-primary)]">
                            {code.prizeLabel}
                          </div>
                          {code.prizeType === 'discount_percentage' && code.prizeValue && (
                            <div className="text-xs text-gray-500">
                              {code.prizeValue}% Discount
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                            {code.code}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{expiresAt.toLocaleDateString()}</div>
                          {isExpired && (
                            <div className="text-xs text-red-600 font-semibold">Expired</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {code.used ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Used
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Unused
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {code.used ? (
                            <div>
                              <div className="font-medium">
                                {code.usedFor === 'consultation' ? 'Consultation' : 'Checkout'}
                              </div>
                              {usedAt && (
                                <div className="text-xs text-gray-500">
                                  {usedAt.toLocaleDateString()} {usedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                              {code.consultationId && (
                                <div className="text-xs text-gray-500">
                                  ID: {code.consultationId}
                                </div>
                              )}
                              {code.orderId && (
                                <div className="text-xs text-gray-500">
                                  Order: {code.orderId}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p>
            <strong>Total displayed:</strong> {sortedCodes.length} of {codes.length} winners
          </p>
        </div>
      </div>
    </div>
  )
}
