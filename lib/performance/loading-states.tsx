/**
 * Loading States and Skeletons
 * Provides optimized loading indicators to prevent layout shift
 */

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} border-4 border-brown/20 border-t-brown-dark rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}

export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-brown/10 rounded ${className}`} aria-hidden="true" />
  )
}

export function PageLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-amber-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-brown/60">Loading...</p>
      </div>
    </div>
  )
}

