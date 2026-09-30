import { NextResponse } from 'next/server'
import { requireUser } from '../../../../../lib/integration-auth'
import { getGoogleAccessToken } from '../../../../../lib/google'

export async function GET() {
  try {
    const { db, user } = await requireUser()
    const token = await getGoogleAccessToken(db, user.id)
    const params = new URLSearchParams({ timeMin: new Date(Date.now()-7*86400000).toISOString(), maxResults: '50', singleEvents: 'true', orderBy: 'startTime' })
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Could not load Google Calendar')
    return NextResponse.json({ events: (data.items || []).map((e: any) => ({ id:e.id, title:e.summary||'(Untitled)', starts_at:e.start?.dateTime||e.start?.date, ends_at:e.end?.dateTime||e.end?.date, location:e.location||null, join_url:e.hangoutLink||e.htmlLink||null, source:'google' })) })
  } catch (error:any) {
    return NextResponse.json({ error:error?.message||'Could not load Google Calendar' }, { status:error?.message==='UNAUTHENTICATED'?401:500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser()
    const token = await getGoogleAccessToken(db, user.id)
    const body = await request.json()
    const event = { summary: body.title, location: body.location || undefined, description: body.notes || undefined, start: { dateTime: body.starts_at }, end: { dateTime: body.ends_at || new Date(new Date(body.starts_at).getTime()+3600000).toISOString() } }
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', { method:'POST', headers:{ Authorization:`Bearer ${token}`,'content-type':'application/json' }, body:JSON.stringify(event), cache:'no-store' })
    const data = await res.json()
    if(!res.ok) throw new Error(data.error?.message||'Could not create Google Calendar event')
    return NextResponse.json({ event:data })
  } catch(error:any) {
    return NextResponse.json({error:error?.message||'Could not create event'},{status:error?.message==='UNAUTHENTICATED'?401:500})
  }
}
