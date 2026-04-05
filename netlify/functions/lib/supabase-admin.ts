import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient(url, key)
}
