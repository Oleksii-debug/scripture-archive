import assert from "node:assert/strict";
import test from "node:test";
import { COMMUNITY_RUNNER_AUDIENCE,verifyCommunityRunner } from "../lib/community-runner-identity.mjs";

const pair=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
const key={...await crypto.subtle.exportKey("jwk",pair.publicKey),kid:"test-signing-key",use:"sig"};
const now=Date.parse("2026-10-25T08:00:00Z"),seconds=now/1000;
const base={iss:"https://token.actions.githubusercontent.com",aud:COMMUNITY_RUNNER_AUDIENCE,repository:"Oleksii-debug/scripture-archive",repository_id:"1337375179",repository_owner_id:"316471245",ref:"refs/heads/main",workflow_ref:"Oleksii-debug/scripture-archive/.github/workflows/community-schedule.yml@refs/heads/main",sub:"repo:Oleksii-debug/scripture-archive:ref:refs/heads/main",event_name:"schedule",iat:seconds,exp:seconds+300};
const encode=value=>Buffer.from(value).toString("base64url");
async function token(changes={}){
  const message=`${encode(JSON.stringify({alg:"RS256",kid:key.kid}))}.${encode(JSON.stringify({...base,...changes}))}`;
  return `${message}.${encode(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,new TextEncoder().encode(message)))}`;
}
const options={now,fetcher:async url=>{assert.equal(url,"https://token.actions.githubusercontent.com/.well-known/jwks");return Response.json({keys:[key]})}};
test("signed identity of the approved main-branch scheduler is accepted",async()=>{
  assert.equal(await verifyCommunityRunner(await token(),options),true);
  assert.equal(await verifyCommunityRunner(await token({sub:"repo:Oleksii-debug@316471245/scripture-archive@1337375179:ref:refs/heads/main"}),options),true);
});
test("another repository, workflow, branch or audience cannot operate the scheduler",async()=>{
  for(const changes of [{repository_id:"1"},{repository_owner_id:"1"},{sub:"repo:Oleksii-debug@1/scripture-archive@1337375179:ref:refs/heads/main"},{ref:"refs/pull/1/merge"},{workflow_ref:"other"},{aud:"other"},{event_name:"pull_request"}])
    assert.equal(await verifyCommunityRunner(await token(changes),options),false);
});
test("expired identities and a valid claim set with a forged signature are rejected",async()=>{
  assert.equal(await verifyCommunityRunner(await token({exp:seconds-1}),options),false);
  const valid=await token();const parts=valid.split(".");const signature=Buffer.from(parts[2],"base64url");signature[0]^=1;
  assert.equal(await verifyCommunityRunner(`${parts[0]}.${parts[1]}.${signature.toString("base64url")}`,options),false);
});

test("signed tokens with malformed or inverted NumericDate claims fail closed",async()=>{
  const invalid=[
    {nbf:"not-a-time"},{nbf:String(seconds-5)},{nbf:null},{nbf:false},
    {nbf:seconds+0.5},{nbf:seconds+31},{nbf:seconds+500},
    {exp:String(seconds+300)},{exp:seconds+0.5},{iat:String(seconds)},
    {iat:seconds+0.5},{iat:seconds+25,exp:seconds+10},
    {nbf:seconds+15,exp:seconds+10},
  ];
  for(const changes of invalid){
    assert.equal(await verifyCommunityRunner(await token(changes),options),false,
      "invalid NumericDate claims: "+JSON.stringify(changes));
  }
});
test("valid signed scheduler tokens with bounded nbf remain accepted",async()=>{
  assert.equal(await verifyCommunityRunner(await token({nbf:seconds-1}),options),true);
  assert.equal(await verifyCommunityRunner(await token({nbf:seconds+30}),options),true);
});
