import type { Context } from '@netlify/functions'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { json, error } from './lib/response.js'

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'GET') {
    return error('Method not allowed', 405)
  }

  const supabase = getSupabaseAdmin()
  const { data, error: err } = await supabase
    .from('designers')
    .select('*')
    .order('name')

  if (err) return error(err.message)
  return json(data)
}
