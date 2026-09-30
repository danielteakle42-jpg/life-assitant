import { decryptSecret, encryptSecret } from './token-crypto'

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive.readonly',
]

export async function getGoogleAccessToken(db: any, userId: string) {
  const { data, error } = await db.from('assistant_integrations').select('*').eq('user_id', userId).eq('provider', 'google').maybeSingle()
  if (error || !data) throw new Error('GOOGLE_NOT_CONNECTED')

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0
  let accessToken = await decryptSecret(data.encrypted_access_token)
  const refreshToken = await decryptSecret(data.encrypted_refresh_token)
  if (!accessToken) throw new Error('GOOGLE_NOT_CONNECTED')

  if (expiresAt && expiresAt < Date.now() + 60_000) {
    if (!refreshToken) throw new Error('GOOGLE_RECONNECT_REQUIRED')
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params,
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('GOOGLE_REFRESH_FAILED')
    const token = await res.json()
    accessToken = token.access_token
    await db.from('assistant_integrations').update({
      encrypted_access_token: await encryptSecret(accessToken),
      token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
      scopes: token.scope ? String(token.scope).split(' ') : data.scopes,
      status: 'connected',
      updated_at: new Date().toISOString(),
    }).eq('id', data.id)
  }
  return accessToken
}
