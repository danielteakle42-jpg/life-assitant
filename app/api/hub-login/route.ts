import {NextResponse} from 'next/server';
import {supabaseServer} from '../../../lib/supabase-server';
import {adminToken} from '../../../lib/admin-auth';
export async function POST(request:Request){
 if(request.headers.get('origin')!=='https://managment-dash.vercel.app')return NextResponse.json({error:'Open the assistant from your manager dashboard.'},{status:403});
 const secret=process.env.ADMIN_SESSION_SECRET;if(!secret)return NextResponse.json({error:'Assistant access is not configured.'},{status:503});
 const form=await request.formData();const hash=String(form.get('token_hash')||'');if(!hash)return NextResponse.json({error:'Missing login token.'},{status:400});
 const db=await supabaseServer();const {data,error}=await db.auth.verifyOtp({token_hash:hash,type:'magiclink'});
 if(error||!data.user||!data.session)return NextResponse.json({error:'This login has expired. Open the assistant again from your dashboard.'},{status:401});
 const {data:staff}=await db.from('profiles').select('role,display_name,username').eq('id',data.user.id).single();
 const {data:existing}=await db.from('assistant_user_profiles').select('role').eq('user_id',data.user.id).single();
 if(staff?.role!=='manager'&&existing?.role!=='owner'){await db.auth.signOut();return NextResponse.json({error:'Staff assistant access required.'},{status:403});}
 const {error:profileError}=await db.from('assistant_user_profiles').upsert({user_id:data.user.id,login_alias:staff?.username||'owner',display_name:staff?.display_name||'Owner',role:existing?.role==='owner'?'owner':'manager',updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(profileError)return NextResponse.json({error:'Could not prepare assistant account.'},{status:500});
 const response=NextResponse.redirect(new URL('/',request.url),303);response.headers.set('Cache-Control','no-store');response.cookies.set('pp_admin',await adminToken(secret),{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:60*60*24*14});return response;
}
