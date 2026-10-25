import { env } from "cloudflare:workers";
import { ensureCommunityRun, controlCommunity, leaseCommunityAgents } from "./community-engine";
import { COMMUNITY_RUN_ID } from "./community";
import { runCommunityAgent } from "./run-community-agent.mjs";
import { communityDeploymentReady } from "./community-smoke.mjs";

export async function runScheduledCommunity() {
  if (!env.DB || !env.APP_BASE_URL) return;
  const origin = new URL(env.APP_BASE_URL).origin;
  if (!["https://scripture-archive.com", "https://scripture-archive-live.bubblybasil20.chatgpt.site"].includes(origin)) return;
  await ensureCommunityRun();
  const run = await env.DB.prepare("SELECT status FROM community_runs WHERE id=?").bind(COMMUNITY_RUN_ID).first<{status:string}>();
  if (run?.status === "waiting" && env.COMMUNITY_AUTOSTART === "1") {
    // A fresh deployment must prove its own public routes before activation.
    // Paused/stopped runs are never resumed by this flag or by a redeployment.
    if(!await communityDeploymentReady(origin))return;
    await controlCommunity("start");
  }
  const leased = await leaseCommunityAgents(2);
  await Promise.allSettled(leased.jobs.map(job => runCommunityAgent({ origin, token: job.token, seed: job.seed })));
}
