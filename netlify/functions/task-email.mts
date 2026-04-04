import type { Context } from '@netlify/functions'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { getGmailClient, getGmailClientForToken, getAttachmentData } from './lib/gmail.js'
import { json, error } from './lib/response.js'

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'GET') return error('Method not allowed', 405)

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

  // Try to find which Gmail client has this message
  // First try main account, then check designer accounts
  let gmail = await getGmailClient().catch(() => null)

  // If main account doesn't work, check all designers with connected Gmail
  if (!gmail) {
    const { data: designers } = await supabase
      .from('designers')
      .select('gmail_refresh_token')
      .not('gmail_refresh_token', 'is', null)

    for (const d of designers || []) {
      if (d.gmail_refresh_token) {
        gmail = getGmailClientForToken(d.gmail_refresh_token)
        break
      }
    }
  }

  if (!gmail) return error('No Gmail account connected', 400)

  const attachments = []
  if (task.attachments) {
    for (const att of task.attachments) {
      try {
        const data = await getAttachmentData(gmail, task.gmail_message_id, att.gmail_attachment_id)
        attachments.push({ filename: att.filename, mime_type: att.mime_type, data })
      } catch {
        attachments.push({ filename: att.filename, mime_type: att.mime_type, data: null, error: 'Failed to fetch' })
      }
    }
  }

  return json({ body: task.full_body, attachments })
}
