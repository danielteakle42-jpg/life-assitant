import { NextResponse } from 'next/server'
import { requireUser } from '../../../../../lib/integration-auth'
import { getGoogleAccessToken } from '../../../../../lib/google'

export async function GET() {
  try {
    const { db, user } = await requireUser()
    const token = await getGoogleAccessToken(db, user.id)
    const params = new URLSearchParams({ pageSize:'50', q:'trashed = false', orderBy:'modifiedTime desc', fields:'files(id,name,mimeType,webViewLink,modifiedTime,iconLink)' })
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers:{Authorization:`Bearer ${token}`}, cache:'no-store' })
    const data = await res.json()
    if(!res.ok) throw new Error(data.error?.message||'Could not load Google Drive')
    return NextResponse.json({files:data.files||[]})
  } catch(error:any){
    return NextResponse.json({error:error?.message||'Could not load Google Drive'},{status:error?.message==='UNAUTHENTICATED'?401:500})
  }
}
