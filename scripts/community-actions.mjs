import { setTimeout } from "node:timers/promises";
import { COMMUNITY_RUNNER_AUDIENCE, verifyCommunityRunner } from "../lib/community-runner-identity.mjs";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";
import { runCommunityAgent } from "../lib/run-community-agent.mjs";

const origin="https://scripture-archive.com";
if(process.env.GITHUB_REPOSITORY!=="Oleksii-debug/scripture-archive"||process.env.GITHUB_REF!=="refs/heads/main")
  throw Error("The community scheduler only runs in the approved repository's main workflow.");
const stop=new AbortController();
process.once("SIGTERM",()=>stop.abort());process.once("SIGINT",()=>stop.abort());
const active=new Set();
const until=Date.now()+5*60*1000;
let currentToken="",tokenExpires=0;
async function identityToken(){
  if(Date.now()<tokenExpires)return currentToken;
  const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  if(url.protocol!=="https:")throw Error("Invalid GitHub identity endpoint.");
  url.searchParams.set("audience",COMMUNITY_RUNNER_AUDIENCE);
  const response=await fetch(url,{redirect:"error",headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error("GitHub did not issue a workload identity.");
  currentToken=(await response.json()).value;
  if(typeof currentToken!=="string")throw Error("GitHub workload identity is missing.");
  tokenExpires=Date.now()+120000;
  return currentToken;
}
if(!await verifyCommunityRunner(await identityToken()))throw Error("GitHub workload identity does not match the approved scheduler.");
console.log("Approved scheduler identity verified; no credentials are written to logs.");
if(!await communityDeploymentReady(origin)){
  console.log("The new public deployment is not ready; no activity was started.");
  process.exit(0);
}
try{
  do{
    if(Date.now()>=until){
      const response=await fetch(`${origin}/api/community?public=summary`,{signal:AbortSignal.any([stop.signal,AbortSignal.timeout(15000)])});
      if(!response.ok)throw Error(`Community heartbeat failed (HTTP ${response.status}).`);
      await setTimeout(15000,undefined,{signal:stop.signal});
      continue;
    }
    const response=await fetch(`${origin}/api/community/dispatch`,{
      method:"POST",redirect:"manual",headers:{Authorization:`Bearer ${await identityToken()}`},
      signal:AbortSignal.any([stop.signal,AbortSignal.timeout(15000)]),
    });
    if(!response.ok)throw Error(`Community dispatch rejected the runner (HTTP ${response.status}).`);
    const {jobs=[],status}=await response.json();
    if(["paused","stopped","waiting"].includes(status)&&!active.size)break;
    for(const job of jobs){
      const task=runCommunityAgent({origin,token:job.token,seed:job.seed,signal:stop.signal})
        .then(result=>console.log(JSON.stringify({at:new Date().toISOString(),event:"completed",score:result.score,total:result.total})))
        .catch(error=>{if(!stop.signal.aborted)console.error(error.message)})
        .finally(()=>active.delete(task));
      active.add(task);
    }
    await setTimeout(15000,undefined,{signal:stop.signal});
  }while(!stop.signal.aborted&&(Date.now()<until||active.size));
}catch(error){if(!stop.signal.aborted){console.error(error.message);process.exitCode=1;stop.abort();}}
finally{await Promise.allSettled([...active]);}
