export type MoolreChannel = 'MTN' | 'Telecel' | 'AirtelTigo';
const channels: Record<MoolreChannel,string> = { MTN:'13', Telecel:'6', AirtelTigo:'7' };
const baseUrl = () => process.env.MOOLRE_BASE_URL ?? 'https://api.moolre.com';
const paymentHeaders = () => ({'Content-Type':'application/json','X-API-USER':process.env.MOOLRE_API_USER ?? '','X-API-PUBKEY':process.env.MOOLRE_API_PUBKEY ?? ''});
const configured = () => Boolean(process.env.MOOLRE_API_USER && process.env.MOOLRE_API_PUBKEY && process.env.MOOLRE_ACCOUNT_NUMBER);

export async function collectMobileMoney(input:{payer:string;amount:number;channel:MoolreChannel;externalref:string}) {
 if(!configured()) return {mode:'sandbox-not-configured' as const, status:1, code:'LOCAL_PENDING', message:'Moolre credentials have not been configured.', data:null};
 const response=await fetch(`${baseUrl()}/open/transact/payment`,{method:'POST',headers:paymentHeaders(),body:JSON.stringify({type:1,channel:channels[input.channel],currency:'GHS',payer:input.payer,amount:input.amount.toFixed(2),externalref:input.externalref,accountnumber:process.env.MOOLRE_ACCOUNT_NUMBER})});
 const result=await response.json() as {status:number|string;code:string;message:string|null;data:unknown};
 if(!response.ok || String(result.status)!=='1') throw new Error(result.message || 'Moolre could not initiate the payment request.');
 return {mode:'live' as const,...result};
}

export async function getPaymentStatus(externalref:string) {
 if(!configured()) throw new Error('Moolre is not configured.');
 const response=await fetch(`${baseUrl()}/open/transact/status`,{method:'POST',headers:paymentHeaders(),body:JSON.stringify({type:1,idtype:1,id:externalref,accountnumber:process.env.MOOLRE_ACCOUNT_NUMBER})});
 if(!response.ok) throw new Error('Moolre payment status lookup failed.');
 return response.json();
}
