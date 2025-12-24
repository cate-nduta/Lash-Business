'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import AdminBackButton from '@/components/AdminBackButton'
import { courseStructure } from '@/lib/course-structure'
import { marked } from 'marked'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

interface Lesson {
  moduleId: string
  moduleTitle: string
  lessonId: string
  lessonTitle: string
  lessonDescription: string
  estimatedTime: string
}

// Configure marked for better markdown rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

export default function AdminLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<{ moduleId: string; lessonId: string } | null>(null)
  const [navigationView, setNavigationView] = useState<'modules' | 'lessons'>('modules')
  const [lessonContent, setLessonContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const imageFileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user', {
          signal: abortController.signal,
        })
        if (!isMounted) return
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        loadLessons(abortController.signal)
      } catch (error) {
        if (!isMounted) return
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          return
        }
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
      try {
        abortController.abort('Component unmounted')
      } catch (error) {
        // Ignore abort errors during cleanup
      }
    }
  }, [router])

  const loadLessons = async (signal?: AbortSignal) => {
    try {
      const fetchOptions: RequestInit = {}
      if (signal) {
        fetchOptions.signal = signal
      }
      const response = await authorizedFetch('/api/admin/lessons', fetchOptions)
      if (signal?.aborted) return
      if (!response.ok) {
        throw new Error('Failed to load lessons')
      }
      const data = await response.json()
      if (signal?.aborted) return
      setLessons(data.lessons || [])
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        return
      }
      console.error('Error loading lessons:', error)
      if (!signal?.aborted) {
        setMessage({ type: 'error', text: 'Failed to load lessons' })
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  const handleModuleClick = (moduleId: string) => {
    setSelectedModuleId(moduleId)
    setNavigationView('lessons')
    setSelectedLesson(null)
    setLessonContent('')
  }

  const handleLessonClick = async (moduleId: string, lessonId: string) => {
    try {
      const response = await authorizedFetch(`/api/admin/lessons?moduleId=${moduleId}&lessonId=${lessonId}`)
      if (!response.ok) {
        throw new Error('Failed to load lesson content')
      }
      const data = await response.json()
      setLessonContent(data.content || '')
      setSelectedLesson({ moduleId, lessonId })
    } catch (error) {
      console.error('Error loading lesson content:', error)
      setMessage({ type: 'error', text: 'Failed to load lesson content' })
    }
  }

  const handleBackToModules = () => {
    setNavigationView('modules')
    setSelectedModuleId(null)
    setSelectedLesson(null)
    setLessonContent('')
  }

  const handleBackToLessons = () => {
    setNavigationView('lessons')
    setSelectedLesson(null)
    setLessonContent('')
  }

  const handleSave = async () => {
    if (!selectedLesson) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: selectedLesson.moduleId,
          lessonId: selectedLesson.lessonId,
          content: lessonContent,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save lesson')
      }

      setMessage({ type: 'success', text: 'Lesson saved successfully!' })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Error saving lesson:', error)
      setMessage({ type: 'error', text: 'Failed to save lesson' })
    } finally {
      setSaving(false)
    }
  }

  // Insert markdown at cursor position
  const insertMarkdown = (before: string, after: string = '') => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = lessonContent.substring(start, end)
    const newText = lessonContent.substring(0, start) + before + selectedText + after + lessonContent.substring(end)
    
    setLessonContent(newText)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length + after.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const insertImage = () => {
    if (imageUrl.trim()) {
      insertMarkdown(`![Image description](${imageUrl.trim()})\n\n`, '')
      setImageUrl('')
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ 
        type: 'error', 
        text: 'Invalid file type. Please upload JPEG, PNG, WebP, GIF, or SVG image files.' 
      })
      return
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setMessage({ 
        type: 'error', 
        text: `File too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      })
      return
    }

    setUploadingImage(true)
    setImageUploadProgress(0)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          setImageUploadProgress(percentComplete)
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          if (response.success && response.url) {
            // Insert image into markdown
            const imageMarkdown = `![Image description](${response.url})\n\n`
            insertMarkdown(imageMarkdown, '')
            setMessage({ type: 'success', text: 'Image uploaded successfully!' })
          } else {
            setMessage({ type: 'error', text: response.error || 'Failed to upload image' })
          }
        } else {
          const response = JSON.parse(xhr.responseText)
          setMessage({ type: 'error', text: response.error || 'Failed to upload image' })
        }
        setUploadingImage(false)
        setImageUploadProgress(0)
        if (imageFileInputRef.current) {
          imageFileInputRef.current.value = ''
        }
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        setMessage({ type: 'error', text: 'Network error. Please try again.' })
        setUploadingImage(false)
        setImageUploadProgress(0)
        if (imageFileInputRef.current) {
          imageFileInputRef.current.value = ''
        }
      })

      xhr.open('POST', '/api/admin/lessons/upload-image')
      xhr.send(formData)
    } catch (error) {
      console.error('Error uploading image:', error)
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' })
      setUploadingImage(false)
      setImageUploadProgress(0)
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = ''
      }
    }
  }

  const insertVideo = () => {
    if (videoUrl.trim()) {
      const url = videoUrl.trim()
      let embedCode = ''
      
      // YouTube
      if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
        const videoId = url.includes('youtu.be/') 
          ? url.split('youtu.be/')[1].split('?')[0]
          : url.split('v=')[1]?.split('&')[0]
        if (videoId) {
          embedCode = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n\n`
        }
      }
      // Vimeo
      else if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
        if (videoId) {
          embedCode = `<iframe src="https://player.vimeo.com/video/${videoId}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>\n\n`
        }
      }
      // Direct video file
      else if (url.match(/\.(mp4|webm|ogg|mov|avi)$/i)) {
        embedCode = `<video controls width="560" height="315">\n  <source src="${url}" type="video/mp4">\n  Your browser does not support the video tag.\n</video>\n\n`
      }
      
      if (embedCode) {
        insertMarkdown(embedCode, '')
        setVideoUrl('')
      } else {
        setMessage({ type: 'error', text: 'Invalid video URL. Please use YouTube, Vimeo, or direct video file link.' })
      }
    }
  }

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ 
        type: 'error', 
        text: 'Invalid file type. Please upload MP4, WebM, OGG, MOV, or AVI video files.' 
      })
      return
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      setMessage({ 
        type: 'error', 
        text: `File too large. Maximum size is 100MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      })
      return
    }

    setUploadingVideo(true)
    setUploadProgress(0)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('video', file)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          setUploadProgress(percentComplete)
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          if (response.success && response.url) {
            // Insert video into markdown
            const videoEmbed = `<video controls width="560" height="315">\n  <source src="${response.url}" type="${response.mimeType || 'video/mp4'}">\n  Your browser does not support the video tag.\n</video>\n\n`
            insertMarkdown(videoEmbed, '')
            setMessage({ type: 'success', text: 'Video uploaded successfully!' })
          } else {
            setMessage({ type: 'error', text: response.error || 'Failed to upload video' })
          }
        } else {
          const response = JSON.parse(xhr.responseText)
          setMessage({ type: 'error', text: response.error || 'Failed to upload video' })
        }
        setUploadingVideo(false)
        setUploadProgress(0)
        if (videoFileInputRef.current) {
          videoFileInputRef.current.value = ''
        }
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        setMessage({ type: 'error', text: 'Network error. Please try again.' })
        setUploadingVideo(false)
        setUploadProgress(0)
        if (videoFileInputRef.current) {
          videoFileInputRef.current.value = ''
        }
      })

      xhr.open('POST', '/api/admin/lessons/upload-video')
      xhr.send(formData)
    } catch (error) {
      console.error('Error uploading video:', error)
      setMessage({ type: 'error', text: 'Failed to upload video. Please try again.' })
      setUploadingVideo(false)
      setUploadProgress(0)
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = ''
      }
    }
  }

  const getPreviewHTML = (): string => {
    try {
      // Use marked to parse markdown, which will handle HTML tags in the content
      const result = marked(lessonContent, { breaks: true, gfm: true })
      // Ensure we return a string (marked can return Promise in some versions)
      return typeof result === 'string' ? result : String(result)
    } catch (error) {
      return '<p>Error rendering preview</p>'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading lessons...</div>
      </div>
    )
  }

  const modules = courseStructure
  const selectedModule = selectedModuleId 
    ? modules.find(m => m.id === selectedModuleId)
    : null
  const moduleLessons = selectedModuleId
    ? lessons.filter(l => l.moduleId === selectedModuleId)
    : []

  const currentLesson = selectedLesson 
    ? lessons.find(l => l.moduleId === selectedLesson.moduleId && l.lessonId === selectedLesson.lessonId)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/admin/dashboard"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Lesson Editor</h1>
            {currentLesson && selectedModule && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <span className="font-medium text-gray-700">Module {selectedModule.id}:</span>
                <span>{selectedModule.title}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-gray-700">{currentLesson.lessonTitle}</span>
              </div>
            )}
            {!currentLesson && (
              <p className="text-gray-600 mt-1">Select a module, then a lesson to edit</p>
            )}
          </div>
          {currentLesson && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium shadow-lg"
            >
              {saving ? 'Saving...' : '💾 Save Lesson'}
            </button>
          )}
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Navigation */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-5 sticky top-6">
              {/* Breadcrumb Navigation */}
              <div className="mb-4 flex items-center gap-2 text-sm">
                {navigationView === 'lessons' && (
                  <>
                    <button
                      onClick={handleBackToModules}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      ← Modules
                    </button>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600">Lessons</span>
                  </>
                )}
                {navigationView === 'modules' && (
                  <span className="text-gray-600 font-medium">Modules</span>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {navigationView === 'modules' ? '📚 Modules' : `📖 ${selectedModule?.title || 'Lessons'}`}
              </h2>

              {/* Module List View */}
              {navigationView === 'modules' && (
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {modules.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => handleModuleClick(module.id)}
                      className="w-full text-left px-4 py-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all bg-white"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-bold text-sm text-gray-900">
                          Module {module.id}: {module.title}
                        </div>
                        <span className="text-blue-600">→</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">{module.description}</div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>📚 {module.lessons.length} lessons</span>
                        <span>⏱️ {module.estimatedTime}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Lesson List View */}
              {navigationView === 'lessons' && selectedModule && (
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {moduleLessons.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No lessons found in this module</p>
                  ) : (
                    moduleLessons.map((lesson) => (
                      <button
                        key={`${lesson.moduleId}-${lesson.lessonId}`}
                        onClick={() => handleLessonClick(lesson.moduleId, lesson.lessonId)}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                          selectedLesson?.moduleId === lesson.moduleId && selectedLesson?.lessonId === lesson.lessonId
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="font-semibold text-sm mb-1">{lesson.lessonTitle}</div>
                        <div className={`text-xs ${
                          selectedLesson?.moduleId === lesson.moduleId && selectedLesson?.lessonId === lesson.lessonId
                            ? 'text-white/80'
                            : 'text-gray-500'
                        }`}>
                          ⏱️ {lesson.estimatedTime}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Editor */}
          <div className="lg:col-span-9">
            {currentLesson ? (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Lesson Info Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                  <h2 className="text-2xl font-bold mb-2">{currentLesson.lessonTitle}</h2>
                  <div className="flex items-center gap-4 text-sm text-blue-100">
                    <span>📦 {currentLesson.moduleTitle}</span>
                    <span>⏱️ {currentLesson.estimatedTime}</span>
                  </div>
                </div>

                {/* View Mode Toggle */}
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 mr-2">View:</span>
                    {(['edit', 'preview', 'split'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          viewMode === mode
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {mode === 'edit' ? '✏️ Edit' : mode === 'preview' ? '👁️ Preview' : '📄 Split View'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor/Preview Content */}
                <div className={`grid ${viewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'} gap-0`}>
                  {/* Editor */}
                  {(viewMode === 'edit' || viewMode === 'split') && (
                    <div className="border-r border-gray-200">
                      {/* Toolbar */}
                      <div className="bg-gray-50 border-b border-gray-200 p-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => insertMarkdown('# ', '')}
                          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                          title="Heading"
                        >
                          H1
                        </button>
                        <button
                          onClick={() => insertMarkdown('## ', '')}
                          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                          title="Subheading"
                        >
                          H2
                        </button>
                        <button
                          onClick={() => insertMarkdown('**', '**')}
                          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          onClick={() => insertMarkdown('*', '*')}
                          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 italic"
                          title="Italic"
                        >
                          I
                        </button>
                        <button
                          onClick={() => insertMarkdown('- ', '')}
                          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                          title="List"
                        >
                          •
                        </button>
                        <button
                          onClick={() => insertMarkdown('`', '`')}
                          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 font-mono"
                          title="Code"
                        >
                          {'</>'}
                        </button>
                        <div className="w-px h-6 bg-gray-300 mx-1" />
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Image URL"
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded w-48"
                            onKeyPress={(e) => e.key === 'Enter' && insertImage()}
                            disabled={uploadingImage}
                          />
                          <button
                            onClick={insertImage}
                            disabled={uploadingImage}
                            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                            title="Insert Image from URL"
                          >
                            🖼️
                          </button>
                        </div>
                        <div className="w-px h-6 bg-gray-300 mx-1" />
                        <div className="flex items-center gap-2">
                          <input
                            ref={imageFileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                            disabled={uploadingImage}
                          />
                          <label
                            htmlFor="image-upload"
                            className={`px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer transition-colors ${
                              uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title="Upload Image from Device"
                          >
                            {uploadingImage ? `📤 Uploading... ${Math.round(imageUploadProgress)}%` : '📤 Upload Image'}
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Video URL (YouTube/Vimeo)"
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded w-48"
                            onKeyPress={(e) => e.key === 'Enter' && insertVideo()}
                            disabled={uploadingVideo}
                          />
                          <button
                            onClick={insertVideo}
                            disabled={uploadingVideo}
                            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                            title="Insert Video from URL"
                          >
                            🎥
                          </button>
                        </div>
                        <div className="w-px h-6 bg-gray-300 mx-1" />
                        <div className="flex items-center gap-2">
                          <input
                            ref={videoFileInputRef}
                            type="file"
                            accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                            onChange={handleVideoUpload}
                            className="hidden"
                            id="video-upload"
                            disabled={uploadingVideo}
                          />
                          <label
                            htmlFor="video-upload"
                            className={`px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer transition-colors ${
                              uploadingVideo ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title="Upload Video from Device"
                          >
                            {uploadingVideo ? `📤 Uploading... ${Math.round(uploadProgress)}%` : '📤 Upload Video'}
                          </label>
                        </div>
                      </div>

                      {/* Textarea */}
                      <textarea
                        ref={textareaRef}
                        value={lessonContent}
                        onChange={(e) => setLessonContent(e.target.value)}
                        placeholder="Start typing your lesson content here...

You can use Markdown formatting:
# Heading
## Subheading
**bold text**
*italic text*
- List item

Or use the toolbar above for quick formatting!"
                        className="w-full h-[calc(100vh-400px)] min-h-[500px] p-6 border-0 focus:ring-0 font-mono text-sm resize-none"
                        style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace' }}
                      />
                    </div>
                  )}

                  {/* Preview */}
                  {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className="bg-gray-50 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                      <div className="p-8">
                        <div
                          className="prose prose-lg max-w-none"
                          dangerouslySetInnerHTML={{ __html: getPreviewHTML() }}
                          style={{
                            '--tw-prose-body': '#374151',
                            '--tw-prose-headings': '#111827',
                            '--tw-prose-links': '#2563eb',
                            '--tw-prose-code': '#1f2937',
                          } as React.CSSProperties}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Lesson</h3>
                <p className="text-gray-600">Choose a lesson from the sidebar to start editing</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
