import { env } from "cloudflare:workers";
import { authenticateRequest, sameOrigin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: {"Cache-Control":"private, no-store"} });
const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const validName = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 100 && !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value);
const groupAuthority = `g.owner_user_id=e.organizer_user_id AND g.visibility='private' AND g.roster_visibility='private'
  AND om.user_id=g.owner_user_id AND om.role='owner'`;
const eventAuthority = `e.status='active' AND c.id=e.church_claim_id AND c.status='approved'
  AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL`;

export async function GET(request: Request) {
  if (!env.DB) return json({error:"database_unavailable"},503);
  try {
    const actor=await authenticateRequest(request);
    if (!actor) return json({error:"authentication_required"},401);
    if (actor.provider==='agent'||!actor.emailVerified) return json({error:"forbidden"},403);
    const params=new URL(request.url).searchParams,view=params.get('view')||'member';
    if (['view','eventId','after'].some(key=>params.getAll(key).length>1)) return json({error:"invalid_query"},400);
    if(view==='options'){
      const after=params.get('after');
      if(after!==null&&!validId(after))return json({error:"invalid_cursor"},400);
      const rows=await env.DB.prepare(`SELECT g.id,g.name FROM home_groups g
        JOIN accounts a ON a.id=g.owner_user_id JOIN home_group_members m ON m.group_id=g.id AND m.user_id=a.id
        WHERE g.owner_user_id=? AND m.role='owner' AND g.visibility='private' AND g.roster_visibility='private'
          AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL AND g.id>?
        ORDER BY g.id LIMIT 101`).bind(actor.userId,after||'').all<{id:string;name:string}>();
      if(!rows.success||!Array.isArray(rows.results)||!rows.results.every(row=>validId(row.id)&&validName(row.name)))return json({error:"teams_unavailable"},503);
      const items=rows.results.slice(0,100).map(({id,name})=>({id,name}));
      return json({items,nextCursor:rows.results.length>100?items[99].id:null});
    }
    const eventId=params.get('eventId');
    if(!validId(eventId)||!['member','manage'].includes(view))return json({error:"invalid_query"},400);
    if(view==='manage'){
      const row=await env.DB.prepare(`SELECT t.revision,
          CASE WHEN ${eventAuthority} AND ${groupAuthority} THEN g.id END AS group_id,
          CASE WHEN ${eventAuthority} AND ${groupAuthority} THEN g.name END AS group_name
        FROM church_events e JOIN accounts a ON a.id=e.organizer_user_id
        LEFT JOIN church_directory_claims c ON c.claimant_user_id=e.organizer_user_id
        LEFT JOIN event_teams t ON t.event_id=e.id LEFT JOIN home_groups g ON g.id=t.group_id
        LEFT JOIN home_group_members om ON om.group_id=g.id AND om.user_id=g.owner_user_id
        WHERE e.id=? AND e.organizer_user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL`)
        .bind(eventId,actor.userId).first<{revision:string|null;group_id:string|null;group_name:string|null}>();
      if(!row)return json({error:"not_found"},404);
      if((row.revision!==null&&!validId(row.revision))||(row.group_id!==null&&(!validId(row.group_id)||!validName(row.group_name))))return json({error:"teams_unavailable"},503);
      return json({revision:row.revision,team:row.group_id?{id:row.group_id,name:row.group_name}:null});
    }
    const row=await env.DB.prepare(`SELECT g.id,g.name FROM event_teams t JOIN church_events e ON e.id=t.event_id
      JOIN accounts a ON a.id=e.organizer_user_id JOIN church_directory_claims c ON c.claimant_user_id=e.organizer_user_id
      JOIN home_groups g ON g.id=t.group_id JOIN home_group_members om ON om.group_id=g.id AND om.user_id=g.owner_user_id
      JOIN home_group_members member ON member.group_id=g.id AND member.user_id=?
      JOIN accounts reader ON reader.id=member.user_id AND reader.deleted_at IS NULL AND reader.email_verified_at IS NOT NULL
      WHERE e.id=? AND ${eventAuthority} AND ${groupAuthority} AND member.role IN ('owner','facilitator','member')`)
      .bind(actor.userId,eventId).first<{id:string;name:string}>();
    if(row&&(!validId(row.id)||!validName(row.name)))return json({error:"teams_unavailable"},503);
    return json({team:row?{id:row.id,name:row.name}:null});
  }catch{return json({error:"teams_unavailable"},503);}
}

export async function POST(request: Request) {
  if(!env.DB)return json({error:"database_unavailable"},503);
  if(!sameOrigin(request))return json({error:"cross_origin_request"},403);
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||!validId(body.eventId)||!['set','clear'].includes(String(body.action))||
      (body.expectedRevision!==null&&!validId(body.expectedRevision))||
      (body.action==='set'&&(!validId(body.groupId)||body.confirm!==true)))return json({error:"invalid_team"},400);
  try {
    const actor=await authenticateRequest(request);
    if(!actor)return json({error:"authentication_required"},401);
    if(actor.provider==='agent'||!actor.emailVerified)return json({error:"forbidden"},403);
    const result=body.action==='set'
      ? await env.DB.prepare(`INSERT INTO event_teams(event_id,group_id,revision)
        SELECT e.id,g.id,? FROM church_events e JOIN accounts a ON a.id=e.organizer_user_id
        JOIN church_directory_claims c ON c.claimant_user_id=e.organizer_user_id JOIN home_groups g ON g.id=?
        JOIN home_group_members om ON om.group_id=g.id AND om.user_id=g.owner_user_id
        WHERE e.id=? AND e.organizer_user_id=? AND ${eventAuthority} AND ${groupAuthority}
          AND ((? IS NULL AND NOT EXISTS(SELECT 1 FROM event_teams WHERE event_id=e.id))
            OR EXISTS(SELECT 1 FROM event_teams WHERE event_id=e.id AND revision=?))
        ON CONFLICT(event_id) DO UPDATE SET group_id=excluded.group_id,revision=excluded.revision,updated_at=CURRENT_TIMESTAMP
          WHERE event_teams.revision=?`).bind(crypto.randomUUID(),body.groupId,body.eventId,actor.userId,body.expectedRevision,body.expectedRevision,body.expectedRevision).run()
      : await env.DB.prepare(`DELETE FROM event_teams WHERE event_id=? AND revision=? AND EXISTS
        (SELECT 1 FROM church_events e JOIN accounts a ON a.id=e.organizer_user_id
          WHERE e.id=event_teams.event_id AND e.organizer_user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL)`)
        .bind(body.eventId,body.expectedRevision,actor.userId).run();
    if(!result.success||!Number.isSafeInteger(result.meta?.changes)||result.meta.changes<0||result.meta.changes>1)return json({error:"team_failed"},503);
    return result.meta.changes===1?json({ok:true}):json({error:"team_changed_or_unavailable"},409);
  }catch{return json({error:"team_failed"},503);}
}
