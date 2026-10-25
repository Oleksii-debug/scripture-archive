import { setTimeout } from "node:timers/promises";

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
    if (!Number.isInteger(data?.summary?.registered) || !Number.isInteger(data?.summary?.online))
      throw Error("Community API returned an unexpected payload; scheduler stopped.");
    const summary = JSON.stringify(data.summary);
    if (summary !== previous) {
      console.log(JSON.stringify({
        at: new Date().toISOString(), timeZone: "Europe/Warsaw", origin,
        summary: data.summary, localOnly: local,
      }));
      previous = summary;
    }
    if (process.argv.includes("--once")) break;
    await setTimeout(30000, undefined, { signal: stop.signal });
  } while (!stop.signal.aborted);
} catch (error) {
  if (!stop.signal.aborted) { console.error(error.message); process.exitCode = 1; }
}
