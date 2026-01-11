'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Utility function to create URL-friendly slugs from scenario names
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

interface GuideScenario {
  id: string
  name: string
  description: string
  mustHaveServiceIds: string[]
  recommendedServiceIds: string[]
}

interface GuideData {
  scenarios: GuideScenario[]
  services: any[]
}

export default function LabsGuidePage() {
  const [guideData, setGuideData] = useState<GuideData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadGuide = async () => {
      try {
        const response = await fetch('/api/labs/guide', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setGuideData(data)
        }
      } catch (error) {
        console.error('Error loading guide:', error)
      } finally {
        setLoading(false)
      }
    }
    loadGuide()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <p className="text-brown-dark/70">Loading guide...</p>
      </div>
    )
  }

  if (!guideData || guideData.scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/labs/custom-website-builds"
            className="inline-flex items-center mb-6 text-brown-dark/70 hover:text-brown-dark transition-colors"
          >
            ← Back to Custom Website Builds
          </Link>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-display text-brown-dark mb-4">Service Selection Guide</h1>
            <p className="text-brown-dark/70">
              No guide scenarios available yet. Please check back later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/labs/custom-website-builds"
          className="inline-flex items-center mb-6 text-brown-dark/70 hover:text-brown-dark transition-colors back-to-services-link"
          style={{ 
            backgroundColor: 'transparent', 
            padding: 0,
            border: 'none',
            boxShadow: 'none',
          }}
        >
          ← Back to Custom Website Builds
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-display text-brown-dark mb-4">Service Selection Guide</h1>
          <p className="text-brown-dark/70 text-lg">
            Not sure which services you need? Choose a scenario that matches your situation, and we'll recommend the perfect services for you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {guideData.scenarios.map((scenario) => {
            const scenarioSlug = createSlug(scenario.name)
            const mustHaveCount = scenario.mustHaveServiceIds.length
            const recommendedCount = scenario.recommendedServiceIds.length

            return (
              <Link
                key={scenario.id}
                href={`/labs/custom-website-builds/guide/${scenarioSlug}`}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <h2 className="text-xl font-display text-brown-dark mb-2">{scenario.name}</h2>
                  {scenario.description && (
                    <p className="text-brown-dark/70 text-sm mb-4 line-clamp-2">
                      {scenario.description.replace(/<[^>]*>/g, '').substring(0, 150)}
                      {scenario.description.replace(/<[^>]*>/g, '').length > 150 ? '...' : ''}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-brown-dark/60 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                        Must-Haves
                      </span>
                      <span>{mustHaveCount}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                        Recommended
                      </span>
                      <span>{recommendedCount}</span>
                    </span>
                  </div>

                  <div className="pt-4 border-t border-brown-light">
                    <div className="px-4 py-2 bg-brown-dark rounded-lg text-center font-medium hover:bg-brown transition-colors text-white" style={{ color: '#ffffff' }}>
                      <span className="text-white" style={{ color: '#ffffff' }}>View Details →</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
