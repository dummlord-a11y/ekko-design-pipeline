import type { Context } from '@netlify/functions'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { getAttachmentData } from './lib/gmail.js'
import { json, error } from './lib/response.js'

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'GET') {
    return error('Method not allowed', 405)
  }

  const url = new URL(req.url)
  const taskId = url.searchParams.get('id')

  if (!taskId) return error('Missing task id', 400)

  const supabase = getSupabaseAdmin()

  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .select('*, attachments(*)')
    .eq('id', taskId)
    .single()

  if (taskErr || !task) return error('Task not found', 404)

  // Fetch attachment data on demand
  const attachments = []
  if (task.attachments) {
    for (const att of task.attachments) {
      try {
        const data = await getAttachmentData(
          task.gmail_message_id,
          att.gmail_attachment_id
        )
        attachments.push({
          filename: att.filename,
          mime_type: att.mime_type,
          data,
        })
      } catch {
        attachments.push({
          filename: att.filename,
          mime_type: att.mime_type,
          data: null,
          error: 'Failed to fetch attachment',
        })
      }
    }
  }

  return json({
    body: task.full_body,
    attachments,
  })
}
