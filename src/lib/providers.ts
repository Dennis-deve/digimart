import { providerFetch } from '@/lib/provider-http';
import { collectMobileMoney, type MoolreChannel } from '@/lib/moolre';
export async function initiateMoolreCollection(input:{payer:string;amount:number;channel:MoolreChannel;externalref:string;reference:string}) { const result=await collectMobileMoney(input); return {mode:result.mode,paymentReference:input.externalref,instructions:result.mode==='live'?`${(result as {message?:string|null}).message??'Check your phone and approve the Mobile Money request.'} If you received a payment code by SMS instead of a prompt, dial *170# (MTN MoMo) or open your wallet app and approve the payment for DigiMart.`:'Payments are not configured yet — try again shortly.',moolreReference:result.data}; }
export async function fulfillBundleShopGH(input:{phone:string;size:number;network:string;callback:string}) { if(!process.env.BUNDLESHOPGH_API_KEY)return {mode:'sandbox-not-configured' as const,status:'PENDING'};const response=await providerFetch(`${process.env.BUNDLESHOPGH_BASE_URL??'https://backend.mycledanet.com'}/api/order`,{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':process.env.BUNDLESHOPGH_API_KEY},body:JSON.stringify(input)});if(!response.ok)throw new Error('BundleShopGH could not accept this data order.');return {mode:'live' as const,...(await response.json())}; }
export async function fulfillMuviinAirtime(input:{phone:string;amount:number;network:string;extRef:string}) { if(!process.env.MUVIIN_API_KEY)return {mode:'sandbox-not-configured' as const,status:'PENDING'};const response=await providerFetch('https://core.muviin.co/src/api/v1/',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.MUVIIN_API_KEY}`},body:JSON.stringify({func:'airtime',prod:'airtime',...input})});if(!response.ok)throw new Error('Muviin could not accept this airtime order.');return {mode:'live' as const,...(await response.json())}; }
export async function getMuviinAirtimeStatus(extRef:string){if(!process.env.MUVIIN_API_KEY)throw new Error('Muviin is not configured.');const response=await providerFetch('https://core.muviin.co/src/api/v1/',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.MUVIIN_API_KEY}`},body:JSON.stringify({func:'GetAirtimeStatus',prod:'airtime',extRef})});if(!response.ok)throw new Error('Muviin status lookup failed.');return response.json() as Promise<{status?:string}>;}
// --- Muviin result checkers (BuyChecker / GetCheckerStatus) ---
export async function fulfillMuviinChecker(input:{checkerType:string;extRef:string}) { if(!process.env.MUVIIN_API_KEY)return {mode:'sandbox-not-configured' as const,status:'pending'};const response=await providerFetch('https://core.muviin.co/src/api/v1/',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.MUVIIN_API_KEY}`},body:JSON.stringify({func:'BuyChecker',prod:'resultchecker',checker_type:input.checkerType,extRef:input.extRef})});if(!response.ok)throw new Error('Muviin could not accept this result checker order.');return {mode:'live' as const,...(await response.json())};}
export async function getMuviinCheckerStatus(extRef:string){if(!process.env.MUVIIN_API_KEY)throw new Error('Muviin is not configured.');const response=await providerFetch('https://core.muviin.co/src/api/v1/',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.MUVIIN_API_KEY}`},body:JSON.stringify({func:'GetCheckerStatus',prod:'resultchecker',extRef})});if(!response.ok)throw new Error('Muviin checker status lookup failed.');return response.json() as Promise<{status?:string;[k:string]:unknown}>;}
// --- Refer2Bundle (data bundles + AFA) ---
// Docs: https://refer2bundle.com/api/v1/docs/index.php — auth via X-API-KEY header.
// POST /order {network, data_plan, beneficiary} -> {status:'success', data:{reference}}
// GET  /order-status?reference=... (no webhook documented -> status polling job)
const r2bBase = () => process.env.REFER2BUNDLE_BASE_URL ?? 'https://refer2bundle.com/api/v1';
const r2bHeaders = () => ({ 'Content-Type': 'application/json', ...(process.env.REFER2BUNDLE_API_KEY ? { 'X-API-KEY': process.env.REFER2BUNDLE_API_KEY } : {}) });
export const refer2BundleConfigured = () => Boolean(process.env.REFER2BUNDLE_API_KEY);
// DigiMart networks -> Refer2Bundle network codes (docs show "MTN" and "AT")
const r2bNetworks: Record<string, string> = { MTN: 'MTN', AirtelTigo: 'AT', Telecel: 'TELECEL' };
export async function fulfillRefer2Bundle(input: { network: string; dataPlan: string; beneficiary: string }) {
  if (!refer2BundleConfigured()) return { mode: 'sandbox-not-configured' as const, status: 'pending' };
  const network = r2bNetworks[input.network] ?? input.network;
  const response = await providerFetch(`${r2bBase()}/order`, { method: 'POST', headers: r2bHeaders(), body: JSON.stringify({ network, data_plan: input.dataPlan, beneficiary: input.beneficiary }) });
  const result = await response.json().catch(() => null) as { status?: string; data?: { reference?: string; message?: string } } | null;
  if (!response.ok || result?.status !== 'success') throw new Error(result?.data?.message ?? 'Refer2Bundle could not accept this data order.');
  return { mode: 'live' as const, reference: result.data?.reference ?? null, raw: result };
}
export async function getRefer2BundleStatus(reference: string) {
  if (!refer2BundleConfigured()) throw new Error('Refer2Bundle is not configured.');
  const response = await providerFetch(`${r2bBase()}/order-status?reference=${encodeURIComponent(reference)}`, { headers: r2bHeaders() });
  if (!response.ok) throw new Error('Refer2Bundle status lookup failed.');
  return response.json() as Promise<{ status?: string; data?: { status?: string } }>;
}
export async function getRefer2BundleBalance() {
  if (!refer2BundleConfigured()) throw new Error('Refer2Bundle is not configured.');
  const response = await providerFetch(`${r2bBase()}/balance`, { headers: r2bHeaders() });
  if (!response.ok) throw new Error('Refer2Bundle balance lookup failed.');
  return response.json() as Promise<{ data?: { balance?: string; currency?: string } }>;
}
// --- Refer2Bundle AFA registrations ---
// POST /afa/register {full_name, phone, id_card_number, location, idempotency_key} (GHS 11 fee from wallet)
// GET  /afa/status/{reference} — statuses: pending ... (success values confirmed by owner)
export async function registerRefer2BundleAFA(input: { fullName: string; phone: string; idCardNumber: string; location: string; idempotencyKey: string }) {
  if (!refer2BundleConfigured()) return { mode: 'sandbox-not-configured' as const, status: 'pending' };
  const response = await providerFetch(`${r2bBase()}/afa/register`, { method: 'POST', headers: r2bHeaders(), body: JSON.stringify({ full_name: input.fullName, phone: input.phone, id_card_number: input.idCardNumber, location: input.location, idempotency_key: input.idempotencyKey }) });
  const result = await response.json().catch(() => null) as { status?: string; data?: { reference?: string; status?: string; message?: string } } | null;
  if (!response.ok || result?.status !== 'success') throw new Error(result?.data?.message ?? 'Refer2Bundle could not accept this AFA registration.');
  return { mode: 'live' as const, reference: result.data?.reference ?? null, status: result.data?.status ?? 'pending', raw: result };
}
export async function getRefer2BundleAFAStatus(reference: string) {
  if (!refer2BundleConfigured()) throw new Error('Refer2Bundle is not configured.');
  const response = await providerFetch(`${r2bBase()}/afa/status/${encodeURIComponent(reference)}`, { headers: r2bHeaders() });
  if (!response.ok) throw new Error('Refer2Bundle AFA status lookup failed.');
  return response.json() as Promise<{ status?: string; data?: { status?: string } }>;
}
// --- BundleShopGH AFA registrations ---
// POST /api/afa-registration — field names follow their order-API style; filtered by presence.
// If the exact body differs, the call fails safely and the item stays PENDING for admin retry.
export async function fulfillBundleShopGHAFA(input: { phone: string; fullName?: string; idCardNumber?: string; location?: string; callback: string }) {
  if (!process.env.BUNDLESHOPGH_API_KEY) return { mode: 'sandbox-not-configured' as const, status: 'PENDING' };
  const body: Record<string, string> = { phone: input.phone, callback: input.callback };
  if (input.fullName) body.full_name = input.fullName;
  if (input.idCardNumber) body.id_card_number = input.idCardNumber;
  if (input.location) body.location = input.location;
  const response = await providerFetch(`${process.env.BUNDLESHOPGH_BASE_URL ?? 'https://backend.mycledanet.com'}/api/afa-registration`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.BUNDLESHOPGH_API_KEY }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error('BundleShopGH could not accept this AFA registration.');
  const result = await response.json().catch(() => ({})) as { id?: string; data?: { id?: string } };
  return { mode: 'live' as const, reference: result.id ?? result.data?.id ?? null, raw: result };
}
