// SMS via Moolre (same account). Requires MOOLRE_SMS_VASKEY from the Moolre dashboard.
// Sender ID must be registered/approved with Moolre (MOOLRE_SMS_SENDER, default "DigiMart").
// SMS failures must NEVER block order flow, so everything here is best-effort and silent.
const base = () => process.env.MOOLRE_BASE_URL ?? 'https://api.moolre.com';
export async function sendSms(recipient: string, message: string): Promise<void> {
  const key = process.env.MOOLRE_SMS_VASKEY;
  if (!key || !/^0\d{9}$/.test(recipient)) return; // not configured or invalid number — skip
  try {
    await fetch(`${base()}/open/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-VASKEY': key },
      body: JSON.stringify({ type: 1, senderid: process.env.MOOLRE_SMS_SENDER ?? 'DigiMart', messages: [{ recipient, message, ref: `DM_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }] }),
    });
  } catch { /* best-effort only */ }
}
