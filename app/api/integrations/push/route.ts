import { NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/integration-auth'

export async function POST(request:Request){
  try{
    const {db,user}=await requireUser(); const body=await request.json()
    const {error}=await db.from('assistant_integrations').upsert({user_id:user.id,provider:'push',status:body.permission==='granted'?'connected':'error',account_label:'This browser',encrypted_access_token:null,encrypted_refresh_token:null,token_expires_at:null,scopes:[],metadata:{permission:body.permission,user_agent:request.headers.get('user-agent')},updated_at:new Date().toISOString()},{onConflict:'user_id,provider'})
    if(error) throw error
    return NextResponse.json({connected:body.permission==='granted'})
  }catch(error:any){return NextResponse.json({error:error?.message||'Push setup failed'},{status:error?.message==='UNAUTHENTICATED'?401:500})}
}
