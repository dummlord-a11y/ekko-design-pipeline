/**
 * One-time script to get a Gmail OAuth2 refresh token.
 *
 * Prerequisites:
 * 1. Go to Google Cloud Console > APIs & Services > Credentials
 * 2. Create OAuth 2.0 Client ID (Desktop App)
 * 3. Enable Gmail API in the project
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy npx tsx scripts/get-gmail-token.ts
 *
 * It will open a browser for consent. After authorization,
 * it prints the refresh token to store as GOOGLE_REFRESH_TOKEN env var.
 */

import { google } from 'googleapis'
import http from 'http'
import { URL } from 'url'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3333/callback'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  prompt: 'consent',
})

console.log('\nOpen this URL in your browser:\n')
console.log(authUrl)
console.log('\nWaiting for callback on http://localhost:3333/callback...\n')

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/callback')) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const url = new URL(req.url, 'http://localhost:3333')
  const code = url.searchParams.get('code')

  if (!code) {
    res.writeHead(400)
    res.end('No code in callback')
    return
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)

    console.log('\n=== SUCCESS ===')
    console.log('Refresh Token:', tokens.refresh_token)
    console.log('\nAdd this to your Netlify environment variables as GOOGLE_REFRESH_TOKEN')
    console.log('================\n')

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h1>Success! You can close this tab.</h1><p>Check your terminal for the refresh token.</p>')
  } catch (err) {
    console.error('Token exchange failed:', err)
    res.writeHead(500)
    res.end('Token exchange failed')
  }

  server.close()
})

server.listen(3333)
