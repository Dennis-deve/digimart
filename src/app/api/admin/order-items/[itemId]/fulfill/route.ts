import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {recomputeAndSettle} from '@/lib/settle';
import {sendSms} from '@/lib/notify';

const schema = z.object({ fulfillment: z.enum(['FULFILLED', 'FAILED']), note: z.string().max(500).optional() });

/** Admin completes a manual item (Muviin AFA, subscriptions, etc.) — recomputes the order
 *  and triggers settlement exactly once when everything is fulfilled. */
export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const { itemId } = await params;
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: 'Choose FULFILLED or FAILED.' }, { status: 400 });
  const item = await prisma.orderItem.findUnique({ where: { id: itemId }, include: { Order: true, Product: { select: { name: true } } } });
  if (!item) return NextResponse.json({ status: 'error', message: 'Order item not found.' }, { status: 404 });
  if (item.fulfillment !== 'PENDING') return NextResponse.json({ status: 'error', message: `Item is already ${item.fulfillment}.` }, { status: 409 });
  await prisma.orderItem.update({ where: { id: itemId }, data: { fulfillment: input.data.fulfillment, metadata: { ...(item.metadata as object | null ?? {}), adminNote: input.data.note ?? 'Completed manually by admin' } as never } });
  const result = await recomputeAndSettle(item.orderId);
  if (input.data.fulfillment === 'FULFILLED' && item.Order?.customerPhone) await sendSms(item.Order.customerPhone, `DigiMart: your ${item.Product.name} has been processed. Thank you.`);
  return NextResponse.json({ status: 'success', data: { itemId, fulfillment: input.data.fulfillment, orderStatus: result?.status ?? null } });
}
