'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LashMapEditor, { type LashMapDrawingData } from '@/components/LashMapEditor'

interface LashMap {
  appointmentId: string
  date: string
  mapData: string
  imageUrl?: string
  notes?: string
}

interface ClientMapsData {
  lashMaps: LashMap[]
}

export default function ClientLashMapsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ClientMapsData | null>(null)
  const [error, setError] = useState('')
  const [eyepatchImageUrl, setEyepatchImageUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    // Fetch eyepatch image URL from settings - cache for 5 minutes
    if (typeof window !== 'undefined') {
      const cachedUrl = sessionStorage.getItem('eyepatchImageUrl')
      const cachedTime = sessionStorage.getItem('eyepatchImageUrlTime')
      const now = Date.now()
      
      if (cachedUrl && cachedTime && (now - parseInt(cachedTime)) < 300000) {
        // Use cached value if less than 5 minutes old
        setEyepatchImageUrl(cachedUrl)
        return
      }
    }
    
    fetch('/api/settings', { cache: 'default' })
      .then((res) => res.json())
      .then((data) => {
        if (data.business?.eyepatchImageUrl) {
          setEyepatchImageUrl(data.business.eyepatchImageUrl)
          // Cache for 5 minutes
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('eyepatchImageUrl', data.business.eyepatchImageUrl)
            sessionStorage.setItem('eyepatchImageUrlTime', Date.now().toString())
          }
        }
      })
      .catch(() => {}) // Silently fail
  }, [])

  useEffect(() => {
    loadMaps()
  }, [])

  const loadMaps = async () => {
    try {
      const mapsResponse = await fetch('/api/client/maps')
      if (mapsResponse.status === 401) {
        router.push('/account/login')
        return
      }
      if (!mapsResponse.ok) {
        throw new Error('Failed to load lash maps')
      }
      const mapsData = await mapsResponse.json()
      setData(mapsData)
    } catch (err: any) {
      setError(err.message || 'Failed to load lash maps')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-dark mx-auto mb-4"></div>
          <p className="text-brown/70">Loading your lash maps...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load lash maps'}</p>
          <Link
            href="/account/dashboard"
            className="text-brown-dark hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-brown/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display text-brown-dark">Your Lash Maps</h1>
              <p className="text-sm text-brown/70">View your personalized lash mapping designs</p>
            </div>
            <Link
              href="/account/dashboard"
              className="px-4 py-2 bg-brown-dark !text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {data.lashMaps.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 border border-brown/10 shadow-sm text-center">
            <div className="text-4xl mb-4">👁️</div>
            <h2 className="text-xl font-display text-brown-dark mb-2">No Lash Maps Yet</h2>
            <p className="text-brown/70 mb-6">
              Your lash maps will appear here after your appointments. These maps show the custom
              lash design created specifically for your eye shape and preferences.
            </p>
            <Link
              href="/booking"
              className="inline-block px-6 py-3 bg-brown-dark !text-white rounded-lg hover:bg-brown transition-colors font-medium"
            >
              Book Your First Appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {useMemo(() => {
              if (!data?.lashMaps || !Array.isArray(data.lashMaps)) {
                return []
              }
              return data.lashMaps
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((map) => {
                  let parsedData: LashMapDrawingData | null = null
                  try {
                    parsedData = JSON.parse(map.mapData || '{}')
                  } catch {
                    // Invalid JSON, ignore
                  }
                  return { map, parsedData }
                })
            }, [data.lashMaps]).map(({ map, parsedData }, index) => (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm"
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-display text-brown-dark">
                      {formatDate(map.date)}
                    </h2>
                    {map.appointmentId && (
                      <span className="text-sm text-brown/70">
                        Appointment: {map.appointmentId}
                      </span>
                    )}
                  </div>
                  {map.notes && (
                    <p className="text-brown/80 mt-2">{map.notes}</p>
                  )}
                </div>

                    {parsedData && (parsedData.leftEye?.length > 0 || parsedData.rightEye?.length > 0 || parsedData.leftEyeLabels?.length > 0 || parsedData.rightEyeLabels?.length > 0) ? (
                      <div className="bg-white rounded-lg p-4 border border-brown/10">
                        <LashMapEditor
                          initialData={parsedData}
                          readOnly={true}
                          showLabels={true}
                          eyepatchImageUrl={eyepatchImageUrl}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-brown/70">
                        <p>No drawing data available for this map.</p>
                        {map.mapData && (
                          <p className="text-xs mt-2 italic">
                            Raw data: {map.mapData.substring(0, 100)}...
                          </p>
                        )}
                        {parsedData && (
                          <p className="text-xs mt-2 text-brown/50">
                            Parsed but empty: {JSON.stringify(parsedData).substring(0, 200)}...
                          </p>
                        )}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this lash map? This action cannot be undone.')) {
                            try {
                              const response = await fetch('/api/client/maps', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ appointmentId: map.appointmentId }),
                              })
                              if (response.ok) {
                                loadMaps()
                              } else {
                                const errorData = await response.json().catch(() => ({ error: 'Failed to delete' }))
                                alert(errorData.error || 'Failed to delete lash map')
                              }
                            } catch (err) {
                              alert('Failed to delete lash map')
                            }
                          }
                        }}
                        className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        Delete Map
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        )}
      </div>
    </div>
  )
}

