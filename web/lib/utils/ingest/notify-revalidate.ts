// Best-effort POST to app/api/ingest/revalidate after a successful ingest run
// (2026-08-20-ingest-cache-revalidation-design.md), so the deployed app doesn't wait out
// the `ingest` cacheLife profile's 6h `revalidate` window before reflecting fresh data.
// CI-only by design (decision, 2026-08-20): a local `npm run ingest:* -- --seasons ...`
// run against prod has no APP_URL/INGEST_REVALIDATE_SECRET in `.env.local`, so this
// silently no-ops there — same 6h-window behavior as before this feature, on purpose.
// Never throws (invariant 7 — an ingest run's success must not hinge on this succeeding).
export async function notifyRevalidate(
  tags: string[],
  opts?: { fetchImpl?: typeof fetch; timeoutMs?: number }
): Promise<void> {
  const appUrl = process.env.APP_URL;
  const secret = process.env.INGEST_REVALIDATE_SECRET;
  if (!appUrl || !secret) {
    console.log('Skipping cache revalidation: APP_URL/INGEST_REVALIDATE_SECRET not set');
    return;
  }
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? 5000;
  try {
    const res = await fetchImpl(`${appUrl}/api/ingest/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.error(`Cache revalidation failed: ${res.status} ${await res.text()}`);
    } else {
      console.log(`Cache revalidation triggered for tags: ${tags.join(', ')}`);
    }
  } catch (e) {
    console.error(`Cache revalidation request failed (non-fatal): ${(e as Error).message}`);
  }
}
