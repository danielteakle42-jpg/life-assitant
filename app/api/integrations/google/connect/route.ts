import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireUser, requestOrigin } from '../../../../../lib/integration-auth'
import { GOOGLE_SCOPES } from '../../../../../lib/google'

export async function GET(request: Request) {
  try {
    await requireUser()
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Google OAuth credentials are not configured yet.' }, { status: 503 })
    }
    const origin = requestOrigin(request)
    const state = crypto.randomUUID()
    const cookieStore = await cookies()
    cookieStore.set('google_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https://'), path: '/', maxAge: 600 })
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${origin}/api/integrations/google/callback`,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
    })
    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to start Google connection' }, { status: error?.message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
