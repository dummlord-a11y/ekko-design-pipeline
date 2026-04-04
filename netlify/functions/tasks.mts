import type { Context } from '@netlify/functions'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { json, error } from './lib/response.js'

export default async function handler(req: Request, _context: Context) {
  const supabase = getSupabaseAdmin()

  if (req.method === 'GET') {
    const { data, error: err } = await supabase
      .from('tasks')
      .select('*, designer:designers(*), attachments(*)')
      .order('complexity', { ascending: false })
      .order('created_at', { ascending: false })

    if (err) return error(err.message)
    return json(data)
  }

  if (req.method === 'PATCH') {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) return error('Missing task id', 400)

    const { data, error: err } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (err) return error(err.message)
    return json(data)
  }

  return error('Method not allowed', 405)
}
