// Real browser interactions with explicitly synthetic auth/provider responses.
// No requests reach a real member account or model provider.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({cacheDir:'node_modules/.vite-albert-chat-ui',server:{host:'127.0.0.1',port:5364,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const origin='http://127.0.0.1:5364',out=process.env.ALBERT_CHAT_UI_OUT||path.resolve('work/albert-chat-qa'),uid='11111111-1111-4111-8111-111111111111';
await mkdir(out,{recursive:true});const checks=[],errors=[],blocked=[],check=(label,ok)=>{assert.ok(ok,label);checks.push(label);console.log('PASS',label);};
const sessionScript=({uid})=>{const token=[btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),btoa(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})),'synthetic-ui-test'].join('.');localStorage.setItem('3b_member_auth_v1',JSON.stringify({access_token:token,refresh_token:'synthetic-ui-test',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,aud:'authenticated',email:'demo@example.invalid'}}));};
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce'});await context.addInitScript(sessionScript,{uid});
  await context.addInitScript(()=>{window.albertQARecognition=[];window.SpeechRecognition=class{constructor(){window.albertQARecognition.push(this);}start(){this.started=true;}abort(){this.aborted=true;}stop(){this.stopped=true;}};});
  let available=true,failure='',delay=0;const requests=[];
  await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url()),json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.origin===origin)return route.continue();
   if(url.pathname.endsWith('/ecosystem-public'))return json({gpt:available,claude:available,gemini:false,albert:{configured:available,providers:available?['gpt','claude']:[],mode:'generalist',history:true,tools:false}});
   if(url.pathname.endsWith('/member-api'))return json({profile:{user_id:uid,name:'Compte synthétique'},events:[],inventory:[],entitlements:[]});
   if(url.pathname.endsWith('/ecosystem-private')){const body=request.postDataJSON();requests.push({body,authorization:request.headers().authorization?.startsWith('Bearer ')});if(delay)await new Promise(resolve=>setTimeout(resolve,delay));if(failure)return json({error:failure},429);return json({answer:'Réponse synthétique de recette, sans appel à une IA réelle.\nObjectif : '+body.messages.at(-1).content,contributors:['gpt','claude'],partial:false,synthesized:true,mode:'albert'}).catch(()=>{});}
   if(url.pathname.endsWith('/logout'))return json({});
   blocked.push(url.origin+url.pathname);return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/tests/albert-chat-preview.html');
  const ai=page.getByRole('region',{name:'Conversation IA avec Albert'}),input=ai.getByLabel('Ta question pour Albert',{exact:true}),send=ai.getByRole('button',{name:'Envoyer à Albert',exact:true});
  await ai.getByText('GPT · Claude · accès configuré',{exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.albert-ai-account'));
  check(width+': authenticated conversation is available',await send.isDisabled());
  check(width+': conversation has a real scrollable page',await page.locator('.th-albert-screen').evaluate(el=>el.scrollHeight<=el.getBoundingClientRect().height+2&&document.documentElement.scrollHeight>innerHeight));
  await ai.getByRole('button',{name:'Dicter',exact:true}).click();await ai.getByRole('button',{name:'Nouvelle conversation',exact:true}).click();
  await page.evaluate(()=>window.albertQARecognition.at(-1).onresult({results:[[{transcript:'ancienne dictée ignorée'}]]}));
  check(width+': reset stops dictation and ignores late transcripts',await page.evaluate(()=>window.albertQARecognition.at(-1).aborted)&&await input.inputValue()==='');
  await ai.getByRole('button',{name:'Dicter',exact:true}).click();await page.getByRole('button',{name:'Guide 3B',exact:true}).click();await page.evaluate(()=>window.albertQARecognition.at(-1).onresult({results:[[{transcript:'dictée hors panneau ignorée'}]]}));await page.getByRole('button',{name:'Dialoguer',exact:true}).click();
  check(width+': hiding AI stops the microphone without changing the draft',await page.evaluate(()=>window.albertQARecognition.at(-1).aborted)&&await input.inputValue()==='');
  await ai.getByRole('button',{name:'Construire mon projet',exact:true}).click();check(width+': starter only prepares a question',requests.length===0&&(await input.inputValue()).includes('plan de projet'));
  await input.fill('Comment préparer mon premier projet ?');await send.click();await ai.locator('.albert-ai-answer').waitFor();
  check(width+': actual transport sends only authenticated conversation',requests[0].authorization&&requests[0].body.action==='chat-ai'&&requests[0].body.mode==='albert'&&JSON.stringify(requests[0].body.messages)==='[{"role":"user","content":"Comment préparer mon premier projet ?"}]');
  check(width+': answer shows its actual contributors',await ai.locator('.albert-ai-answer small').innerText()==='ALBERT · GPT + Claude');
  await input.fill('Et le budget ?');await send.click();await page.waitForFunction(()=>document.querySelectorAll('.albert-ai-answer').length===2);
  check(width+': next question carries the previous pair',requests.at(-1).body.messages.length===3&&requests.at(-1).body.messages[1].role==='assistant'&&requests.at(-1).body.messages[2].content==='Et le budget ?');
  failure='Quota quotidien atteint pour cette recette.';await input.fill('Question conservée après erreur');await send.click();await ai.getByText(failure,{exact:true}).waitFor();
  check(width+': quota error retains draft and complete history',(await input.inputValue())==='Question conservée après erreur'&&await ai.locator('.albert-ai-answer').count()===2);
  failure='';delay=5000;await send.click();await ai.getByRole('button',{name:'Interrompre',exact:true}).click();
  await ai.getByText('Demande interrompue. Ta question reste disponible pour réessayer.',{exact:true}).waitFor();
  await page.waitForTimeout(5200);check(width+': cancellation ignores late answers',await ai.locator('.albert-ai-answer').count()===2&&await input.inputValue()==='Question conservée après erreur');delay=0;
  const download=page.waitForEvent('download');await ai.getByRole('button',{name:'Exporter',exact:true}).click();const file=await download;const exported=path.join(out,'albert-conversation-'+width+'.json');await file.saveAs(exported);const {readFile}=await import('node:fs/promises');const payload=JSON.parse(await readFile(exported,'utf8'));
  check(width+': export contains the two successful exchanges only',payload.turns.length===2&&!JSON.stringify(payload).includes('Question conservée'));
  await ai.getByRole('button',{name:'Nouvelle conversation',exact:true}).click();check(width+': a fresh conversation clears visible context',await ai.locator('.albert-ai-answer').count()===0&&await input.inputValue()==='');
  available=false;await ai.getByRole('button',{name:'Vérifier le service IA Albert'}).click();await ai.getByText('Connexion IA à finaliser',{exact:true}).waitFor();await input.fill('Brouillon préparé hors service');check(width+': unavailable service never fabricates a reply',await send.isDisabled()&&await ai.locator('.albert-ai-answer').count()===0);
  available=true;await ai.getByRole('button',{name:'Vérifier le service IA Albert'}).click();await ai.getByText('GPT · Claude · accès configuré',{exact:true}).waitFor();
  await input.fill('Conversation avant déconnexion');await send.click();await ai.locator('.albert-ai-answer').waitFor();await page.evaluate(()=>window.albertQAAuth.signOut({scope:'local'}));await ai.getByRole('button',{name:'Me connecter'}).waitFor();
  check(width+': signing out removes private conversation and draft',await ai.locator('.albert-ai-answer').count()===0&&await input.inputValue()===''&&await send.isDisabled());
  await ai.getByRole('button',{name:'Me connecter'}).click();check(width+': account action targets the real member destination',await page.evaluate(()=>document.body.dataset.lastRoute)==='member');
  check(width+': mobile and desktop have no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await input.scrollIntoViewIfNeeded();check(width+': composer can be reached without scrolling a clipped panel',await input.evaluate(el=>{const r=el.getBoundingClientRect(),screen=el.closest('.th-albert-screen');return r.top>=0&&r.bottom<=innerHeight&&screen.scrollTop===0;}));
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(out,'albert-generaliste-'+width+'.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Guide 3B',exact:true}).click();await page.getByLabel('Ta question pour le guide 3B',{exact:true}).fill('voyage');await page.getByRole('button',{name:'Envoyer ma question'}).click();check(width+': local guide remains distinct and operational',await page.locator('.albert3b-reply-link').last().getAttribute('href').then(href=>href.includes('#voyage')));
  await page.getByRole('button',{name:'Dialoguer',exact:true}).click();check(width+': returning to AI never converts local guide into model history',await ai.isVisible()&&await ai.locator('.albert-ai-answer').count()===0);await context.close();
 }
 check('No uncaught rendering errors',errors.length===0);check('No remote account or model endpoint reached',blocked.length===0);
 await writeFile(path.join(out,'albert-chat-results.json'),JSON.stringify({passed:checks.length,checks,errors,mode:'synthetic-provider-browser-acceptance',realModelCalls:0},null,2));console.log('ALBERT_CHAT_UI_OK',checks.length);
}finally{await browser.close();await server.close();}
