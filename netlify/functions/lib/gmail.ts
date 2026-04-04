import { google, type gmail_v1 } from 'googleapis'
import { getSupabaseAdmin } from './supabase-admin.js'

function createOAuth2Client(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth env vars not configured.')
  }

  const client = new google.auth.OAuth2(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

/** Get Gmail client for the main (global) account */
export async function getGmailClient(): Promise<gmail_v1.Gmail> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'google_refresh_token')
    .single()

  const refreshToken = data?.value || process.env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) {
    throw new Error('Google OAuth not configured. Go to Settings to connect Gmail.')
  }

  const auth = createOAuth2Client(refreshToken)
  return google.gmail({ version: 'v1', auth })
}

/** Get Gmail client for a specific refresh token */
export function getGmailClientForToken(refreshToken: string): gmail_v1.Gmail {
  const auth = createOAuth2Client(refreshToken)
  return google.gmail({ version: 'v1', auth })
}

/** Get all connected Gmail accounts (global + designers) */
export async function getAllGmailClients(): Promise<Array<{ label: string; gmail: gmail_v1.Gmail }>> {
  const supabase = getSupabaseAdmin()
  const clients: Array<{ label: string; gmail: gmail_v1.Gmail }> = []

  // Global account
  const { data: globalToken } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'google_refresh_token')
    .single()

  if (globalToken?.value) {
    try {
      clients.push({
        label: 'main',
        gmail: getGmailClientForToken(globalToken.value),
      })
    } catch { /* skip */ }
  }

  // Designer accounts
  const { data: designers } = await supabase
    .from('designers')
    .select('id, name, gmail_refresh_token')
    .not('gmail_refresh_token', 'is', null)

  for (const d of designers || []) {
    if (d.gmail_refresh_token) {
      try {
        clients.push({
          label: d.name,
          gmail: getGmailClientForToken(d.gmail_refresh_token),
        })
      } catch { /* skip */ }
    }
  }

  return clients
}

function getDateQuery(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  return `${yesterday.getFullYear()}/${yesterday.getMonth() + 1}/${yesterday.getDate()}`
}

/** Fetch emails from a single Gmail client */
export async function fetchEmailsFromClient(gmail: gmail_v1.Gmail) {
  const formatted = getDateQuery()
  const query = `after:${formatted}`

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 15,
  })

  return res.data.messages || []
}

/** Fetch emails from ALL connected accounts */
export async function fetchAllDesignEmails(): Promise<Array<{ id: string; gmail: gmail_v1.Gmail }>> {
  const clients = await getAllGmailClients()
  const allMessages: Array<{ id: string; gmail: gmail_v1.Gmail }> = []

  for (const client of clients) {
    try {
      const messages = await fetchEmailsFromClient(client.gmail)
      for (const msg of messages) {
        if (msg.id) {
          allMessages.push({ id: msg.id, gmail: client.gmail })
        }
      }
    } catch (e) {
      console.error(`[Gmail] Failed to fetch from ${client.label}:`, e)
    }
  }

  return allMessages
}

export async function getMessageDetails(gmail: gmail_v1.Gmail, messageId: string) {
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

  const senderMatch = sender.match(/^(.+?)\s*<(.+?)>$/)
  const senderName = senderMatch ? senderMatch[1].replace(/"/g, '').trim() : sender
  const senderEmail = senderMatch ? senderMatch[2] : sender

  return { messageId, threadId, sender: senderName, senderEmail, subject, body, attachments }
}

export async function getAttachmentData(gmail: gmail_v1.Gmail, messageId: string, attachmentId: string) {
  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  })
  return res.data.data || ''
}
