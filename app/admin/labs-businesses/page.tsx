'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

interface LabsBusiness {
  orderId: string
  tierId: string
  businessName: string
  email: string
  phone?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  amountKES: number
  currency: string
  createdAt: string
  completedAt?: string
  subdomain?: string
  customDomain?: string
  accountCreated: boolean
  tier?: {
    id: string
    name: string
  }
  settings?: {
    business?: {
      name?: string
      email?: string
      phone?: string
      address?: string
      description?: string
      logoType?: 'text' | 'image'
      logoUrl?: string
      logoText?: string
      logoColor?: string
    }
    social?: {
      instagram?: string
      facebook?: string
      tiktok?: string
      twitter?: string
    }
    emailConfig?: {
      enabled?: boolean
      fromEmail?: string
      fromName?: string
    }
  }
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminLabsBusinesses() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<LabsBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingBusiness, setEditingBusiness] = useState<LabsBusiness | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
        loadBusinesses()
      } catch (error) {
        router.replace('/admin/login')
      }
    }

    checkAuth()
  }, [router])

  const loadBusinesses = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs-businesses')
      if (!response.ok) {
        throw new Error('Failed to load businesses')
      }
      const data = await response.json()
      setBusinesses(data.businesses || [])
    } catch (error) {
      console.error('Error loading businesses:', error)
      setMessage({ type: 'error', text: 'Failed to load businesses' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (business: LabsBusiness) => {
    setEditingBusiness({ ...business })
  }

  const handleSave = async () => {
    if (!editingBusiness) return

    setSaving(true)
    setMessage(null)

    try {
      const updates: any = {}
      
      // Update basic business info
      if (editingBusiness.businessName) updates.businessName = editingBusiness.businessName
      if (editingBusiness.email) updates.email = editingBusiness.email
      if (editingBusiness.phone !== undefined) updates.phone = editingBusiness.phone
      if (editingBusiness.subdomain) updates.subdomain = editingBusiness.subdomain
      if (editingBusiness.customDomain !== undefined) updates.customDomain = editingBusiness.customDomain
      if (editingBusiness.status) updates.status = editingBusiness.status

      // Update settings if they exist
      if (editingBusiness.settings) {
        updates.settings = editingBusiness.settings
      }

      const response = await authorizedFetch('/api/admin/labs-businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: editingBusiness.orderId,
          updates,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save changes')
      }

      setMessage({ type: 'success', text: 'Business details updated successfully!' })
      setEditingBusiness(null)
      loadBusinesses()
    } catch (error: any) {
      console.error('Error saving business:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save changes' })
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const filteredBusinesses = businesses.filter(business =>
    business.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.orderId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading businesses...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display text-brown mb-2">Labs Businesses</h1>
          <p className="text-gray-600">View and help onboard Labs clients</p>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by business name, email, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
          />
        </div>

        {/* Businesses List */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brown-light/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-brown uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-brown uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-brown uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-brown uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-brown uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-brown uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-light/20">
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                      {searchQuery ? 'No businesses found matching your search.' : 'No businesses yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map((business) => (
                    <tr key={business.orderId} className="hover:bg-brown-light/10">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-brown">{business.businessName}</div>
                        <div className="text-sm text-gray-600">{business.email}</div>
                        {business.phone && (
                          <div className="text-sm text-gray-600">{business.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {business.tier?.name || business.tierId}
                        </div>
                        <div className="text-sm text-gray-600">
                          {business.amountKES.toLocaleString()} {business.currency}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(business.status)}`}>
                          {business.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {business.customDomain || business.subdomain || 'Not set'}
                        </div>
                        {business.customDomain && business.subdomain && (
                          <div className="text-xs text-gray-500">Sub: {business.subdomain}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(business.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleEdit(business)}
                          className="text-brown hover:text-brown-dark font-semibold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingBusiness && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-brown-light">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-display text-brown">Edit Business: {editingBusiness.businessName}</h2>
                  <button
                    onClick={() => setEditingBusiness(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-xl font-semibold text-brown mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                      <input
                        type="text"
                        value={editingBusiness.businessName}
                        onChange={(e) => setEditingBusiness({ ...editingBusiness, businessName: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={editingBusiness.email}
                        onChange={(e) => setEditingBusiness({ ...editingBusiness, email: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={editingBusiness.phone || ''}
                        onChange={(e) => setEditingBusiness({ ...editingBusiness, phone: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={editingBusiness.status}
                        onChange={(e) => setEditingBusiness({ ...editingBusiness, status: e.target.value as any })}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Domain Information */}
                <div>
                  <h3 className="text-xl font-semibold text-brown mb-4">Domain Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Subdomain</label>
                      <input
                        type="text"
                        value={editingBusiness.subdomain || ''}
                        onChange={(e) => setEditingBusiness({ ...editingBusiness, subdomain: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                        placeholder="businessname.lashdiarylabs.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Domain</label>
                      <input
                        type="text"
                        value={editingBusiness.customDomain || ''}
                        onChange={(e) => setEditingBusiness({ ...editingBusiness, customDomain: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                        placeholder="businessname.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Settings */}
                {editingBusiness.settings && (
                  <div>
                    <h3 className="text-xl font-semibold text-brown mb-4">Website Settings</h3>
                    {editingBusiness.settings.business && (
                      <div className="space-y-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name (Website)</label>
                          <input
                            type="text"
                            value={editingBusiness.settings.business.name || ''}
                            onChange={(e) => setEditingBusiness({
                              ...editingBusiness,
                              settings: {
                                ...editingBusiness.settings,
                                business: {
                                  ...(editingBusiness.settings?.business || {}),
                                  name: e.target.value,
                                },
                              },
                            })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Business Address</label>
                          <input
                            type="text"
                            value={editingBusiness.settings.business.address || ''}
                            onChange={(e) => setEditingBusiness({
                              ...editingBusiness,
                              settings: {
                                ...editingBusiness.settings,
                                business: {
                                  ...(editingBusiness.settings?.business || {}),
                                  address: e.target.value,
                                },
                              },
                            })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Business Description</label>
                          <textarea
                            value={editingBusiness.settings.business.description || ''}
                            onChange={(e) => setEditingBusiness({
                              ...editingBusiness,
                              settings: {
                                ...editingBusiness.settings,
                                business: {
                                  ...(editingBusiness.settings?.business || {}),
                                  description: e.target.value,
                                },
                              },
                            })}
                            rows={3}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>
                      </div>
                    )}
                    {editingBusiness.settings.social && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Instagram</label>
                          <input
                            type="text"
                            value={editingBusiness.settings.social.instagram || ''}
                            onChange={(e) => setEditingBusiness({
                              ...editingBusiness,
                              settings: {
                                ...editingBusiness.settings,
                                social: {
                                  ...(editingBusiness.settings?.social || {}),
                                  instagram: e.target.value,
                                },
                              },
                            })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Facebook</label>
                          <input
                            type="text"
                            value={editingBusiness.settings.social.facebook || ''}
                            onChange={(e) => setEditingBusiness({
                              ...editingBusiness,
                              settings: {
                                ...editingBusiness.settings,
                                social: {
                                  ...(editingBusiness.settings?.social || {}),
                                  facebook: e.target.value,
                                },
                              },
                            })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-brown mb-2">Order Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">Order ID:</span>
                      <div className="text-gray-600 font-mono">{editingBusiness.orderId}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Account Created:</span>
                      <div className="text-gray-600">{editingBusiness.accountCreated ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Created:</span>
                      <div className="text-gray-600">{new Date(editingBusiness.createdAt).toLocaleString()}</div>
                    </div>
                    {editingBusiness.completedAt && (
                      <div>
                        <span className="font-semibold text-gray-700">Completed:</span>
                        <div className="text-gray-600">{new Date(editingBusiness.completedAt).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-brown-light flex justify-end gap-4">
                <button
                  onClick={() => setEditingBusiness(null)}
                  className="px-6 py-2 border-2 border-brown-light rounded-lg text-brown hover:bg-brown-light transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

