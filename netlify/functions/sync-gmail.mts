import type { Context } from '@netlify/functions'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { fetchAllDesignEmails, getMessageDetails, getAttachmentData } from './lib/gmail.js'
import { checkRelevanceAndAnalyze } from './lib/claude-analyzer.js'
import { json, error } from './lib/response.js'

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGES = 3
const MAX_IMAGE_SIZE = 4 * 1024 * 1024

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const supabase = getSupabaseAdmin()

    // Fetch from ALL connected Gmail accounts
    const allMessages = await fetchAllDesignEmails()
    let processed = 0
    let skipped = 0
    const errors: string[] = []

    for (const { id: msgId, gmail } of allMessages) {
      try {
        const { data: existing } = await supabase
          .from('tasks')
          .select('id')
          .eq('gmail_message_id', msgId)
          .single()

        if (existing) continue

        const details = await getMessageDetails(gmail, msgId)

        const images: Array<{ data: string; mediaType: string }> = []
        const imageAttachments = details.attachments
          .filter(a => IMAGE_MIME_TYPES.includes(a.mimeType) && a.size < MAX_IMAGE_SIZE)
          .slice(0, MAX_IMAGES)

        for (const att of imageAttachments) {
          try {
            const base64Data = await getAttachmentData(gmail, details.messageId, att.attachmentId)
            if (base64Data) {
              images.push({ data: base64Data.replace(/-/g, '+').replace(/_/g, '/'), mediaType: att.mimeType })
            }
          } catch { /* skip */ }
        }

        const analysis = await checkRelevanceAndAnalyze({
          subject: details.subject,
          body: details.body,
          attachmentNames: details.attachments.map(a => a.filename),
          images,
        })

        if (!analysis) { skipped++; continue }

        const { data: task, error: taskErr } = await supabase
          .from('tasks')
          .insert({
            gmail_message_id: details.messageId,
            gmail_thread_id: details.threadId,
            sender: details.sender,
            sender_email: details.senderEmail,
            subject: details.subject,
            body_preview: details.body.slice(0, 300),
            full_body: details.body,
            complexity: analysis.complexity,
            category: analysis.category,
            ai_summary: analysis.summary_uk,
            ai_analysis: analysis,
            status: 'backlog',
          })
          .select()
          .single()

        if (taskErr) { errors.push(`Insert: ${taskErr.message}`); continue }

        if (details.attachments.length > 0 && task) {
          await supabase.from('attachments').insert(
            details.attachments.map(att => ({
              task_id: task.id,
              filename: att.filename,
              mime_type: att.mimeType,
              size_bytes: att.size,
              gmail_attachment_id: att.attachmentId,
            }))
          )
        }

        processed++
      } catch (e) {
        errors.push(`${msgId}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    await supabase.from('sync_metadata').update({ last_synced_at: new Date().toISOString() }).eq('id', 1)
    return json({ processed, skipped, accounts: allMessages.length, errors, timestamp: new Date().toISOString() })
  } catch (e) {
    return error(`Sync failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}
