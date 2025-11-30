'use client'

import { useEffect } from 'react'

export function StructuredDataScript({ id, data }: { id: string; data: object }) {
  useEffect(() => {
    // Remove existing script if present
    const existing = document.getElementById(id)
    if (existing) {
      existing.remove()
    }

    // Create and inject script
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = id
    script.text = JSON.stringify(data)
    document.head.appendChild(script)

    return () => {
      const scriptToRemove = document.getElementById(id)
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
    }
  }, [id, data])

  return null
}

