import { NextResponse } from 'next/server'
import { requireUser } from '../../../../../lib/integration-auth'
import { getLarkAccessToken, LARK_BASE } from '../../../../../lib/lark'

export async function GET(){
  try{
    const {db,user}=await requireUser(); const token=await getLarkAccessToken(db,user.id)
    // Fetch calendar list first. Event fetching is then done per visible calendar.
    const calRes=await fetch(`${LARK_BASE}/open-apis/calendar/v4/calendars?page_size=20`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const calRaw=await calRes.json(); if(!calRes.ok||(calRaw.code&&calRaw.code!==0)) throw new Error(calRaw.msg||'Could not load Lark calendars')
    const calendars=(calRaw.data?.calendar_list||calRaw.data?.items||[])
    return NextResponse.json({calendars})
  }catch(error:any){return NextResponse.json({error:error?.message||'Could not load Lark calendars'},{status:error?.message==='UNAUTHENTICATED'?401:500})}
}
