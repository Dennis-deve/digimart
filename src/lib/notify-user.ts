import {prisma} from '@/lib/db';
import {sendPushToUser} from '@/lib/push';
/** Single place to notify a user: in-app row + web push (best-effort). */
export async function createNotification(input: { userId: string; title: string; message: string; type: string; url?: string }) {
  const row = await prisma.notification.create({ data: { id: crypto.randomUUID(), userId: input.userId, title: input.title, message: input.message, type: input.type } }).catch(() => null);
  await sendPushToUser(input.userId, { title: input.title, body: input.message, url: input.url ?? '/notifications' }).catch(() => undefined);
  return row;
}
