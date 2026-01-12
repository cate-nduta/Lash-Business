'use client'

import { useState, useRef, useEffect } from 'react'

interface ImageCropProps {
  imageSrc: string
  onCrop: (croppedImageBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number // Optional aspect ratio (width/height)
}

export default function ImageCrop({ imageSrc, onCrop, onCancel, aspectRatio }: ImageCropProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      // Initialize crop to center 95% of image (larger initial crop)
      const initialSize = Math.min(img.width, img.height) * 0.95
      let finalWidth = initialSize
      let finalHeight = initialSize
      
      if (aspectRatio) {
        // Maintain aspect ratio
        if (img.width > img.height) {
          finalHeight = initialSize
          finalWidth = initialSize * aspectRatio
        } else {
          finalWidth = initialSize
          finalHeight = initialSize / aspectRatio
        }
        // Ensure it fits within image bounds
        if (finalWidth > img.width) {
          finalWidth = img.width
          finalHeight = finalWidth / aspectRatio
        }
        if (finalHeight > img.height) {
          finalHeight = img.height
          finalWidth = finalHeight * aspectRatio
        }
      }
      
      const initialX = Math.max(0, (img.width - finalWidth) / 2)
      const initialY = Math.max(0, (img.height - finalHeight) / 2)
      
      setCrop({
        x: initialX,
        y: initialY,
        width: finalWidth,
        height: finalHeight,
      })
      setCropStart({ x: initialX, y: initialY })
    }
    img.src = imageSrc
  }, [imageSrc, aspectRatio])

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageRef.current || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = imageSize.width / rect.width
    const scaleY = imageSize.height / rect.height
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    
    // Check if clicking inside crop area
    if (
      x >= crop.x &&
      x <= crop.x + crop.width &&
      y >= crop.y &&
      y <= crop.y + crop.height
    ) {
      setIsDragging(true)
      setDragStart({ x: x - crop.x, y: y - crop.y })
    } else {
      // Start new crop - use larger default size (60% of smaller dimension)
      const defaultSize = Math.min(imageSize.width, imageSize.height) * 0.6
      const newWidth = aspectRatio ? defaultSize * aspectRatio : defaultSize
      const newHeight = aspectRatio ? defaultSize / aspectRatio : defaultSize
      const newX = Math.max(0, Math.min(x - newWidth / 2, imageSize.width - newWidth))
      const newY = Math.max(0, Math.min(y - newHeight / 2, imageSize.height - newHeight))
      setCrop({ x: newX, y: newY, width: newWidth, height: newHeight })
      setCropStart({ x: newX, y: newY })
      setIsDragging(true)
      setDragStart({ x: newWidth / 2, y: newHeight / 2 })
    }
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !imageRef.current || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = imageSize.width / rect.width
    const scaleY = imageSize.height / rect.height
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    
    const newX = Math.max(0, Math.min(x - dragStart.x, imageSize.width - crop.width))
    const newY = Math.max(0, Math.min(y - dragStart.y, imageSize.height - crop.height))
    
    setCrop({ ...crop, x: newX, y: newY })
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  const handleResize = (direction: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if (!imageRef.current || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = imageSize.width / rect.width
    const scaleY = imageSize.height / rect.height
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const startX = clientX
    const startY = clientY
    const startCrop = { ...crop }
    
    const handleMoveResize = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
      
      const deltaX = (moveClientX - startX) * scaleX
      const deltaY = (moveClientY - startY) * scaleY
      
      const newCrop = { ...startCrop }
      
      if (direction.includes('e')) {
        newCrop.width = Math.max(50, Math.min(startCrop.width + deltaX, imageSize.width - startCrop.x))
        if (aspectRatio) {
          newCrop.height = newCrop.width / aspectRatio
          // Ensure it doesn't go out of bounds
          if (newCrop.y + newCrop.height > imageSize.height) {
            newCrop.height = imageSize.height - newCrop.y
            newCrop.width = newCrop.height * aspectRatio
          }
        }
      }
      if (direction.includes('w')) {
        const newWidth = Math.max(50, Math.min(startCrop.width - deltaX, startCrop.x + startCrop.width))
        const deltaWidth = startCrop.width - newWidth
        newCrop.x = startCrop.x + deltaWidth
        newCrop.width = newWidth
        if (aspectRatio) {
          newCrop.height = newCrop.width / aspectRatio
          // Ensure it doesn't go out of bounds
          if (newCrop.y + newCrop.height > imageSize.height) {
            newCrop.height = imageSize.height - newCrop.y
            newCrop.width = newCrop.height * aspectRatio
            newCrop.x = startCrop.x + startCrop.width - newCrop.width
          }
        }
        newCrop.x = Math.max(0, newCrop.x)
      }
      if (direction.includes('s')) {
        newCrop.height = Math.max(50, Math.min(startCrop.height + deltaY, imageSize.height - startCrop.y))
        if (aspectRatio) {
          newCrop.width = newCrop.height * aspectRatio
          // Ensure it doesn't go out of bounds
          if (newCrop.x + newCrop.width > imageSize.width) {
            newCrop.width = imageSize.width - newCrop.x
            newCrop.height = newCrop.width / aspectRatio
          }
        }
      }
      if (direction.includes('n')) {
        const newHeight = Math.max(50, Math.min(startCrop.height - deltaY, startCrop.y + startCrop.height))
        const deltaHeight = startCrop.height - newHeight
        newCrop.y = startCrop.y + deltaHeight
        newCrop.height = newHeight
        if (aspectRatio) {
          newCrop.width = newCrop.height * aspectRatio
          // Ensure it doesn't go out of bounds
          if (newCrop.x + newCrop.width > imageSize.width) {
            newCrop.width = imageSize.width - newCrop.x
            newCrop.height = newCrop.width / aspectRatio
            newCrop.y = startCrop.y + startCrop.height - newCrop.height
          }
        }
        newCrop.y = Math.max(0, newCrop.y)
      }
      
      setCrop(newCrop)
    }
    
    const handleUpResize = () => {
      document.removeEventListener('mousemove', handleMoveResize as EventListener)
      document.removeEventListener('mouseup', handleUpResize)
      document.removeEventListener('touchmove', handleMoveResize as EventListener)
      document.removeEventListener('touchend', handleUpResize)
    }
    
    document.addEventListener('mousemove', handleMoveResize as EventListener)
    document.addEventListener('mouseup', handleUpResize)
    document.addEventListener('touchmove', handleMoveResize as EventListener, { passive: false })
    document.addEventListener('touchend', handleUpResize)
  }

  const handleCrop = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = crop.width
      canvas.height = crop.height
      
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      )
      
      canvas.toBlob((blob) => {
        if (blob) {
          onCrop(blob)
        }
      }, 'image/jpeg', 0.92)
    }
    img.src = imageSrc
  }

  if (!imageSize.width || !imageSize.height) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-brown">Loading image...</div>
      </div>
    )
  }

  const containerWidth = 600
  const containerHeight = 400
  const scaleX = containerWidth / imageSize.width
  const scaleY = containerHeight / imageSize.height
  const scale = Math.min(scaleX, scaleY, 1)
  const displayWidth = imageSize.width * scale
  const displayHeight = imageSize.height * scale
  const displayCrop = {
    x: crop.x * scale,
    y: crop.y * scale,
    width: crop.width * scale,
    height: crop.height * scale,
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <h3 className="text-2xl font-semibold text-brown-dark mb-4">Crop Your Photo</h3>
          <p className="text-sm text-brown-dark/70 mb-4">
            Click and drag to move the crop area, or drag the corners to resize. Click "Apply Crop" when you're happy with the selection.
          </p>
          
          <div
            ref={containerRef}
            className="relative mx-auto border-2 border-brown-light rounded-lg overflow-hidden bg-gray-100 touch-none"
            style={{ width: containerWidth, height: containerHeight }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                width: displayWidth,
                height: displayHeight,
                maxWidth: 'none',
              }}
              draggable={false}
            />
            
            {/* Crop overlay */}
            <div
              className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
              style={{
                left: displayCrop.x,
                top: displayCrop.y,
                width: displayCrop.width,
                height: displayCrop.height,
              }}
            >
              {/* Resize handles */}
              <div
                className="absolute -top-1 -left-1 w-6 h-6 bg-white border-2 border-brown-dark rounded-full cursor-nwse-resize touch-manipulation"
                onMouseDown={(e) => handleResize('nw', e)}
                onTouchStart={(e) => handleResize('nw', e)}
              />
              <div
                className="absolute -top-1 -right-1 w-6 h-6 bg-white border-2 border-brown-dark rounded-full cursor-nesw-resize touch-manipulation"
                onMouseDown={(e) => handleResize('ne', e)}
                onTouchStart={(e) => handleResize('ne', e)}
              />
              <div
                className="absolute -bottom-1 -left-1 w-6 h-6 bg-white border-2 border-brown-dark rounded-full cursor-nesw-resize touch-manipulation"
                onMouseDown={(e) => handleResize('sw', e)}
                onTouchStart={(e) => handleResize('sw', e)}
              />
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border-2 border-brown-dark rounded-full cursor-nwse-resize touch-manipulation"
                onMouseDown={(e) => handleResize('se', e)}
                onTouchStart={(e) => handleResize('se', e)}
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCrop}
              className="flex-1 px-6 py-3 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              Apply Crop
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

