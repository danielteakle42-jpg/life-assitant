import { NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/integration-auth'

export async function GET() {
  try {
    const { db, user } = await requireUser()
    const { data, error } = await db.from('assistant_integrations')
      .select('provider,status,account_label,scopes,metadata,updated_at')
      .eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ integrations: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load integrations' }, { status: error?.message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
