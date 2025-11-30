'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useInView } from 'react-intersection-observer'
import Image from 'next/image'
import type { BlogPost } from '@/lib/blog-utils'

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    const loadBlog = async () => {
      try {
        // Add cache busting with timestamp
        const response = await fetch(`/api/blog`, {
          cache: 'force-cache',
          next: { revalidate: 60 },
        })

        if (!response.ok) {
          throw new Error('Failed to load blog posts')
        }

        const data = await response.json()
        setPosts(data.posts || [])

        if (data.posts && data.posts.length === 0) {
          setError(null) // No error, just no posts yet
        }
      } catch (err: any) {
        console.error('Error loading blog:', err)
        setError(err.message || 'Failed to load blog posts.')
      } finally {
        setLoading(false)
      }
    }

    loadBlog()
  }, [])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-20 flex items-center justify-center">
        <div className="text-brown">Loading blog posts...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 sm:py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={ref}
          className={`text-center mb-12 md:mb-16 ${
            inView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display text-brown mb-4">
            Lash Blog
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Tips, trends, and everything you need to know about lash extensions
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-white rounded-xl shadow-soft-lg border-2 border-brown-light p-8 max-w-2xl mx-auto mb-8">
            <p className="text-red-600 mb-4 font-semibold">Error loading blog posts</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        )}

        {/* Blog Posts Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white rounded-xl shadow-soft-lg border-2 border-brown-light p-8 max-w-2xl mx-auto">
              <p className="text-gray-600 mb-4">No blog posts yet.</p>
              <p className="text-sm text-gray-500">
                Check back soon for our latest articles and tips!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts
              .filter((post) => post && post.id && post.slug && post.title)
              .map((post, index) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug || post.id}`}
                  className="group bg-white rounded-xl shadow-soft-lg border-2 border-brown-light overflow-hidden hover:shadow-soft-xl transition-all duration-300 hover:scale-[1.02] animate-slide-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Featured Image */}
                  {post.featuredImage && post.featuredImage.trim() ? (
                    <div className="h-48 w-full relative overflow-hidden bg-gray-100">
                      <img
                        src={post.featuredImage}
                        alt={post.title || 'Blog post image'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to placeholder on error
                          const target = e.target as HTMLImageElement
                          target.src = 'https://via.placeholder.com/800x400?text=Image+Not+Available'
                          target.onerror = null // Prevent infinite loop
                        }}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-pink-light to-pink flex items-center justify-center">
                      <span className="text-4xl">📝</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    {/* Date and Category */}
                    <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
                      {post.publishedAt && (
                        <span>{formatDate(post.publishedAt)}</span>
                      )}
                      {post.category && (
                        <span className="px-2 py-1 bg-brown-light text-brown-dark rounded text-xs font-semibold">
                          {post.category}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-display text-brown-dark mb-3 group-hover:text-brown transition-colors line-clamp-2">
                      {post.title || 'Untitled Post'}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {post.excerpt || 'Read more...'}
                    </p>

                    {/* Tags */}
                    {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {post.tags
                          .filter((tag) => tag && typeof tag === 'string')
                          .slice(0, 3)
                          .map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Read More */}
                    <div className="flex items-center text-brown font-semibold text-sm group-hover:gap-2 transition-all">
                      Read More
                      <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}