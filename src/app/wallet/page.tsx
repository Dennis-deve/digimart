'use client';
import Link from 'next/link';import {useEffect,useState} from 'react';
type Entry={id:string;type:string;amount:number;balanceAfter:number;reference:string;relatedOrderId?:string|null;createdAt:string};
export default function Wallet(){const [balance,setBalance]=useState<number|null>(null);const [entries,setEntries]=useState<Entry[]>([]);const [error,setError]=useState('');
const [topOpen,setTopOpen]=useState(false);const [wdOpen,setWdOpen]=useState(false);
const [amount,setAmount]=useState('');const [provider,setProvider]=useState<'MTN'|'Telecel'|'AirtelTigo'>('MTN');
const [wName,setWName]=useState('');const [wMomo,setWMomo]=useState('');const [wNet,setWNet]=useState<'MTN'|'Telecel'|'AirtelTigo'>('MTN');
const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
const load=()=>{fetch('/api/wallet/me').then(r=>r.json().then(d=>({ok:r.ok,d}))).then(({ok,d})=>{if(!ok)throw new Error(d.message);setBalance(d.data.balance);setEntries(d.data.entries)}).catch(e=>setError(e instanceof Error?e.message:'Could not load wallet.'))};
useEffect(()=>{load()},[]);
const flash=(m:string)=>{setNotice(m);setTimeout(()=>setNotice(''),6000)};
const topup=async()=>{const amt=Number(amount);if(!amt||amt<1)return flash('Enter an amount of at least GH₵1.');setBusy(true);
try{const r=await fetch('/api/wallet/topup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:amt,provider})});const d=await r.json();if(!r.ok)throw new Error(d.message);
flash(`Top-up started — GH₵${amt.toFixed(2)}. ${d.data.instructions} Your wallet is credited automatically after verified payment.`);setAmount('');setTopOpen(false);}catch(e){flash(e instanceof Error?e.message:'Top-up failed.')}finally{setBusy(false)}};
const withdraw=async()=>{if(wName.trim().length<2)return flash('Enter the Mobile Money account name.');if(!/^0\d{9}$/.test(wMomo))return flash('Enter a valid 10-digit Mobile Money number.');setBusy(true);
try{const r=await fetch('/api/wallet/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({momoName:wName.trim(),momoNumber:wMomo,network:wNet})});const d=await r.json();if(!r.ok)throw new Error(d.message);
flash(d.data.message);setWdOpen(false);setWName('');setWMomo('');load();}catch(e){flash(e instanceof Error?e.message:'Withdrawal failed.')}finally{setBusy(false)}};
const statement=()=>{const rows=[['Date','Type','Amount (GHS)','Balance After','Reference'],...entries.map(e=>[new Date(e.createdAt).toLocaleString('en-GB'),e.type.replaceAll('_',' '),(e.amount>=0?'+':'')+e.amount.toFixed(2),e.balanceAfter.toFixed(2),e.relatedOrderId??e.reference])];const csv=rows.map(r=>r.map(c=>`"${String(c).replaceAll('"','""')}"`).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`digimart-wallet-statement-${Date.now()}.csv`;a.click();URL.revokeObjectURL(url);};
return <main className="walletPage"><header><Link className="logo" href="/"><span>Digi</span><b>Mart</b></Link><Link href="/account">← Account</Link></header>
<section className="walletBalance"><p>DIGIMART WALLET</p><h1>{balance===null?'Loading…':`GH₵${balance.toFixed(2)}`}</h1><span>Available balance</span>
<div><button onClick={()=>setTopOpen(true)}>＋ Top up wallet</button><button onClick={()=>setWdOpen(true)}>↗ Withdraw</button></div></section>
{notice&&<p className="walletNotice">{notice}</p>}
{topOpen&&<div className="overlay" onClick={()=>setTopOpen(false)}><section className="checkout" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setTopOpen(false)}>×</button><p className="eyebrow">WALLET TOP-UP</p><h2>Top up your wallet</h2><p className="sub">Pay with Mobile Money — credited automatically after verified payment.</p>
<input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^\d.]/g,''))} inputMode="decimal" placeholder="Amount e.g. 20"/>
<div className="networkSelect">{(['MTN','Telecel','AirtelTigo'] as const).map(n=><button type="button" key={n} className={provider===n?'selected':''} onClick={()=>setProvider(n)}>{n}</button>)}</div>
<button className="payment" disabled={busy} onClick={topup}>{busy?'Starting…':`Top up GH₵${Number(amount||0).toFixed(2)}`}</button></section></div>}
{wdOpen&&<div className="overlay" onClick={()=>setWdOpen(false)}><section className="checkout" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setWdOpen(false)}>×</button><p className="eyebrow">WALLET WITHDRAWAL</p><h2>Withdraw to Mobile Money</h2><p className="sub">Minimum GH₵5. Admin sends it to your wallet — you get an SMS when it lands.</p>
<input value={wName} onChange={e=>setWName(e.target.value)} placeholder="Mobile Money account name"/>
<input value={wMomo} onChange={e=>setWMomo(e.target.value.replace(/\D/g,'').slice(0,10))} inputMode="numeric" placeholder="Mobile Money number"/>
<div className="networkSelect">{(['MTN','Telecel','AirtelTigo'] as const).map(n=><button type="button" key={n} className={wNet===n?'selected':''} onClick={()=>setWNet(n)}>{n}</button>)}</div>
<button className="payment" disabled={busy} onClick={withdraw}>{busy?'Requesting…':`Withdraw GH₵${(balance??0).toFixed(2)}`}</button></section></div>}
<section className="ledger"><div className="heading"><div><p className="eyebrow">TRANSACTION HISTORY</p><h2>Wallet activity</h2></div><button onClick={statement}>Download statement</button></div>
{error?<p className="empty">{error}</p>:entries.length?entries.map(e=><article key={e.id}><div className={e.amount>=0?'refund':'purchase'}>{e.amount>=0?'✦':'🛒'}</div><span><b>{e.type.replaceAll('_',' ')}</b><small>{e.relatedOrderId??e.reference} · {new Date(e.createdAt).toLocaleDateString()}</small></span><strong className={e.amount>=0?'credit':''}>{e.amount>=0?'+':''}GH₵{Math.abs(e.amount).toFixed(2)}</strong></article>):<p className="empty">No wallet activity yet — top up to get started.</p>}</section></main>}
