import assert from 'node:assert/strict';

Deno.test('actual Edge handlers fail closed and check current session, origin and body limits',async t=>{
  const savedFetch=globalThis.fetch,savedServe=Deno.serve,savedEnvGet=Deno.env.get;
  const user='123e4567-e89b-12d3-a456-426614174000',session='123e4567-e89b-12d3-a456-426614174002';
  const token='header.'+btoa(JSON.stringify({session_id:session}))+'.signature';
  const env:Record<string,string>={SUPABASE_URL:'https://synthetic-supabase.example',SUPABASE_SERVICE_ROLE_KEY:'synthetic-admin',
    SUPABASE_ANON_KEY:'synthetic-public',APP_URL:'https://3b.example',PASSPORT_PASSKEY_STEPUP_ENABLED:'false',PASSPORT_PARTNER_PILOT_ENABLED:'false'};
  let handler:(req:Request)=>Promise<Response>,sessionValid=true,logoutOK=true;
  let capability={enabled:false,everEnabled:false,qualifiedAt:null as string|null,rpId:'3b.example',origin:'https://3b.example'};
  try {
    Deno.env.get=(name:string)=>env[name];
    Deno.serve=((callback:any)=>{handler=callback;return {finished:Promise.resolve(),shutdown:()=>Promise.resolve()};}) as any;
    globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=String(input),headers=new Headers(init?.headers);
      if(!url.startsWith(env.SUPABASE_URL))throw Error('Network access is forbidden in this synthetic test');
      if(url.endsWith('/auth/v1/user'))return Response.json(headers.get('authorization')==='Bearer '+token?{id:user}:{error:'invalid token'},
        {status:headers.get('authorization')==='Bearer '+token?200:401});
      if(url.endsWith('/rest/v1/rpc/loyalty_session_valid'))return Response.json(sessionValid);
      if(url.endsWith('/rest/v1/rpc/loyalty_rate'))return Response.json(true);
      if(url.endsWith('/rest/v1/rpc/passport_auth_capability'))return Response.json(capability);
      if(url.endsWith('/rest/v1/rpc/passport_card_list'))return Response.json([]);
      if(url.endsWith('/rest/v1/rpc/passport_card_revoke'))return Response.json(true);
      if(url.endsWith('/auth/v1/logout?scope=others'))return new Response(null,{status:logoutOK?204:503});
      throw Error('Unexpected synthetic route: '+url);
    }) as typeof fetch;
    await import('./index.ts');
    const call=(body:unknown,patch:RequestInit={})=>handler(new Request('https://edge.example/passport-passkeys',{
      method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,origin:'https://3b.example'},body:JSON.stringify(body),...patch}));
    await t.step('disabled passkeys report disabled and block registration',async()=>{
      const response=await call({action:'readiness'});assert.equal(response.status,200);assert.equal((await response.json()).enabled,false);
      assert.equal((await call({action:'register-options'})).status,503);
    });
    await t.step('missing or forged bearer tokens and revoked sessions are rejected',async()=>{
      assert.equal((await call({action:'readiness'},{headers:{'content-type':'application/json'}})).status,401);
      assert.equal((await call({action:'readiness'},{headers:{'content-type':'application/json',authorization:'Bearer forged'}})).status,401);
      sessionValid=false;assert.equal((await call({action:'readiness'})).status,401);sessionValid=true;
    });
    await t.step('unexpected origin and method are rejected',async()=>{
      assert.equal((await call({action:'readiness'},{headers:{'content-type':'application/json',origin:'https://evil.example'}})).status,403);
      assert.equal((await handler(new Request('https://edge.example',{method:'GET'}))).status,405);
    });
    await t.step('streamed oversized JSON is refused before the business action',async()=>{
      const response=await call({action:'readiness',padding:'x'.repeat(25000)});assert.equal(response.status,413);
    });
    await t.step('logout of other devices works with passkeys disabled and never hides a provider failure',async()=>{
      const success=await call({action:'sessions-revoke'});assert.equal(success.status,200);assert.equal((await success.json()).sessionsRevoked,true);
      logoutOK=false;const failed=await call({action:'sessions-revoke'});assert.equal(failed.status,503);assert.equal((await failed.json()).sessionsRevoked,undefined);logoutOK=true;
    });
    await import('../passport-partner/index.ts');
    await t.step('partner sharing remains closed by default for member and external caller',async()=>{
      const response=await call({action:'readiness'});assert.equal((await response.json()).enabled,false);
      assert.equal((await call({action:'create',clientId:'synthetic-partner',clientSecret:'a'.repeat(64)})).status,503);
      assert.equal((await call({action:'approve',consent:true,requestToken:'b'.repeat(64)})).status,503);
    });
    await import('../passport-card/index.ts');
    await t.step('disabled card issuance/activation stays closed while authenticated list/revocation remain available',async()=>{
      assert.equal((await (await call({action:'readiness'})).json()).enabled,false);
      assert.equal((await call({action:'issue',kind:'physical'})).status,503);
      assert.equal((await call({action:'activate',cardId:session,stepupToken:'a'.repeat(64)})).status,503);
      assert.deepEqual((await (await call({action:'list'})).json()).cards,[]);
      assert.equal((await (await call({action:'revoke',cardId:session})).json()).revoked,true);
      sessionValid=false;assert.equal((await call({action:'revoke',cardId:session})).status,401);sessionValid=true;
    });
    await import('../passport-auth/index.ts');
    await t.step('public initial-login readiness requires server flag plus dated exact hosted RP qualification',async()=>{
      assert.equal((await (await call({action:'readiness'})).json()).enabled,false);
      env.PASSPORT_INITIAL_PASSKEY_ENABLED='true';assert.equal((await (await call({action:'readiness'})).json()).enabled,false);
      capability={...capability,enabled:true,everEnabled:true,qualifiedAt:'2026-09-30T00:00:00Z',rpId:'evil.example'};
      assert.equal((await (await call({action:'readiness'})).json()).enabled,false);
      capability.rpId='3b.example';assert.equal((await (await call({action:'readiness'})).json()).enabled,true);
      assert.equal((await call({action:'sign-in'})).status,404); // Auth SDK alone issues sessions.
    });
    await t.step('malformed JSON receives a client error without any business action',async()=>{
      assert.equal((await handler(new Request('https://edge.example',{method:'POST',headers:{'content-type':'application/json',origin:'https://3b.example'},body:'{broken'}))).status,400);
    });
  } finally {globalThis.fetch=savedFetch;Deno.serve=savedServe;Deno.env.get=savedEnvGet;}
});
