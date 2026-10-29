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
