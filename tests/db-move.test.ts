import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { z } from 'zod';

describe('db-move table order (parents before children)', () => {
  const TABLES: string[] = ['User', 'Announcement', 'PlatformSettings', 'Product', 'Seller', 'Reseller', 'Rider', 'DeliveryZone', 'Coupon', 'ResellerProductMarkup', 'CustomerAddress', 'Order', 'OrderItem', 'Delivery', 'Payout', 'Refund', 'Notification', 'SupportTicket', 'SupportMessage', 'Review', 'Wallet', 'WalletEntry', 'AuditLog', 'PushSubscription'];
  const PARENT_OF: Record<string, string[]> = { OrderItem: ['Order', 'Product'], Delivery: ['Order'], Payout: ['Reseller', 'Seller'], Review: ['Product', 'User'], SupportMessage: ['SupportTicket'], WalletEntry: ['Wallet'], PushSubscription: ['User'], Order: ['User', 'Reseller'], ResellerProductMarkup: ['Product', 'Reseller'] };

  it('copies every referenced parent before its child', () => {
    for (const [child, parents] of Object.entries(PARENT_OF)) {
      const childIndex = TABLES.indexOf(child);
      expect(childIndex, `${child} missing from copy list`).toBeGreaterThan(-1);
      for (const parent of parents) {
        expect(TABLES.indexOf(parent), `${parent} must be copied before ${child}`).toBeLessThan(childIndex);
      }
    }
  });

  it('script file and test stay in sync', () => {
    const script = readFileSync('./scripts/db-move-postgres.mjs', 'utf8');
    const listMatch = script.match(/const TABLES = \[([^\]]+)\]/);
    expect(listMatch).toBeTruthy();
    const scriptTables = listMatch![1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean);
    expect(scriptTables).toEqual(TABLES);
  });
});

describe('web-push subscription payload validation (mirrors /api/push/subscribe)', () => {
  const schema = z.object({ endpoint: z.string().url().max(600), keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(200) }) });
  const good = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: { p256dh: 'a'.repeat(100), auth: 'b'.repeat(50) } };

  it('accepts a well-formed subscription', () => {
    expect(schema.safeParse(good).success).toBe(true);
  });
  it('rejects junk endpoints and empty keys', () => {
    expect(schema.safeParse({ endpoint: 'not-a-url', keys: good.keys }).success).toBe(false);
    expect(schema.safeParse({ endpoint: good.endpoint, keys: { p256dh: '', auth: 'x' } }).success).toBe(false);
  });
});
