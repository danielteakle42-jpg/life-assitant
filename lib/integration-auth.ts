import { supabaseServer } from './supabase-server'
import {headers} from 'next/headers'
import {createClient} from '@supabase/supabase-js'

export async function requireUser() {
  const token=(await headers()).get('authorization')?.replace(/^Bearer\s+/i,'').trim()
  const db = token ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}}) : await supabaseServer()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) throw new Error('UNAUTHENTICATED')
  return { db, user }
}

export function requestOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
}
