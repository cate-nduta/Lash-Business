'use client'

import { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

interface GalleryImage {
  url: string
  name: string
}

export default function Gallery() {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    // Fetch gallery images from API with cache busting
    const fetchGallery = async () => {
      try {
        const response = await fetch(`/api/gallery?t=${Date.now()}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        const data = await response.json()
        setGalleryImages(data.images || [])
        setLoading(false)
      } catch (error) {
        console.error('Error loading gallery:', error)
        setLoading(false)
      }
    }
    fetchGallery()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading gallery...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 sm:py-12 md:py-20 relative overflow-hidden">
      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="cartoon-sticker top-20 left-10 animate-float-sticker opacity-45 hidden md:block" style={{ animationDelay: '0s' }}>
          <div className="sticker-lash"></div>
        </div>
        <div className="cartoon-sticker top-32 right-16 animate-float-sticker opacity-40 hidden lg:block" style={{ animationDelay: '1.3s' }}>
          <div className="sticker-star"></div>
        </div>
        <div className="cartoon-sticker bottom-40 left-20 animate-float-sticker opacity-35 hidden md:block" style={{ animationDelay: '2.1s' }}>
          <div className="sticker-heart"></div>
        </div>
        <div className="cartoon-sticker top-1/2 right-12 animate-float-sticker opacity-40 hidden xl:block" style={{ animationDelay: '0.7s' }}>
          <div className="sticker-sparkle animate-rotate-slow"></div>
        </div>
        <div className="cartoon-sticker bottom-20 right-20 animate-float-sticker opacity-30 hidden lg:block" style={{ animationDelay: '1.8s' }}>
          <div className="sticker-star"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16 relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display text-brown mb-4 sm:mb-6 relative inline-block">
            Our Gallery
            <span className="absolute -top-2 -right-8 text-2xl opacity-50 hidden lg:inline-block">📸</span>
            <span className="absolute -bottom-1 -left-6 text-xl opacity-40 hidden md:inline-block">✨</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            Explore our stunning transformations and see the fabulous artistry 
            of LashDiary! Get ready to be inspired! 💫
          </p>
        </div>

        {/* Gallery Grid */}
        {galleryImages.length === 0 ? (
          <div className="text-center py-16 relative">
            <div className="cartoon-sticker top-8 left-1/2 -translate-x-1/2 opacity-40">
              <div className="sticker-heart animate-float-sticker"></div>
            </div>
            <p className="text-xl text-brown">No images in the gallery yet. 📷</p>
            <p className="text-brown mt-2">Check back soon for our latest work! ✨</p>
          </div>
        ) : (
          <div 
            ref={ref}
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 ${
              inView ? 'animate-fade-in-up' : 'opacity-0'
            }`}
          >
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 cursor-pointer transform hover:scale-110 hover:rotate-2"
                onClick={() => setSelectedImage(image)}
              >
                <div className="cartoon-sticker top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                  <div className="sticker-sparkle"></div>
                </div>
                <div className="aspect-square relative">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found'
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
                        <span>✨</span>
                        {image.name}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center px-4 py-14 md:py-16 animate-fade-in backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute inset-0" aria-hidden onClick={() => setSelectedImage(null)} />
          <div className="relative w-full max-w-4xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 rounded-full bg-black/60 backdrop-blur p-2"
              aria-label="Close image"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div
              className="bg-black/95 rounded-xl overflow-hidden shadow-2xl border border-white/10"
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="w-full h-full max-h-[75vh] md:max-h-[80vh] object-contain bg-black"
              />
              <div className="p-4 text-center text-white bg-black/85">
                <h3 className="font-display text-lg md:text-xl font-semibold">
                  {selectedImage.name}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

