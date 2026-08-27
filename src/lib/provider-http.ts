// Hardened HTTP layer for ALL external provider calls.
// - Every request gets a timeout (a hung provider must never freeze checkout/webhooks)
// - No-store caching so status lookups are always fresh
// - Errors are normalized; response bodies parse defensively
export const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS ?? 15000);

export async function providerFetch(url: string, init: RequestInit = {}, timeoutMs = PROVIDER_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function providerJson<T>(url: string, init: RequestInit = {}, timeoutMs = PROVIDER_TIMEOUT_MS): Promise<{ ok: boolean; status: number; body: T | null }> {
  try {
    const response = await providerFetch(url, init, timeoutMs);
    let body: T | null = null;
    try { body = await response.json() as T; } catch { body = null; }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    const message = (error as Error).name === 'AbortError' ? `Provider request timed out after ${timeoutMs / 1000}s` : 'Provider request failed';
    throw new Error(message);
  }
}
