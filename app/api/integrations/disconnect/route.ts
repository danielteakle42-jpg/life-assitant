import { NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/integration-auth'

export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser()
    const { provider } = await request.json()
    if (!['google','lark','discord','push'].includes(provider)) return NextResponse.json({ error:'Unsupported provider' }, { status:400 })
    const { error } = await db.from('assistant_integrations').delete().eq('user_id', user.id).eq('provider', provider)
    if (error) throw error
    return NextResponse.json({ disconnected:true })
  } catch(error:any) {
    return NextResponse.json({error:error?.message||'Disconnect failed'},{status:error?.message==='UNAUTHENTICATED'?401:500})
  }
}
