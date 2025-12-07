'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { BlogPost } from '@/lib/blog-utils'

export default function BlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    const loadPost = async () => {
      try {
        const response = await fetch(`/api/blog/${slug}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found')
          } else {
            throw new Error('Failed to load post')
          }
          return
        }

        const data = await response.json()
        setPost(data.post)
      } catch (err: any) {
        console.error('Error loading post:', err)
        setError(err.message || 'Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    loadPost()
  }, [slug])

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
        <div className="text-brown">Loading post...</div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-8 sm:py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-display text-brown mb-4">Post Not Found</h1>
            <p className="text-gray-600 mb-8">{error || 'The post you are looking for does not exist.'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 sm:py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Article */}
        <article className="bg-white rounded-xl shadow-soft-lg border-2 border-brown-light overflow-hidden">
          <div className="p-8 md:p-12">
            {/* Title - First */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display text-brown-dark mb-6">
              {post.title}
            </h1>

            {/* Date and Author - Second */}
            <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              {post.publishedAt && (
                <span>{formatDate(post.publishedAt)}</span>
              )}
              {post.author && (
                <span>By {post.author}</span>
              )}
            </div>

            {/* Featured Image - Third */}
            {post.featuredImage && post.featuredImage.trim() && (
              <div className="w-full h-64 md:h-96 relative bg-gray-100 mb-8 rounded-lg overflow-hidden">
                <img
                  src={post.featuredImage}
                  alt={post.title || 'Blog post image'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder on error
                    const target = e.target as HTMLImageElement
                    target.src = 'https://via.placeholder.com/1200x600?text=Image+Not+Available'
                    target.onerror = null // Prevent infinite loop
                  }}
                  loading="lazy"
                />
              </div>
            )}

            {/* Category and Reading Time */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
              {post.category && (
                <span className="px-3 py-1 bg-brown-light text-brown-dark rounded-full font-semibold">
                  {post.category}
                </span>
              )}
              {post.readingTime && (
                <span className="text-gray-600">{post.readingTime} min read</span>
              )}
            </div>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-gray-600 mb-8 font-body italic">
                {post.excerpt}
              </p>
            )}

            {/* Content - Body of Article - Fourth */}
            {post.content ? (
              <div
                className="prose prose-lg max-w-none mb-8 font-body"
                style={{
                  color: 'var(--color-text)',
                }}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <div className="mb-8">
                <p className="text-gray-600 italic">Content coming soon...</p>
              </div>
            )}

            {/* Tags - At the end */}
            {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8 pt-8 border-t border-brown-light">
                {post.tags
                  .filter((tag) => tag && typeof tag === 'string')
                  .map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
              </div>
            )}

            {/* Updated Date */}
            {post.updatedAt && post.updatedAt !== post.publishedAt && (
              <div className="mt-8 pt-8 border-t border-brown-light">
                <p className="text-sm text-gray-500">
                  Last updated: {formatDate(post.updatedAt)}
                </p>
              </div>
            )}
          </div>
        </article>

        {/* Back to Blog Link */}
        <div className="mt-8 flex justify-start">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brown-dark text-white rounded-full font-semibold hover:bg-brown transition-colors duration-200 shadow-soft hover:shadow-soft-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back</span>
          </Link>
        </div>
      </div>
    </div>
  )
}