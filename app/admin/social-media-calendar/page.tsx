'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, { credentials: 'include', ...init })
}

interface SocialMediaPost {
  id: string
  platform: 'instagram' | 'email'
  content: string
  scheduledDate: string
  scheduledTime: string
  imageUrl?: string
  status: 'draft' | 'scheduled' | 'published'
  createdAt: string
  updatedAt: string
  // Email-specific fields
  emailSubject?: string
  emailTo?: string
  emailBody?: string
  newsletterId?: string // If using an existing newsletter
}

export default function SocialMediaCalendar() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [posts, setPosts] = useState<SocialMediaPost[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(1)
    return today
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newsletters, setNewsletters] = useState<Array<{ id: string; title: string; subject: string }>>([])
  const [emailMode, setEmailMode] = useState<'fresh' | 'newsletter'>('fresh')
  
  // Form state
  const [formData, setFormData] = useState({
    platform: 'instagram' as 'instagram' | 'email',
    content: '',
    scheduledDate: '',
    scheduledTime: '',
    imageUrl: '',
    status: 'draft' as 'draft' | 'scheduled' | 'published',
    // Email-specific fields
    emailSubject: '',
    emailTo: '',
    emailBody: '',
    newsletterId: '',
  })

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
        setAuthenticated(true)
        loadPosts()
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

  // Auto-update status based on scheduled date/time
  useEffect(() => {
    let isMounted = true
    let updateInProgress = false

    const updatePostStatuses = async () => {
      if (updateInProgress || !isMounted) return
      updateInProgress = true

      try {
        const now = new Date()
        const postsToUpdate: string[] = []

        posts.forEach((post) => {
          if (post.status === 'scheduled' && post.scheduledDate) {
            const scheduledDateTime = new Date(
              `${post.scheduledDate}T${post.scheduledTime || '00:00'}:00`
            )
            
            // If scheduled time has passed, mark as published
            if (scheduledDateTime <= now) {
              postsToUpdate.push(post.id)
            }
          }
        })

        // Update posts that need status changes
        if (postsToUpdate.length > 0 && isMounted) {
          for (const postId of postsToUpdate) {
            try {
              const post = posts.find(p => p.id === postId)
              if (post && isMounted) {
                await authorizedFetch(`/api/admin/social-media-calendar/${postId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...post,
                    status: 'published',
                  }),
                })
              }
            } catch (error) {
              console.error('Error updating post status:', error)
            }
          }
          // Reload posts after updates
          if (isMounted) {
            loadPosts()
          }
        }
      } finally {
        updateInProgress = false
      }
    }

    // Check statuses on mount and every minute
    if (posts.length > 0) {
      updatePostStatuses()
      const interval = setInterval(() => {
        if (isMounted) {
          updatePostStatuses()
        }
      }, 60000) // Check every minute

      return () => {
        isMounted = false
        clearInterval(interval)
      }
    }
  }, [posts.length]) // Only depend on posts.length to avoid infinite loops

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await authorizedFetch('/api/admin/social-media-calendar')
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNewsletters = async () => {
    try {
      const response = await authorizedFetch('/api/admin/newsletters')
      if (response.ok) {
        const data = await response.json()
        setNewsletters(data.newsletters || [])
      }
    } catch (error) {
      console.error('Error loading newsletters:', error)
    }
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(1)
    setCurrentMonth(today)
  }

  const getCurrentMonthLabel = () => {
    return currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }

  // Get posts for a specific date
  const getPostsForDate = (dateStr: string) => {
    return posts.filter(post => post.scheduledDate === dateStr)
  }

  // Calendar generation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }, [currentMonth])

  const formatDateStr = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const handleDateClick = (day: number) => {
    const dateStr = formatDateStr(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSelectedDate(dateStr)
    setFormData({
      platform: 'instagram',
      content: '',
      scheduledDate: dateStr,
      scheduledTime: '',
      imageUrl: '',
      status: 'draft',
      emailSubject: '',
      emailTo: '',
      emailBody: '',
      newsletterId: '',
    })
    setEmailMode('fresh')
    setEditingPost(null)
    setShowModal(true)
    
    // Scroll to posts section after modal opens (with a small delay to ensure DOM update)
    setTimeout(() => {
      const postsSection = document.getElementById('selected-date-posts')
      if (postsSection) {
        postsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleEditPost = (post: SocialMediaPost) => {
    setEditingPost(post)
    const isEmail = post.platform === 'email'
    setEmailMode(post.newsletterId ? 'newsletter' : 'fresh')
    setFormData({
      platform: post.platform,
      content: post.content,
      scheduledDate: post.scheduledDate,
      scheduledTime: post.scheduledTime,
      imageUrl: post.imageUrl || '',
      status: post.status,
      emailSubject: post.emailSubject || '',
      emailTo: post.emailTo || '',
      emailBody: post.emailBody || '',
      newsletterId: post.newsletterId || '',
    })
    if (isEmail) {
      loadNewsletters()
    }
    setShowModal(true)
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await authorizedFetch(`/api/admin/social-media-calendar/${postId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Post deleted successfully' })
        loadPosts()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to delete post' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting post' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingPost
        ? `/api/admin/social-media-calendar/${editingPost.id}`
        : '/api/admin/social-media-calendar'
      
      const method = editingPost ? 'PUT' : 'POST'

      const response = await authorizedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: editingPost ? 'Post updated successfully' : 'Post created successfully' 
        })
        setShowModal(false)
        setEditingPost(null)
        setFormData({
          platform: 'instagram',
          content: '',
          scheduledDate: '',
          scheduledTime: '',
          imageUrl: '',
          status: 'draft',
          emailSubject: '',
          emailTo: '',
          emailBody: '',
          newsletterId: '',
        })
        loadPosts()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save post' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving post' })
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPost(null)
    setEmailMode('fresh')
    setFormData({
      platform: 'instagram',
      content: '',
      scheduledDate: '',
      scheduledTime: '',
      imageUrl: '',
      status: 'draft',
      emailSubject: '',
      emailTo: '',
      emailBody: '',
      newsletterId: '',
    })
    
    // Scroll to posts section after modal closes
    if (selectedDate) {
      setTimeout(() => {
        const postsSection = document.getElementById('selected-date-posts')
        if (postsSection) {
          postsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  if (authenticated === null || loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  const today = new Date()
  const isToday = (day: number | null) => {
    if (day === null) return false
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-display text-brown-dark mb-2">Social Media Calendar</h1>
              <p className="text-brown">Schedule and manage Instagram and Email posts</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="bg-brown-light text-brown-dark px-4 py-2 rounded-lg hover:bg-brown hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPreviousMonth}
              className="px-4 py-2 bg-pink-light text-brown-dark rounded-lg hover:bg-pink transition-colors"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold text-brown-dark">{getCurrentMonthLabel()}</h2>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-brown-light text-brown-dark rounded-lg hover:bg-brown hover:text-white transition-colors text-sm"
              >
                Today
              </button>
            </div>
            <button
              onClick={goToNextMonth}
              className="px-4 py-2 bg-pink-light text-brown-dark rounded-lg hover:bg-pink transition-colors"
            >
              Next →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-brown-dark py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }
              
              const dateStr = formatDateStr(currentMonth.getFullYear(), currentMonth.getMonth(), day)
              const dayPosts = getPostsForDate(dateStr)
              const instagramPosts = dayPosts.filter(p => p.platform === 'instagram')
              const emailPosts = dayPosts.filter(p => p.platform === 'email')

              return (
                <div
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`aspect-square border-2 rounded-lg p-2 cursor-pointer transition-all ${
                    isToday(day)
                      ? 'border-brown-dark bg-brown-light'
                      : 'border-brown-light hover:border-brown hover:bg-pink-light'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-semibold ${isToday(day) ? 'text-brown-dark' : 'text-brown'}`}>
                      {day}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {instagramPosts.length > 0 && (
                      <div className="text-xs bg-pink rounded px-1 text-brown-dark truncate">
                        📷 {instagramPosts.length}
                      </div>
                    )}
                    {emailPosts.length > 0 && (
                      <div className="text-xs bg-pink-light rounded px-1 text-brown-dark truncate">
                        📧 {emailPosts.length}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected Date Posts */}
          {selectedDate && !showModal && (
            <div id="selected-date-posts" className="mb-6 scroll-mt-24 pt-4">
              <h3 className="text-xl font-semibold text-brown-dark mb-4">
                Posts for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <div className="space-y-3">
                {getPostsForDate(selectedDate).map((post) => (
                  <div
                    key={post.id}
                    className="bg-pink-light rounded-lg p-4 border-2 border-brown-light"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {post.platform === 'instagram' ? '📷' : '📧'}
                        </span>
                        <span className="font-semibold text-brown-dark capitalize">
                          {post.platform}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          post.status === 'published' ? 'bg-green-200 text-green-800' :
                          post.status === 'scheduled' ? 'bg-blue-200 text-blue-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditPost(post)}
                          className="px-3 py-1 bg-brown-light text-brown-dark rounded hover:bg-brown hover:text-white transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt="Post preview"
                        className="w-full h-48 object-cover rounded mb-2"
                      />
                    )}
                    {post.platform === 'email' ? (
                      <>
                        {post.newsletterId ? (
                          <div className="space-y-2">
                            <p className="text-brown text-sm">
                              <span className="font-semibold">Newsletter:</span> Using existing newsletter
                            </p>
                            {post.emailTo && (
                              <p className="text-brown text-sm">
                                <span className="font-semibold">To:</span> {post.emailTo}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {post.emailSubject && (
                              <p className="text-brown text-sm">
                                <span className="font-semibold">Subject:</span> {post.emailSubject}
                              </p>
                            )}
                            {post.emailTo && (
                              <p className="text-brown text-sm">
                                <span className="font-semibold">To:</span> {post.emailTo}
                              </p>
                            )}
                            {post.emailBody && (
                              <p className="text-brown text-sm whitespace-pre-wrap">
                                <span className="font-semibold">Body:</span> {post.emailBody}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-brown text-sm whitespace-pre-wrap">{post.content}</p>
                    )}
                    {post.scheduledTime && (
                      <p className="text-brown-light text-xs mt-2">
                        Scheduled for: {post.scheduledTime}
                      </p>
                    )}
                  </div>
                ))}
                {getPostsForDate(selectedDate).length === 0 && (
                  <p className="text-brown-light text-center py-4">No posts scheduled for this date</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] p-4 pt-20 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[calc(100vh-5rem)] my-4 overflow-hidden flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white border-b-2 border-brown-light px-6 py-4 z-10 flex justify-between items-center shadow-sm">
              <h2 className="text-2xl font-semibold text-brown-dark">
                {editingPost ? 'Edit Post' : 'Create New Post'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-brown-light hover:text-brown-dark text-3xl font-bold leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-brown-light transition-colors"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6">

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Platform
                  </label>
                  <select
                    value={formData.platform}
                    onChange={(e) => {
                      const newPlatform = e.target.value as 'instagram' | 'email'
                      setFormData({ ...formData, platform: newPlatform })
                      if (newPlatform === 'email') {
                        loadNewsletters()
                        setEmailMode('fresh')
                      }
                    }}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                    required
                  >
                    <option value="instagram">Instagram 📷</option>
                    <option value="email">Email 📧</option>
                  </select>
                </div>

                {/* Email-specific fields */}
                {formData.platform === 'email' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-brown-dark mb-2">
                        Email Type
                      </label>
                      <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="emailMode"
                            value="fresh"
                            checked={emailMode === 'fresh'}
                            onChange={(e) => {
                              setEmailMode('fresh')
                              setFormData({ ...formData, newsletterId: '' })
                            }}
                            className="w-4 h-4 text-brown-dark"
                          />
                          <span>Write Fresh Email</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="emailMode"
                            value="newsletter"
                            checked={emailMode === 'newsletter'}
                            onChange={(e) => {
                              setEmailMode('newsletter')
                              setFormData({ ...formData, emailSubject: '', emailBody: '', emailTo: '' })
                            }}
                            className="w-4 h-4 text-brown-dark"
                          />
                          <span>Use Existing Newsletter</span>
                        </label>
                      </div>
                    </div>

                    {emailMode === 'newsletter' ? (
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-2">
                          Select Newsletter
                        </label>
                        <select
                          value={formData.newsletterId}
                          onChange={(e) => setFormData({ ...formData, newsletterId: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                          required={emailMode === 'newsletter'}
                        >
                          <option value="">Select a newsletter...</option>
                          {newsletters.map((newsletter) => (
                            <option key={newsletter.id} value={newsletter.id}>
                              {newsletter.title} - {newsletter.subject}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-brown-dark mb-2">
                            To:
                          </label>
                          <input
                            type="text"
                            value={formData.emailTo}
                            onChange={(e) => setFormData({ ...formData, emailTo: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                            placeholder="recipient@example.com or All Subscribers"
                            required={emailMode === 'fresh'}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-brown-dark mb-2">
                            Subject:
                          </label>
                          <input
                            type="text"
                            value={formData.emailSubject}
                            onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                            placeholder="Email subject line"
                            required={emailMode === 'fresh'}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-brown-dark mb-2">
                            Body:
                          </label>
                          <textarea
                            value={formData.emailBody}
                            onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                            rows={10}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                            placeholder="Write your email content here..."
                            required={emailMode === 'fresh'}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Instagram-specific fields */}
                {formData.platform === 'instagram' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-brown-dark mb-2">
                        Caption
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                        placeholder="Write your Instagram caption here..."
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Scheduled Time
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                  />
                </div>

                {formData.platform === 'instagram' && (
                  <div>
                    <label className="block text-sm font-semibold text-brown-dark mb-2">
                      Image URL (optional)
                    </label>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                      placeholder="https://example.com/image.jpg"
                    />
                    {formData.imageUrl && (
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="mt-2 w-full h-48 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'scheduled' | 'published' })}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown-dark"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                  <p className="text-xs text-brown-light mt-1">
                    Status will automatically change to "Published" when the scheduled date/time passes
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-brown-dark text-white px-6 py-3 rounded-lg hover:bg-brown transition-colors font-semibold"
                  >
                    {editingPost ? 'Update Post' : 'Create Post'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-brown-light text-brown-dark px-6 py-3 rounded-lg hover:bg-brown hover:text-white transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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

