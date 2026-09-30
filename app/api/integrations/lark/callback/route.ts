import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireUser, requestOrigin } from '../../../../../lib/integration-auth'
import { encryptSecret } from '../../../../../lib/token-crypto'
import { LARK_BASE } from '../../../../../lib/lark'

export async function GET(request: Request) {
  const origin=requestOrigin(request)
  const url=new URL(request.url)
  try{
    const {db,user}=await requireUser()
    const code=url.searchParams.get('code'), state=url.searchParams.get('state')
    const cookieStore=await cookies(); const expected=cookieStore.get('lark_oauth_state')?.value; cookieStore.delete('lark_oauth_state')
    if(!code||!state||!expected||state!==expected) throw new Error('Invalid Lark OAuth state')
    const res=await fetch(`${LARK_BASE}/open-apis/authen/v2/oauth/token`,{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({grant_type:'authorization_code',client_id:process.env.LARK_APP_ID,client_secret:process.env.LARK_APP_SECRET,code,redirect_uri:`${origin}/api/integrations/lark/callback`}),cache:'no-store'})
    const raw=await res.json(); if(!res.ok||(raw.code&&raw.code!==0)) throw new Error(raw.msg||raw.error_description||'Lark token exchange failed')
    const token=raw.data||raw
    const infoRes=await fetch(`${LARK_BASE}/open-apis/authen/v1/user_info`,{headers:{Authorization:`Bearer ${token.access_token}`},cache:'no-store'})
    const infoRaw=await infoRes.json(); const info=infoRaw.data||infoRaw
    const {error}=await db.from('assistant_integrations').upsert({user_id:user.id,provider:'lark',status:'connected',account_label:info.name||info.en_name||info.email||'Lark account',encrypted_access_token:await encryptSecret(token.access_token),encrypted_refresh_token:await encryptSecret(token.refresh_token),token_expires_at:new Date(Date.now()+Number(token.expires_in||7200)*1000).toISOString(),scopes:token.scope?String(token.scope).split(' '):[],metadata:{open_id:info.open_id||null,user_id:info.user_id||null,avatar_url:info.avatar_url||null},updated_at:new Date().toISOString()},{onConflict:'user_id,provider'})
    if(error) throw error
    return NextResponse.redirect(`${origin}/?connected=lark`)
  }catch(error:any){return NextResponse.redirect(`${origin}/?connection_error=${encodeURIComponent(error?.message||'Lark connection failed')}`)}
}
