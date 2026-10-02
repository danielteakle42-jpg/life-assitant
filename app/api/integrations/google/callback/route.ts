import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireUser, requestOrigin } from '../../../../../lib/integration-auth'
import { encryptSecret } from '../../../../../lib/token-crypto'

export async function GET(request: Request) {
  const origin = requestOrigin(request)
  const hubReturn=(await cookies()).get('assistant_hub_return')?.value==='1'
  const destination=hubReturn?'https://managment-dash.vercel.app/?view=assistant&assistantTab=connections&':`${origin}/?`
  if(hubReturn)(await cookies()).delete('assistant_hub_return')
  const url = new URL(request.url)
  try {
    const { db, user } = await requireUser()
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const cookieStore = await cookies()
    const expected = cookieStore.get('google_oauth_state')?.value
    cookieStore.delete('google_oauth_state')
    if (!code || !state || !expected || state !== expected) throw new Error('Invalid Google OAuth state')

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${origin}/api/integrations/google/callback`,
      }),
      cache: 'no-store',
    })
    const token = await tokenRes.json()
    if (!tokenRes.ok || !token.access_token) throw new Error(token.error_description || token.error || 'Google token exchange failed')

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` }, cache: 'no-store' })
    const info = infoRes.ok ? await infoRes.json() : {}
    const { data: existing } = await db.from('assistant_integrations').select('encrypted_refresh_token').eq('user_id', user.id).eq('provider', 'google').maybeSingle()
    const encryptedRefresh = token.refresh_token ? await encryptSecret(token.refresh_token) : existing?.encrypted_refresh_token || null

    const { error } = await db.from('assistant_integrations').upsert({
      user_id: user.id,
      provider: 'google',
      status: 'connected',
      account_label: info.email || user.email || 'Google account',
      encrypted_access_token: await encryptSecret(token.access_token),
      encrypted_refresh_token: encryptedRefresh,
      token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
      scopes: token.scope ? String(token.scope).split(' ') : [],
      metadata: { picture: info.picture || null, google_user_id: info.id || null },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' })
    if (error) throw error
    return NextResponse.redirect(`${destination}connected=google`)
  } catch (error: any) {
    return NextResponse.redirect(`${destination}connection_error=${encodeURIComponent(error?.message || 'Google connection failed')}`)
  }
}
