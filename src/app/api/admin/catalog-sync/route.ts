import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {audit} from '@/lib/audit';
import {runCatalogSync, defaultMarginPct} from '@/lib/catalog-sync';

const schema = z.object({ marginPct: z.number().min(0).max(300).optional(), hidden: z.boolean().optional() });

/** ONE-CLICK provider catalog sync (admin). Pulls the owner's real inventory
 *  from provider catalog APIs into the store with the strict provider rules. */
export async function POST(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const input = schema.safeParse(await request.json().catch(() => ({})));
  const marginPct = input.success && input.data.marginPct !== undefined ? input.data.marginPct : defaultMarginPct();
  const hidden = input.success ? Boolean(input.data.hidden) : false;
  const result = await runCatalogSync(marginPct, hidden);
  await audit({ actorId: guard.session!.id, action: 'CATALOG_SYNC', entityType: 'Product', entityId: 'catalog', metadata: { marginPct, providers: result.providers.map(p => ({ p: p.provider, ok: p.ok, n: p.imported + p.updated })) } });
  return NextResponse.json({ status: 'success', data: result });
}
