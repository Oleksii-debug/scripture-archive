// Wait for an actually settled disposable worker, not merely the first 200.
// Only a side-effect-free GET is polled. Mutating API calls are never retried.
export async function waitForStableWorker(base, {
  fetcher = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  isStopped = () => false,
  attempts = 100,
  consecutive = 8,
  intervalMs = 300,
} = {}) {
  if (!Number.isInteger(attempts) || attempts < 1 || !Number.isInteger(consecutive)
      || consecutive < 1 || !Number.isFinite(intervalMs) || intervalMs < 0)
    throw new RangeError("Invalid worker-readiness limits.");
  let healthy = 0;
  for (let count = 0; count < attempts; count++) {
    if (isStopped()) return false;
    try {
      const response = await fetcher(`${base}/api/account?action=me`, {
        method: "GET",
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok && response.status === 200 && (await response.json()).user === null) {
        healthy++;
        if (healthy >= consecutive) return true;
      } else healthy = 0;
    } catch {
      healthy = 0;
    }
    if (count + 1 < attempts) await sleep(intervalMs);
  }
  return false;
}
