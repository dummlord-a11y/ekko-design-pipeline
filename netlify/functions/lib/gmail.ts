import { google } from 'googleapis'
import { getSupabaseAdmin } from './supabase-admin.js'

async function getOAuth2Client() {
  const supabase = getSupabaseAdmin()

  // Try reading credentials from Supabase settings first, fall back to env vars
  const keys = ['google_client_id', 'google_client_secret', 'google_refresh_token']
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', keys)

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.key] = row.value
  }

  const clientId = settings.google_client_id || process.env.GOOGLE_CLIENT_ID
  const clientSecret = settings.google_client_secret || process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = settings.google_refresh_token || process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth not configured. Go to Settings to connect Gmail.')
  }

  const client = new google.auth.OAuth2(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

export async function getGmailClient() {
  const auth = await getOAuth2Client()
  return google.gmail({ version: 'v1', auth })
}

export async function fetchDesignEmails(_afterDate?: string) {
  const gmail = await getGmailClient()

  // Fetch all inbox emails from yesterday+today
  // AI relevance filter handles the rest (skips spam, newsletters, etc.)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const formatted = `${yesterday.getFullYear()}/${yesterday.getMonth() + 1}/${yesterday.getDate()}`

  const query = `in:inbox after:${formatted} -category:promotions -category:social -category:updates -category:forums`

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 15,
  })

  return res.data.messages || []
}

export async function getMessageDetails(messageId: string) {
  const gmail = await getGmailClient()
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  const headers = res.data.payload?.headers || []
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

  const sender = getHeader('From')
  const subject = getHeader('Subject')
  const threadId = res.data.threadId || ''

  // Extract body
  let body = ''
  const payload = res.data.payload

  function extractText(part: typeof payload): string {
    if (!part) return ''
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
    if (part.parts) {
      for (const p of part.parts) {
        const text = extractText(p)
        if (text) return text
      }
    }
    if (part.mimeType === 'text/html' && part.body?.data) {
      const html = Buffer.from(part.body.data, 'base64').toString('utf-8')
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
    return ''
  }

  body = extractText(payload)

  // Extract attachments metadata
  const attachments: Array<{
    filename: string
    mimeType: string
    size: number
    attachmentId: string
  }> = []

  function findAttachments(part: typeof payload) {
    if (!part) return
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      })
    }
    if (part.parts) {
      part.parts.forEach(findAttachments)
    }
  }

  findAttachments(payload)

  // Extract sender name and email
  const senderMatch = sender.match(/^(.+?)\s*<(.+?)>$/)
  const senderName = senderMatch ? senderMatch[1].replace(/"/g, '').trim() : sender
  const senderEmail = senderMatch ? senderMatch[2] : sender

  return {
    messageId,
    threadId,
    sender: senderName,
    senderEmail,
    subject,
    body,
    attachments,
  }
}

export async function getAttachmentData(messageId: string, attachmentId: string) {
  const gmail = await getGmailClient()
  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  })
  return res.data.data || ''
}
