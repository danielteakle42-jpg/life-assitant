'use client'
import { useState } from 'react'
import { LockKeyhole, Sparkles } from 'lucide-react'

export default function AdminLogin(){
  const [code,setCode]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)

  async function submit(e:React.FormEvent){
    e.preventDefault();setMessage('');setBusy(true)
    try {
    const res=await fetch('/api/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})})
    const data=await res.json().catch(()=>({}))
    setBusy(false)
    if(!res.ok){setMessage(data.error||'Unable to sign in.');return}
    window.location.href='/'
    } catch { setMessage('Connection interrupted. Please try again.') } finally { setBusy(false) }
  }

  return <div className="auth"><div className="card adminGate">
    <div className="adminIcon"><LockKeyhole size={26}/></div>
    <div className="eyebrow">SCOTTY ASSISTANT</div><h1>Welcome back.</h1>
    <p className="muted">Everything you’re building, in one place.</p>
    <form className="stack" onSubmit={submit}>
      <input className="input" type="password" required autoComplete="current-password" aria-label="Access password" autoFocus placeholder="Access password" value={code} onChange={e=>setCode(e.target.value)} />
      <button className="btn" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
      {message&&<div className="authError">{message}</div>}
    </form>
  </div></div>
}
