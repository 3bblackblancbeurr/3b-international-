import { createHmac } from "node:crypto";

const EVENTS = new Set([
  "quickkit_page_view",
  "quickkit_audit_started",
  "quickkit_audit_completed",
  "quickkit_pro_click",
  "tools_page_view",
  "outbound_descript",
  "outbound_lovable",
  "manifest_generator_view",
  "manifest_generated",
  "headers_generator_view",
  "headers_generated",
]);

function json(data,status=200,extra={}) {
  return Response.json(data,{status,headers:{
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer",
    ...extra,
  }});
}

function safeHttps(value){
  try{
    const url=new URL(value);
    return url.protocol==="https:"&&!url.username&&!url.password?url.href:"";
  }catch{return "";}
}

function clientAddress(request){
  const raw=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ||request.headers.get("x-real-ip")?.trim()||"";
  return raw.length<=80&&/^[0-9a-fA-F:.]+$/.test(raw)?raw:"";
}

function normalizeMetadata(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) return {};
  const out={};
  if(Number.isInteger(value.score)&&value.score>=0&&value.score<=100) out.score=value.score;
  if(typeof value.grade==="string"&&/^[A-F]$/.test(value.grade)) out.grade=value.grade;
  if(typeof value.tool==="string"&&/^[a-z0-9-]{1,40}$/.test(value.tool)) out.tool=value.tool;
  return out;
}

async function db(env,fetcher,path,{method="POST",body}={}){
  const base=safeHttps(env.SUPABASE_URL);
  if(!base||!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("UNCONFIGURED");
  const url=new URL(path,base);
  const response=await fetcher(url,{
    method,
    signal:AbortSignal.timeout(8000),
    headers:{
      apikey:env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type":"application/json",
      Prefer:"return=minimal",
    },
    ...(body?{body:JSON.stringify(body)}:{}),
  });
  if(!response.ok) throw new Error("DB_FAILED");
  return response;
}

export function createRevenueFunnel({env=process.env,fetcher=fetch}={}){
  return async request=>{
    if(request.method!=="POST") return json({error:"METHOD_NOT_ALLOWED"},405,{Allow:"POST"});
    try{
      const origin=new URL(request.url).origin;
      if(request.headers.get("origin")!==origin) return json({error:"INVALID_ORIGIN"},403);
      if(!request.headers.get("content-type")?.startsWith("application/json")) return json({error:"INVALID_FORMAT"},415);

      const raw=await request.text();
      if(Buffer.byteLength(raw,"utf8")>4096) return json({error:"TOO_LARGE"},413);
      const body=JSON.parse(raw||"{}");

      if(!EVENTS.has(body.event)) return json({error:"INVALID_EVENT"},400);
      if(typeof body.sessionId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.sessionId))
        return json({error:"INVALID_SESSION"},400);
      if(typeof body.page!=="string"||body.page.length<1||body.page.length>120||!body.page.startsWith("/"))
        return json({error:"INVALID_PAGE"},400);
      const channel=typeof body.channel==="string"&&/^[a-z0-9._-]{1,64}$/i.test(body.channel)?body.channel.toLowerCase():"direct";

      const ip=clientAddress(request);
      if(ip){
        const key=createHmac("sha256",env.PWA_QUICKKIT_RATE_LIMIT_SECRET||env.SUPABASE_SERVICE_ROLE_KEY||"")
          .update(`revenue-funnel:${ip}`).digest("hex");
        const response=await db(env,fetcher,"/rest/v1/rpc/pwa_quickkit_consume_rate_limit",{
          body:{p_key:key,p_limit:200,p_window_minutes:1440},
        });
        const allowed=Boolean(await response.json().catch(()=>false));
        if(!allowed) return json({ok:true,limited:true});
      }

      await db(env,fetcher,"/rest/v1/revenue_funnel_events",{
        body:{
          session_id:body.sessionId,
          event_name:body.event,
          page:body.page,
          channel,
          metadata:normalizeMetadata(body.metadata),
        },
      });
      return json({ok:true},202);
    }catch{
      return json({ok:false},202);
    }
  };
}
