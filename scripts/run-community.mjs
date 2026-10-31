import { setTimeout } from "node:timers/promises";
import { runCommunityAgent } from "../lib/run-community-agent.mjs";

const configured = new URL(process.env.COMMUNITY_ORIGIN || "https://scripture-archive.com");
const local = ["127.0.0.1", "localhost", "[::1]"].includes(configured.hostname);
const publicOrigins = new Set([
  "https://scripture-archive.com",
  "https://scripture-archive-live.bubblybasil20.chatgpt.site",
]);
if (configured.username || configured.password || (!local && !publicOrigins.has(configured.origin)))
  throw Error("Use the Scripture Archive origin or a loopback test worker.");
const origin = configured.origin;
const stop = new AbortController();
process.once("SIGINT", () => stop.abort());
process.once("SIGTERM", () => stop.abort());
let previous = "";
const active = new Set();
const executeAgents = process.argv.includes("--agents");
const ownerCookie = process.env.COMMUNITY_OWNER_COOKIE;
if (executeAgents && !ownerCookie) throw Error("Agent execution needs an owner session in COMMUNITY_OWNER_COOKIE; never put it in Git or logs.");
try {
  do {
    const response = await fetch(`${origin}/api/community?public=summary`, {
      redirect: "manual",
      headers: { Accept: "application/json" },
      signal: AbortSignal.any([stop.signal, AbortSignal.timeout(15000)]),
    });
    if (response.status === 404)
      throw Error(`Community API is not deployed at ${origin}; no public bot run was started.`);
    if (!response.ok) throw Error(`Community API returned HTTP ${response.status}; scheduler stopped.`);
    const data = await response.json().catch(() => null);
    const registered = data?.summary?.registered;
    const online = data?.summary?.online;
    // Do not request owner leases from inconsistent or unsafe public counters.
    // Keep the same finite, nonnegative SQL COUNT boundary as release smoke.
    if (!Number.isSafeInteger(registered) || registered < 0 ||
        !Number.isSafeInteger(online) || online < 0 || online > registered)
      throw Error("Community API returned an unexpected payload; scheduler stopped.");
    const summary = JSON.stringify(data.summary);
    if (summary !== previous) {
      console.log(JSON.stringify({
        at: new Date().toISOString(), timeZone: "Europe/Warsaw", origin,
        summary: data.summary, localOnly: local,
      }));
      previous = summary;
    }
    if (executeAgents && active.size < 2) {
      const leased = await fetch(`${origin}/api/community`, {
        method: "POST", redirect: "manual", headers: { Origin: origin, Cookie: ownerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lease", limit: 2 - active.size }),
        signal: AbortSignal.any([stop.signal, AbortSignal.timeout(15000)]),
      });
      if (!leased.ok) throw Error(`Agent lease denied (HTTP ${leased.status}); no owner access was bypassed.`);
      const { jobs = [] } = await leased.json();
      for (const job of jobs) {
        const task = runCommunityAgent({ origin, token: job.token, seed: job.seed, signal: stop.signal })
          .then(result => console.log(JSON.stringify({ at: new Date().toISOString(), event: "agent_completed", ...result, localOnly: local })))
          .catch(error => { if (!stop.signal.aborted) console.error(error.message); })
          .finally(() => active.delete(task));
        active.add(task);
      }
    }
    if (process.argv.includes("--once")) break;
    await setTimeout(30000, undefined, { signal: stop.signal });
  } while (!stop.signal.aborted);
} catch (error) {
  if (!stop.signal.aborted) { console.error(error.message); process.exitCode = 1; }
  stop.abort();
} finally {
  await Promise.allSettled([...active]);
}
