import { NextRequest, NextResponse } from 'next/server'
import { adminToken } from './lib/admin-auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/api/hub-login' || pathname === '/admin' || pathname.startsWith('/api/admin-login') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

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
