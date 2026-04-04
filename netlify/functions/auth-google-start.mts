import type { Context } from '@netlify/functions'
import { google } from 'googleapis'
import { getSupabaseAdmin } from './lib/supabase-admin.js'
import { json, error } from './lib/response.js'

export default async function handler(req: Request, context: Context) {
  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const supabase = getSupabaseAdmin()

    // Read Google credentials from settings or env
    const { data: clientIdRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'google_client_id')
      .single()
    const { data: clientSecretRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'google_client_secret')
      .single()

    const clientId = clientIdRow?.value || process.env.GOOGLE_CLIENT_ID
    const clientSecret = clientSecretRow?.value || process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return error('Google Client ID and Secret must be configured first', 400)
    }

    // Determine the callback URL based on the request origin
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || context.site.url || 'http://localhost:8888'
    const redirectUri = `${origin}/api/auth-google-callback`

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      prompt: 'consent',
      state: origin, // pass origin so callback knows where to redirect
    })

    return json({ authUrl })
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Failed to generate auth URL')
  }
}
