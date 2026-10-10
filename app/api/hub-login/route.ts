import { NextResponse } from 'next/server'
export async function POST() {
 return NextResponse.json({error:'Sign in through Scotty Assistant’s own login.'},{status:403})
}
