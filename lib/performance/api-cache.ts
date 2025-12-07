/**
 * API Request Caching and Deduplication
 * Prevents duplicate requests and caches responses for better performance
 */

interface CacheEntry {
  data: any
  timestamp: number
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const pendingRequests = new Map<string, Promise<any>>()

// Default cache TTL: 30 seconds for most data, 5 seconds for time-sensitive data
const DEFAULT_TTL = 30000 // 30 seconds
const SHORT_TTL = 5000 // 5 seconds

/**
 * Get cached data if available and not expired
 */
function getCachedData(key: string): any | null {
  const entry = cache.get(key)
  if (!entry) return null

  const now = Date.now()
  if (now > entry.expiresAt) {
    cache.delete(key)
    return null
  }

  return entry.data
}

/**
 * Set data in cache
 */
function setCachedData(key: string, data: any, ttl: number = DEFAULT_TTL): void {
  const now = Date.now()
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  })
}

/**
 * Deduplicated fetch with caching
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl: number = DEFAULT_TTL
): Promise<Response> {
  const cacheKey = `${url}-${JSON.stringify(options)}`

  // Check cache first
  const cached = getCachedData(cacheKey)
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check if request is already pending
  if (pendingRequests.has(cacheKey)) {
    const response = await pendingRequests.get(cacheKey)!
    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Make new request
  const requestPromise = fetch(url, {
    ...options,
    cache: options?.cache || 'default',
  })
    .then(async (response) => {
      if (response.ok) {
        const data = await response.json()
        setCachedData(cacheKey, data, ttl)
      }
      pendingRequests.delete(cacheKey)
      return response
    })
    .catch((error) => {
      pendingRequests.delete(cacheKey)
      throw error
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

/**
 * Clear cache for a specific URL pattern
 */
export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }

  const keysToDelete: string[] = []
  cache.forEach((_, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key)
    }
  })
  
  keysToDelete.forEach(key => cache.delete(key))
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now()
  const keysToDelete: string[] = []
  
  cache.forEach((entry, key) => {
    if (now > entry.expiresAt) {
      keysToDelete.push(key)
    }
  })
  
  keysToDelete.forEach(key => cache.delete(key))
}

// Clean up expired cache every minute
if (typeof window !== 'undefined') {
  setInterval(clearExpiredCache, 60000)
}

