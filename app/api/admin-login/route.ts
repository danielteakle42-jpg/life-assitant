import { NextResponse } from 'next/server'
import { adminToken } from '../../../lib/admin-auth'
import { supabaseServer } from '../../../lib/supabase-server'

const ACCOUNTS = [
  {
    codeEnv: 'OWNER_CODE',
    fallbackCode: 'ppn777',
    emailEnv: 'OWNER_EMAIL',
    fallbackEmail: 'danielteakle42@gmail.com',
    alias: 'ppn777',
    displayName: 'Owner',
    role: 'owner' as const,
  },
  {
    codeEnv: 'MANAGER_CODE',
    fallbackCode: 'cody789',
    emailEnv: 'MANAGER_EMAIL',
    fallbackEmail: 'codynoonan06@gmail.com',
    alias: 'cody789',
    displayName: 'Cody',
    role: 'manager' as const,
  },
  {
    codeEnv: 'LILS_CODE',
    fallbackCode: '',
    codeHash: 'aad84c086f59e91e21909d55ca1d53db91c2e672381c3993aab4454ec9e55d2c',
    emailEnv: 'LILS_EMAIL',
    fallbackEmail: 'lillybice14@gmail.com',
    alias: 'lils',
    displayName: 'Lilly',
    role: 'manager' as const,
  },
]

async function hashCode(value:string){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')
}

export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({ code: '' }))
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'Assistant access is not configured.' }, { status: 500 })
  }

  const supplied=String(code||'')
  const suppliedHash=await hashCode(supplied)
  const account = ACCOUNTS.find((item:any) => {
    if(item.codeHash && suppliedHash===item.codeHash) return true
    const configured=process.env[item.codeEnv]
    if(configured) return supplied===configured
    return supplied===item.fallbackCode
  })
  if (!account) {
    return NextResponse.json({ error: 'Incorrect access password.' }, { status: 401 })
  }

  const email = process.env[account.emailEnv] || account.fallbackEmail
  const db = await supabaseServer()

  const login = await db.auth.signInWithPassword({ email, password: code })
  let data: {user: import('@supabase/supabase-js').User | null;session: import('@supabase/supabase-js').Session | null} = login.data
  const error = login.error

  // First-use bootstrap: create the hidden Supabase identity if it does not exist yet.
  // If email confirmation is enabled in Supabase, the user must confirm the email once.
  if (error) {
    const signup = await db.auth.signUp({
      email,
      password: code,
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
  response.cookies.set('pp_admin', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })
  return response
}
