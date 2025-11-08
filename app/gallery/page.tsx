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
    // Fetch gallery images from API
    fetch('/api/gallery')
      .then((res) => res.json())
      .then((data) => {
        setGalleryImages(data.images || [])
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error loading gallery:', error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading gallery...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-display text-brown mb-6">
            Our Gallery
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our stunning transformations and see the fabulous artistry 
            of LashDiary! Get ready to be inspired!
          </p>
        </div>

        {/* Gallery Grid */}
        {galleryImages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-brown">No images in the gallery yet.</p>
            <p className="text-brown mt-2">Check back soon for our latest work!</p>
          </div>
        ) : (
          <div 
            ref={ref}
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${
              inView ? 'animate-fade-in-up' : 'opacity-0'
            }`}
          >
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 cursor-pointer transform hover:scale-110 hover:rotate-2"
                onClick={() => setSelectedImage(image)}
              >
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
                      <h3 className="font-display text-lg font-semibold mb-1">
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
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-white/90 text-brown-dark hover:bg-white hover:text-red transition-colors rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="bg-white rounded-xl overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="w-full h-full max-h-[70vh] object-contain bg-black"
              />
              <div className="p-4 text-center text-brown-dark bg-white">
                <h3 className="font-display text-xl font-semibold">
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

