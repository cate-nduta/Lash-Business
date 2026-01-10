import path from 'path'
import { promises as fs } from 'fs'
import { getSupabaseAdminClient } from './supabase-admin'

const dataDir = path.join(process.cwd(), 'data')
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const DOCUMENTS_TABLE = 'app_documents'

// Detect production environment (Vercel, Netlify, etc.)
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.VERCEL === '1' || 
                     process.env.NETLIFY === 'true' ||
                     process.env.RAILWAY_ENVIRONMENT !== undefined ||
                     process.env.FLY_APP_NAME !== undefined

function getDocumentKey(filename: string) {
  return filename.endsWith('.json') ? filename.slice(0, -5) : filename
}

export async function readDataFile<T>(filename: string, fallback: T | Record<string, unknown> = {}): Promise<T> {
  // In production, try Supabase first
  if (isProduction && useSupabase) {
    const supabase = getSupabaseAdminClient()
    if (supabase) {
      try {
        const key = getDocumentKey(filename)
        const { data, error } = await supabase
          .from(DOCUMENTS_TABLE)
          .select('value')
          .eq('key', key)
          .maybeSingle()

        if (error) {
          console.error(`[readDataFile] Supabase read error for ${filename}:`, error)
          return fallback as T
        }

        if (data?.value) {
          return data.value as T
        }
      } catch (error) {
        console.error(`[readDataFile] Error reading from Supabase for ${filename}:`, error)
        return fallback as T
      }
    }
  }

  // Development mode or fallback: try Supabase if configured
  if (useSupabase) {
    const supabase = getSupabaseAdminClient()
    if (supabase) {
      try {
        const key = getDocumentKey(filename)
        const { data, error } = await supabase
          .from(DOCUMENTS_TABLE)
          .select('value')
          .eq('key', key)
          .maybeSingle()

        if (!error && data?.value) {
          return data.value as T
        }
        
        // If Supabase read fails, fall through to file system
        if (error) {
          console.warn(`[readDataFile] Supabase read error, falling back to file system:`, error)
        }
      } catch (error) {
        console.warn(`[readDataFile] Supabase error, falling back to file system:`, error)
      }
    }
  }

  // Fallback to local file system (development only)
  try {
    const filePath = path.join(dataDir, filename)
    const fileContent = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(fileContent) as T
  } catch (error) {
    return fallback as T
  }
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
