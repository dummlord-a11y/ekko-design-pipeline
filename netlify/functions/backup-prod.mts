import type { Config, Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Run daily at 3:00 AM
export const config: Config = {
  schedule: '0 3 * * *',
}

export default async function handler(_req: Request, _context: Context) {
  console.log('[Backup] Starting production backup at', new Date().toISOString())

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[Backup] Missing Supabase credentials')
    return new Response('Missing credentials', { status: 500 })
  }

  // Only run backups on production (public schema)
  const schema = process.env.DB_SCHEMA || 'public'
  if (schema !== 'public') {
    console.log('[Backup] Skipping — not production environment')
    return new Response(JSON.stringify({ skipped: true, reason: 'not production' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(url, key)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  try {
    // Export all tables as JSON
    const tables = ['designers', 'tasks', 'attachments', 'settings', 'sync_metadata']
    const backup: Record<string, unknown[]> = {}

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        console.error(`[Backup] Error reading ${table}:`, error.message)
        backup[table] = []
      } else {
        backup[table] = data || []
      }
    }

    const backupJson = JSON.stringify(backup, null, 2)
    const filename = `backup-${timestamp}.json`

    // Try storing in Supabase Storage (bucket: backups)
    // First ensure bucket exists
    await supabase.storage.createBucket('backups', {
      public: false,
      fileSizeLimit: 52428800, // 50MB
    }).catch(() => {
      // Bucket already exists — that's fine
    })

    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, backupJson, {
        contentType: 'application/json',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Backup] Upload failed:', uploadError.message)
      // Fallback: store as a settings row
      await supabase.from('settings').upsert({
        key: 'last_backup',
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          tables: Object.fromEntries(
            Object.entries(backup).map(([k, v]) => [k, (v as unknown[]).length])
          ),
        }),
        updated_at: new Date().toISOString(),
      })
      return new Response(JSON.stringify({
        status: 'partial',
        error: uploadError.message,
        timestamp: new Date().toISOString(),
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Clean up old backups (keep last 7)
    const { data: files } = await supabase.storage.from('backups').list('', {
      sortBy: { column: 'created_at', order: 'asc' },
    })

    if (files && files.length > 7) {
      const toDelete = files.slice(0, files.length - 7).map(f => f.name)
      await supabase.storage.from('backups').remove(toDelete)
      console.log(`[Backup] Cleaned up ${toDelete.length} old backups`)
    }

    // Record successful backup
    await supabase.from('settings').upsert({
      key: 'last_backup',
      value: JSON.stringify({
        timestamp: new Date().toISOString(),
        filename,
        tables: Object.fromEntries(
          Object.entries(backup).map(([k, v]) => [k, (v as unknown[]).length])
        ),
      }),
      updated_at: new Date().toISOString(),
    })

    const stats = Object.fromEntries(
      Object.entries(backup).map(([k, v]) => [k, (v as unknown[]).length])
    )
    console.log(`[Backup] Done. File: ${filename}`, stats)

    return new Response(JSON.stringify({
      status: 'success', filename, stats, timestamp: new Date().toISOString(),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[Backup] Fatal error:', e)
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
