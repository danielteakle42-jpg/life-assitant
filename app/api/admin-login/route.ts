import { NextResponse } from 'next/server'
import { adminToken } from '../../../lib/admin-auth'
import { supabaseServer } from '../../../lib/supabase-server'


export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({ code: '' }))
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'Assistant access is not configured.' }, { status: 500 })
  }

  const supplied = String(code || '')
  const entryPassword = process.env.ADMIN_ACCESS_PASSWORD
  if (!entryPassword) return NextResponse.json({error:'Scotty login is not configured yet.'},{status:503})
  if (!supplied || supplied !== entryPassword) return NextResponse.json({error:'Incorrect access password.'},{status:401})
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({error:'Scotty’s database settings still need to be copied in Vercel.'},{status:503})
  }
  const account = { emailEnv:'OWNER_EMAIL', fallbackEmail:'danielteakle42@gmail.com', codeEnv:'OWNER_CODE', fallbackCode:'ppn777', alias:'scotty', displayName:'Scotty', role:'owner' as const }
  const email = process.env[account.emailEnv] || account.fallbackEmail
  const db = await supabaseServer()

  // Keep the existing identity and records when the owner changes their entry password.
  const identityPassword = account.role === 'owner'
    ? (process.env[account.codeEnv] || account.fallbackCode)
    : supplied
  const login = await db.auth.signInWithPassword({ email, password: identityPassword })
  let data: {user: import('@supabase/supabase-js').User | null;session: import('@supabase/supabase-js').Session | null} = login.data
  const error = login.error

  // First-use bootstrap: create the hidden Supabase identity if it does not exist yet.
  // If email confirmation is enabled in Supabase, the user must confirm the email once.
  if (error) {
    const signup = await db.auth.signUp({
      email,
      password: identityPassword,
      options: {
        data: { assistant_role: account.role, assistant_alias: account.alias },
      },
    })

    if (signup.error) {
      return NextResponse.json({ error: 'Unable to create or sign in to this assistant account.' }, { status: 401 })
    }

    data = signup.data
    if (!data.session) {
      return NextResponse.json(
        { error: `This account was created. Confirm ${email} once, then sign in here using only the access password.` },
        { status: 403 },
      )
    }
  }

  const user = data.user
  if (!user) {
    return NextResponse.json({ error: 'Unable to start the account session.' }, { status: 401 })
  }

  await db.from('assistant_user_profiles').upsert({
    user_id: user.id,
    login_alias: account.alias,
    display_name: account.displayName,
    role: account.role,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  const token = await adminToken(secret)
  const response = NextResponse.json({ ok: true, role: account.role, alias: account.alias })
  response.cookies.set('scotty_admin', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })
  return response
}
