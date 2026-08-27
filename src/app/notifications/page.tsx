'use client';
import Link from 'next/link';import {useEffect,useState} from 'react';
type Note={id:string;title:string;message:string;type:string;readAt:string|null;createdAt:string};
const urlBase64ToUint8Array=(b64:string)=>{const padding='='.repeat((4-b64.length%4)%4);const base64=(b64+padding).replace(/-/g,'+').replace(/_/g,'/');const raw=window.atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))};
export default function Notifications(){const [notes,setNotes]=useState<Note[]>([]);const [error,setError]=useState('');
const [pushState,setPushState]=useState('');const [pushMsg,setPushMsg]=useState('');
const enablePush=async()=>{setPushMsg('');
try{if(!('serviceWorker' in navigator)||!('PushManager' in window))return setPushMsg('This browser does not support push notifications.');
const cfg=await fetch('/api/push/subscribe').then(r=>r.json());
if(!cfg.data?.enabled)return setPushMsg('Push is not enabled on the server yet (set VAPID keys).');
const permission=await Notification.requestPermission();if(permission!=='granted')return setPushMsg('Notification permission was not granted.');
const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
let sub=await reg.pushManager.getSubscription();
if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(cfg.data.publicKey)});
const r=await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sub.toJSON())});
const d=await r.json();if(!r.ok)throw new Error(d.message);
setPushState('on');setPushMsg('Push notifications enabled for this device. You can turn them off in browser settings.');
}catch(e){setPushMsg(e instanceof Error?e.message:'Could not enable push.')}};
const disablePush=async()=>{try{const reg=await navigator.serviceWorker.getRegistration();const sub=reg?await reg.pushManager.getSubscription():null;if(sub){await fetch('/api/push/subscribe',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe();}setPushState('off');setPushMsg('Push notifications disabled for this device.');}catch{setPushMsg('Could not disable push.')}};
useEffect(()=>{if('serviceWorker' in navigator&&'PushManager' in window)navigator.serviceWorker.ready.then(r=>r.pushManager.getSubscription()).then(s=>setPushState(s?'on':'off')).catch(()=>undefined);},[]);useEffect(()=>{fetch('/api/notifications').then(r=>r.json().then(d=>({ok:r.ok,d}))).then(({ok,d})=>{if(!ok)throw new Error(d.message);setNotes(d.data)}).catch(e=>setError(e instanceof Error?e.message:'Could not load notifications.'))},[]);const read=async(id:string)=>{await fetch(`/api/notifications/${id}/read`,{method:'PATCH'});setNotes(v=>v.map(n=>n.id===id?{...n,readAt:new Date().toISOString()}:n))};return <main className="notifications"><header><Link href="/" className="logo"><span>Digi</span><b>Mart</b></Link><Link href="/account">← Account</Link></header><section><p className="eyebrow">NOTIFICATION CENTER</p><h1>Updates for you</h1>
<div className="pushToggle"><div><b>🔔 Push notifications</b><span>Get payment, delivery and order alerts on this device — even when DigiMart is closed.</span></div><button onClick={pushState==='on'?disablePush:enablePush} disabled={!pushState&&typeof window!=='undefined'&&!("serviceWorker" in navigator)}>{pushState==='on'?'Disable':'Enable'}</button></div>
{pushMsg&&<p className="pushMsg">{pushMsg}</p>}{error?<p className="empty">{error}</p>:notes.length?notes.map(n=><article className={n.readAt?'':'unread'} key={n.id} onClick={()=>!n.readAt&&read(n.id)}><div>{n.type==='PAYMENT'?'◉':n.type==='REFUND'?'↩':'✦'}</div><span><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small></span>{!n.readAt&&<i>New</i>}</article>):<p className="empty">You have no notifications yet.</p>}</section></main>}
