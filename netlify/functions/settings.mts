import type { Context } from '@netlify/functions'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { json, error } from './lib/response.js'

export default async function handler(req: Request, _context: Context) {
  const supabase = getSupabaseAdmin()

  if (req.method === 'GET') {
    // Return all settings (mask sensitive values)
    const { data, error: err } = await supabase
      .from('settings')
      .select('key, value, updated_at')

    if (err) return error(err.message)

    const settings: Record<string, { value: string; updated_at: string }> = {}
    for (const row of data || []) {
      const masked = ['google_refresh_token', 'google_client_secret', 'anthropic_api_key']
      settings[row.key] = {
        value: masked.includes(row.key) ? '••••' + (row.value as string).slice(-6) : row.value,
        updated_at: row.updated_at,
      }
    }

    return json(settings)
  }

  if (req.method === 'PUT') {
    const body = await req.json()
    const { key, value } = body as { key: string; value: string }

    if (!key || !value) return error('Missing key or value', 400)

    // Whitelist of allowed settings keys
    const allowed = [
      'google_client_id',
      'google_client_secret',
      'anthropic_api_key',
    ]

    if (!allowed.includes(key)) {
      return error(`Setting '${key}' cannot be modified`, 400)
    }

    const { error: err } = await supabase.from('settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    })

    if (err) return error(err.message)
    return json({ ok: true })
  }

  return error('Method not allowed', 405)
}
