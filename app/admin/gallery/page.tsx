'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

interface GalleryImage {
  url: string
  name: string
}

interface GalleryData {
  images: GalleryImage[]
}

export default function AdminGallery() {
  const [gallery, setGallery] = useState<GalleryData>({ images: [] })
  const [originalGallery, setOriginalGallery] = useState<GalleryData>({ images: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageName, setNewImageName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadImageName, setUploadImageName] = useState('')
  const router = useRouter()
  const hasUnsavedChanges = JSON.stringify(gallery) !== JSON.stringify(originalGallery)

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Unauthorized')
        }

        const data = await response.json()
        if (!isMounted) return

        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }

        loadGallery()
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

  const loadGallery = async () => {
    try {
      const response = await fetch('/api/admin/gallery', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setGallery(data)
        setOriginalGallery(data)
      }
    } catch (error) {
      console.error('Error loading gallery:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  // Intercept Link clicks
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      setPendingNavigation(href)
      setShowDialog(true)
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
      const response = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gallery),
        credentials: 'include',
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Gallery updated successfully!' })
        setNewImageUrl('')
        setOriginalGallery(gallery) // Update original to clear unsaved changes flag
        setShowDialog(false) // Close dialog if open
      } else {
        setMessage({ type: 'error', text: 'Failed to save gallery' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const addImage = () => {
    if (newImageUrl.trim()) {
      const imageName = newImageName.trim() || `Image ${gallery.images.length + 1}`
      setGallery((prev) => ({
        images: [...prev.images, { url: newImageUrl.trim(), name: imageName }],
      }))
      setNewImageName('')
      setNewImageUrl('')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' })
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB' })
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    setSelectedFile(file)
    setMessage(null)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    // Require image name before uploading
    const imageName = uploadImageName.trim()
    if (!imageName) {
      setMessage({ type: 'error', text: 'Please enter a name for the image before uploading' })
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/admin/gallery/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Use absolute URL if provided (Supabase), otherwise fall back to origin-relative path
        const imageUrl =
          typeof data.url === 'string' && data.url.startsWith('http')
            ? data.url
            : `${window.location.origin}${data.url}`
        
        // Add image to gallery
        const updatedGallery = {
          images: [...gallery.images, { url: imageUrl, name: imageName }],
        }
        
        // Update local state
        setGallery(updatedGallery)
        
        // Automatically save to backend
        const saveResponse = await fetch('/api/admin/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedGallery),
          credentials: 'include',
        })

        if (saveResponse.ok) {
          setMessage({ type: 'success', text: 'Image uploaded and published successfully! It will appear on the gallery page.' })
          setOriginalGallery(updatedGallery) // Update original to clear unsaved changes flag
          setShowDialog(false) // Close dialog if open
        } else {
          setMessage({ type: 'error', text: 'Image uploaded but failed to save. Please try saving manually.' })
        }
        
        setUploadProgress(100)
        
        // Reset file selection
        setSelectedFile(null)
        setPreviewUrl(null)
        setUploadImageName('')
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload image' })
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setMessage({ type: 'error', text: 'An error occurred while uploading' })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const removeImage = async (index: number) => {
    // Store the original gallery state in case we need to revert
    const originalGalleryState = { ...gallery }
    
    // Remove from local state immediately
    const updatedGallery = {
      images: gallery.images.filter((_, i) => i !== index),
    }
    setGallery(updatedGallery)
    
    // Automatically save to backend
    try {
      const response = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGallery),
        credentials: 'include',
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Image removed successfully!' })
        setOriginalGallery(updatedGallery) // Update original to clear unsaved changes flag
      } else {
        setMessage({ type: 'error', text: 'Failed to remove image. Please try again.' })
        // Revert the change if save failed
        setGallery(originalGalleryState)
      }
    } catch (error) {
      console.error('Error removing image:', error)
      setMessage({ type: 'error', text: 'An error occurred while removing the image' })
      // Revert the change if save failed
      setGallery(originalGalleryState)
    }
  }

  const updateImageName = (index: number, newName: string) => {
    setGallery((prev) => ({
      images: prev.images.map((img, i) => 
        i === index ? { ...img, name: newName } : img
      ),
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          {hasUnsavedChanges && (
            <div className="text-sm text-orange-600 font-medium">
              ⚠️ You have unsaved changes
            </div>
          )}
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
            onClick={(e) => handleLinkClick(e, '/admin/dashboard')}
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Toast Notification */}
        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Gallery Management</h1>
          
          {/* Upload from Device */}
          <div className="mb-6 p-6 bg-pink-light/30 rounded-lg border-2 border-brown-light">
            <label className="block text-sm font-medium text-brown-dark mb-2">
              Upload Image from Device
            </label>
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="px-4 py-2 border-2 border-brown-light rounded-lg bg-white hover:bg-brown-light/20 transition-colors text-center">
                    <span className="text-brown-dark">
                      {selectedFile ? selectedFile.name : 'Choose File'}
                    </span>
                  </div>
                </label>
                {selectedFile && !uploading && (
                  <button
                    onClick={handleFileUpload}
                    disabled={!uploadImageName.trim()}
                    className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload & Publish
                  </button>
                )}
                {selectedFile && (
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                      setUploadImageName('')
                      const fileInput = document.getElementById('file-upload') as HTMLInputElement
                      if (fileInput) fileInput.value = ''
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              {uploading && (
                <div className="w-full bg-brown-light/20 rounded-full h-2">
                  <div
                    className="bg-brown-dark h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              
              {previewUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-brown-dark mb-2">Preview:</p>
                  <div className="relative w-full max-w-md">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border-2 border-brown-light"
                    />
                    {selectedFile && (
                      <p className="text-xs text-brown mt-2">
                        File: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-brown-dark mb-2">
                        Image Name * (Required)
                      </label>
                      <input
                        type="text"
                        value={uploadImageName}
                        onChange={(e) => setUploadImageName(e.target.value)}
                        placeholder="Enter a name for this image"
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && uploadImageName.trim() && selectedFile) {
                            e.preventDefault()
                            handleFileUpload()
                          }
                        }}
                      />
                      <p className="text-xs text-brown mt-1">
                        Enter a name, then click "Upload & Publish" to add it to the gallery
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-brown mt-2">
              Select an image file from your device (max 5MB, JPG, PNG, GIF, etc.), name it, and click "Upload & Publish" to add it to the gallery immediately.
            </p>
          </div>

          {/* Add Image URL */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-brown-dark mb-2">
              Or Add Image URL
            </label>
            <div className="space-y-3">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addImage()
                  }
                }}
              />
              <input
                type="text"
                value={newImageName}
                onChange={(e) => setNewImageName(e.target.value)}
                placeholder="Image Name (optional)"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addImage()
                  }
                }}
              />
              <button
                onClick={addImage}
                className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors"
              >
                Add Image
              </button>
            </div>
            <p className="text-sm text-brown mt-2">
              Enter the full URL of the image and optionally give it a name
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.images.map((image, index) => (
              <div key={index} className="bg-pink-light rounded-lg p-4">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found'
                  }}
                />
                <div className="mb-3">
                  <label className="block text-xs font-medium text-brown-dark mb-1">
                    Image Name:
                  </label>
                  <input
                    type="text"
                    value={image.name}
                    onChange={(e) => updateImageName(index, e.target.value)}
                    className="w-full px-3 py-2 text-sm border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    placeholder="Image name"
                  />
                </div>
                <div className="text-xs text-brown mb-3 truncate" title={image.url}>
                  {image.url}
                </div>
                <button
                  onClick={() => removeImage(index)}
                  className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {gallery.images.length === 0 && (
            <div className="text-center text-brown py-8">
              No images in gallery yet. Add an image URL above to get started.
            </div>
          )}
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showDialog}
        onSave={handleDialogSave}
        onLeave={handleDialogLeave}
        onCancel={handleDialogCancel}
        saving={saving}
      />
    </div>
  )
}

