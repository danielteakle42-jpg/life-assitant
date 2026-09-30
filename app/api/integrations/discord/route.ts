import { NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/integration-auth'
import { encryptSecret, decryptSecret } from '../../../../lib/token-crypto'

export async function POST(request:Request){
  try{
    const {db,user}=await requireUser(); const body=await request.json(); const webhook=String(body.webhook_url||'')
    if(!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i.test(webhook)) return NextResponse.json({error:'Enter a valid Discord webhook URL.'},{status:400})
    const test=await fetch(webhook,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content:'✅ Platinum Assistant connected successfully.'})})
    if(!test.ok) return NextResponse.json({error:'Discord rejected that webhook. Check the URL and channel permissions.'},{status:400})
    const {error}=await db.from('assistant_integrations').upsert({user_id:user.id,provider:'discord',status:'connected',account_label:body.label||'Discord webhook',encrypted_access_token:await encryptSecret(webhook),encrypted_refresh_token:null,token_expires_at:null,scopes:[],metadata:{mode:'webhook'},updated_at:new Date().toISOString()},{onConflict:'user_id,provider'})
    if(error) throw error
    return NextResponse.json({connected:true})
  }catch(error:any){return NextResponse.json({error:error?.message||'Discord connection failed'},{status:error?.message==='UNAUTHENTICATED'?401:500})}
}

export async function PUT(request:Request){
  try{
    const {db,user}=await requireUser(); const body=await request.json()
    const {data}=await db.from('assistant_integrations').select('encrypted_access_token').eq('user_id',user.id).eq('provider','discord').maybeSingle()
    if(!data) return NextResponse.json({error:'Discord is not connected.'},{status:400})
    const webhook=await decryptSecret(data.encrypted_access_token); if(!webhook) throw new Error('Discord webhook unavailable')
    const res=await fetch(webhook,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content:String(body.message||'Test from Platinum Assistant')})})
    if(!res.ok) throw new Error('Discord message failed')
    return NextResponse.json({sent:true})
  }catch(error:any){return NextResponse.json({error:error?.message||'Discord message failed'},{status:error?.message==='UNAUTHENTICATED'?401:500})}
}
