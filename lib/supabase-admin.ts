import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    // Return null instead of throwing - let the caller handle it
    console.warn('[Supabase] Supabase credentials are not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.')
    return null
  }

  try {
    client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    })

    return client
  } catch (error) {
    console.error('[Supabase] Failed to initialize Supabase client:', error)
    return null
  }
}

