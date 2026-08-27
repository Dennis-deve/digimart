'use client';
import {useState,useEffect} from 'react';
import Link from 'next/link';
type Msg={id:string;senderRole:string;senderName:string;message:string;createdAt:string};
type Ticket={id:string;topic:string;orderNo?:string|null;status:string;createdAt:string;messages:Msg[]};
export default function Support(){const [sent,setSent]=useState('');const [topic,setTopic]=useState('');const [orderNo,setOrderNo]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [tickets,setTickets]=useState<Ticket[]|null>(null);const [signedIn,setSignedIn]=useState(false);const [reply,setReply]=useState('');const [openId,setOpenId]=useState('');
const load=()=>{fetch('/api/support/mine').then(r=>{setSignedIn(r.ok);return r.ok?r.json():null}).then(r=>{if(r)setTickets(r.data)}).catch(()=>undefined)};
useEffect(()=>{load()},[]);
const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{const result=await fetch('/api/support/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic,orderNo:orderNo||undefined,message})});const data=await result.json();if(!result.ok)throw new Error(data.message);setSent(`Ticket ${data.data.id} created. Our team will respond here and by SMS.`);setTopic('');setOrderNo('');setMessage('');load();}catch(e){setSent(e instanceof Error?e.message:'Could not submit request.')}finally{setBusy(false)}};
const sendReply=async(id:string)=>{if(!reply.trim())return;await fetch(`/api/support/tickets/${id}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:reply})});setReply('');load();};
return <main className="portal"><header><Link href="/" className="logo"><span>Digi</span><b>Mart</b></Link><Link href="/">← Back to marketplace</Link></header>
<section className="portalHero"><p>CUSTOMER CARE</p><h1>We are here to help.</h1><span>Track requests, reply to our team and get answers fast. Never share your MoMo PIN or passwords.</span></section>
{sent&&<p className="formSuccess">{sent}</p>}
<section className="application"><h2>Open a new request</h2>
<form onSubmit={submit}><label>What do you need help with?<select value={topic} onChange={e=>setTopic(e.target.value)} required><option value="" disabled>Select a topic</option><option value="ORDER_TRACKING">Order tracking</option><option value="PAYMENT">Payment issue</option><option value="REFUND">Refund request</option><option value="DELIVERY">Delivery issue</option><option value="ACCOUNT">Account help</option></select></label><label>Order number (optional)<input value={orderNo} onChange={e=>setOrderNo(e.target.value.toUpperCase())} placeholder="e.g. DM-48291"/></label><label className="wide">Tell us what happened<textarea value={message} onChange={e=>setMessage(e.target.value)} required placeholder="Include the relevant details without sharing your MoMo PIN or passwords."/></label><button disabled={busy}>{busy?'Sending request…':'Submit support request'}</button></form></section>
{signedIn&&<section className="application" style={{marginTop:18}}><h2>Your conversations</h2>
{tickets===null?<p>Loading…</p>:tickets.length===0?<p style={{color:'#68758a',fontSize:14}}>No tickets yet — your requests and our replies will appear here.</p>:tickets.map(t=><article key={t.id} className="threadCard">
<div className="threadHead" onClick={()=>setOpenId(openId===t.id?'':t.id)}><b>{t.id}</b><span>{t.topic.replaceAll('_',' ').toLowerCase()}{t.orderNo?` · ${t.orderNo}`:''}</span><em className={`badge ${t.status==='CLOSED'?'failed':t.status==='ANSWERED'?'completed':'pending'}`}>{t.status}</em></div>
{openId===t.id&&<div className="threadBody">{t.messages.map(m=><div key={m.id} className={m.senderRole==='SUPPORT'?'msg staff':'msg'}><b>{m.senderName}</b><p>{m.message}</p><small>{new Date(m.createdAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></div>)}{t.status!=='CLOSED'&&<div className="replyRow"><input value={reply} onChange={e=>setReply(e.target.value)} placeholder="Write a reply…"/><button onClick={()=>sendReply(t.id)}>Send</button></div>}</div>}
</article>)}
</section>}
</main>}
