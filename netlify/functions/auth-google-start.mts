import type { Context } from '@netlify/functions'
import { google } from 'googleapis'
import { json, error } from './lib/response.js'

export default async function handler(req: Request, context: Context) {
  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return error('Google OAuth not configured. Contact administrator.', 400)
    }

    // Optional designerId — if provided, we're connecting a designer's inbox
    const body = await req.json().catch(() => ({}))
    const designerId = (body as { designerId?: string }).designerId || ''

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || context.site.url || 'http://localhost:8888'
    const redirectUri = `${origin}/api/auth-google-callback`

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    // Encode origin + designerId in state
    const state = JSON.stringify({ origin, designerId })

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      prompt: 'consent',
      state,
    })

    return json({ authUrl })
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Failed to generate auth URL')
  }
}
