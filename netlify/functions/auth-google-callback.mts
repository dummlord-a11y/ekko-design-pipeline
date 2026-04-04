import type { Context } from '@netlify/functions'
import { google } from 'googleapis'
import { getSupabaseAdmin } from './lib/supabase-admin.js'

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // origin URL

  if (!code) {
    return new Response('Missing authorization code', { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()

    // Read Google credentials
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
      return new Response('Google credentials not configured', { status: 500 })
    }

    const origin = state || 'http://localhost:8888'
    const redirectUri = `${origin}/api/auth-google-callback`

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      return redirectWithMessage(origin, 'error', 'No refresh token received. Try revoking access at myaccount.google.com/permissions and reconnecting.')
    }

    // Store refresh token in Supabase settings
    await supabase.from('settings').upsert({
      key: 'google_refresh_token',
      value: tokens.refresh_token,
      updated_at: new Date().toISOString(),
    })

    // Also store access token info for status display
    await supabase.from('settings').upsert({
      key: 'google_connected_at',
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Get the Gmail profile email
    oauth2Client.setCredentials(tokens)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })

    if (profile.data.emailAddress) {
      await supabase.from('settings').upsert({
        key: 'google_email',
        value: profile.data.emailAddress,
        updated_at: new Date().toISOString(),
      })
    }

    return redirectWithMessage(origin, 'success', 'Gmail connected successfully!')
  } catch (e) {
    const origin = state || 'http://localhost:8888'
    const msg = e instanceof Error ? e.message : 'Token exchange failed'
    return redirectWithMessage(origin, 'error', msg)
  }
}

function redirectWithMessage(origin: string, status: string, message: string) {
  const params = new URLSearchParams({ status, message })
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/settings?${params}` },
  })
}
