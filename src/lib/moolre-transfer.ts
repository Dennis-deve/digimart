// Moolre TRANSFERS (payouts) — uses the PRIVATE API key (X-API-KEY), NOT the public key.
// Endpoint specs from the official Moolre Postman collection:
//   POST /open/transact/validate {type:1, receiver, channel, currency, accountnumber}
//   POST /open/transact/transfer {type:1, channel, currency, amount, receiver, externalref, accountnumber}
//   POST /open/transact/status  {type:1, idtype:1, id, accountnumber}
// Transfer channel codes: MTN is documented as "1". Telecel/AT codes are not in the
// collection — set them via env when Moolre confirms: MOOLRE_TRF_TELECEL / MOOLRE_TRF_AT.
const base = () => process.env.MOOLRE_BASE_URL ?? 'https://api.moolre.com';
const transferHeaders = () => ({ 'Content-Type': 'application/json', 'X-API-USER': process.env.MOOLRE_API_USER ?? '', 'X-API-KEY': process.env.MOOLRE_API_PRIVKEY ?? '' });
export const transfersConfigured = () => Boolean(process.env.MOOLRE_API_PRIVKEY && process.env.MOOLRE_API_USER && process.env.MOOLRE_ACCOUNT_NUMBER);
const transferChannels: Record<string, string | undefined> = { MTN: '1', Telecel: process.env.MOOLRE_TRF_TELECEL, AirtelTigo: process.env.MOOLRE_TRF_AT };
export const transferChannelFor = (network: string) => transferChannels[network];

export async function validateReceiver(input: { receiver: string; channel: string }) {
  const response = await fetch(`${base()}/open/transact/validate`, { method: 'POST', headers: transferHeaders(), body: JSON.stringify({ type: 1, receiver: input.receiver, channel: input.channel, currency: 'GHS', accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER }) });
  const result = await response.json().catch(() => null) as { status?: number | string; message?: string | null; data?: { name?: string } | null } | null;
  return { ok: response.ok && String(result?.status) === '1', message: result?.message ?? null, name: result?.data?.name ?? null };
}

/** Sends a MoMo transfer. Returns ok=true only when Moolre accepts it (status 1). */
export async function sendTransfer(input: { receiver: string; channel: string; amount: number; externalref: string }) {
  const response = await fetch(`${base()}/open/transact/transfer`, { method: 'POST', headers: transferHeaders(), body: JSON.stringify({ type: 1, channel: input.channel, currency: 'GHS', amount: input.amount.toFixed(2), receiver: input.receiver, externalref: input.externalref, accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER }) });
  const result = await response.json().catch(() => null) as { status?: number | string; code?: string; message?: string | null; data?: unknown } | null;
  const ok = response.ok && String(result?.status) === '1';
  return { ok, code: result?.code ?? null, message: result?.message ?? (ok ? 'Transfer accepted.' : 'Moolre rejected the transfer.'), data: result?.data ?? null };
}
