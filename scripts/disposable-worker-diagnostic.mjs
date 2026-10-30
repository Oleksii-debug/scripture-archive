// Diagnostic only: following a failed disposable Worker/D1 run, distinguish
// "still serving safe reads" from "proxy/Worker unavailable" without ever
// replaying a potentially committed POST/PUT or logging private response data.
const PROBES = Object.freeze([
  { id: "account", path: "/api/account?action=me",
    valid: data => data !== null && typeof data === "object" && data.user === null },
  { id: "editor", path: "/api/editor-roles?view=me",
    valid: data => data !== null && typeof data === "object" && data.editor === false },
  { id: "public-review", path: "/api/material-review?view=public",
    valid: data => data !== null && typeof data === "object" && Array.isArray(data.items) },
]);

export async function diagnoseDisposableWorkerReads(base, {
  fetcher = fetch,
  timeoutMs = 900,
  signalFactory = ms => AbortSignal.timeout(ms),
} = {}) {
  const parsed = typeof base === "string" &&
    /^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(base);
  if (!parsed || Number(parsed[1]) > 65535 || typeof fetcher !== "function" ||
      typeof signalFactory !== "function" || !Number.isInteger(timeoutMs) ||
      timeoutMs < 100 || timeoutMs > 2000) {
    throw new RangeError("Disposable diagnostic accepts only bounded loopback GET probes.");
  }
  const results = [];
  for (const probe of PROBES) {
    try {
      const response = await fetcher(base + probe.path, {
        method: "GET", redirect: "manual", cache: "no-store",
        signal: signalFactory(timeoutMs),
      });
      // Persist statuses and a strict public response-shape bit only.
      // Never include response bodies, headers, errors, cookies or user IDs.
      const status = Number.isInteger(response?.status) ? response.status : null;
      let valid = false;
      if (status === 200) {
        try { valid = probe.valid(await response.json()); } catch { /* invalid JSON */ }
      }
      results.push({ target: probe.id, status, shape_ok: valid });
    } catch {
      results.push({ target: probe.id, status: null, shape_ok: false });
    }
  }
  return {
    kind: "DISPOSABLE_WORKER_READONLY_AFTER_FAILURE",
    all_responsive: results.every(row => row.status === 200 && row.shape_ok),
    probes: results,
  };
}
