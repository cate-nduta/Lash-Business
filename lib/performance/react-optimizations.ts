/**
 * React Performance Optimizations
 * Utilities to prevent lag and improve rendering performance
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'

/**
 * Debounced callback hook to prevent excessive function calls
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Throttled callback hook to limit function execution rate
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const throttledCallback = useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      const timeSinceLastRun = now - lastRun.current

      if (timeSinceLastRun >= delay) {
        lastRun.current = now
        callback(...args)
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now()
          callback(...args)
        }, delay - timeSinceLastRun)
      }
    }) as T,
    [callback, delay]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return throttledCallback
}

/**
 * Memoized fetch with request deduplication
 */
const pendingRequests = new Map<string, Promise<any>>()

export function useDeduplicatedFetch() {
  return useCallback(async (url: string, options?: RequestInit) => {
    const key = `${url}-${JSON.stringify(options)}`
    
    // If request is already pending, return the same promise
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key)
    }

    // Create new request
    const requestPromise = fetch(url, options)
      .then((response) => {
        pendingRequests.delete(key)
        return response
      })
      .catch((error) => {
        pendingRequests.delete(key)
        throw error
      })

    pendingRequests.set(key, requestPromise)
    return requestPromise
  }, [])
}

/**
 * Hook to prevent unnecessary re-renders
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current(...args)
    }) as T,
    []
  )
}

/**
 * Hook for optimized state updates that batch changes
 */
export function useBatchedState<T>(initialState: T) {
  const [state, setState] = useState(initialState)
  const batchRef = useRef<T | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const batchedSetState = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    batchRef.current = typeof updates === 'function' 
      ? (updates as (prev: T) => T)(state)
      : { ...state, ...updates }

    timeoutRef.current = setTimeout(() => {
      if (batchRef.current !== null) {
        setState(batchRef.current)
        batchRef.current = null
      }
    }, 0)
  }, [state])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [state, batchedSetState] as const
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true)
      }
    }, options)

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [options, hasIntersected])

  return [elementRef, isIntersecting, hasIntersected] as const
}

