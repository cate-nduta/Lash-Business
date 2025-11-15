'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

type EyeShapeOption = {
  id: string
  label: string
  imageUrl: string
  description?: string
  recommendedStyles: string[]
}

type ImageLibraryState = {
  eyeShapes: EyeShapeOption[]
}

type UploadState = {
  file: File | null
  previewUrl: string | null
  label: string
  description: string
  recommendedStyles: string
  uploading: boolean
  error: string | null
}

const createInitialUploadState = (): UploadState => ({
  file: null,
  previewUrl: null,
  label: '',
  description: '',
  recommendedStyles: '',
  uploading: false,
  error: null,
})

type ToastMessage = { type: 'success' | 'error'; text: string }

const normalizeStylesInput = (input: string): string[] =>
  input
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `option-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const CATEGORY_META: Record<'eyeShapes', { title: string; helper: string; emptyMessage: string; referenceLabel: string }> = {
  eyeShapes: {
    title: 'Eye Shape References',
    helper:
      'Upload clear reference images that represent different eye shapes, and list the lash styles you recommend (e.g., Natural, Volume, Mega Volume). Clients will choose a desired look and we’ll flag whether it matches your guidance.',
    emptyMessage: 'No eye shape references yet. Upload a few examples so clients can easily identify their shape.',
    referenceLabel: 'Eye Shape Reference',
  },
}

export default function AdminImageLibrary() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [library, setLibrary] = useState<ImageLibraryState>({ eyeShapes: [] })
  const [originalLibrary, setOriginalLibrary] = useState<ImageLibraryState>({ eyeShapes: [] })
  const [uploadState, setUploadState] = useState<UploadState>(createInitialUploadState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<ToastMessage | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [replacingOptionId, setReplacingOptionId] = useState<string | null>(null)

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(library) !== JSON.stringify(originalLibrary),
    [library, originalLibrary],
  )

  const updateUploadState = useCallback(
    (updater: (prev: UploadState) => UploadState) => {
      setUploadState((prev) => {
        if (prev.previewUrl && updater(prev).previewUrl !== prev.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl)
        }
        return updater(prev)
      })
    },
    [],
  )

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

        const libraryResponse = await fetch('/api/admin/image-library', { credentials: 'include' })
        if (!libraryResponse.ok) {
          throw new Error('Failed to load image library')
        }
        const data = await libraryResponse.json()
        if (!isMounted) return

        const eyeShapes: EyeShapeOption[] = Array.isArray(data?.eyeShapes)
          ? data.eyeShapes.map((entry: any) => ({
              id:
                typeof entry?.id === 'string' && entry.id.trim().length > 0
                  ? entry.id.trim()
                  : generateId(),
              label:
                typeof entry?.label === 'string' && entry.label.trim().length > 0
                  ? entry.label.trim()
                  : 'Untitled eye shape',
              imageUrl:
                typeof entry?.imageUrl === 'string' && entry.imageUrl.trim().length > 0
                  ? entry.imageUrl.trim()
                  : '',
              description:
                typeof entry?.description === 'string' && entry.description.trim().length > 0
                  ? entry.description.trim()
                  : '',
              recommendedStyles: Array.isArray(entry?.recommendedStyles)
                ? entry.recommendedStyles.filter((style: any) => typeof style === 'string' && style.trim().length > 0)
                : [],
            }))
          : []

        const normalized: ImageLibraryState = { eyeShapes }
        setLibrary(normalized)
        setOriginalLibrary(normalized)
      } catch (error) {
        console.error('Error loading image library:', error)
        if (isMounted) {
          setMessage({ type: 'error', text: 'Failed to load the image library. Please refresh the page.' })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [router])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = ''
        return ''
      }
      return undefined
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    return () => {
      if (uploadState.previewUrl) {
        URL.revokeObjectURL(uploadState.previewUrl)
      }
    }
  }, [uploadState.previewUrl])

  const requestNavigation = (href: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(href)
      setShowDialog(true)
    } else {
      router.push(href)
    }
  }

  const handleDialogSave = async () => {
    await handleSave()
    if (pendingNavigation) {
      setShowDialog(false)
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  const handleDialogLeave = () => {
    setShowDialog(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  const handleDialogCancel = () => {
    setShowDialog(false)
    setPendingNavigation(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/image-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(library),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save image library')
      }

      setOriginalLibrary(library)
      setMessage({ type: 'success', text: 'Image library updated successfully.' })
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving image library:', error)
      setMessage({ type: 'error', text: 'Failed to save changes. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = (fileList: FileList | null) => {
    const file = fileList?.[0] || null
    updateUploadState((prev) => {
      if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
      if (!file) {
        return { ...prev, file: null, previewUrl: null, error: null }
      }
      if (!file.type.startsWith('image/')) {
        return { ...prev, file: null, previewUrl: null, error: 'Please select an image file (JPG, PNG, or WebP).' }
      }
      if (file.size > 5 * 1024 * 1024) {
        return { ...prev, file: null, previewUrl: null, error: 'File size must be less than 5MB.' }
      }
      return { ...prev, file, previewUrl: URL.createObjectURL(file), error: null }
    })
  }

  const resetUploadState = () => {
    updateUploadState(() => {
      if (uploadState.previewUrl) URL.revokeObjectURL(uploadState.previewUrl)
      return createInitialUploadState()
    })
  }

  const handleUpload = async () => {
    if (!uploadState.file) {
      updateUploadState((prev) => ({ ...prev, error: 'Please select an image to upload.' }))
      return
    }
    const label = uploadState.label.trim()
    if (!label) {
      updateUploadState((prev) => ({ ...prev, error: 'Please enter a label for this eye shape.' }))
      return
    }

    setUploadState((prev) => ({ ...prev, uploading: true, error: null }))

    try {
      const formData = new FormData()
      formData.append('file', uploadState.file)
      formData.append('category', 'eyeShapes')

      const response = await fetch('/api/admin/image-library/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()
      if (!response.ok || !data.success || typeof data.url !== 'string') {
        throw new Error(data.error || 'Failed to upload image')
      }

      const newOption: EyeShapeOption = {
        id: generateId(),
        label,
        imageUrl: data.url,
        description: uploadState.description.trim(),
        recommendedStyles: normalizeStylesInput(uploadState.recommendedStyles),
      }

      setLibrary((prev) => ({
        ...prev,
        eyeShapes: [...prev.eyeShapes, newOption],
      }))

      setMessage({
        type: 'success',
        text: 'Eye shape reference added. Don\'t forget to save your changes.',
      })
      resetUploadState()
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        error: error?.message || 'Failed to upload image. Please try again.',
      }))
    } finally {
      setUploadState((prev) => ({ ...prev, uploading: false }))
    }
  }

  const handleReplaceImage = async (optionId: string, fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file (JPG, PNG, or WebP).' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB.' })
      return
    }

    setReplacingOptionId(optionId)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'eyeShapes')

      const response = await fetch('/api/admin/image-library/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()
      if (!response.ok || !data.success || typeof data.url !== 'string') {
        throw new Error(data.error || 'Failed to upload image')
      }

      setLibrary((prev) => ({
        ...prev,
        eyeShapes: prev.eyeShapes.map((option) =>
          option.id === optionId
            ? {
                ...option,
                imageUrl: data.url,
              }
            : option,
        ),
      }))
      setMessage({ type: 'success', text: 'Image replaced. Remember to save your changes.' })
    } catch (error: any) {
      console.error('Failed to replace image:', error)
      setMessage({ type: 'error', text: error?.message || 'Failed to replace image.' })
    } finally {
      setReplacingOptionId(null)
    }
  }

  const handleOptionChange = (optionId: string, field: keyof EyeShapeOption, value: string | string[]) => {
    setLibrary((prev) => ({
      ...prev,
      eyeShapes: prev.eyeShapes.map((option) =>
        option.id === optionId
          ? {
              ...option,
              [field]: field === 'recommendedStyles' && Array.isArray(value) ? value : value,
            }
          : option,
      ),
    }))
  }

  const handleRemoveOption = (optionId: string) => {
    setLibrary((prev) => ({
      ...prev,
      eyeShapes: prev.eyeShapes.filter((option) => option.id !== optionId),
    }))
  }

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    setLibrary((prev) => {
      const list = [...prev.eyeShapes]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= list.length) {
        return prev
      }
      ;[list[index], list[targetIndex]] = [list[targetIndex], list[index]]
      return {
        ...prev,
        eyeShapes: list,
      }
    })
  }

  if (loading || authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
              <span>⚠️ Unsaved changes</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => requestNavigation('/admin/dashboard')}
            className="text-brown hover:text-brown-dark"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {message && (
          <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-10">
          <h1 className="text-4xl font-display text-brown-dark mb-2">Eye Shape Image Library</h1>
          <p className="text-brown-dark/80 max-w-3xl">
            Upload and organize eye shape references. Clients will see these visuals during booking, along with any
            recommended lash styles you provide for each shape.
          </p>

          <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70">
            <div className="border-b border-brown-light/40 px-6 py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-brown-dark">Eye Shape References</h2>
                <p className="text-sm text-brown-dark/70 max-w-3xl">
                  Provide clear imagery and optional descriptions. Add any lash-style guidance clients should consider when picking their look.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brown-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brown-dark/70">
                {library.eyeShapes.length} option{library.eyeShapes.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="px-6 py-6 space-y-6">
              <div className="border border-dashed border-brown-light rounded-xl p-5 bg-brown-light/20">
                <h3 className="text-sm font-semibold text-brown-dark mb-3">Upload new eye shape</h3>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-900 mb-1">📸 Image Recommendations:</p>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>Recommended size: 800x300px (landscape format works best)</li>
                    <li>File format: JPG, PNG, or WebP</li>
                    <li>Max file size: 5MB</li>
                    <li>Focus on clear, close-up eye images that show the eye shape clearly</li>
                    <li>Images will be displayed at 300px height and will fit proportionally</li>
                  </ul>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-brown-dark">
                      Upload image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleFileSelect(event.target.files)}
                        className="mt-2 w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      />
                    </label>
                    {uploadState.previewUrl && (
                      <div className="overflow-hidden rounded-lg border border-brown-light bg-white aspect-[8/3]">
                        <img src={uploadState.previewUrl} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <label className="block text-sm font-medium text-brown-dark">
                      Display label
                      <input
                        type="text"
                        value={uploadState.label}
                        onChange={(event) => updateUploadState((prev) => ({ ...prev, label: event.target.value }))}
                        placeholder="Almond, Round, Monolid..."
                        className="mt-2 w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      />
                    </label>
                    <label className="block text-sm font-medium text-brown-dark">
                      Optional description
                      <textarea
                        value={uploadState.description}
                        onChange={(event) => updateUploadState((prev) => ({ ...prev, description: event.target.value }))}
                        rows={3}
                        className="mt-2 w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        placeholder="Any extra details you want clients to know."
                      />
                    </label>
                    <label className="block text-sm font-medium text-brown-dark">
                      Recommended styles (one per line)
                      <textarea
                        value={uploadState.recommendedStyles}
                        onChange={(event) =>
                          updateUploadState((prev) => ({ ...prev, recommendedStyles: event.target.value }))
                        }
                        rows={3}
                        className="mt-2 w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        placeholder={['Natural', 'Volume', 'Mega Volume'].join('\n')}
                      />
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploadState.uploading}
                        className="inline-flex items-center justify-center rounded-lg bg-brown-dark px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brown disabled:opacity-50"
                      >
                        {uploadState.uploading ? 'Uploading...' : 'Upload & Add'}
                      </button>
                      <button type="button" onClick={resetUploadState} className="text-sm text-brown-dark/70 underline">
                        Clear
                      </button>
                    </div>
                    {uploadState.error && <p className="text-sm text-red-600 font-medium">{uploadState.error}</p>}
                  </div>
                  <div className="space-y-3 text-sm text-brown-dark/80">
                    <p className="font-semibold text-brown-dark">Tips</p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>Use consistent lighting and angles across references.</li>
                      <li>Square or portrait crops help the booking page remain uniform.</li>
                      <li>List the lash styles you typically recommend so clients arrive informed.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {library.eyeShapes.length === 0 ? (
                <div className="rounded-xl border border-brown-light bg-brown-light/20 px-5 py-6 text-sm text-brown-dark/80">
                  No eye shape references yet. Upload a few examples so clients can easily identify their shape.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {library.eyeShapes.map((option, index) => (
                    <div key={option.id} className="rounded-2xl border-2 border-brown-light bg-white shadow-sm">
                      <div className="relative w-full aspect-[8/3] overflow-hidden rounded-t-2xl bg-brown-light/20">
                        {option.imageUrl ? (
                          <img
                            src={option.imageUrl}
                            alt={`Eye shape: ${option.label}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-brown-dark/60">
                            No image available
                          </div>
                        )}
                        <label className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brown-dark shadow">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleReplaceImage(option.id, event.target.files)}
                            className="hidden"
                          />
                          <span className="cursor-pointer text-[11px] uppercase tracking-wide">
                            {replacingOptionId === option.id ? 'Updating...' : 'Replace Image'}
                          </span>
                        </label>
                      </div>
                      <div className="space-y-3 px-5 py-4">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-brown-dark/60">Label</label>
                          <input
                            type="text"
                            value={option.label}
                            onChange={(event) => handleOptionChange(option.id, 'label', event.target.value)}
                            className="mt-1 w-full rounded-lg border-2 border-brown-light px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-brown-dark/60">
                            Description (optional)
                          </label>
                          <textarea
                            value={option.description || ''}
                            onChange={(event) => handleOptionChange(option.id, 'description', event.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-lg border-2 border-brown-light px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                            placeholder="Add supporting notes if helpful"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-brown-dark/60">
                            Recommended styles (one per line)
                          </label>
                          <textarea
                            value={option.recommendedStyles.join('\n')}
                            onChange={(event) =>
                              handleOptionChange(option.id, 'recommendedStyles', normalizeStylesInput(event.target.value))
                            }
                            rows={3}
                            className="mt-1 w-full rounded-lg border-2 border-brown-light px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                            placeholder="Classic\nCat-Eye\nWispy"
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleMoveOption(index, 'up')}
                              className="rounded-full border border-brown-light px-3 py-1 text-xs font-semibold text-brown-dark hover:border-brown-dark"
                              disabled={index === 0}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOption(index, 'down')}
                              className="rounded-full border border-brown-light px-3 py-1 text-xs font-semibold text-brown-dark hover:border-brown-dark"
                              disabled={index === library.eyeShapes.length - 1}
                            >
                              ↓
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(option.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showDialog}
        onSave={handleDialogSave}
        onLeave={handleDialogLeave}
        onCancel={handleDialogCancel}
      />
    </div>
  )
}
