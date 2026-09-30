'use client'
import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'

export default function AdminLogin(){
  const [code,setCode]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)

  async function submit(e:React.FormEvent){
    e.preventDefault();setMessage('');setBusy(true)
    const res=await fetch('/api/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})})
    const data=await res.json().catch(()=>({}))
    setBusy(false)
    if(!res.ok){setMessage(data.error||'Unable to sign in.');return}
    window.location.href='/'
  }

  return <div className="auth"><div className="card adminGate">
    <div className="adminIcon"><LockKeyhole size={26}/></div>
    <h1>Platinum Assistant</h1>
    <p className="muted">Enter your access password.</p>
    <form className="stack" onSubmit={submit}>
      <input className="input" type="password" autoFocus placeholder="Access password" value={code} onChange={e=>setCode(e.target.value)} />
      <button className="btn" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
      {message&&<div className="authError">{message}</div>}
    </form>
  </div></div>
}
