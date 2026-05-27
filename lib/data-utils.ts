import path from 'path'
import { promises as fs } from 'fs'
import { getSupabaseAdminClient } from './supabase-admin'

const dataDir = path.join(process.cwd(), 'data')
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const DOCUMENTS_TABLE = 'app_documents'
const SUPABASE_READ_TIMEOUT_MS = 3000
/** After a failed Supabase read in dev, skip remote reads for this long. */
const SUPABASE_DEV_COOLDOWN_MS = 5 * 60 * 1000

let supabaseReadCooldownUntil = 0

// Detect production environment (Vercel, Netlify, etc.)
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.VERCEL === '1' || 
                     process.env.NETLIFY === 'true' ||
                     process.env.RAILWAY_ENVIRONMENT !== undefined ||
                     process.env.FLY_APP_NAME !== undefined

function getDocumentKey(filename: string) {
  return filename.endsWith('.json') ? filename.slice(0, -5) : filename
}

async function readLocalDataFile<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(dataDir, filename)
    const fileContent = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(fileContent) as T
  } catch {
    return null
  }
}

async function readFromSupabase<T>(filename: string): Promise<T | null> {
  if (!useSupabase) return null
  if (!isProduction && Date.now() < supabaseReadCooldownUntil) return null

  const supabase = getSupabaseAdminClient()
  if (!supabase) return null

  const key = getDocumentKey(filename)

  try {
    const query = supabase.from(DOCUMENTS_TABLE).select('value').eq('key', key).maybeSingle()
    const { data, error } = await Promise.race([
      query,
      new Promise<{ data: null; error: { message: string } }>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase read timeout')), SUPABASE_READ_TIMEOUT_MS)
      ),
    ])

    if (error) {
      if (!isProduction) {
        supabaseReadCooldownUntil = Date.now() + SUPABASE_DEV_COOLDOWN_MS
        console.warn(`[readDataFile] Supabase read error, falling back to file system:`, error)
      } else {
        console.error(`[readDataFile] Supabase read error for ${filename}:`, error)
      }
      return null
    }

    if (data?.value) {
      return data.value as T
    }
  } catch (error) {
    if (!isProduction) {
      supabaseReadCooldownUntil = Date.now() + SUPABASE_DEV_COOLDOWN_MS
      console.warn(`[readDataFile] Supabase error, falling back to file system:`, error)
    } else {
      console.error(`[readDataFile] Error reading from Supabase for ${filename}:`, error)
    }
  }

  return null
}

export async function readDataFile<T>(filename: string, fallback: T | Record<string, unknown> = {}): Promise<T> {
  // Remote data is the source of truth. This prevents blank local JSON files
  // from masking real admin-saved content while developing locally.
  const remote = await readFromSupabase<T>(filename)
  if (remote !== null) return remote

  if (!isProduction) {
    const localFallback = await readLocalDataFile<T>(filename)
    if (localFallback !== null) return localFallback
  }

  return fallback as T
}

export async function readDataFilePreferRemote<T>(filename: string, fallback: T | Record<string, unknown> = {}): Promise<T> {
  const remote = await readFromSupabase<T>(filename)
  if (remote !== null) return remote

  const local = await readLocalDataFile<T>(filename)
  if (local !== null) return local

  return fallback as T
}

export async function writeDataFile<T>(filename: string, data: T): Promise<void> {
  // In production, always require Supabase (file system is read-only)
  if (isProduction) {
    if (!useSupabase) {
      throw new Error(
        `Cannot save ${filename} in production without Supabase configuration. ` +
        `Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables. ` +
        `Production deployments (Vercel, Netlify, etc.) have read-only file systems.`
      )
    }

    const supabase = getSupabaseAdminClient()
    if (!supabase) {
      throw new Error(
        `Supabase client unavailable. Cannot save ${filename} in production. ` +
        `Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correctly configured.`
      )
    }

    try {
      const key = getDocumentKey(filename)
      const { error } = await supabase
        .from(DOCUMENTS_TABLE)
        .upsert(
          { 
            key, 
            value: data, 
            updated_at: new Date().toISOString() 
          },
          { 
            onConflict: 'key' 
          }
        )

      if (error) {
        console.error(`[writeDataFile] Supabase write error for ${filename}:`, error)
        throw new Error(
          `Failed to save ${filename} to Supabase: ${error.message}. ` +
          `Please check your Supabase configuration and database connection.`
        )
      }

      console.log(`[writeDataFile] ✓ Successfully saved ${filename} to Supabase (production)`)
      return
    } catch (error) {
      console.error(`[writeDataFile] Production save failed for ${filename}:`, error)
      throw error instanceof Error ? error : new Error(`Failed to save ${filename} in production: Unknown error`)
    }
  }

  // Development mode: try Supabase first if available, fall back to file system
  if (useSupabase) {
    try {
      const supabase = getSupabaseAdminClient()
      if (supabase) {
        const key = getDocumentKey(filename)
        const { error } = await supabase
          .from(DOCUMENTS_TABLE)
          .upsert(
            { 
              key, 
              value: data, 
              updated_at: new Date().toISOString() 
            },
            { 
              onConflict: 'key' 
            }
          )

        if (!error) {
          console.log(`[writeDataFile] ✓ Successfully saved ${filename} to Supabase (development)`)
          return
        }
        
        console.warn(`[writeDataFile] Supabase write error, falling back to file system:`, error)
      }
    } catch (error) {
      console.warn(`[writeDataFile] Supabase error, falling back to file system:`, error)
    }
  }

  // Fallback to local file system (development only)
  try {
    const filePath = path.join(dataDir, filename)
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`[writeDataFile] ✓ Successfully saved ${filename} to local file system`)
  } catch (error) {
    console.error(`[writeDataFile] Failed to save ${filename} to local file system:`, error)
    throw new Error(
      `Failed to save ${filename} to local file system: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
