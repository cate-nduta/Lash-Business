'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Toast from '@/components/Toast'
import type { GuideScenario } from '@/lib/labs-guide-utils'
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface WebService {
  id: string
  name: string
  description: string
  price: number
  category: string
  billingPeriod?: 'one-time' | 'yearly' | 'monthly'
}

export default function LabsGuideAdminPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [scenarios, setScenarios] = useState<GuideScenario[]>([])
  const [services, setServices] = useState<WebService[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [newScenario, setNewScenario] = useState<Partial<GuideScenario>>({
    name: '',
    description: '',
    mustHaveServiceIds: [],
    recommendedServiceIds: [],
  })

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const authResponse = await fetch('/api/admin/current-user', { credentials: 'include' })
        if (!authResponse.ok) {
          throw new Error('Unauthorized')
        }
        const authData = await authResponse.json()
        if (!isMounted) return
        if (!authData.authenticated) {
          setAuthenticated(false)
          router.replace('/admin/login')
          return
        }
        setAuthenticated(true)
      } catch (error) {
        if (!isMounted) return
        console.error('Auth error:', error)
        setAuthenticated(false)
        router.replace('/admin/login')
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [router])

  useEffect(() => {
    if (authenticated) {
      loadData()
    }
  }, [authenticated])

  const loadData = async () => {
    try {
      setLoading(true)
      const [guideResponse, servicesResponse] = await Promise.all([
        fetch('/api/admin/labs-guide', { credentials: 'include' }),
        fetch('/api/labs/web-services', { credentials: 'include' }),
      ])

      if (guideResponse.ok) {
        const guideData = await guideResponse.json()
        setScenarios(guideData.scenarios || [])
      }

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json()
        setServices(servicesData.services || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/labs-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          scenarios: scenarios.map((s, index) => ({ ...s, order: index })),
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Guide saved successfully' })
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || 'Failed to save guide' })
      }
    } catch (error) {
      console.error('Error saving guide:', error)
      setMessage({ type: 'error', text: 'Failed to save guide' })
    } finally {
      setSaving(false)
    }
  }

  const saveScenarios = async (scenariosToSave: GuideScenario[]) => {
    try {
      const response = await fetch('/api/admin/labs-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          scenarios: scenariosToSave.map((s, index) => ({ ...s, order: index })),
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Scenario saved successfully' })
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || 'Failed to save scenario' })
      }
    } catch (error) {
      console.error('Error saving scenario:', error)
      setMessage({ type: 'error', text: 'Failed to save scenario' })
    }
  }

  const handleAddScenario = async () => {
    const scenario: GuideScenario = {
      id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newScenario.name || 'New Scenario',
      description: newScenario.description || '',
      mustHaveServiceIds: newScenario.mustHaveServiceIds || [],
      recommendedServiceIds: newScenario.recommendedServiceIds || [],
      order: scenarios.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updatedScenarios = [...scenarios, scenario]
    setScenarios(updatedScenarios)
    setNewScenario({ name: '', description: '', mustHaveServiceIds: [], recommendedServiceIds: [] })
    
    // Auto-save after adding
    await saveScenarios(updatedScenarios)
  }

  const handleStartEdit = (scenario: GuideScenario) => {
    setEditingScenarioId(scenario.id)
    setEditingName(scenario.name)
    setEditingDescription(scenario.description)
  }

  const handleCancelEdit = () => {
    setEditingScenarioId(null)
    setEditingName('')
    setEditingDescription('')
  }

  const handleSaveEdit = async (scenarioId: string) => {
    if (!editingName.trim()) {
      setMessage({ type: 'error', text: 'Scenario name is required' })
      return
    }
    
    const updatedScenarios = scenarios.map(s => 
      s.id === scenarioId 
        ? { ...s, name: editingName.trim(), description: editingDescription.trim(), updatedAt: new Date().toISOString() }
        : s
    )
    setScenarios(updatedScenarios)
    setEditingScenarioId(null)
    setEditingName('')
    setEditingDescription('')
    
    // Auto-save after editing
    await saveScenarios(updatedScenarios)
  }


  const handleDeleteScenario = async (id: string) => {
    if (confirm('Are you sure you want to delete this scenario?')) {
      const updatedScenarios = scenarios.filter(s => s.id !== id).map((s, index) => ({ ...s, order: index }))
      setScenarios(updatedScenarios)
      
      // Auto-save after deleting
      await saveScenarios(updatedScenarios)
    }
  }

  const handleMoveScenario = async (id: string, direction: 'up' | 'down') => {
    const index = scenarios.findIndex(s => s.id === id)
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= scenarios.length) return

    const newScenarios = [...scenarios]
    ;[newScenarios[index], newScenarios[newIndex]] = [newScenarios[newIndex], newScenarios[index]]
    const updatedScenarios = newScenarios.map((s, i) => ({ ...s, order: i }))
    setScenarios(updatedScenarios)
    
    // Auto-save after moving
    await saveScenarios(updatedScenarios)
  }

  const toggleServiceInList = async (scenarioId: string, serviceId: string, listType: 'mustHave' | 'recommended') => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (!scenario) return

    const list = listType === 'mustHave' ? scenario.mustHaveServiceIds : scenario.recommendedServiceIds
    const otherList = listType === 'mustHave' ? scenario.recommendedServiceIds : scenario.mustHaveServiceIds
    
    // Remove from other list if present
    const updatedOtherList = otherList.filter(id => id !== serviceId)
    
    // Toggle in current list
    const updatedList = list.includes(serviceId)
      ? list.filter(id => id !== serviceId)
      : [...list, serviceId]

    let updatedScenarios: GuideScenario[]
    if (listType === 'mustHave') {
      updatedScenarios = scenarios.map(s => 
        s.id === scenarioId 
          ? { ...s, mustHaveServiceIds: updatedList, recommendedServiceIds: updatedOtherList, updatedAt: new Date().toISOString() }
          : s
      )
    } else {
      updatedScenarios = scenarios.map(s => 
        s.id === scenarioId 
          ? { ...s, recommendedServiceIds: updatedList, mustHaveServiceIds: updatedOtherList, updatedAt: new Date().toISOString() }
          : s
      )
    }
    
    setScenarios(updatedScenarios)
    
    // Auto-save after toggling service
    await saveScenarios(updatedScenarios)
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <p className="text-brown-dark/70">Loading...</p>
      </div>
    )
  }

  if (authenticated === false) {
    return null
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/admin/labs-web-services"
            className="text-brown-dark/70 hover:text-brown-dark transition-colors"
          >
            ← Back to Services
          </Link>
          <span className="text-brown-dark/50">|</span>
          <span className="text-brown-dark font-semibold">Guide Scenarios</span>
        </div>

        <div className="bg-white/70 rounded-2xl shadow-soft p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-display text-brown-dark mb-2">Guide Scenarios</h1>
              <p className="text-brown-dark/70">
                Create scenarios to help customers choose the right services for their needs
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/labs/custom-website-builds/guide"
                target="_blank"
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
              >
                👁️ Preview Guide
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Add New Scenario */}
          <div className="bg-brown-light/20 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-brown-dark mb-4">Add New Scenario</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Scenario Name *
                </label>
                <input
                  type="text"
                  value={newScenario.name || ''}
                  onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                  placeholder="e.g., Small Business / SME (Online Presence First)"
                  className="w-full rounded-lg border-2 border-brown-light bg-white px-4 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Description
                </label>
                <div style={{ minHeight: '200px' }}>
                  <ReactQuill
                    theme="snow"
                    value={newScenario.description || ''}
                    onChange={(value) => setNewScenario({ ...newScenario, description: value })}
                    placeholder="Brief description of this scenario..."
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        ['link'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                      ],
                    }}
                    formats={['header', 'bold', 'italic', 'underline', 'link', 'list']}
                  />
                </div>
                <p className="text-xs text-brown-dark/60 mt-2">
                  Use the toolbar to format text, add links, and create lists.
                </p>
              </div>
            </div>
            <button
              onClick={handleAddScenario}
              disabled={!newScenario.name}
              className="mt-4 px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Scenario
            </button>
          </div>

          {/* Scenarios List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-brown-dark/70">Loading scenarios...</p>
            </div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-brown-dark/70">No scenarios yet. Add one above to get started.</p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-brown-dark mb-4">Saved Scenarios</h2>
              {editingScenarioId ? (
                // When editing, show full-width edit form
                <div className="bg-white rounded-lg border-2 border-brown-light p-4 mb-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-brown-dark mb-1">
                        Scenario Name *
                      </label>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        placeholder="Scenario name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brown-dark mb-1">
                        Description
                      </label>
                            <div style={{ minHeight: '200px' }}>
                              <ReactQuill
                                theme="snow"
                                value={editingDescription}
                                onChange={setEditingDescription}
                                placeholder="Brief description..."
                                modules={{
                                  toolbar: [
                                    [{ 'header': [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline'],
                                    ['link'],
                                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                    ['clean']
                                  ],
                                }}
                                formats={['header', 'bold', 'italic', 'underline', 'link', 'list']}
                              />
                            </div>
                      <p className="text-xs text-brown-dark/60 mt-2">
                        Use the toolbar to format text, add links, and create lists.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(scenarios.find(s => s.id === editingScenarioId)?.id || '')}
                        disabled={!editingName.trim()}
                        className="px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="grid md:grid-cols-2 gap-6">
                {scenarios.map((scenario, index) => (
                  <div key={scenario.id} className="bg-white rounded-lg border-2 border-brown-light p-6 shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-brown-dark">{scenario.name}</h3>
                          <span className="text-xs text-brown-dark/60">#{index + 1}</span>
                        </div>
                        {scenario.description && (
                          <div 
                            className="text-sm text-brown-dark/70 mb-3 prose prose-sm max-w-none line-clamp-2"
                            dangerouslySetInnerHTML={{ 
                              __html: scenario.description.replace(/<[^>]*>/g, '').substring(0, 150) + 
                                      (scenario.description.replace(/<[^>]*>/g, '').length > 150 ? '...' : '')
                            }}
                          />
                        )}
                        <div className="flex items-center gap-4 text-xs text-brown-dark/60 mb-4">
                          <span className="flex items-center gap-1">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                              Must-Haves
                            </span>
                            <span>{scenario.mustHaveServiceIds.length}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                              Recommended
                            </span>
                            <span>{scenario.recommendedServiceIds.length}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-brown-light">
                      <button
                        onClick={() => handleStartEdit(scenario)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                        title="Edit"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleMoveScenario(scenario.id, 'up')}
                        disabled={index === 0}
                        className="px-3 py-1.5 bg-brown-light text-brown-dark rounded text-xs font-medium hover:bg-brown-light/80 disabled:opacity-50"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveScenario(scenario.id, 'down')}
                        disabled={index === scenarios.length - 1}
                        className="px-3 py-1.5 bg-brown-light text-brown-dark rounded text-xs font-medium hover:bg-brown-light/80 disabled:opacity-50"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(scenario.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                        title="Delete"
                      >
                        🗑️ Delete
                      </button>
                    </div>

                    <div className="mt-4 grid md:grid-cols-2 gap-6">
                      {/* Must-Haves */}
                      <div>
                        <h4 className="text-sm font-semibold text-brown-dark mb-3 flex items-center gap-2">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Must-Haves</span>
                          <span className="text-xs text-brown-dark/60">
                            ({scenario.mustHaveServiceIds.length} selected)
                          </span>
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {services.map((service) => {
                            const isSelected = scenario.mustHaveServiceIds.includes(service.id)
                            return (
                              <label
                                key={service.id}
                                className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-red-50 border-red-300'
                                    : 'bg-white border-brown-light hover:border-brown-dark'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleServiceInList(scenario.id, service.id, 'mustHave')}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-brown-dark">{service.name}</div>
                                  <div className="text-xs text-brown-dark/60">
                                    {service.category} • {service.billingPeriod || 'one-time'}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      {/* Recommended */}
                      <div>
                        <h4 className="text-sm font-semibold text-brown-dark mb-3 flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Recommended</span>
                          <span className="text-xs text-brown-dark/60">
                            ({scenario.recommendedServiceIds.length} selected)
                          </span>
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {services.map((service) => {
                            const isSelected = scenario.recommendedServiceIds.includes(service.id)
                            return (
                              <label
                                key={service.id}
                                className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'bg-white border-brown-light hover:border-brown-dark'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleServiceInList(scenario.id, service.id, 'recommended')}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-brown-dark">{service.name}</div>
                                  <div className="text-xs text-brown-dark/60">
                                    {service.category} • {service.billingPeriod || 'one-time'}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}
    </div>
  )
}

