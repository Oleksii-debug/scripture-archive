const issuer="https://token.actions.githubusercontent.com";
export const COMMUNITY_RUNNER_AUDIENCE="https://scripture-archive.com/community-runner";
const repository="Oleksii-debug/scripture-archive";
const workflow=`${repository}/.github/workflows/community-schedule.yml@refs/heads/main`;
const subjects=new Set([
  `repo:${repository}:ref:refs/heads/main`,
  "repo:Oleksii-debug@316471245/scripture-archive@1337375179:ref:refs/heads/main",
]);
let cachedKeys=null;
let cachedUntil=0;
function decode(value){return Uint8Array.from(atob(value.replaceAll("-","+").replaceAll("_","/")+"=".repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));}

export async function verifyCommunityRunner(token,{fetcher=fetch,now=Date.now()}={}){
  try{
    if(typeof token!=="string"||token.length>16000)return false;
    const parts=token.split(".");if(parts.length!==3)return false;
    const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
    const seconds=Math.floor(now/1000);
    if(header.alg!=="RS256"||typeof header.kid!=="string"||header.kid.length>200)return false;
    if(claims.iss!==issuer||claims.aud!==COMMUNITY_RUNNER_AUDIENCE||claims.repository!==repository||String(claims.repository_id)!=="1337375179"||String(claims.repository_owner_id)!=="316471245"
      ||claims.ref!=="refs/heads/main"||(claims.job_workflow_ref||claims.workflow_ref)!==workflow||!subjects.has(claims.sub)
      ||!["push","schedule","workflow_dispatch"].includes(claims.event_name))return false;
    // A signed token must still have structurally valid NumericDate claims.
    // JavaScript's relational coercion accepts malformed nbf strings/null and
    // an issue-before-expiry inversion can slip through the clock-skew window.
    if(!Number.isSafeInteger(claims.exp)||!Number.isSafeInteger(claims.iat)||
      claims.exp<=seconds||claims.iat>seconds+30||claims.iat>claims.exp||
      claims.exp-claims.iat>900||
      (claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||
        claims.nbf>seconds+30||claims.nbf>=claims.exp)))return false;
    let keys=fetcher===fetch&&cachedUntil>now?cachedKeys:null;
    if(!keys){
      const response=await fetcher(`${issuer}/.well-known/jwks`,{redirect:"error",signal:AbortSignal.timeout(10000)});
      if(!response.ok)return false;
      keys=(await response.json()).keys;
      if(!Array.isArray(keys))return false;
      if(fetcher===fetch){cachedKeys=keys;cachedUntil=now+60000;}
    }
    const jwk=keys.find(key=>key.kid===header.kid&&key.kty==="RSA"&&(key.use===undefined||key.use==="sig"));
    if(!jwk)return false;
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  }catch{return false;}
}
