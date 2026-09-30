import { supabaseServer } from './supabase-server'

export async function requireUser() {
  const db = await supabaseServer()
  const { data: { user }, error } = await db.auth.getUser()
  if (error || !user) throw new Error('UNAUTHENTICATED')
  return { db, user }
}

export function requestOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
}
