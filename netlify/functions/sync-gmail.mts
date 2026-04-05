import type { Context } from '@netlify/functions'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { fetchAllDesignEmails, getMessageDetails, getAttachmentData } from './lib/gmail.js'
import { checkRelevanceAndAnalyze } from './lib/claude-analyzer.js'
import { json, error } from './lib/response.js'
import type { gmail_v1 } from 'googleapis'

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGES = 2
const MAX_IMAGE_SIZE = 3 * 1024 * 1024
const CONCURRENCY = 3 // process 3 emails at a time

async function processEmail(
  msgId: string,
  gmail: gmail_v1.Gmail,
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<'processed' | 'skipped' | 'exists' | string> {
  try {
    // Check if exists
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('gmail_message_id', msgId)
      .single()
    if (existing) return 'exists'

    // Get email details
    const details = await getMessageDetails(gmail, msgId)

    // First do relevance check WITHOUT images (fast)
    const analysis = await checkRelevanceAndAnalyze({
      subject: details.subject,
      body: details.body,
      attachmentNames: details.attachments.map(a => a.filename),
    })

    if (!analysis) return 'skipped'

    // Only fetch images for relevant emails (saves time)
    const images: Array<{ data: string; mediaType: string }> = []
    if (details.attachments.length > 0) {
      const imageAtts = details.attachments
        .filter(a => IMAGE_MIME_TYPES.includes(a.mimeType) && a.size < MAX_IMAGE_SIZE)
        .slice(0, MAX_IMAGES)

      // Fetch images in parallel
      const imageResults = await Promise.allSettled(
        imageAtts.map(att => getAttachmentData(gmail, details.messageId, att.attachmentId))
      )

      imageResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
          images.push({
            data: result.value.replace(/-/g, '+').replace(/_/g, '/'),
            mediaType: imageAtts[i].mimeType,
          })
        }
      })
    }

    // If we got images, re-analyze with visual context for better scoring
    let finalAnalysis = analysis
    if (images.length > 0) {
      const visualAnalysis = await checkRelevanceAndAnalyze({
        subject: details.subject,
        body: details.body,
        attachmentNames: details.attachments.map(a => a.filename),
        images,
      })
      if (visualAnalysis) finalAnalysis = visualAnalysis
    }

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
        complexity: finalAnalysis.complexity,
        category: finalAnalysis.category,
        ai_summary: finalAnalysis.summary_uk,
        ai_analysis: finalAnalysis,
        status: 'backlog',
      })
      .select()
      .single()

    if (taskErr) return `Insert: ${taskErr.message}`

    // Insert attachments
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

    return 'processed'
  } catch (e) {
    return `${msgId}: ${e instanceof Error ? e.message : String(e)}`
  }
}

// Process items with concurrency limit
async function processWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const supabase = getSupabaseAdmin()
    const allMessages = await fetchAllDesignEmails()

    const results = await processWithConcurrency(
      allMessages,
      ({ id, gmail }) => processEmail(id, gmail, supabase),
      CONCURRENCY
    )

    const processed = results.filter(r => r === 'processed').length
    const skipped = results.filter(r => r === 'skipped').length
    const errors = results.filter(r => r !== 'processed' && r !== 'skipped' && r !== 'exists')

    await supabase.from('sync_metadata').update({ last_synced_at: new Date().toISOString() }).eq('id', 1)
    return json({ processed, skipped, total: allMessages.length, errors, timestamp: new Date().toISOString() })
  } catch (e) {
    return error(`Sync failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}
