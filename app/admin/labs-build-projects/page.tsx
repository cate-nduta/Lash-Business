'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { BuildProject } from '@/app/api/admin/labs/build-projects/route'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

function formatDateOnly(dateStr: string | undefined): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// Gantt Chart Component
function GanttChartView({ projects }: { projects: BuildProject[] }) {
  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-12 text-center">
        <p className="text-gray-600 text-lg">No projects with time blocks to display.</p>
        <p className="text-gray-500 text-sm mt-2">Set time blocks on projects to see them in the Gantt chart.</p>
      </div>
    )
  }

  // Calculate date range
  const allDates: Date[] = []
  projects.forEach(project => {
    if (project.timeBlock) {
      allDates.push(new Date(project.timeBlock.startDate))
      allDates.push(new Date(project.timeBlock.endDate))
      if (project.timeBlock.publishDate) {
        allDates.push(new Date(project.timeBlock.publishDate))
      }
    }
  })

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
  
  // Extend range by 7 days on each side for better visualization
  minDate.setDate(minDate.getDate() - 7)
  maxDate.setDate(maxDate.getDate() + 7)

  // Generate date columns (one per week)
  const weeks: Date[] = []
  const currentDate = new Date(minDate)
  while (currentDate <= maxDate) {
    weeks.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 7)
  }

  const getDaysBetween = (start: Date, end: Date): number => {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getPosition = (date: Date): number => {
    const daysFromStart = getDaysBetween(minDate, date)
    return (daysFromStart / getDaysBetween(minDate, maxDate)) * 100
  }

  const getWidth = (start: Date, end: Date): number => {
    const totalDays = getDaysBetween(minDate, maxDate)
    const blockDays = getDaysBetween(start, end)
    return (blockDays / totalDays) * 100
  }

  return (
    <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 overflow-x-auto">
      <h3 className="text-xl font-semibold text-brown mb-4">Project Timeline Gantt Chart</h3>
      <div className="min-w-full">
        <div className="space-y-3">
          {projects.map((project) => {
            if (!project.timeBlock) return null
            
            const startDate = new Date(project.timeBlock.startDate)
            const endDate = new Date(project.timeBlock.endDate)
            const publishDate = project.timeBlock.publishDate ? new Date(project.timeBlock.publishDate) : null
            
            const left = getPosition(startDate)
            const width = getWidth(startDate, endDate)
            const publishLeft = publishDate ? getPosition(publishDate) : null

            return (
              <div key={project.projectId} className="relative" style={{ height: '60px' }}>
                <div className="absolute left-0 top-0 w-48 text-sm font-semibold text-brown truncate pr-2">
                  {project.businessName}
                </div>
                <div className="ml-48 relative h-full border-l-2 border-gray-300">
                  {/* Build period bar */}
                  <div
                    className="absolute top-2 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-semibold"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      minWidth: '80px',
                    }}
                    title={`${formatDateOnly(project.timeBlock.startDate)} - ${formatDateOnly(project.timeBlock.endDate)}`}
                  >
                    <span className="px-2 truncate">
                      {formatDateOnly(project.timeBlock.startDate)} - {formatDateOnly(project.timeBlock.endDate)}
                    </span>
                  </div>
                  
                  {/* Publish date marker */}
                  {publishDate && publishLeft !== null && (
                    <div
                      className="absolute top-12 h-4 bg-green-500 rounded-full"
                      style={{
                        left: `${publishLeft}%`,
                        width: '4px',
                        transform: 'translateX(-2px)',
                      }}
                      title={`Publish: ${formatDateOnly(project.timeBlock.publishDate)}`}
                    />
                  )}
                  
                  {/* Date labels */}
                  <div className="absolute -bottom-5 left-0 right-0 text-xs text-gray-500 flex justify-between">
                    <span>{formatDateOnly(project.timeBlock.startDate)}</span>
                    {publishDate && <span className="text-green-600">Publish: {formatDateOnly(project.timeBlock.publishDate)}</span>}
                    <span>{formatDateOnly(project.timeBlock.endDate)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Week markers */}
        <div className="mt-8 pt-4 border-t-2 border-gray-300">
          <div className="flex justify-between text-xs text-gray-500">
            {weeks.map((week, idx) => (
              <div key={idx} className="text-center">
                <div className="font-semibold">{week.toLocaleDateString('en-US', { month: 'short' })}</div>
                <div>{week.getDate()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLabsBuildProjects() {
  const [projects, setProjects] = useState<BuildProject[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending-payment' | 'slot-reserved' | 'timeline-sent' | 'build-started' | 'in-progress' | 'ready-for-delivery' | 'delivered'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<BuildProject | null>(null)
  const [editingTimeBlock, setEditingTimeBlock] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list')
  const [timeBlockForm, setTimeBlockForm] = useState<{
    startDate: string
    endDate: string
    publishDate: string
    notes: string
  }>({
    startDate: '',
    endDate: '',
    publishDate: '',
    notes: '',
  })
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user')
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        loadProjects()
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  const loadProjects = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs/build-projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error loading build projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (projectId: string, status: BuildProject['status'], milestone?: any) => {
    try {
      const response = await authorizedFetch(`/api/admin/labs/build-projects`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          status,
          milestone,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update project')
      }

      alert('Project updated successfully!')
      loadProjects()
      setEditingProject(null)
    } catch (error: any) {
      alert(error.message || 'Failed to update project')
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }


  const handleSetTimeBlock = async (projectId: string) => {
    try {
      if (!timeBlockForm.startDate || !timeBlockForm.endDate) {
        alert('Please provide both start and end dates')
        return
      }

      const response = await authorizedFetch(`/api/admin/labs/build-projects`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          timeBlock: {
            startDate: timeBlockForm.startDate,
            endDate: timeBlockForm.endDate,
            publishDate: timeBlockForm.publishDate || undefined,
            notes: timeBlockForm.notes || undefined,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set time block')
      }

      alert('Time block set successfully!')
      setEditingTimeBlock(null)
      setTimeBlockForm({ startDate: '', endDate: '', publishDate: '', notes: '' })
      loadProjects()
    } catch (error: any) {
      alert(error.message || 'Failed to set time block')
    }
  }

  const canSetTimeBlock = (project: BuildProject) => {
    return project.status !== 'pending-payment' && project.paymentStatus.upfrontPaid
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-600 text-white'
      case 'ready-for-delivery':
        return 'bg-blue-600 text-white'
      case 'in-progress':
      case 'build-started':
        return 'bg-purple-600 text-white'
      case 'timeline-sent':
        return 'bg-yellow-600 text-white'
      case 'slot-reserved':
        return 'bg-teal-600 text-white'
      case 'pending-payment':
        return 'bg-gray-600 text-white'
      case 'on-hold':
        return 'bg-orange-600 text-white'
      case 'cancelled':
        return 'bg-red-600 text-white'
      default:
        return 'bg-gray-400 text-white'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending-payment': 'Pending Payment',
      'slot-reserved': '✓ Build Slot Reserved',
      'timeline-sent': '✓ Build Timeline Sent',
      'build-started': '✓ Build Started',
      'in-progress': 'In Progress',
      'review': 'Under Review',
      'ready-for-delivery': 'Ready for Delivery',
      'delivered': 'Delivered',
      'on-hold': 'On Hold',
      'cancelled': 'Cancelled',
    }
    return labels[status] || status
  }

  const filteredProjects = projects.filter((project) => {
    if (filter === 'all') return true
    return project.status === filter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading build projects...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-display text-brown mb-2">Build Projects</h1>
            <p className="text-gray-600">Track and manage all system setup projects</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 bg-white rounded-lg border-2 border-brown-light p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-brown-dark text-white'
                    : 'text-brown hover:bg-brown-light/20'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  viewMode === 'gantt'
                    ? 'bg-brown-dark text-white'
                    : 'text-brown hover:bg-brown-light/20'
                }`}
              >
                Gantt Chart
              </button>
            </div>
            <a
              href="/admin/labs-invoices"
              className="bg-brown-dark text-white px-6 py-2 rounded-lg font-semibold hover:bg-brown transition-colors"
            >
              View Invoices →
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            All ({projects.length})
          </button>
          <button
            onClick={() => setFilter('pending-payment')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'pending-payment'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            Pending Payment ({projects.filter(p => p.status === 'pending-payment').length})
          </button>
          <button
            onClick={() => setFilter('slot-reserved')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'slot-reserved'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            Slot Reserved ({projects.filter(p => p.status === 'slot-reserved').length})
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'in-progress'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            In Progress ({projects.filter(p => p.status === 'in-progress' || p.status === 'build-started').length})
          </button>
          <button
            onClick={() => setFilter('ready-for-delivery')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'ready-for-delivery'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            Ready ({projects.filter(p => p.status === 'ready-for-delivery').length})
          </button>
        </div>

        {/* Projects List or Gantt Chart */}
        {viewMode === 'gantt' ? (
          <GanttChartView projects={filteredProjects.filter(p => p.timeBlock)} />
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-12 text-center">
            <p className="text-gray-600 text-lg">No build projects found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => {
              const isExpanded = expandedId === project.projectId
              const isEditing = editingProject?.projectId === project.projectId
              return (
                <div
                  key={project.projectId}
                  className="bg-white rounded-xl shadow-soft border-2 border-brown-light overflow-hidden"
                >
                  <div
                    className="p-6 cursor-pointer hover:bg-brown-light/10 transition-colors"
                    onClick={() => !isEditing && setExpandedId(isExpanded ? null : project.projectId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-xl font-semibold text-brown">
                            {project.businessName}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(project.status)}`}>
                            {getStatusLabel(project.status)}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-1">
                          <strong>Tier:</strong> {project.tierName}
                        </p>
                        <p className="text-gray-600 mb-1">
                          <strong>Contact:</strong> {project.contactName} ({project.email})
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Created: {formatDate(project.createdAt)} | Updated: {formatDate(project.updatedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-brown mb-1">
                          {formatCurrency(project.totalAmount, project.currency)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Paid: {formatCurrency(project.paymentStatus.totalPaid, project.currency)}
                        </div>
                        <span className="text-gray-500 text-sm">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && !isEditing && (
                    <div className="border-t-2 border-brown-light p-6 space-y-6">
                      {/* Workflow Milestones */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Workflow Milestones
                        </h4>
                        <div className="space-y-3">
                          <div className={`p-4 rounded-lg border-2 ${
                            project.milestones.buildSlotReserved
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-700">
                                  {project.milestones.buildSlotReserved ? '✓' : '○'} Build Slot Reserved
                                </p>
                                {project.milestones.buildSlotReserved && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {formatDate(project.milestones.buildSlotReserved.date)}
                                    {project.milestones.buildSlotReserved.notes && ` - ${project.milestones.buildSlotReserved.notes}`}
                                  </p>
                                )}
                              </div>
                              {!project.milestones.buildSlotReserved && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUpdateStatus(project.projectId, 'slot-reserved', {
                                      type: 'buildSlotReserved',
                                      date: new Date().toISOString(),
                                    })
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                                >
                                  Mark Reserved
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`p-4 rounded-lg border-2 ${
                            project.milestones.buildTimelineSent
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-700">
                                  {project.milestones.buildTimelineSent ? '✓' : '○'} Build Timeline Sent
                                </p>
                                {project.milestones.buildTimelineSent && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {formatDate(project.milestones.buildTimelineSent.date)}
                                    {project.milestones.buildTimelineSent.notes && ` - ${project.milestones.buildTimelineSent.notes}`}
                                  </p>
                                )}
                              </div>
                              {!project.milestones.buildTimelineSent && project.milestones.buildSlotReserved && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUpdateStatus(project.projectId, 'timeline-sent', {
                                      type: 'buildTimelineSent',
                                      date: new Date().toISOString(),
                                    })
                                  }}
                                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700"
                                >
                                  Mark Sent
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`p-4 rounded-lg border-2 ${
                            project.milestones.buildStarted
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-700">
                                  {project.milestones.buildStarted ? '✓' : '○'} Build Started
                                </p>
                                {project.milestones.buildStarted && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {formatDate(project.milestones.buildStarted.date)}
                                    {project.milestones.buildStarted.notes && ` - ${project.milestones.buildStarted.notes}`}
                                  </p>
                                )}
                              </div>
                              {!project.milestones.buildStarted && project.milestones.buildTimelineSent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUpdateStatus(project.projectId, 'build-started', {
                                      type: 'buildStarted',
                                      date: new Date().toISOString(),
                                    })
                                  }}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
                                >
                                  Mark Started
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Time Blocking */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Project Timeline & Time Blocking
                        </h4>
                        {project.timeBlock ? (
                          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300 mb-3">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-sm text-gray-600 font-semibold">Build Start Date</p>
                                <p className="text-lg font-bold text-brown">{formatDateOnly(project.timeBlock.startDate)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 font-semibold">Build End Date</p>
                                <p className="text-lg font-bold text-brown">{formatDateOnly(project.timeBlock.endDate)}</p>
                              </div>
                              {project.timeBlock.publishDate && (
                                <div>
                                  <p className="text-sm text-gray-600 font-semibold">Target Publish Date</p>
                                  <p className="text-lg font-bold text-brown">{formatDateOnly(project.timeBlock.publishDate)}</p>
                                </div>
                              )}
                            </div>
                            {project.timeBlock.notes && (
                              <p className="text-sm text-gray-700 mt-2">{project.timeBlock.notes}</p>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingTimeBlock(project.projectId)
                                setTimeBlockForm({
                                  startDate: project.timeBlock?.startDate || '',
                                  endDate: project.timeBlock?.endDate || '',
                                  publishDate: project.timeBlock?.publishDate || '',
                                  notes: project.timeBlock?.notes || '',
                                })
                              }}
                              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                            >
                              Edit Time Block
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-300 mb-3">
                            {canSetTimeBlock(project) ? (
                              <>
                                <p className="text-gray-600 mb-3">No time block set. Set a time block to reserve build time for this project.</p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingTimeBlock(project.projectId)
                                    const today = new Date().toISOString().split('T')[0]
                                    setTimeBlockForm({
                                      startDate: today,
                                      endDate: '',
                                      publishDate: '',
                                      notes: '',
                                    })
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                                >
                                  Set Time Block
                                </button>
                              </>
                            ) : (
                              <p className="text-gray-500 italic">Time blocking available after payment is received</p>
                            )}
                          </div>
                        )}
                        
                        {editingTimeBlock === project.projectId && (
                          <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300 mt-3">
                            <h5 className="font-semibold text-brown mb-3">Set Time Block</h5>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-semibold text-brown mb-1">Build Start Date *</label>
                                <input
                                  type="date"
                                  value={timeBlockForm.startDate}
                                  onChange={(e) => setTimeBlockForm({ ...timeBlockForm, startDate: e.target.value })}
                                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-brown mb-1">Build End Date *</label>
                                <input
                                  type="date"
                                  value={timeBlockForm.endDate}
                                  onChange={(e) => setTimeBlockForm({ ...timeBlockForm, endDate: e.target.value })}
                                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                                  min={timeBlockForm.startDate || new Date().toISOString().split('T')[0]}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-brown mb-1">Target Publish Date (Optional)</label>
                                <input
                                  type="date"
                                  value={timeBlockForm.publishDate}
                                  onChange={(e) => setTimeBlockForm({ ...timeBlockForm, publishDate: e.target.value })}
                                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                                  min={timeBlockForm.endDate || timeBlockForm.startDate || new Date().toISOString().split('T')[0]}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-brown mb-1">Notes (Optional)</label>
                                <textarea
                                  value={timeBlockForm.notes}
                                  onChange={(e) => setTimeBlockForm({ ...timeBlockForm, notes: e.target.value })}
                                  rows={2}
                                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                                  placeholder="Any notes about this time block..."
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSetTimeBlock(project.projectId)
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                                >
                                  Save Time Block
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingTimeBlock(null)
                                    setTimeBlockForm({ startDate: '', endDate: '', publishDate: '', notes: '' })
                                  }}
                                  className="px-4 py-2 bg-gray-400 text-white rounded-lg text-sm font-semibold hover:bg-gray-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Payment Status */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Payment Status
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Upfront Payment</p>
                            <p className={`text-lg font-semibold ${project.paymentStatus.upfrontPaid ? 'text-green-600' : 'text-gray-400'}`}>
                              {project.paymentStatus.upfrontPaid ? '✓ Paid' : 'Pending'}
                            </p>
                            {project.paymentStatus.upfrontPaidDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(project.paymentStatus.upfrontPaidDate)}
                              </p>
                            )}
                          </div>
                          {project.tierName.includes('Full Operations Suite') && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">Second Payment</p>
                              <p className={`text-lg font-semibold ${project.paymentStatus.secondPaid ? 'text-green-600' : 'text-gray-400'}`}>
                                {project.paymentStatus.secondPaid ? '✓ Paid' : 'Pending'}
                              </p>
                              {project.paymentStatus.secondPaidDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDate(project.paymentStatus.secondPaidDate)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="mt-3 p-3 bg-brown-light/20 rounded-lg">
                          <p className="text-sm text-gray-600">Total Paid</p>
                          <p className="text-xl font-bold text-brown">
                            {formatCurrency(project.paymentStatus.totalPaid, project.currency)} / {formatCurrency(project.totalAmount, project.currency)}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      {(project.notes || project.nextSteps) && (
                        <div>
                          <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                            Notes & Next Steps
                          </h4>
                          {project.notes && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-600 mb-1">Notes:</p>
                              <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{project.notes}</p>
                            </div>
                          )}
                          {project.nextSteps && (
                            <div>
                              <p className="text-sm font-semibold text-gray-600 mb-1">Next Steps:</p>
                              <p className="text-gray-700 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg">{project.nextSteps}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4 border-t-2 border-brown-light flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingProject(project)
                          }}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Edit Project
                        </button>
                        <a
                          href={`/admin/labs-invoices?invoiceId=${project.invoiceId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-brown-dark text-white px-6 py-2 rounded-lg font-semibold hover:bg-brown transition-colors"
                        >
                          View Invoice
                        </a>
                        <a
                          href={`mailto:${project.email}?subject=Re: Build Project - ${project.businessName}`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-brown-light text-brown px-6 py-2 rounded-lg font-semibold hover:bg-brown-light/80 transition-colors"
                        >
                          Email Client
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Edit Mode */}
                  {isEditing && (
                    <div className="border-t-2 border-brown-light p-6 space-y-6">
                      <h4 className="text-lg font-semibold text-brown mb-4">Edit Project</h4>
                      
                      <div>
                        <label className="block text-sm font-semibold text-brown mb-2">Status</label>
                        <select
                          value={editingProject.status}
                          onChange={(e) => {
                            setEditingProject({ ...editingProject, status: e.target.value as any })
                          }}
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                        >
                          <option value="pending-payment">Pending Payment</option>
                          <option value="slot-reserved">Build Slot Reserved</option>
                          <option value="timeline-sent">Build Timeline Sent</option>
                          <option value="build-started">Build Started</option>
                          <option value="in-progress">In Progress</option>
                          <option value="review">Under Review</option>
                          <option value="ready-for-delivery">Ready for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="on-hold">On Hold</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brown mb-2">Notes</label>
                        <textarea
                          value={editingProject.notes || ''}
                          onChange={(e) => {
                            setEditingProject({ ...editingProject, notes: e.target.value })
                          }}
                          rows={4}
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          placeholder="Internal notes about this project..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brown mb-2">Next Steps</label>
                        <textarea
                          value={editingProject.nextSteps || ''}
                          onChange={(e) => {
                            setEditingProject({ ...editingProject, nextSteps: e.target.value })
                          }}
                          rows={3}
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          placeholder="What needs to happen next..."
                        />
                      </div>

                      <div className="flex gap-4 pt-4 border-t-2 border-brown-light">
                        <button
                          onClick={async () => {
                            try {
                              const response = await authorizedFetch(`/api/admin/labs/build-projects`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  projectId: editingProject.projectId,
                                  status: editingProject.status,
                                  notes: editingProject.notes,
                                  nextSteps: editingProject.nextSteps,
                                }),
                              })

                              if (!response.ok) {
                                const error = await response.json()
                                throw new Error(error.error || 'Failed to update project')
                              }

                              alert('Project updated successfully!')
                              setEditingProject(null)
                              loadProjects()
                            } catch (error: any) {
                              alert(error.message || 'Failed to update project')
                            }
                          }}
                          className="flex-1 bg-brown-dark text-white px-6 py-3 rounded-lg font-semibold hover:bg-brown transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingProject(null)}
                          className="px-6 py-3 border-2 border-brown-light text-brown rounded-lg font-semibold hover:bg-brown-light/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

