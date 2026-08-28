import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import { siteUrl } from '@/lib/site-url';

/** Admin integrations page data: callback URLs to paste into provider portals,
 *  cron commands, and configuration health. ADMIN only. */
export async function GET(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const base = siteUrl();
  const token = process.env.MOOLRE_WEBHOOK_TOKEN ?? '';
  const jobs = process.env.JOBS_TOKEN ?? '';
  const health = {
    moolrePayments: Boolean(process.env.MOOLRE_API_USER && process.env.MOOLRE_API_PUBKEY && process.env.MOOLRE_ACCOUNT_NUMBER),
    moolreTransfers: Boolean(process.env.MOOLRE_API_PRIVKEY),
    moolreSms: Boolean(process.env.MOOLRE_SMS_VASKEY),
    bundleshopgh: Boolean(process.env.BUNDLESHOPGH_API_KEY),
    muviin: Boolean(process.env.MUVIIN_API_KEY),
    refer2bundle: Boolean(process.env.REFER2BUNDLE_API_KEY),
    cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_SECRET),
    push: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  };
  return NextResponse.json({ status: 'success', data: {
    moolreCallback: `${base}/api/webhooks/moolre?token=${token}`,
    bundleshopghNote: 'BundleShopGH needs no dashboard setup — the callback URL rides inside every order request automatically.',
    crons: [
      { name: 'muviin-poll', schedule: '*/5 * * * *', command: `curl -s -X POST -H "Authorization: Bearer ${jobs}" ${base}/api/jobs/recheck-muviin` },
      { name: 'refer2bundle-poll', schedule: '*/5 * * * *', command: `curl -s -X POST -H "Authorization: Bearer ${jobs}" ${base}/api/jobs/recheck-refer2bundle` },
      { name: 'moolre-payment-poll', schedule: '*/5 * * * *', command: `curl -s -X POST -H "Authorization: Bearer ${jobs}" ${base}/api/jobs/recheck-moolre` },
      { name: 'auto-payouts', schedule: '0 * * * *', command: `curl -s -X POST -H "Authorization: Bearer ${jobs}" ${base}/api/jobs/auto-payouts` },
    ],
    health,
  } });
}
