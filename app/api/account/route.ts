import { env } from "cloudflare:workers";
import { authenticateRequest, isVerifiedOwner, sameOrigin, type Identity } from "../../../lib/auth";
import mission from "../../../content/mission-abraham.json";
import catalog from "../../../public/data/catalog.json";
export const dynamic = "force-dynamic";
const AGE_RANGES = new Set(["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]);
const ALLOWED_LOCALES = new Set(["uk", "ru", "en"]);
const TRADITIONS = new Set(["orthodox", "catholic", "protestant", "other", "prefer_not"]);
const MARITAL_STATUSES = new Set(["married", "married_children", "single", "seeking", "separated", "widowed", "prefer_not"]);
const GENDERS = new Set(["man", "woman", "prefer_not"]);
function privateJson(data:unknown,init?:{status?:number}){return Response.json(data,{status:init?.status??200,headers:{"Cache-Control":"no-store, private"}})}
function unauthorized(){return privateJson({error:"authentication_required"},{status:401})}
// A resolved D1 promise is not a durable mutation acknowledgement.
function confirmedD1Changes(result:unknown):number|null{
  const receipt=result as {success?:unknown;meta?:{changes?:unknown}}|null;
  const changes=receipt?.meta?.changes;
  return receipt?.success===true&&typeof changes==="number"&&Number.isSafeInteger(changes)&&changes>=0?changes:null;
}
function clean(value:unknown,max=120){return typeof value==="string"?value.trim().slice(0,max):""}
// Preserve user-authored profile/consent text; trimming is intentional,
// silently cutting identity or sensitive-profile fields before D1 is not.
function oversized(value:unknown,max:number){return typeof value==="string"&&value.trim().length>max}
// The reader renders every receipt as a book/chapter/title. Do not ACK damaged arrays.
// Reading receipts do not store an edition. Accept the chapter when it is
// present in at least one canonical LOCAL Bible edition, including translated
// chapter-number differences (e.g. Ohiienko Joel/JOL chapter 4). Never accept
// invented books/chapters merely because they match the reference shape.
const READING_CHAPTERS=new Map<string,number>(catalog.books.en.map(book=>[book.code,book.chapters]));
for(const books of Object.values(catalog.editionBooks)){
  for(const book of books){
    READING_CHAPTERS.set(book.code,Math.max(READING_CHAPTERS.get(book.code)??0,book.chapters));
  }
}
function validReadingReceipt(value:unknown):value is {book:string;chapter:number;title:string}{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return typeof row.book==="string"&&/^[1-3]?[A-Z]{2,3}$/.test(row.book)
    &&typeof row.chapter==="number"&&Number.isInteger(row.chapter)&&row.chapter>0&&row.chapter<=(READING_CHAPTERS.get(row.book as string)??0)
    &&typeof row.title==="string"&&row.title.trim().length>0&&row.title.length<=100;
}
function publicUser(id:Identity,row:Record<string,unknown>|null){return {id:id.userId,email:id.email,emailVerified:id.emailVerified,authProvider:id.provider,fullName:id.fullName,firstName:row?.first_name??"",lastName:row?.last_name??"",ageRange:row?.age_range??"",age:row?.age??null,tradition:row?.tradition??"",denomination:row?.denomination??"",church:row?.church??"",maritalStatus:row?.marital_status??"",gender:row?.gender??"",hasChildren:row?.has_children==null?null:(row.has_children===1),locale:row?.locale??"uk",sensitiveConsent:(row?.sensitive_consent===1 && row?.sensitive_consent_version===1),visibility:{firstName:(row?.public_first_name===1),lastName:(row?.public_last_name===1),church:(row?.public_church===1 && row?.sensitive_consent===1 && row?.sensitive_consent_version===1),progress:(row?.public_progress===1),community:(row?.public_community===1 && (row?.public_first_name===1 || row?.public_last_name===1))},profileComplete:Boolean(row),isOwner:isVerifiedOwner(id)}}
export async function GET(request:Request){
  const action=new URL(request.url).searchParams.get("action")??"me";
  // Absence of the identity database is not proof that a saved session has
  // signed out. Never return user:null for a backend outage.
  if(!env.DB)return privateJson({error:"database_unavailable"},{status:503});
  let id: Awaited<ReturnType<typeof authenticateRequest>>;
  try{id=await authenticateRequest(request);}
  catch{return privateJson({error:"account_state_unavailable"},{status:503});}
  if(!id)return action==="me"?privateJson({user:null}):unauthorized();
  if(action==="reading"){
    try{
      const row=await env.DB!.prepare("SELECT data FROM progress WHERE user_id=? AND mission_id='READING'").bind(id.userId).first<{data:string}>();
      if(!row)return privateJson({reading:[]});
      const reading=JSON.parse(row.data);
      // Bound legacy D1 histories by the same 2,000-entry write contract.
      // Return only canonical receipt fields, never extra historical private JSON.
      if(Array.isArray(reading)&&reading.length<=2000&&reading.every(validReadingReceipt))
        return privateJson({reading:reading.map(entry=>({
          book:entry.book,chapter:entry.chapter,title:entry.title,
        }))});
    }catch{}
    // D1 errors and corrupt history are unavailable, not an empty reading history.
    return privateJson({error:"reading_state_unavailable"},{status:503});
  }
  if(action==="progress"){
    try{
      const rows=await env.DB!.prepare("SELECT data FROM progress WHERE user_id=? AND mission_id LIKE 'OT-AB-01:%'").bind(id.userId).all<{data:string}>();
      if((rows as {success?:boolean}).success===false||!Array.isArray(rows.results))throw Error("progress read not acknowledged");
      const answered=new Set<string>(),correct=new Set<string>();
      const validTasks=new Set(mission.tasks.map(task=>task.id));
      let validRows=0,corruptRows=0;
      for(const row of rows.results){
        // Preserve the accepted legacy contract: one damaged historical
        // snapshot must not erase a separate valid saved attempt.
        try{
          const result=JSON.parse(row.data);
          if(!result||typeof result!=="object"||!Array.isArray(result.details))
            throw Error("invalid saved mission result");
          for(const detail of result.details){
            if(!detail||typeof detail.taskId!=="string"||typeof detail.correct!=="boolean")
              throw Error("invalid saved mission answer");
          }
          validRows++;
          for(const detail of result.details){
            if(!validTasks.has(detail.taskId))continue;
            answered.add(detail.taskId);
            if(detail.correct)correct.add(detail.taskId);
          }
        }catch{corruptRows++;}
      }
      // All returned records corrupt is different from genuinely no records.
      if(corruptRows&&!validRows)throw Error("no readable saved mission result");
      return privateJson({progress:{index:answered.size,correct:[...correct],complete:answered.size===validTasks.size},
        ...(corruptRows?{warning:"partial_progress_history"}:{})});
    }catch{
      // Never assert "no progress" when the private database read failed.
      return privateJson({error:"progress_state_unavailable"},{status:503});
    }
  }
  if(action==="users"){
    if(!isVerifiedOwner(id))return privateJson({error:"forbidden"},{status:403});
    try{
      const rows=await env.DB.prepare("SELECT email,first_name,last_name,age_range,locale,created_at,updated_at FROM profiles ORDER BY created_at DESC LIMIT 250").all();
      if(!rows.success||!Array.isArray(rows.results))throw Error("owner users read failed");
      return privateJson({users:rows.results});
    }catch{return privateJson({error:"account_state_unavailable"},{status:503});}
  }
  // A mistyped or unsupported account read must never fall through to the
  // private profile payload. Retain the existing explicit profile read alias.
  if(action!=="me"&&action!=="profile")return privateJson({error:"unknown_action"},{status:400});
  try{
    const row=await env.DB.prepare("SELECT * FROM profiles WHERE user_id=?").bind(id.userId).first<Record<string,unknown>>();
    return privateJson({user:publicUser(id,row)});
  }catch{return privateJson({error:"account_state_unavailable"},{status:503});}
}
export async function POST(request:Request){return write(request)} export async function PUT(request:Request){return write(request)}
async function write(request:Request){
  if(!sameOrigin(request))return privateJson({error:"cross_origin_request"},{status:403});
  if(!env.DB)return privateJson({error:"database_unavailable"},{status:503});
  let id: Awaited<ReturnType<typeof authenticateRequest>>;
  try{id=await authenticateRequest(request);}
  catch{return privateJson({error:"account_state_unavailable"},{status:503});}
  if(!id)return unauthorized();const action=new URL(request.url).searchParams.get("action")??"profile";const body=await request.json().catch(()=>null) as Record<string,unknown>|null;if(!body)return privateJson({error:"invalid_json"},{status:400});
  if(action==="reading"){
    if(!Array.isArray(body.reading)||body.reading.length>2000)return privateJson({error:"invalid_reading"},{status:400});
    // Reject the entire invalid request: silently filtering all entries used to return a false 200 ACK.
    // Do not acknowledge a different title from the one the reader sent.
    // The canonical title limit is 100; trimming whitespace is intentional,
    // silently slicing a longer authored title before persistence is not.
    if(!body.reading.every(r=>r&&typeof r==="object"&&!Array.isArray(r)&&
        typeof r.title==="string"&&r.title.trim().length<=100&&
        // Bible book codes are exact catalog identifiers, not display text.
        // Never alias caller whitespace to another saved reading key.
        typeof r.book==="string"&&r.book.length>0&&r.book.length<=4&&
        r.book===r.book.trim()))
      return privateJson({error:"invalid_reading"},{status:400});
    const reading=body.reading.map(r=>({book:clean(r.book,4),chapter:r.chapter,title:clean(r.title,100)}));
    if(!reading.every(validReadingReceipt))return privateJson({error:"invalid_reading"},{status:400});
    const unique=[...new Map(reading.map(r=>[`${r.book}:${r.chapter}`,r])).values()];
    // Validate prior, possibly legacy receipts inside the same atomic D1 merge.
    const chapterLimits=JSON.stringify(Object.fromEntries(READING_CHAPTERS));
    // Serialize the merge in one canonical D1 statement. Never replace a newer read receipt with a stale snapshot.
    // Invalid stored JSON fails the transaction rather than overwriting evidence of corruption.
    try {
    const result=await env.DB!.prepare(`
      INSERT INTO progress (user_id,mission_id,data,updated_at)
      VALUES (?,'READING',?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id,mission_id) DO UPDATE SET
        data=(
          SELECT COALESCE(json_group_array(json(entry)), '[]')
          FROM (
            SELECT previous.value AS entry FROM json_each(CASE WHEN json_valid(progress.data) AND json_type(progress.data)='array'
              AND NOT EXISTS (
                SELECT 1 FROM json_each(progress.data) AS receipt
                WHERE COALESCE(json_type(receipt.value),'missing')!='object'
                   OR COALESCE(json_type(receipt.value,'$.book'),'missing')!='text'
                   OR COALESCE(json_type(receipt.value,'$.chapter'),'missing')!='integer'
                   OR COALESCE(json_type(receipt.value,'$.title'),'missing')!='text'
                   OR NOT (json_extract(receipt.value,'$.chapter') BETWEEN 1 AND 151)
                   OR length(json_extract(receipt.value,'$.title'))>100
                   OR length(trim(json_extract(receipt.value,'$.title'), char(9)||char(10)||char(13)||' '))=0
                   OR COALESCE(json_extract(?, '$.' || json_extract(receipt.value,'$.book')), 0)<json_extract(receipt.value,'$.chapter')
                   OR NOT (
                     json_extract(receipt.value,'$.book') GLOB '[A-Z][A-Z]'
                     OR json_extract(receipt.value,'$.book') GLOB '[A-Z][A-Z][A-Z]'
                     OR json_extract(receipt.value,'$.book') GLOB '[1-3][A-Z][A-Z]'
                     OR json_extract(receipt.value,'$.book') GLOB '[1-3][A-Z][A-Z][A-Z]'
                   )
              )
              THEN progress.data ELSE 'invalid_reading_history' END) AS previous
            UNION ALL
            SELECT incoming.value AS entry FROM json_each(excluded.data) AS incoming
            WHERE NOT EXISTS (
              SELECT 1 FROM json_each(CASE WHEN json_valid(progress.data) AND json_type(progress.data)='array'
              AND NOT EXISTS (
                SELECT 1 FROM json_each(progress.data) AS receipt
                WHERE COALESCE(json_type(receipt.value),'missing')!='object'
                   OR COALESCE(json_type(receipt.value,'$.book'),'missing')!='text'
                   OR COALESCE(json_type(receipt.value,'$.chapter'),'missing')!='integer'
                   OR COALESCE(json_type(receipt.value,'$.title'),'missing')!='text'
                   OR NOT (json_extract(receipt.value,'$.chapter') BETWEEN 1 AND 151)
                   OR length(json_extract(receipt.value,'$.title'))>100
                   OR length(trim(json_extract(receipt.value,'$.title'), char(9)||char(10)||char(13)||' '))=0
                   OR COALESCE(json_extract(?, '$.' || json_extract(receipt.value,'$.book')), 0)<json_extract(receipt.value,'$.chapter')
                   OR NOT (
                     json_extract(receipt.value,'$.book') GLOB '[A-Z][A-Z]'
                     OR json_extract(receipt.value,'$.book') GLOB '[A-Z][A-Z][A-Z]'
                     OR json_extract(receipt.value,'$.book') GLOB '[1-3][A-Z][A-Z]'
                     OR json_extract(receipt.value,'$.book') GLOB '[1-3][A-Z][A-Z][A-Z]'
                   )
              )
              THEN progress.data ELSE 'invalid_reading_history' END) AS previous
              WHERE json_extract(previous.value,'$.book')=json_extract(incoming.value,'$.book')
                AND json_extract(previous.value,'$.chapter')=json_extract(incoming.value,'$.chapter')
            )
          )
        ),
        updated_at=CURRENT_TIMESTAMP
        -- The private GET contract rejects histories longer than 2000.
        -- Check FINAL merged length in this atomic UPSERT. A stale client's
        -- snapshot may overlap old chapters. Legacy histories can have 2000
        -- entries. Never ACK a write that would make the private GET fail.
        WHERE json_array_length(progress.data) + (
          SELECT COUNT(*) FROM json_each(excluded.data) AS incoming
          WHERE NOT EXISTS (
            SELECT 1 FROM json_each(progress.data) AS existing
            WHERE json_extract(existing.value,'$.book')=json_extract(incoming.value,'$.book')
              AND json_extract(existing.value,'$.chapter')=json_extract(incoming.value,'$.chapter')
          )
        ) <= 2000
    `).bind(id.userId,JSON.stringify(unique),chapterLimits,chapterLimits).run();
    const written=confirmedD1Changes(result);
    // A zero-change receipt may be a capacity refusal OR an uncertain D1
    // write. Preserve the existing fail-closed 503 contract for both.
    if(written===null||written===0)return privateJson({error:"reading_save_failed"},{status:503});
    return privateJson({ok:true});
    }catch{return privateJson({error:"reading_state_unavailable"},{status:503});}
  }
  if(action==="progress")return privateJson({error:"progress_is_server_managed"},{status:403});
  if(action==="sensitive-consent"){
    if(id.provider==="agent")return privateJson({error:"forbidden"},{status:403});
    if(typeof body.acceptSensitive!=="boolean")return privateJson({error:"invalid_consent"},{status:400});
    // Validate lossless sensitive metadata only when accepting consent.
    // Stale/malformed optional fields must never prevent a user from
    // withdrawing consent and clearing sensitive values.
    if(body.acceptSensitive===true && (
      oversized(body.tradition,40)||oversized(body.denomination,160)||oversized(body.church,160)||
      ["tradition","denomination","church"].some(key=>body[key]!=null&&typeof body[key]!=="string")
    ))return privateJson({error:"invalid_profile_field"},{status:400});
    const accepted=body.acceptSensitive, tradition=clean(body.tradition,40), denomination=clean(body.denomination,160), church=clean(body.church,160);
    if(accepted&&tradition&&!TRADITIONS.has(tradition))return privateJson({error:"invalid_profile_option"},{status:400});
    try {
      // A privacy-consent change is a mutation, not a SELECT. Never ACK a
      // missing/failed D1 receipt or mistake an uncertain write for absence.
      const saved=await env.DB!.prepare(`UPDATE profiles SET sensitive_consent=?,sensitive_consent_version=?,tradition=?,denomination=?,church=?,
        public_church=CASE WHEN ?=0 OR sensitive_consent_version<>1 THEN 0 ELSE public_church END,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`)
        .bind(accepted?1:0,accepted?1:0,accepted&&tradition!=="prefer_not"?tradition||null:null,accepted?denomination||null:null,accepted?church||null:null,accepted?1:0,id.userId).run();
      // A coercible JSON value is not a verified D1 mutation receipt.
      // Use the same strict acknowledgement boundary as profile/visibility.
      const changes=confirmedD1Changes(saved);
      if(changes===null)return privateJson({error:"consent_save_failed"},{status:503});
      if(changes===0)return privateJson({error:"profile_not_found"},{status:409});
      const row=await env.DB!.prepare("SELECT * FROM profiles WHERE user_id=?").bind(id.userId).first<Record<string,unknown>>();
      if(!row)return privateJson({error:"consent_read_failed"},{status:503});
      return privateJson({user:publicUser(id,row)});
    }catch{return privateJson({error:"consent_save_failed"},{status:503});}
  }
  if(action==="visibility"){
    // The canonical UI submits one complete five-boolean snapshot. Silently
    // coercing a missing/typed value to false could erase unrelated saved
    // sharing choices from a truncated or malformed request.
    const visibilityKeys=["firstName","lastName","church","progress","community"];
    if(typeof body!=="object"||Array.isArray(body)||
       Object.keys(body).length!==visibilityKeys.length||
       !visibilityKeys.every(key=>Object.hasOwn(body,key)&&typeof body[key]==="boolean")||
       (body.community===true&&body.firstName!==true&&body.lastName!==true))
      return privateJson({error:"invalid_visibility"},{status:400});
    try{
      const visibilityWrite=await env.DB!.prepare("UPDATE profiles SET public_first_name=?,public_last_name=?,public_church=CASE WHEN sensitive_consent=1 AND sensitive_consent_version=1 THEN ? ELSE 0 END,public_progress=?,public_community=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(body.firstName===true?1:0,body.lastName===true?1:0,body.church===true?1:0,body.progress===true?1:0,body.community===true?1:0,id.userId).run();
      const changed=confirmedD1Changes(visibilityWrite);
      if(changed===null)return privateJson({error:"visibility_save_failed"},{status:503});
      if(changed===0)return privateJson({error:"profile_not_found"},{status:409});
      const row=await env.DB!.prepare("SELECT * FROM profiles WHERE user_id=?").bind(id.userId).first<Record<string,unknown>>();
      if(!row)return privateJson({error:"visibility_state_unavailable"},{status:503});
      return privateJson({user:publicUser(id,row)});
    }catch{return privateJson({error:"visibility_save_failed"},{status:503});}
  }
  if(action!=="profile")return privateJson({error:"unknown_action"},{status:400});
  // Existing SA10 callers may omit acceptSensitive on an ordinary profile
  // update. Omission must preserve the CURRENT saved consent and sensitive
  // metadata, never revoke it. The canonical browser sends an explicit boolean;
  // malformed supplied values are rejected before any database mutation.
  const preserveSensitive=body.acceptSensitive===undefined;
  if(!preserveSensitive && typeof body.acceptSensitive!=="boolean")
    return privateJson({error:"invalid_profile_consent"},{status:400});
  if(oversized(body.firstName,80)||oversized(body.lastName,80)||oversized(body.ageRange,10)||
     oversized(body.tradition,40)||oversized(body.maritalStatus,40)||oversized(body.gender,30)||
     oversized(body.church,160)||oversized(body.locale,2))
    return privateJson({error:"invalid_profile_field"},{status:400});
  // Preserve the established fallback for unknown textual locales (SA10).
  // Reject typed JSON masquerading as a locale instead of silently coercing it.
  if(body.locale!==undefined&&body.locale!==null&&typeof body.locale!=="string")
    return privateJson({error:"invalid_profile_locale"},{status:400});
  const firstName=clean(body.firstName,80),lastName=clean(body.lastName,80),ageRange=clean(body.ageRange,10),rawTradition=clean(body.tradition,40),maritalStatus=clean(body.maritalStatus,40),gender=clean(body.gender,30);if(!firstName||!lastName||!AGE_RANGES.has(ageRange)||body.acceptPrivacy!==true)return privateJson({error:"required_fields"},{status:400});
  if((rawTradition&&!TRADITIONS.has(rawTradition))||(maritalStatus&&!MARITAL_STATUSES.has(maritalStatus))||(gender&&!GENDERS.has(gender)))return privateJson({error:"invalid_profile_option"},{status:400});
  const consent=body.acceptSensitive===true, locale=ALLOWED_LOCALES.has(clean(body.locale,2))?clean(body.locale,2):"uk",tradition=consent?rawTradition||null:null,church=consent?clean(body.church,160)||null:null;
  try{
  const profileWrite=await env.DB!.prepare("INSERT INTO profiles (user_id,email,first_name,last_name,age_range,tradition,church,marital_status,gender,locale,sensitive_consent,sensitive_consent_version,privacy_accepted_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,first_name=excluded.first_name,last_name=excluded.last_name,age_range=excluded.age_range,tradition=CASE WHEN ?=1 THEN profiles.tradition ELSE excluded.tradition END,church=CASE WHEN ?=1 THEN profiles.church ELSE excluded.church END,denomination=CASE WHEN ?=1 THEN profiles.denomination WHEN excluded.sensitive_consent=0 THEN NULL ELSE profiles.denomination END,public_church=CASE WHEN ?=1 THEN profiles.public_church WHEN excluded.sensitive_consent=0 OR profiles.sensitive_consent_version<>1 THEN 0 ELSE profiles.public_church END,marital_status=excluded.marital_status,gender=excluded.gender,locale=excluded.locale,sensitive_consent=CASE WHEN ?=1 THEN profiles.sensitive_consent ELSE excluded.sensitive_consent END,sensitive_consent_version=CASE WHEN ?=1 THEN profiles.sensitive_consent_version ELSE excluded.sensitive_consent_version END,privacy_accepted_at=COALESCE(profiles.privacy_accepted_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP").bind(id.userId,id.email,firstName,lastName,ageRange,tradition,church,maritalStatus||null,gender||null,locale,consent?1:0,consent?1:0,...Array(6).fill(preserveSensitive?1:0)).run();const changed=confirmedD1Changes(profileWrite);if(changed===null||changed===0)return privateJson({error:"profile_save_failed"},{status:503});
  const row=await env.DB!.prepare("SELECT * FROM profiles WHERE user_id=?").bind(id.userId).first<Record<string,unknown>>();if(!row)return privateJson({error:"profile_state_unavailable"},{status:503});return privateJson({user:publicUser(id,row)});
  }catch{return privateJson({error:"profile_save_failed"},{status:503});}
}
