import { NextResponse } from 'next/server'
import { requireUser } from '../../../../../lib/integration-auth'
import { getGoogleAccessToken } from '../../../../../lib/google'

function encodeEmail(input: {to:string;cc?:string;bcc?:string;subject?:string;body?:string}) {
  const headers = [`To: ${input.to}`]
  if (input.cc) headers.push(`Cc: ${input.cc}`)
  if (input.bcc) headers.push(`Bcc: ${input.bcc}`)
  headers.push(`Subject: ${input.subject || ''}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', '', input.body || '')
  return Buffer.from(headers.join('\r\n')).toString('base64url')
}

export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser()
    const body = await request.json()
    if (!body.to) return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
    const token = await getGoogleAccessToken(db, user.id)
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ raw: encodeEmail(body) }), cache: 'no-store'
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Email send failed')
    if (body.draftId) await db.from('assistant_email_drafts').update({ status: 'sent', provider_message_id: data.id, sent_at: new Date().toISOString() }).eq('id', body.draftId).eq('user_id', user.id)
    return NextResponse.json({ sent: true, id: data.id })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Email send failed' }, { status: error?.message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
