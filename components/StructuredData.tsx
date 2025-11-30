'use client'

import { useEffect } from 'react'
import { readDataFile } from '@/lib/data-utils'

interface StructuredDataProps {
  type: 'Organization' | 'LocalBusiness' | 'Service'
  data?: any
}

export default function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    if (!data) return

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(data)
    script.id = `structured-data-${type.toLowerCase()}`
    
    // Remove existing script if present
    const existing = document.getElementById(script.id)
    if (existing) {
      existing.remove()
    }
    
    document.head.appendChild(script)

    return () => {
      const scriptToRemove = document.getElementById(script.id)
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
    }
  }, [type, data])

  return null
}

