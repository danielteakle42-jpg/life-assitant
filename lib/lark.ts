import { decryptSecret, encryptSecret } from './token-crypto'

export const LARK_BASE = 'https://open.larksuite.com'

export async function getLarkAccessToken(db: any, userId: string) {
  const { data, error } = await db.from('assistant_integrations').select('*').eq('user_id', userId).eq('provider', 'lark').maybeSingle()
  if (error || !data) throw new Error('LARK_NOT_CONNECTED')
  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0
  let accessToken = await decryptSecret(data.encrypted_access_token)
  const refreshToken = await decryptSecret(data.encrypted_refresh_token)
  if (!accessToken) throw new Error('LARK_NOT_CONNECTED')

  if (expiresAt && expiresAt < Date.now() + 60_000 && refreshToken) {
    const res = await fetch(`${LARK_BASE}/open-apis/authen/v2/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.LARK_APP_ID,
        client_secret: process.env.LARK_APP_SECRET,
        refresh_token: refreshToken,
      }),
      cache: 'no-store',
    })
    const body = await res.json()
    if (!res.ok || body.code && body.code !== 0) throw new Error('LARK_REFRESH_FAILED')
    const token = body.data || body
    accessToken = token.access_token
    await db.from('assistant_integrations').update({
      encrypted_access_token: await encryptSecret(accessToken),
      encrypted_refresh_token: token.refresh_token ? await encryptSecret(token.refresh_token) : data.encrypted_refresh_token,
      token_expires_at: new Date(Date.now() + Number(token.expires_in || 7200) * 1000).toISOString(),
      status: 'connected',
      updated_at: new Date().toISOString(),
    }).eq('id', data.id)
  }
  return accessToken
}
