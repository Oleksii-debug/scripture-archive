import { env } from "cloudflare:workers";
import { verifyCommunityRunner } from "../../../../lib/community-runner-identity.mjs";
import { ensureCommunityRun, controlCommunity, leaseCommunityAgents } from "../../../../lib/community-engine";
import { COMMUNITY_RUN_ID } from "../../../../lib/community";
import { rateLimit, requestAddress } from "../../../../lib/auth";

export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
// No DB write or credential access: only identifies a deployment that
// supports the signed runner dispatch contract. The POST below retains the
// independent exact OIDC verification and owner-controlled start policy.
export function GET(){
  return new Response(null,{status:204,headers:{"Cache-Control":"no-store","X-Scripture-Runner-Protocol":"github-oidc-v1"}});
}

export async function POST(request:Request){
  if(!env.DB)return json({error:"database_unavailable"},503);
  if(!await rateLimit(`community-dispatch:${requestAddress(request)}`,30,60))return json({error:"too_many_requests"},429);
  const bearer=request.headers.get("authorization")||"";
  if(!bearer.startsWith("Bearer ")||!await verifyCommunityRunner(bearer.slice(7)))return json({error:"forbidden"},403);
  // The signed, main-branch workflow performs the external deployment smoke
  // check before this request. It can start a waiting run, never resume a stop.
  await ensureCommunityRun();
  const run=await env.DB.prepare("SELECT status FROM community_runs WHERE id=?").bind(COMMUNITY_RUN_ID).first<{status:string}>();
  if(run?.status==="waiting"){
    if(env.COMMUNITY_AUTOSTART!=="1")return json({jobs:[],status:"waiting"});
    await controlCommunity("start");
  }
  return json(await leaseCommunityAgents(2));
}
