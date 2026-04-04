import type { Context } from '@netlify/functions'
import { google } from 'googleapis'
import { getSupabaseAdmin } from './lib/supabase-admin.js'

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')

  if (!code) {
    return new Response('Missing authorization code', { status: 400 })
  }

  // Parse state — can be JSON { origin, designerId } or plain origin string (backwards compat)
  let origin = 'http://localhost:8888'
  let designerId = ''
  try {
    const parsed = JSON.parse(stateRaw || '{}')
    origin = parsed.origin || origin
    designerId = parsed.designerId || ''
  } catch {
    origin = stateRaw || origin
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return new Response('Google credentials not configured', { status: 500 })
    }

    const redirectUri = `${origin}/api/auth-google-callback`
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      return redirectWithMessage(origin, 'error', 'Не вдалося отримати токен. Спробуйте відкликати доступ на myaccount.google.com/permissions та підключитися знову.')
    }

    const supabase = getSupabaseAdmin()

    // Get the Gmail email address
    oauth2Client.setCredentials(tokens)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const gmailEmail = profile.data.emailAddress || ''

    if (designerId) {
      // Store token on the designer record
      await supabase.from('designers').update({
        gmail_refresh_token: tokens.refresh_token,
        gmail_connected_at: new Date().toISOString(),
        email: gmailEmail || undefined,
      }).eq('id', designerId)

      return redirectWithMessage(origin, 'success', `Gmail ${gmailEmail} підключено для дизайнера!`)
    } else {
      // Store as the main/global token (backwards compat)
      await supabase.from('settings').upsert({
        key: 'google_refresh_token',
        value: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      })
      await supabase.from('settings').upsert({
        key: 'google_connected_at',
        value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      if (gmailEmail) {
        await supabase.from('settings').upsert({
          key: 'google_email',
          value: gmailEmail,
          updated_at: new Date().toISOString(),
        })
      }

      return redirectWithMessage(origin, 'success', 'Gmail підключено!')
    }
  } catch (e) {
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
