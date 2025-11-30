'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'
import type { BlogPost } from '@/lib/blog-utils'
import RichTextEditor from './rich-text-editor'
import Image from 'next/image'

type Message = { type: 'success' | 'error'; text: string } | null

function createBlogPost(): BlogPost {
  const id = `blog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    title: '',
    excerpt: '',
    content: '',
    published: false,
    author: '',
    tags: [],
    category: '',
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminBlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false)
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null)
  const featuredImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let isMounted = true

    const ensureAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', { credentials: 'include' })
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data?.authenticated) {
          router.replace('/admin/login')
          return
        }
        setAuthChecked(true)
        await loadPosts()
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    ensureAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/blog', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load posts')
      }
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Error loading posts:', error)
      setMessage({ type: 'error', text: 'Failed to load blog posts' })
    } finally {
      setLoading(false)
    }
  }

  const savePost = async (post: BlogPost) => {
    try {
      setSaving(true)
      
      // Auto-generate slug from title if not provided
      const postToSave = {
        ...post,
        slug: post.slug && post.slug.trim() ? post.slug : (post.title ? generateSlug(post.title) : ''),
      }

      console.log('Saving post:', { 
        title: postToSave.title, 
        published: postToSave.published, 
        id: postToSave.id,
        hasContent: !!postToSave.content,
        slug: postToSave.slug
      })

      const response = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ post: postToSave }),
      })
      if (!response.ok) {
        throw new Error('Failed to save post')
      }
      
      await loadPosts()
      setShowEditor(false)
      setEditingPost(null)
      const publishMessage = postToSave.published 
        ? 'Post saved and published successfully! It will appear on the blog page.'
        : 'Post saved successfully! Don\'t forget to publish it for it to appear on the blog page.'
      setMessage({ type: 'success', text: publishMessage })
    } catch (error) {
      console.error('Error saving post:', error)
      setMessage({ type: 'error', text: 'Failed to save post' })
    } finally {
      setSaving(false)
    }
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', postId }),
      })
      if (!response.ok) {
        throw new Error('Failed to delete post')
      }
      await loadPosts()
      setMessage({ type: 'success', text: 'Post deleted successfully!' })
    } catch (error) {
      console.error('Error deleting post:', error)
      setMessage({ type: 'error', text: 'Failed to delete post' })
    }
  }

  const togglePublish = async (post: BlogPost) => {
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: post.published ? 'unpublish' : 'publish',
          postId: post.id,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to update post')
      }
      await loadPosts()
      setMessage({
        type: 'success',
        text: post.published 
          ? 'Post unpublished! It will no longer appear on the blog page.' 
          : 'Post published successfully! It will now appear on the blog page.',
      })
    } catch (error) {
      console.error('Error updating post:', error)
      setMessage({ type: 'error', text: 'Failed to update post' })
    }
  }

  const startNewPost = () => {
    setEditingPost(createBlogPost())
    setShowEditor(true)
  }

  const startEdit = (post: BlogPost) => {
    setEditingPost({ ...post })
    setShowEditor(true)
  }

  const updateEditingPost = (field: keyof BlogPost, value: any) => {
    if (!editingPost) return
    const updated = { ...editingPost, [field]: value }
    
    // Auto-generate slug from title only if slug is empty or not set
    if (field === 'title' && (!editingPost.slug || !editingPost.slug.trim())) {
      updated.slug = generateSlug(value)
    }
    
    setEditingPost(updated)
  }

  const handleFeaturedImageUpload = async (file: File) => {
    setUploadingFeaturedImage(true)
    setMessage(null)

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file')
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Image size must be less than 10MB')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/blog/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // The API now returns absolute URLs, so use it directly
        const imageUrl = data.url || ''
        
        console.log('Image uploaded successfully:', imageUrl)
        
        if (editingPost && imageUrl) {
          updateEditingPost('featuredImage', imageUrl)
          setFeaturedImagePreview(imageUrl)
        }
        setMessage({ type: 'success', text: 'Featured image uploaded successfully! The image will appear on the blog page.' })
      } else {
        throw new Error(data.error || 'Failed to upload image')
      }
    } catch (error: any) {
      console.error('Error uploading featured image:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to upload image' })
    } finally {
      setUploadingFeaturedImage(false)
      if (featuredImageInputRef.current) {
        featuredImageInputRef.current.value = ''
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFeaturedImageUpload(file)
    }
  }

  useEffect(() => {
    if (editingPost?.featuredImage) {
      setFeaturedImagePreview(editingPost.featuredImage)
    } else {
      setFeaturedImagePreview(null)
    }
  }, [editingPost?.featuredImage])

  if (!authChecked || loading) {
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
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-display text-brown-dark mb-2">Blog Management</h1>
              <p className="text-brown">Create and manage your blog posts.</p>
            </div>
            <button
              onClick={startNewPost}
              className="px-6 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors"
            >
              + New Post
            </button>
          </div>

          {/* Editor */}
          {showEditor && editingPost && (
            <div className="border-2 border-brown-light rounded-lg p-6 mb-6 bg-baby-pink-light">
              <h2 className="text-xl font-display text-brown-dark mb-4">
                {editingPost.id.startsWith('blog-') && !posts.find(p => p.id === editingPost.id) ? 'New Post' : 'Edit Post'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-1">Title *</label>
                  <input
                    type="text"
                    value={editingPost.title}
                    onChange={(e) => updateEditingPost('title', e.target.value)}
                    placeholder="Enter post title..."
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-1">
                    URL Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingPost.slug || ''}
                    onChange={(e) => {
                      const slug = e.target.value.trim()
                      updateEditingPost('slug', slug || undefined)
                    }}
                    placeholder="Auto-generated from title"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to auto-generate from title. This is the URL that will be used for your blog post.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-1">Excerpt</label>
                  <textarea
                    value={editingPost.excerpt}
                    onChange={(e) => updateEditingPost('excerpt', e.target.value)}
                    placeholder="Short description of the post..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown resize-y"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-1">Content *</label>
                  <div className="border-2 border-brown-light rounded-lg overflow-hidden">
                    <RichTextEditor
                      value={editingPost.content}
                      onChange={(value) => updateEditingPost('content', value)}
                      placeholder="Write your blog post content here... You can format text, add images, create lists, and more!"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Click the image icon in the toolbar to insert images directly into your content!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Author</label>
                    <input
                      type="text"
                      value={editingPost.author || ''}
                      onChange={(e) => updateEditingPost('author', e.target.value)}
                      placeholder="Author name"
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Category</label>
                    <input
                      type="text"
                      value={editingPost.category || ''}
                      onChange={(e) => updateEditingPost('category', e.target.value)}
                      placeholder="e.g., Tips, News, Tutorials"
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={editingPost.tags?.join(', ') || ''}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t)
                      updateEditingPost('tags', tags)
                    }}
                    placeholder="lash extensions, beauty, tips"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Featured Image</label>
                  
                  {/* Image Preview */}
                  {featuredImagePreview && (
                    <div className="mb-4 relative w-full max-w-md">
                      <img
                        src={featuredImagePreview}
                        alt="Featured image preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-brown-light"
                      />
                      <button
                        onClick={() => {
                          updateEditingPost('featuredImage', '')
                          setFeaturedImagePreview(null)
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                        type="button"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="flex gap-4 items-center">
                    <label className="cursor-pointer">
                      <input
                        ref={featuredImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploadingFeaturedImage}
                        className="hidden"
                      />
                      <div className={`px-4 py-2 border-2 border-brown-light rounded-lg bg-white hover:bg-brown-light/20 transition-colors text-center ${
                        uploadingFeaturedImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}>
                        <span className="text-brown-dark">
                          {uploadingFeaturedImage ? 'Uploading...' : featuredImagePreview ? 'Change Image' : 'Upload Image from Device'}
                        </span>
                      </div>
                    </label>
                    
                    <span className="text-sm text-gray-500">or</span>
                    
                    <input
                      type="text"
                      value={editingPost.featuredImage || ''}
                      onChange={(e) => {
                        updateEditingPost('featuredImage', e.target.value)
                        setFeaturedImagePreview(e.target.value || null)
                      }}
                      placeholder="Enter image URL"
                      className="flex-1 px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingPost.published}
                      onChange={(e) => updateEditingPost('published', e.target.checked)}
                      className="w-4 h-4 text-brown-dark focus:ring-brown rounded"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-brown-dark">Published</span>
                      <span className="text-xs text-gray-500">Only published posts appear on the blog page</span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => savePost(editingPost)}
                    disabled={saving || !editingPost.title || !editingPost.content}
                    className="px-6 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Post'}
                  </button>
                  <button
                    onClick={() => {
                      setShowEditor(false)
                      setEditingPost(null)
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Posts List */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-brown-light rounded-lg">
                <p className="text-brown mb-4">No blog posts yet.</p>
                <button
                  onClick={startNewPost}
                  className="px-6 py-2 bg-brown-light text-brown-dark rounded-lg font-semibold hover:bg-brown-light/80 transition-colors"
                >
                  Create Your First Post
                </button>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="border-2 border-brown-light rounded-lg p-4 hover:border-brown transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-brown-dark">{post.title || '(Untitled)'}</h3>
                        {post.published ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">Published</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">Draft</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.excerpt || '(No excerpt)'}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {post.publishedAt && (
                          <span>Published: {new Date(post.publishedAt).toLocaleDateString()}</span>
                        )}
                        {post.updatedAt && (
                          <span>Updated: {new Date(post.updatedAt).toLocaleDateString()}</span>
                        )}
                        {post.category && <span>Category: {post.category}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePublish(post)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                          post.published
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {post.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => startEdit(post)}
                        className="px-4 py-2 bg-brown-light text-brown-dark rounded-lg font-semibold text-sm hover:bg-brown-light/80 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold text-sm hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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
