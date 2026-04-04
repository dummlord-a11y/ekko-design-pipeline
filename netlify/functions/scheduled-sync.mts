import type { Config, Context } from '@netlify/functions'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { fetchDesignEmails, getMessageDetails, getAttachmentData } from './lib/gmail.js'
import { checkRelevanceAndAnalyze } from './lib/claude-analyzer.js'

export const config: Config = {
  schedule: '0 */2 * * *',
}

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGES = 3
const MAX_IMAGE_SIZE = 4 * 1024 * 1024

export default async function handler(_req: Request, _context: Context) {
  console.log('[Scheduled Sync] Starting at', new Date().toISOString())

  try {
    const supabase = getSupabaseAdmin()

    const { data: syncMeta } = await supabase
      .from('sync_metadata')
      .select('last_synced_at')
      .single()

    const afterDate = syncMeta?.last_synced_at || undefined
    const messages = await fetchDesignEmails(afterDate)

    let processed = 0
    let skipped = 0
    const errors: string[] = []

    for (const msg of messages) {
      try {
        const { data: existing } = await supabase
          .from('tasks')
          .select('id')
          .eq('gmail_message_id', msg.id)
          .single()

        if (existing) continue

        const details = await getMessageDetails(msg.id!)

        // Fetch images for visual analysis
        const images: Array<{ data: string; mediaType: string }> = []
        const imageAttachments = details.attachments
          .filter(a => IMAGE_MIME_TYPES.includes(a.mimeType) && a.size < MAX_IMAGE_SIZE)
          .slice(0, MAX_IMAGES)

        for (const att of imageAttachments) {
          try {
            const base64Data = await getAttachmentData(details.messageId, att.attachmentId)
            if (base64Data) {
              const standardBase64 = base64Data.replace(/-/g, '+').replace(/_/g, '/')
              images.push({ data: standardBase64, mediaType: att.mimeType })
            }
          } catch { /* skip */ }
        }

        const analysis = await checkRelevanceAndAnalyze({
          subject: details.subject,
          body: details.body,
          attachmentNames: details.attachments.map((a) => a.filename),
          images,
        })

        if (!analysis) {
          skipped++
          continue
        }

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
          errors.push(`Insert failed: ${taskErr.message}`)
          continue
        }

        if (details.attachments.length > 0 && task) {
          await supabase.from('attachments').insert(
            details.attachments.map((att) => ({
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
        errors.push(`${msg.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    await supabase
      .from('sync_metadata')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', 1)

    console.log(`[Scheduled Sync] Done. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors.length}`)

    return new Response(
      JSON.stringify({ processed, skipped, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[Scheduled Sync] Fatal error:', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
