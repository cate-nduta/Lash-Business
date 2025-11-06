import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  const router = useRouter()
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges)

  // Update ref when hasUnsavedChanges changes
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges
  }, [hasUnsavedChanges])

  useEffect(() => {
    // Handle browser back/forward/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault()
        e.returnValue = '' // Required for Chrome
        return '' // Required for Safari
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Intercept Next.js router navigation
  const handleRouteChange = (url: string) => {
    if (hasUnsavedChangesRef.current) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
      )
      if (!confirmed) {
        throw new Error('Route change cancelled by user')
      }
    }
  }

  return { handleRouteChange }
}

