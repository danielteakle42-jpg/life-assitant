import { NextResponse } from 'next/server'
import { requireUser } from '../../../../../lib/integration-auth'
import { getGoogleAccessToken } from '../../../../../lib/google'

function header(payload: any, name: string) {
  return payload?.headers?.find((h: any) => String(h.name).toLowerCase() === name.toLowerCase())?.value || ''
}

export async function GET() {
  try {
    const { db, user } = await requireUser()
    const token = await getGoogleAccessToken(db, user.id)
    const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&labelIds=INBOX', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const list = await listRes.json()
    if (!listRes.ok) throw new Error(list.error?.message || 'Could not load Gmail')
    const messages = await Promise.all((list.messages || []).slice(0, 15).map(async (m: any) => {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const x = await r.json()
      return { id: x.id, threadId: x.threadId, snippet: x.snippet || '', subject: header(x.payload, 'Subject') || '(No subject)', from: header(x.payload, 'From'), date: header(x.payload, 'Date') }
    }))
    return NextResponse.json({ messages })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not load Gmail' }, { status: error?.message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
