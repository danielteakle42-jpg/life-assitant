import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireUser, requestOrigin } from '../../../../../lib/integration-auth'

export async function GET(request: Request) {
  try {
    await requireUser()
    if(!process.env.LARK_APP_ID || !process.env.LARK_APP_SECRET) return NextResponse.json({error:'Lark app credentials are not configured yet.'},{status:503})
    const origin=requestOrigin(request)
    const state=crypto.randomUUID()
    const cookieStore=await cookies()
    cookieStore.set('lark_oauth_state',state,{httpOnly:true,sameSite:'lax',secure:origin.startsWith('https://'),path:'/',maxAge:600})
    const params=new URLSearchParams({app_id:process.env.LARK_APP_ID,redirect_uri:`${origin}/api/integrations/lark/callback`,state})
    if(process.env.LARK_OAUTH_SCOPES) params.set('scope',process.env.LARK_OAUTH_SCOPES)
    return NextResponse.redirect(`https://open.larksuite.com/open-apis/authen/v1/authorize?${params}`)
  } catch(error:any){
    return NextResponse.json({error:error?.message||'Unable to start Lark connection'},{status:error?.message==='UNAUTHENTICATED'?401:500})
  }
}
