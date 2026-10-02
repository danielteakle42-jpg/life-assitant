import { NextRequest, NextResponse } from 'next/server'
import { adminToken } from './lib/admin-auth'
import {createClient} from '@supabase/supabase-js'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/api/hub-login' || pathname === '/admin' || pathname.startsWith('/api/admin-login') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  if(pathname.startsWith('/api/integrations/') && request.headers.has('authorization')){const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim();const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await db.auth.getUser(token);if(error||!data.user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});return NextResponse.next();}
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return NextResponse.redirect(new URL('/admin', request.url))

  const expected = await adminToken(secret)
  const current = request.cookies.get('pp_admin')?.value
  if (current !== expected) return NextResponse.redirect(new URL('/admin', request.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
