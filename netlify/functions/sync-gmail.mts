import type { Context } from '@netlify/functions'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { fetchDesignEmails, getMessageDetails } from './lib/gmail.js'
import { analyzeEmail } from './lib/claude-analyzer.js'
import { json, error } from './lib/response.js'

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') {
    return error('Method not allowed', 405)
  }

  try {
    const supabase = getSupabaseAdmin()

    // Get last sync time
    const { data: syncMeta } = await supabase
      .from('sync_metadata')
      .select('last_synced_at')
      .single()

    const afterDate = syncMeta?.last_synced_at || undefined

    // Fetch emails
    const messages = await fetchDesignEmails(afterDate)
    let processed = 0
    const errors: string[] = []

    for (const msg of messages) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('tasks')
          .select('id')
          .eq('gmail_message_id', msg.id)
          .single()

        if (existing) continue

        // Get full message
        const details = await getMessageDetails(msg.id!)

        // Analyze with Claude
        const analysis = await analyzeEmail({
          subject: details.subject,
          body: details.body,
          attachmentNames: details.attachments.map((a) => a.filename),
        })

        // Insert task
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

        if (taskErr) {
          errors.push(`Task insert failed for ${msg.id}: ${taskErr.message}`)
          continue
        }

        // Insert attachments
        if (details.attachments.length > 0 && task) {
          const attachmentRows = details.attachments.map((att) => ({
            task_id: task.id,
            filename: att.filename,
            mime_type: att.mimeType,
            size_bytes: att.size,
            gmail_attachment_id: att.attachmentId,
          }))

          await supabase.from('attachments').insert(attachmentRows)
        }

        processed++
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        errors.push(`Failed processing ${msg.id}: ${errMsg}`)
      }
    }

    // Update sync timestamp
    await supabase
      .from('sync_metadata')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', 1)

    return json({ processed, errors, timestamp: new Date().toISOString() })
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    return error(`Sync failed: ${errMsg}`)
  }
}
