'use client'

import { useState, useRef, useEffect } from 'react'

interface ImageCropProps {
  imageSrc: string
  onCrop: (croppedBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number // Optional aspect ratio (width/height), e.g., 1 for square
}

export default function ImageCrop({ imageSrc, onCrop, onCancel, aspectRatio = 1 }: ImageCropProps) {
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [scale, setScale] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      imageRef.current = img
      
      // Initialize crop area to center, maintaining aspect ratio
      const containerWidth = 600
      const containerHeight = 400
      const maxCropSize = Math.min(containerWidth * 0.8, containerHeight * 0.8)
      const cropWidth = maxCropSize
      const cropHeight = maxCropSize / aspectRatio
      
      setCropArea({
        x: (containerWidth - cropWidth) / 2,
        y: (containerHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      })
      
      // Calculate scale to fit image in container
      const scaleX = containerWidth / img.width
      const scaleY = containerHeight / img.height
      setScale(Math.min(scaleX, scaleY, 1))
    }
    img.src = imageSrc
  }, [imageSrc, aspectRatio])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setIsDragging(true)
    setDragStart({ 
      x: e.clientX - rect.left - cropArea.x, 
      y: e.clientY - rect.top - cropArea.y 
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const newX = e.clientX - rect.left - dragStart.x
    const newY = e.clientY - rect.top - dragStart.y
    
    // Constrain crop area within container
    const maxX = container.clientWidth - cropArea.width
    const maxY = container.clientHeight - cropArea.height
    
    setCropArea({
      ...cropArea,
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleResize = (direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw', e: React.MouseEvent) => {
    e.stopPropagation()
    if (!containerRef.current) return
    
    const startX = e.clientX
    const startY = e.clientY
    const startCrop = { ...cropArea }
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      
      let newCrop = { ...startCrop }
      
      if (direction.includes('e')) {
        newCrop.width = Math.max(50, startCrop.width + deltaX)
        if (aspectRatio) {
          newCrop.height = newCrop.width / aspectRatio
        }
      }
      if (direction.includes('w')) {
        const newWidth = Math.max(50, startCrop.width - deltaX)
        if (newWidth !== startCrop.width) {
          newCrop.x = startCrop.x + (startCrop.width - newWidth)
          newCrop.width = newWidth
          if (aspectRatio) {
            newCrop.height = newCrop.width / aspectRatio
            newCrop.y = startCrop.y + (startCrop.height - newCrop.height)
          }
        }
      }
      if (direction.includes('s')) {
        newCrop.height = Math.max(50, startCrop.height + deltaY)
        if (aspectRatio) {
          newCrop.width = newCrop.height * aspectRatio
        }
      }
      if (direction.includes('n')) {
        const newHeight = Math.max(50, startCrop.height - deltaY)
        if (newHeight !== startCrop.height) {
          newCrop.y = startCrop.y + (startCrop.height - newHeight)
          newCrop.height = newHeight
          if (aspectRatio) {
            newCrop.width = newCrop.height * aspectRatio
            newCrop.x = startCrop.x + (startCrop.width - newCrop.width)
          }
        }
      }
      
      // Constrain within container
      newCrop.x = Math.max(0, Math.min(newCrop.x, container.clientWidth - newCrop.width))
      newCrop.y = Math.max(0, Math.min(newCrop.y, container.clientHeight - newCrop.height))
      
      setCropArea(newCrop)
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current || !containerRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const img = imageRef.current
    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    
    // Calculate the displayed image size
    const displayedWidth = img.width * scale
    const displayedHeight = img.height * scale
    const imageX = (containerWidth - displayedWidth) / 2
    const imageY = (containerHeight - displayedHeight) / 2
    
    // Convert crop area from container coordinates to image coordinates
    const cropX = Math.max(0, (cropArea.x - imageX) / scale)
    const cropY = Math.max(0, (cropArea.y - imageY) / scale)
    const cropWidth = Math.min(cropArea.width / scale, img.width - cropX)
    const cropHeight = Math.min(cropArea.height / scale, img.height - cropY)
    
    // Set canvas size to crop size
    canvas.width = cropWidth
    canvas.height = cropHeight
    
    // Draw cropped image
    ctx.drawImage(
      img,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    )
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob)
      }
    }, 'image/jpeg', 0.95)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Crop Image</h2>
          <p className="text-sm text-gray-600 mt-1">Drag the crop area to move it, or drag the corners to resize</p>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div
            ref={containerRef}
            className="relative bg-gray-100 rounded-lg overflow-hidden mx-auto"
            style={{ width: '600px', height: '400px' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={imageSrc}
              alt="Crop preview"
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full"
              style={{
                width: imageSize.width * scale,
                height: imageSize.height * scale,
                objectFit: 'contain',
              }}
            />
            
            {/* Dark overlay outside crop area */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top overlay */}
              <div
                className="absolute bg-black/50"
                style={{
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: `${cropArea.y}px`,
                }}
              />
              {/* Bottom overlay */}
              <div
                className="absolute bg-black/50"
                style={{
                  left: 0,
                  top: `${cropArea.y + cropArea.height}px`,
                  width: '100%',
                  height: `${600 - (cropArea.y + cropArea.height)}px`,
                }}
              />
              {/* Left overlay */}
              <div
                className="absolute bg-black/50"
                style={{
                  left: 0,
                  top: `${cropArea.y}px`,
                  width: `${cropArea.x}px`,
                  height: `${cropArea.height}px`,
                }}
              />
              {/* Right overlay */}
              <div
                className="absolute bg-black/50"
                style={{
                  left: `${cropArea.x + cropArea.width}px`,
                  top: `${cropArea.y}px`,
                  width: `${600 - (cropArea.x + cropArea.width)}px`,
                  height: `${cropArea.height}px`,
                }}
              />
            </div>
            
            {/* Crop area border and handles */}
            <div
              className="absolute border-2 border-white shadow-lg cursor-move pointer-events-auto"
              style={{
                left: `${cropArea.x}px`,
                top: `${cropArea.y}px`,
                width: `${cropArea.width}px`,
                height: `${cropArea.height}px`,
              }}
              onMouseDown={handleMouseDown}
            >
              {/* Resize handles */}
              {['nw', 'ne', 'sw', 'se'].map((corner) => (
                <div
                  key={corner}
                  className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-10"
                  style={{
                    [corner.includes('n') ? 'top' : 'bottom']: '-6px',
                    [corner.includes('w') ? 'left' : 'right']: '-6px',
                  }}
                  onMouseDown={(e) => handleResize(corner as 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw', e)}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Crop & Save
          </button>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

