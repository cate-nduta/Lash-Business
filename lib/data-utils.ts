import path from 'path'
import { promises as fs } from 'fs'
import { getSupabaseAdminClient } from './supabase-admin'

const dataDir = path.join(process.cwd(), 'data')
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const DOCUMENTS_TABLE = 'app_documents'

function getDocumentKey(filename: string) {
  return filename.endsWith('.json') ? filename.slice(0, -5) : filename
}

export async function readDataFile<T>(filename: string, fallback: T | Record<string, unknown> = {}): Promise<T> {
  if (useSupabase) {
    const supabase = getSupabaseAdminClient()
    const key = getDocumentKey(filename)

    const { data, error } = await supabase
      .from(DOCUMENTS_TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle()

    if (error) {
      console.error(`Supabase read error for ${filename}:`, error)
      return fallback as T
    }

    if (!data?.value) {
      return fallback as T
    }

    return data.value as T
  }

  try {
    const filePath = path.join(dataDir, filename)
    const fileContent = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(fileContent) as T
  } catch (error) {
    return fallback as T
  }
}

export async function writeDataFile<T>(filename: string, data: T): Promise<void> {
  if (useSupabase) {
    const supabase = getSupabaseAdminClient()
    const key = getDocumentKey(filename)

    const { error } = await supabase
      .from(DOCUMENTS_TABLE)
      .upsert({ key, value: data, updated_at: new Date().toISOString() })

    if (error) {
      console.error(`Supabase write error for ${filename}:`, error)
      throw error
    }

    return
  }

  const filePath = path.join(dataDir, filename)
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
