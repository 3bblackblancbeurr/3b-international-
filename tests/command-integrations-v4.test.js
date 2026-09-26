import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createCommandIntegrations} from '../server/command-integrations.js';

const UID='11111111-1111-4111-8111-111111111111';
const SID='22222222-2222-4222-8222-222222222222';
const OWNER='owner@example.test';
const baseEnv={
 SUPABASE_URL:'https://example.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'service-secret'
};

const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt=()=>`x.${b64({session_id:SID})}.x`;

function response(value,status=200){
 return new Response(typeof value==='string'?value:JSON.stringify(value),{
  status,headers:{'Content-Type':'application/json'}
 });
}

function baseFetcher({ownerId=UID,providers=false}={}){
 return async(input,init={})=>{
  const url=new URL(String(input));
  if(url.hostname==='example.supabase.co'){
   if(url.pathname==='/auth/v1/user')return response({id:UID,email:OWNER,email_confirmed_at:'2026-01-01T00:00:00Z'});
   if(url.pathname==='/rest/v1/rpc/loyalty_session_valid')return response(true);
   if(url.pathname==='/rest/v1/rpc/loyalty_rate')return response(true);
   if(url.pathname==='/rest/v1/control_center_settings')return response([{enabled:true,owner_user_id:ownerId,owner_email:OWNER}]);
  }
  if(providers){
   if(url.hostname==='oauth2.googleapis.com')return response({access_token:'google-access-token'});
   if(url.hostname==='gmail.googleapis.com')return response({id:'INBOX',messagesUnread:3});
   if(url.hostname==='www.googleapis.com'&&url.pathname.includes('/calendar/'))return response({items:[{
    summary:'Rendez-vous 3B',start:{dateTime:'2026-09-27T10:00:00+02:00'},end:{dateTime:'2026-09-27T11:00:00+02:00'}
   }]});
   if(url.hostname==='app.metricool.com')return response([{id:42,label:'3B International',networksData:{instagramData:'x',tiktokData:'x',youtubeData:'x'}}]);
   if(url.hostname==='api.vercel.com')return response({deployments:[{state:'READY',target:'production',createdAt:1790460000000,ready:1790460060000}]});
   if(url.hostname==='api.openai.com')return response({model:'test-model',output_text:'Tout est sous contrôle.'});
  }
  return response({error:'unexpected '+url.href},500);
 };
}

function request(method='GET',origin='https://3b-international.vercel.app',body){
 return new Request('https://3b-international.vercel.app/api/command-integrations',{
  method,
  headers:{Authorization:'Bearer '+jwt(),Origin:origin,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
}

test('Command integrations reject non-owner origins before provider work',async()=>{
 const app=createCommandIntegrations({env:baseEnv,fetcher:baseFetcher()});
 const res=await app.handle(request('GET','https://evil.example'));
 assert.equal(res.status,403);
});

test('Command integrations reject authenticated non-owner users',async()=>{
 const app=createCommandIntegrations({env:baseEnv,fetcher:baseFetcher({ownerId:'33333333-3333-4333-8333-333333333333'})});
 const res=await app.handle(request());
 assert.equal(res.status,403);
 const body=await res.json();
 assert.match(body.error,/propriétaire/i);
});

test('Missing provider secrets stay setup_required instead of fake connected data',async()=>{
 const app=createCommandIntegrations({env:baseEnv,fetcher:baseFetcher()});
 const res=await app.handle(request());
 assert.equal(res.status,200);
 const body=await res.json();
 for(const key of ['google','metricool','stripe','vercel','openai'])assert.equal(body.providers[key].state,'setup_required');
 assert.doesNotMatch(JSON.stringify(body),/service-secret/);
});

test('Configured provider adapters expose only sanitized owner summaries',async()=>{
 const env={
  ...baseEnv,
  COMMAND_GOOGLE_CLIENT_ID:'google-client',
  COMMAND_GOOGLE_CLIENT_SECRET:'google-secret',
  COMMAND_GOOGLE_REFRESH_TOKEN:'google-refresh-secret',
  COMMAND_METRICOOL_TOKEN:'metricool-secret',
  COMMAND_METRICOOL_USER_ID:'7',
  COMMAND_METRICOOL_BLOG_ID:'42',
  STRIPE_SECRET_KEY:'sk_test_secret-value',
  COMMAND_VERCEL_TOKEN:'vercel-secret',
  COMMAND_VERCEL_PROJECT_ID:'project-secret-id',
  OPENAI_API_KEY:'openai-secret',
  COMMAND_AI_MODEL:'test-model'
 };
 const stripeFactory=()=>({balance:{retrieve:async()=>({livemode:false,available:[{currency:'eur',amount:12345}],pending:[{currency:'eur',amount:500}]})}});
 const app=createCommandIntegrations({env,fetcher:baseFetcher({providers:true}),stripeFactory});
 const res=await app.handle(request());
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.providers.google.state,'live');
 assert.equal(body.providers.google.gmail.unread,3);
 assert.equal(body.providers.google.calendar.upcoming,1);
 assert.equal(body.providers.metricool.state,'live');
 assert.deepEqual(body.providers.metricool.networks,['instagram','tiktok','youtube']);
 assert.equal(body.providers.stripe.state,'test');
 assert.equal(body.providers.stripe.livemode,false);
 assert.equal(body.providers.vercel.state,'live');
 assert.equal(body.providers.openai.state,'configured');
 const text=JSON.stringify(body);
 for(const secret of ['google-secret','google-refresh-secret','metricool-secret','sk_test_secret-value','vercel-secret','openai-secret','service-secret'])assert.doesNotMatch(text,new RegExp(secret));
});

test('3B IA Command is owner-only, rate-limited upstream and returns no API key material',async()=>{
 const env={
  ...baseEnv,
  COMMAND_GOOGLE_CLIENT_ID:'google-client',
  COMMAND_GOOGLE_CLIENT_SECRET:'google-secret',
  COMMAND_GOOGLE_REFRESH_TOKEN:'google-refresh-secret',
  COMMAND_METRICOOL_TOKEN:'metricool-secret',
  COMMAND_METRICOOL_USER_ID:'7',
  COMMAND_METRICOOL_BLOG_ID:'42',
  STRIPE_SECRET_KEY:'sk_test_secret-value',
  COMMAND_VERCEL_TOKEN:'vercel-secret',
  COMMAND_VERCEL_PROJECT_ID:'project-secret-id',
  OPENAI_API_KEY:'openai-secret',
  COMMAND_AI_MODEL:'test-model'
 };
 const stripeFactory=()=>({balance:{retrieve:async()=>({livemode:false,available:[],pending:[]})}});
 const app=createCommandIntegrations({env,fetcher:baseFetcher({providers:true}),stripeFactory});
 const res=await app.handle(request('POST','https://3b-international.vercel.app',{action:'ai',prompt:'Que dois-je faire ?'}));
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.answer.text,'Tout est sous contrôle.');
 assert.equal(body.answer.model,'test-model');
 assert.doesNotMatch(JSON.stringify(body),/openai-secret|google-refresh-secret|metricool-secret|vercel-secret/);
});

test('frontend integrations keep secret-bearing values server-side',()=>{
 const env=readFileSync(new URL('../.env.example',import.meta.url),'utf8');
 const client=readFileSync(new URL('../src/control/integrations-client.js',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server/command-integrations.js',import.meta.url),'utf8');
 assert.match(env,/COMMAND_GOOGLE_REFRESH_TOKEN=/);
 assert.match(env,/COMMAND_METRICOOL_TOKEN=/);
 assert.match(env,/COMMAND_VERCEL_TOKEN=/);
 assert.match(env,/COMMAND_AI_MODEL=/);
 assert.doesNotMatch(client,/COMMAND_GOOGLE_CLIENT_SECRET|COMMAND_METRICOOL_TOKEN|COMMAND_VERCEL_TOKEN|OPENAI_API_KEY/);
 assert.match(server,/store:false/);
 assert.match(server,/Command OS réservé au propriétaire 3B/);
 assert.doesNotMatch(server,/Access-Control-Allow-Origin":"\*"/);
});


test('V4 reuses the existing Vercel catalog function and stays under the Hobby function cap',()=>{
 const catalog=readFileSync(new URL('../api/catalog.js',import.meta.url),'utf8');
 const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 const count=readdirSync(new URL('../api/',import.meta.url)).filter(name=>name.endsWith('.js')).length;
 assert.ok(count<=12,'direct Vercel functions must stay at 12 or fewer');
 assert.match(catalog,/createCommandIntegrations/);
 assert.match(catalog,/route === "command-integrations"/);
 assert.equal(vercel.rewrites.some(rule=>rule.source==='/api/command-integrations'&&rule.destination==='/api/catalog?__3b_route=command-integrations'),true);
});
