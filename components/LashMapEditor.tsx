'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

export interface DrawingPath {
  eye: 'left' | 'right'
  points: Array<{ x: number; y: number }>
  color: string
  strokeWidth: number
  type?: 'drawn' | 'template'
  templateId?: string
  rotationAngle?: number // Rotation angle in degrees (0 = original direction)
}

export interface LengthLabel {
  eye: 'left' | 'right'
  length: number // 8-15mm
  x: number
  y: number
  id: string
}

export interface LashMapDrawingData {
  leftEye: DrawingPath[]
  rightEye: DrawingPath[]
  leftEyeLabels: LengthLabel[]
  rightEyeLabels: LengthLabel[]
  backgroundImageUrl?: string
  metadata?: {
    created?: string
    updated?: string
    style?: string
  }
}

interface LashMapEditorProps {
  initialData?: LashMapDrawingData | null
  onSave?: (data: LashMapDrawingData) => void
  readOnly?: boolean
  showLabels?: boolean
  eyepatchImageUrl?: string
  backgroundImageUrl?: string
  onBackgroundImageChange?: (url: string | undefined) => void
}

// Premade line templates - VERTICAL lines
// Scaled for the new 800x400 canvas (each eye area is ~400x400, but canvas height is 400)
// Templates are relative offsets that work in the eye coordinate space
const LINE_TEMPLATES = [
  { id: 'short', name: 'Short Line', points: [{ x: 0, y: 0 }, { x: 0, y: 50 }] },
  { id: 'medium', name: 'Medium Line', points: [{ x: 0, y: 0 }, { x: 0, y: 80 }] },
  { id: 'long', name: 'Long Line', points: [{ x: 0, y: 0 }, { x: 0, y: 200 }] }, // Full height vertical line - longer
  { id: 'diagonal-right', name: '30° Right', points: [{ x: 0, y: 0 }, { x: 115, y: 200 }] }, // 30 degrees to the right - same height as long line
  { id: 'diagonal-left', name: '30° Left', points: [{ x: 0, y: 0 }, { x: -115, y: 200 }] }, // 30 degrees to the left - same height as long line
  { id: 'curve-left', name: 'Curve Left', points: [{ x: 0, y: 0 }, { x: -20, y: 40 }, { x: 0, y: 80 }] },
  { id: 'curve-right', name: 'Curve Right', points: [{ x: 0, y: 0 }, { x: 20, y: 40 }, { x: 0, y: 80 }] },
]

const LASH_LENGTHS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] // mm

export default function LashMapEditor({
  initialData,
  onSave,
  readOnly = false,
  showLabels = true,
  eyepatchImageUrl,
  backgroundImageUrl: propBackgroundImageUrl,
  onBackgroundImageChange,
}: LashMapEditorProps) {
  const [drawing, setDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null)
  const [paths, setPaths] = useState<LashMapDrawingData>({
    leftEye: initialData?.leftEye || [],
    rightEye: initialData?.rightEye || [],
    leftEyeLabels: initialData?.leftEyeLabels || [],
    rightEyeLabels: initialData?.rightEyeLabels || [],
    backgroundImageUrl: initialData?.backgroundImageUrl || propBackgroundImageUrl,
    metadata: initialData?.metadata || {},
  })
  const [selectedColor, setSelectedColor] = useState('#C2185B')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [activeEye, setActiveEye] = useState<'left' | 'right' | null>(null)
  const [draggingLabel, setDraggingLabel] = useState<{ id: string; eye: 'left' | 'right' } | null>(null)
  const [draggingLine, setDraggingLine] = useState<{ id: string; eye: 'left' | 'right' } | null>(null)
  const [rotatingLine, setRotatingLine] = useState<{ pathIndex: number; eye: 'left' | 'right'; startAngle: number; startPoint: { x: number; y: number } } | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [mode, setMode] = useState<'draw' | 'label' | 'template' | 'rotate' | 'erase'>('template')
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | undefined>(propBackgroundImageUrl || initialData?.backgroundImageUrl)
  const svgRef = useRef<SVGSVGElement>(null)
  const rotationSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Landscape canvas dimensions - large enough for both eyes
  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 400
  const LEFT_EYE_CENTER_X = 200
  const RIGHT_EYE_CENTER_X = 600
  const EYE_CENTER_Y = 200

  useEffect(() => {
    if (initialData) {
      setPaths({
        leftEye: initialData.leftEye || [],
        rightEye: initialData.rightEye || [],
        leftEyeLabels: initialData.leftEyeLabels || [],
        rightEyeLabels: initialData.rightEyeLabels || [],
        backgroundImageUrl: initialData.backgroundImageUrl,
        metadata: initialData.metadata || {},
      })
      if (initialData.backgroundImageUrl) {
        setBackgroundImageUrl(initialData.backgroundImageUrl)
      }
    }
  }, [initialData])

  useEffect(() => {
    if (propBackgroundImageUrl !== undefined) {
      setBackgroundImageUrl(propBackgroundImageUrl)
      setPaths((prev) => ({
        ...prev,
        backgroundImageUrl: propBackgroundImageUrl,
      }))
    }
  }, [propBackgroundImageUrl])

  // Removed console.logs for performance

  // Eye patch shape - Bean/Kidney shape matching the image exactly
  // Horizontally elongated, smooth broadly convex top, concave bottom with gentle dip in middle
  // Rounded ends, bean/kidney-shaped - exactly as shown in the image
  const eyeShapePath = 'M 20 50 Q 20 30 50 25 Q 80 20 100 25 Q 120 20 150 25 Q 180 30 180 50 Q 180 70 170 80 Q 160 85 150 87 Q 140 88 130 87 Q 120 88 110 87 Q 100 88 90 87 Q 80 88 70 87 Q 60 88 50 87 Q 40 88 30 87 Q 20 85 10 80 Q 0 70 0 50 Q 0 30 20 25 Q 50 20 80 25 Q 100 20 120 25 Q 150 30 150 50 Q 150 70 140 80 Q 130 85 120 87 Q 110 88 100 87 Q 90 88 80 87 Q 70 88 60 87 Q 50 88 40 87 Q 30 88 20 87 Q 10 85 0 80 Q 0 70 0 50 Z'

  const getPointFromEvent = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
    svg: SVGSVGElement
  ): { x: number; y: number; eye: 'left' | 'right' } | null => {
    const rect = svg.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    // Get the viewBox to properly calculate coordinates
    const viewBox = svg.viewBox.baseVal
    const viewBoxWidth = viewBox.width || CANVAS_WIDTH
    const viewBoxHeight = viewBox.height || CANVAS_HEIGHT
    
    // Calculate coordinates in viewBox space
    const x = ((clientX - rect.left) / rect.width) * viewBoxWidth
    const y = ((clientY - rect.top) / rect.height) * viewBoxHeight
    
    // Determine which eye based on x position
    const eye: 'left' | 'right' = x < viewBoxWidth / 2 ? 'left' : 'right'
    return { x, y, eye }
  }

  // REMOVED automatic save - no useEffect watching paths to prevent infinite loops

  // Drawing functions
  const startDrawing = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    if (readOnly || mode !== 'draw') return
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return

    const point = getPointFromEvent(e, svg)
    if (!point) return

    setActiveEye(point.eye)
    setDrawing(true)
    const newPath: DrawingPath = {
      eye: point.eye,
      points: [{ x: point.x, y: point.y }],
      color: selectedColor,
      strokeWidth,
      type: 'drawn',
    }
    setCurrentPath(newPath)
  }

  const draw = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    if (!drawing || !currentPath || readOnly || mode !== 'draw') return
    e.preventDefault()
    e.stopPropagation()

    const svg = svgRef.current
    if (!svg) return

    const point = getPointFromEvent(e, svg)
    if (!point) return

    // Lock to the eye we started drawing on
    if (point.eye !== currentPath.eye) return

    // Only add point if it's moved a minimum distance (prevents too many points)
    const lastPoint = currentPath.points[currentPath.points.length - 1]
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
    )
    
    // Add point if moved at least 2 units (reduces jitter)
    if (distance >= 2) {
      setCurrentPath({
        ...currentPath,
        points: [...currentPath.points, { x: point.x, y: point.y }],
      })
    }
  }

  const stopDrawing = () => {
    if (!drawing || !currentPath || readOnly) return

    // Straighten the line by keeping only the first and last points
    const straightenedPath: DrawingPath = {
      ...currentPath,
      points: currentPath.points.length >= 2 
        ? [currentPath.points[0], currentPath.points[currentPath.points.length - 1]]
        : currentPath.points,
    }

    setPaths((prev) => {
      const newPaths = { ...prev }
      if (straightenedPath.eye === 'left') {
        newPaths.leftEye = [...prev.leftEye, straightenedPath]
      } else {
        newPaths.rightEye = [...prev.rightEye, straightenedPath]
      }
      newPaths.metadata = {
        ...newPaths.metadata,
        updated: new Date().toISOString(),
      }
      
      // Call onSave only when drawing is complete
      if (onSave) {
        setTimeout(() => {
          onSave(newPaths)
        }, 0)
      }
      
      return newPaths
    })

    setDrawing(false)
    setCurrentPath(null)
    setActiveEye(null)
  }

  // Label dragging functions
  const handleLabelMouseDown = (
    e: React.MouseEvent<SVGTextElement>,
    labelId: string,
    eye: 'left' | 'right'
  ) => {
    if (readOnly || mode !== 'label') return
    e.preventDefault()
    e.stopPropagation()
    setDraggingLabel({ id: labelId, eye })
  }

  const handleLabelMouseMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    if (!draggingLabel || readOnly) return
    e.preventDefault()

    const svg = svgRef.current
    if (!svg) return

    const point = getPointFromEvent(e, svg)
    if (!point || point.eye !== draggingLabel.eye) return

    setPaths((prev) => {
      const newPaths = { ...prev }
      const labels = draggingLabel.eye === 'left' ? newPaths.leftEyeLabels : newPaths.rightEyeLabels
      const labelIndex = labels.findIndex((l) => l.id === draggingLabel.id)
      if (labelIndex !== -1) {
        labels[labelIndex] = { ...labels[labelIndex], x: point.x, y: point.y }
      }
      newPaths.metadata = {
        ...newPaths.metadata,
        updated: new Date().toISOString(),
      }
      return newPaths
    })
  }

  const handleLabelMouseUp = () => {
    if (draggingLabel) {
      // Save when label dragging ends - get current paths state
      setPaths((prev) => {
        const newPaths = { ...prev }
        // Ensure we have the latest label positions
        if (onSave) {
          setTimeout(() => {
            onSave(newPaths)
          }, 0)
        }
        return newPaths
      })
    }
    setDraggingLabel(null)
  }

  // Rotation functions
  const startRotatingLine = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
    pathIndex: number,
    eye: 'left' | 'right'
  ) => {
    if (readOnly || mode !== 'rotate') return
    e.preventDefault()
    e.stopPropagation()

    const svg = svgRef.current
    if (!svg) return

    const point = getPointFromEvent(e, svg)
    if (!point || point.eye !== eye) return

    setPaths((prev) => {
      const pathArray = eye === 'left' ? prev.leftEye : prev.rightEye
      const path = pathArray[pathIndex]
      if (!path || path.points.length < 2) return prev

      const startPoint = path.points[0]
      const endPoint = path.points[path.points.length - 1]
      const currentAngle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x) * (180 / Math.PI)
      const existingRotation = path.rotationAngle || 0

      setRotatingLine({
        pathIndex,
        eye,
        startAngle: currentAngle - existingRotation,
        startPoint: { x: point.x, y: point.y },
      })
      return prev
    })
  }

  const rotateLine = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    if (!rotatingLine || readOnly || mode !== 'rotate') return
    e.preventDefault()

    const svg = svgRef.current
    if (!svg) return

    const point = getPointFromEvent(e, svg)
    if (!point || point.eye !== rotatingLine.eye) return

    setPaths((prev) => {
      const pathArray = rotatingLine.eye === 'left' ? prev.leftEye : prev.rightEye
      const path = pathArray[rotatingLine.pathIndex]
      if (!path || path.points.length < 2) return prev

      const startPoint = path.points[0]
      const currentAngle = Math.atan2(point.y - startPoint.y, point.x - startPoint.x) * (180 / Math.PI)
      const rotationAngle = currentAngle - rotatingLine.startAngle

      // Rotate all points except the first one around the start point
      const rotatePoint = (p: { x: number; y: number }, center: { x: number; y: number }, angleDeg: number) => {
        const angleRad = (angleDeg * Math.PI) / 180
        const cos = Math.cos(angleRad)
        const sin = Math.sin(angleRad)
        const dx = p.x - center.x
        const dy = p.y - center.y
        return {
          x: center.x + dx * cos - dy * sin,
          y: center.y + dx * sin + dy * cos,
        }
      }

      // Get original points (before any rotation) - use template if available
      let originalPoints = path.points
      if (path.templateId && path.rotationAngle === undefined) {
        // First time rotating - use current points as original
        originalPoints = path.points
      } else if (path.templateId) {
        // Recalculate from template to get original points
        const template = LINE_TEMPLATES.find((t) => t.id === path.templateId)
        if (template) {
          originalPoints = template.points.map((p) => ({
            x: startPoint.x + p.x,
            y: startPoint.y + p.y,
          }))
        }
      }

      // Rotate original points by the new rotation angle
      const rotatedPoints = originalPoints.map((p, idx) => {
        if (idx === 0) return p // Keep start point fixed
        return rotatePoint(p, startPoint, rotationAngle)
      })

      const newPaths = { ...prev }
      const newPathArray = rotatingLine.eye === 'left' ? newPaths.leftEye : newPaths.rightEye
      newPathArray[rotatingLine.pathIndex] = {
        ...path,
        points: rotatedPoints,
        rotationAngle,
      }
      newPaths.metadata = {
        ...newPaths.metadata,
        updated: new Date().toISOString(),
      }
      
      // Auto-save during rotation (debounced to avoid too many saves)
      if (onSave) {
        // Clear previous timeout
        if (rotationSaveTimeoutRef.current) {
          clearTimeout(rotationSaveTimeoutRef.current)
        }
        // Set new timeout to save after rotation stops
        rotationSaveTimeoutRef.current = setTimeout(() => {
          onSave(newPaths)
        }, 500) // Save 500ms after last rotation update
      }
      
      return newPaths
    })
  }

  const stopRotatingLine = () => {
    // Clear any pending rotation save timeout and save immediately
    if (rotationSaveTimeoutRef.current) {
      clearTimeout(rotationSaveTimeoutRef.current)
      rotationSaveTimeoutRef.current = null
    }
    
    if (rotatingLine && onSave) {
      // Save immediately when rotation ends
      setPaths((prev) => {
        if (onSave) {
          setTimeout(() => {
            onSave(prev)
          }, 0)
        }
        return prev
      })
    }
    setRotatingLine(null)
  }

  // Template line dragging functions
  const handleTemplateClick = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    if (readOnly || mode !== 'template' || !selectedTemplate) return
    e.preventDefault()

    const svg = svgRef.current
    if (!svg) return

    const point = getPointFromEvent(e, svg)
    if (!point) return

    const template = LINE_TEMPLATES.find((t) => t.id === selectedTemplate)
    if (!template) return

    // Create a new line from the template at the clicked position
    const translatedPoints = template.points.map((p) => ({
      x: point.x + p.x,
      y: point.y + p.y,
    }))

    const newPath: DrawingPath = {
      eye: point.eye,
      points: translatedPoints,
      color: selectedColor,
      strokeWidth,
      type: 'template',
      templateId: selectedTemplate,
    }

    setPaths((prev) => {
      const newPaths = { ...prev }
      if (point.eye === 'left') {
        newPaths.leftEye = [...prev.leftEye, newPath]
      } else {
        newPaths.rightEye = [...prev.rightEye, newPath]
      }
      newPaths.metadata = {
        ...newPaths.metadata,
        updated: new Date().toISOString(),
      }
      
      // Save when template line is added
      if (onSave) {
        setTimeout(() => {
          onSave(newPaths)
        }, 0)
      }
      
      return newPaths
    })
  }

  // Add length label
  const addLengthLabel = (length: number, eye: 'left' | 'right') => {
    if (readOnly) return
    const centerX = eye === 'left' ? LEFT_EYE_CENTER_X : RIGHT_EYE_CENTER_X
    const newLabel: LengthLabel = {
      eye,
      length,
      x: centerX,
      y: EYE_CENTER_Y,
      id: `label-${Date.now()}-${Math.random()}`,
    }

    setPaths((prev) => {
      const newPaths = { ...prev }
      if (eye === 'left') {
        newPaths.leftEyeLabels = [...prev.leftEyeLabels, newLabel]
      } else {
        newPaths.rightEyeLabels = [...prev.rightEyeLabels, newLabel]
      }
      newPaths.metadata = {
        ...newPaths.metadata,
        updated: new Date().toISOString(),
      }
      
      // Call onSave when label is added to ensure it's saved
      if (onSave) {
        setTimeout(() => {
          onSave(newPaths)
        }, 0)
      }
      
      return newPaths
    })
  }

  const removeLabel = (labelId: string, eye: 'left' | 'right') => {
    if (readOnly) return
    setPaths((prev) => {
      const newPaths = { ...prev }
      if (eye === 'left') {
        newPaths.leftEyeLabels = prev.leftEyeLabels.filter((l) => l.id !== labelId)
      } else {
        newPaths.rightEyeLabels = prev.rightEyeLabels.filter((l) => l.id !== labelId)
      }
      newPaths.metadata = {
        ...newPaths.metadata,
        updated: new Date().toISOString(),
      }
      
      // Call onSave when label is removed to ensure it's saved
      if (onSave) {
        setTimeout(() => {
          onSave(newPaths)
        }, 0)
      }
      
      return newPaths
    })
  }

  const clearEye = (eye: 'left' | 'right') => {
    if (readOnly) return
    setPaths((prev) => {
      const newPaths = { ...prev }
      if (eye === 'left') {
        newPaths.leftEye = []
        newPaths.leftEyeLabels = []
      } else {
        newPaths.rightEye = []
        newPaths.rightEyeLabels = []
      }
      newPaths.metadata = {
        ...newPaths.metadata,
        updated: new Date().toISOString(),
      }
      return newPaths
    })
    // Also clear current drawing if it's for this eye
    if (currentPath && currentPath.eye === eye) {
      setCurrentPath(null)
      setDrawing(false)
      setActiveEye(null)
    }
  }

  const clearAll = () => {
    if (readOnly) return
    const cleared = {
      leftEye: [],
      rightEye: [],
      leftEyeLabels: [],
      rightEyeLabels: [],
      metadata: {
        ...paths.metadata,
        updated: new Date().toISOString(),
      },
    }
    setPaths(cleared)
    
    // Save when all is cleared
    if (onSave) {
      setTimeout(() => {
        onSave(cleared)
      }, 0)
    }
    
    // Also clear any current drawing
    setCurrentPath(null)
    setDrawing(false)
    setActiveEye(null)
  }

  const undoLast = () => {
    if (readOnly) return
    setPaths((prev) => {
      const newPaths = { ...prev }
      
      // Remove the most recently added item (check right eye labels, right eye paths, left eye labels, left eye paths)
      if (newPaths.rightEyeLabels.length > 0) {
        newPaths.rightEyeLabels = newPaths.rightEyeLabels.slice(0, -1)
      } else if (newPaths.rightEye.length > 0) {
        newPaths.rightEye = newPaths.rightEye.slice(0, -1)
      } else if (newPaths.leftEyeLabels.length > 0) {
        newPaths.leftEyeLabels = newPaths.leftEyeLabels.slice(0, -1)
      } else if (newPaths.leftEye.length > 0) {
        newPaths.leftEye = newPaths.leftEye.slice(0, -1)
      }
      
      newPaths.metadata = {
        ...newPaths.metadata,
        updated: new Date().toISOString(),
      }
      return newPaths
    })
    // Also clear any current drawing
    setCurrentPath(null)
    setDrawing(false)
    setActiveEye(null)
  }

  const handleEraseLine = (pathIndex: number, eye: 'left' | 'right') => {
    if (readOnly || mode !== 'erase') return
    
    setPaths((prev) => {
      const newPaths = { ...prev }
      if (eye === 'left') {
        newPaths.leftEye = prev.leftEye.filter((_, idx) => idx !== pathIndex)
      } else {
        newPaths.rightEye = prev.rightEye.filter((_, idx) => idx !== pathIndex)
      }
      newPaths.metadata = {
        ...newPaths.metadata,
        updated: new Date().toISOString(),
      }
      
      if (onSave) {
        setTimeout(() => {
          onSave(newPaths)
        }, 0)
      }
      
      return newPaths
    })
  }

  const renderPath = (path: DrawingPath, key: number, eye: 'left' | 'right', pathIndex: number) => {
    if (path.points.length < 2) return null

    const pathData = path.points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')

    const startPoint = path.points[0]
    const endPoint = path.points[path.points.length - 1]
    const showRotationHandle = !readOnly && mode === 'rotate' && path.type === 'template'
    const isEraseMode = !readOnly && mode === 'erase'

    return (
      <g key={key}>
        <path
          d={pathData}
          stroke={path.color}
          strokeWidth={path.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={path.type === 'template' ? 0.8 : 1}
          style={{ 
            cursor: isEraseMode ? 'pointer' : 'default',
            filter: isEraseMode ? 'drop-shadow(0 0 2px rgba(255,0,0,0.5))' : 'none'
          }}
          onClick={isEraseMode ? () => handleEraseLine(pathIndex, eye) : undefined}
        />
        {showRotationHandle && (
          <circle
            cx={endPoint.x}
            cy={endPoint.y}
            r="6"
            fill={path.color}
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => {
              e.stopPropagation()
              const svgEvent = e as unknown as React.MouseEvent<SVGSVGElement>
              startRotatingLine(svgEvent, pathIndex, eye)
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              const svgEvent = e as unknown as React.TouchEvent<SVGSVGElement>
              startRotatingLine(svgEvent, pathIndex, eye)
            }}
          />
        )}
      </g>
    )
  }

  const renderCurrentPath = () => {
    if (!currentPath || currentPath.points.length < 2) return null

    const pathData = currentPath.points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')

    return (
      <path
        d={pathData}
        stroke={currentPath.color}
        strokeWidth={currentPath.strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }

  const renderLabels = (eye: 'left' | 'right') => {
    const labels = eye === 'left' ? paths.leftEyeLabels : paths.rightEyeLabels
    if (!labels || labels.length === 0) return null
    const labelColor = selectedColor || '#C2185B'
    const isEraseMode = !readOnly && mode === 'erase'
    
    return labels.map((label) => {
      const text = `${label.length}mm`
      // Calculate approximate text width for background sizing
      const textWidth = text.length * 7 // Approximate width per character
      const textHeight = 14
      const padding = 4
      
      return (
        <g key={label.id}>
          {/* Background circle/rectangle for better visibility */}
          <rect
            x={label.x - (textWidth / 2) - padding}
            y={label.y - (textHeight / 2) - padding}
            width={textWidth + (padding * 2)}
            height={textHeight + (padding * 2)}
            rx="4"
            ry="4"
            fill={isEraseMode ? "rgba(255, 200, 200, 0.9)" : "rgba(255, 255, 255, 0.95)"}
            stroke={isEraseMode ? "red" : labelColor}
            strokeWidth={isEraseMode ? "2" : "1.5"}
            style={{
              filter: isEraseMode ? 'drop-shadow(0 0 4px rgba(255,0,0,0.8))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
          />
          {/* Text with high contrast */}
          <text
            x={label.x}
            y={label.y}
            fontSize="12"
            fill={isEraseMode ? "red" : labelColor}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            stroke={isEraseMode ? "darkred" : "white"}
            strokeWidth="2"
            paintOrder="stroke fill"
            onMouseDown={(e) => {
              if (isEraseMode) {
                e.stopPropagation()
                removeLabel(label.id, eye)
              } else {
                handleLabelMouseDown(e, label.id, eye)
              }
            }}
            style={{
              cursor: isEraseMode ? 'pointer' : (mode === 'label' && !readOnly ? 'move' : 'default'),
              userSelect: 'none',
              filter: isEraseMode ? 'drop-shadow(0 0 2px rgba(255,0,0,1))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
            }}
          >
            {text}
          </text>
        </g>
      )
    })
  }

  const colors = [
    { name: 'Dark Pink', value: '#C2185B' },
    { name: 'Dark Brown', value: '#3E2A20' },
    { name: 'Dark Purple', value: '#6A1B9A' },
    { name: 'Dark Orange', value: '#E65100' },
    { name: 'Dark Blue', value: '#1565C0' },
  ]

  return (
    <div className="w-full">
      {!readOnly && (
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-brown/10 shadow-sm">
          {/* Mode Selection */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-brown-dark mb-2">Tool Mode</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('template')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'template'
                    ? 'bg-brown-dark text-white'
                    : 'bg-brown-light text-brown-dark hover:bg-brown-light/80'
                }`}
              >
                Template Lines
              </button>
              <button
                type="button"
                onClick={() => setMode('label')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'label'
                    ? 'bg-brown-dark text-white'
                    : 'bg-brown-light text-brown-dark hover:bg-brown-light/80'
                }`}
              >
                Length Labels
              </button>
              <button
                type="button"
                onClick={() => setMode('draw')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'draw'
                    ? 'bg-brown-dark text-white'
                    : 'bg-brown-light text-brown-dark hover:bg-brown-light/80'
                }`}
              >
                Free Draw
              </button>
              <button
                type="button"
                onClick={() => setMode('rotate')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'rotate'
                    ? 'bg-brown-dark text-white'
                    : 'bg-brown-light text-brown-dark hover:bg-brown-light/80'
                }`}
              >
                Rotate Lines
              </button>
              <button
                type="button"
                onClick={() => setMode('erase')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'erase'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                Erase Lines
              </button>
            </div>
          </div>

          {/* Template Selection */}
          {mode === 'template' && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-brown-dark mb-2">
                Select Line Template (click on eye to place)
              </label>
              <div className="flex flex-wrap gap-2">
                {LINE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedTemplate === template.id
                        ? 'bg-brown-dark text-white'
                        : 'bg-white border border-brown/30 text-brown-dark hover:border-brown/60'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Length Labels */}
          {mode === 'label' && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-brown-dark mb-2">
                Add Length Labels (drag to position)
              </label>
              <div className="flex flex-wrap gap-2">
                {LASH_LENGTHS.map((length) => (
                  <button
                    key={length}
                    type="button"
                    onClick={() => {
                      // Add to both eyes by default, user can drag to position
                      addLengthLabel(length, 'left')
                      addLengthLabel(length, 'right')
                    }}
                    className="px-3 py-1.5 bg-white border border-brown/30 text-brown-dark rounded-lg hover:border-brown/60 transition-colors text-xs font-medium"
                  >
                    {length}mm
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-brown-dark mb-1">Color</label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color.value
                        ? 'border-gray-800 scale-110 shadow-md'
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ 
                      backgroundColor: color.value,
                      borderColor: selectedColor === color.value ? '#1F2937' : '#D1D5DB',
                      // Use both backgroundColor and background to ensure it shows
                      background: color.value,
                    } as React.CSSProperties & { background: string }}
                    title={color.name}
                  >
                    <span className="sr-only">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {mode === 'draw' && (
              <div>
                <label className="block text-xs font-medium text-brown-dark mb-1">Stroke Width</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-brown/70 ml-2">{strokeWidth}px</span>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  undoLast()
                }}
                className="px-3 py-1.5 bg-brown-light text-brown-dark rounded-lg hover:bg-brown-light/80 transition-colors text-sm font-medium cursor-pointer"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  clearAll()
                }}
                className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combined Both Eyes in One Landscape Canvas */}
      <div className="flex flex-col items-center w-full">
        {showLabels && (
          <div className="text-sm font-medium text-brown-dark mb-2">Lash Mapping - Both Eyes</div>
        )}
        <div className="relative w-full" style={{ maxWidth: `${CANVAS_WIDTH}px`, aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}>
          <svg
            ref={svgRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="border border-brown/20 rounded-lg cursor-crosshair w-full h-full"
            style={{ 
              touchAction: 'none',
              position: 'relative',
              zIndex: 10,
              background: backgroundImageUrl
                ? `url(${backgroundImageUrl}) center/cover no-repeat`
                : eyepatchImageUrl 
                ? `url(${eyepatchImageUrl}) center/contain no-repeat` 
                : 'white',
              display: 'block'
            }}
            onMouseDown={(e) => {
              if (mode === 'draw') startDrawing(e)
              else if (mode === 'template') handleTemplateClick(e)
            }}
            onMouseMove={(e) => {
              if (mode === 'draw') draw(e)
              else if (mode === 'label') handleLabelMouseMove(e)
              else if (mode === 'rotate') rotateLine(e)
            }}
            onMouseUp={() => {
              if (mode === 'draw') stopDrawing()
              else if (mode === 'label') handleLabelMouseUp()
              else if (mode === 'rotate') stopRotatingLine()
            }}
            onMouseLeave={() => {
              if (mode === 'draw') stopDrawing()
              else if (mode === 'label') handleLabelMouseUp()
              else if (mode === 'rotate') stopRotatingLine()
            }}
            onTouchStart={(e) => {
              if (mode === 'draw') startDrawing(e)
              else if (mode === 'template') handleTemplateClick(e)
            }}
            onTouchMove={(e) => {
              if (mode === 'draw') draw(e)
              else if (mode === 'label') handleLabelMouseMove(e)
            }}
            onTouchEnd={() => {
              if (mode === 'draw') stopDrawing()
              else if (mode === 'label') handleLabelMouseUp()
            }}
          >
            {/* Saved paths - Left Eye */}
            {paths.leftEye.map((path, index) => renderPath(path, index, 'left', index))}
            {/* Saved paths - Right Eye */}
            {paths.rightEye.map((path, index) => renderPath(path, index, 'right', index))}
            {/* Current path being drawn */}
            {renderCurrentPath()}
            {/* Length labels - Left Eye */}
            {renderLabels('left')}
            {/* Length labels - Right Eye */}
            {renderLabels('right')}
          </svg>
          {!readOnly && (
            <div className="absolute top-2 right-2 flex gap-2 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  clearEye('left')
                }}
                className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors cursor-pointer"
              >
                Clear Left
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  clearEye('right')
                }}
                className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors cursor-pointer"
              >
                Clear Right
              </button>
            </div>
          )}
        </div>
      </div>

      {readOnly && paths.leftEye.length === 0 && paths.rightEye.length === 0 && paths.leftEyeLabels.length === 0 && paths.rightEyeLabels.length === 0 && (
        <p className="text-center text-brown/70 mt-4">No mapping data yet.</p>
      )}
    </div>
  )
}
