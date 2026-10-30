// Wait for an actually settled disposable worker, not merely the first 200.
// Only side-effect-free GET probes are polled. Mutating API calls are never retried.
export async function waitForStableWorker(base, {
  fetcher = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  isStopped = () => false,
  attempts = 100,
  consecutive = 8,
  intervalMs = 300,
  routes = [],
} = {}) {
  if (!Number.isInteger(attempts) || attempts < 1 || !Number.isInteger(consecutive)
      || consecutive < 1 || !Number.isFinite(intervalMs) || intervalMs < 0
      || !Array.isArray(routes) || routes.some(item => !item || typeof item.path !== 'string'
        || !item.path.startsWith('/') || item.path.startsWith('//')
        || typeof item.validate !== 'function'))
    throw new RangeError('Invalid worker-readiness limits or routes.');
  const probes = [{path:'/api/account?action=me', validate:data=>data?.user === null}, ...routes];
  let healthy = 0;
  for (let count = 0; count < attempts; count++) {
    if (isStopped()) return false;
    let complete = true;
    for (const probe of probes) {
      if (isStopped()) return false;
      try {
        const response = await fetcher(`${base}${probe.path}`, {
          method:'GET',
          signal: AbortSignal.timeout(1000),
        });
        if (response.status !== 200 || !probe.validate(await response.json())) {
          complete = false;
          break;
        }
      } catch {
        complete = false;
        break;
      }
    }
    healthy = complete ? healthy + 1 : 0;
    if (healthy >= consecutive) return true;
    if (count + 1 < attempts) await sleep(intervalMs);
  }
  return false;
}


// Keep the *local dev proxy's* idle connection fresh during long integration
// scenarios (Cloudflare's local proxy may drop a connection at its 5s idle
// boundary and report a misleading Worker restart on the next POST).
// This probes only the existing public-safe GET, never replays a write.
export function startReadOnlyHeartbeat(base, {
  fetcher = fetch,
  intervalMs = 1100,
  schedule = (callback, ms) => setInterval(callback, ms),
  cancel = handle => clearInterval(handle),
} = {}) {
  if (typeof base !== "string" || !/^https?:\/\/[^/]+$/.test(base)
      || typeof fetcher !== "function" || typeof schedule !== "function"
      || typeof cancel !== "function" || !Number.isFinite(intervalMs)
      || intervalMs < 100 || intervalMs > 4500)
    throw new RangeError("Invalid local Worker heartbeat configuration.");
  let active = true, inFlight = false, pending = Promise.resolve();
  const metrics = { probes: 0, failures: 0 };
  const pulse = () => {
    if (!active || inFlight) return;
    inFlight = true;
    metrics.probes++;
    pending = Promise.resolve().then(() => fetcher(base + "/api/account?action=me", {
      method: "GET", signal: AbortSignal.timeout(900),
    })).then(async response => {
      if (response?.status !== 200 || (await response.json())?.user !== null)
        metrics.failures++;
    }).catch(() => { metrics.failures++; }).finally(() => { inFlight = false; });
  };
  const handle = schedule(pulse, intervalMs);
  // The disposable HTTP suite can complete before the first interval tick.
  // Keep the local proxy alive immediately, using the same safe GET probe.
  pulse();
  return async () => {
    active = false;
    cancel(handle);
    await pending;
    return { ...metrics };
  };
}
