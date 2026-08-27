import webpush from 'web-push';
import {prisma} from '@/lib/db';
// Web Push (VAPID). Generate keys once:  npx web-push generate-vapid-keys
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com)
// Everything no-ops safely when unconfigured — in-app + SMS still work.
const configured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const pushConfigured = configured;
export function pushPublicKey() { return process.env.VAPID_PUBLIC_KEY ?? null; }
function sender() {
  if (!configured()) return null;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:support@digimart.gh', process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  return webpush;
}
/** Best-effort push to every device of a user. Deletes subscriptions that are gone (410). */
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const wp = sender();
  if (!wp) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } }).catch(() => []);
  for (const sub of subs) {
    try {
      await wp.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
    }
  }
}
