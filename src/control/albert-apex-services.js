import {actionRisk,createAlbertEvent,eventPriority} from './albert-apex-core.js';

const clean=(value,max=1000)=>String(value??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const stamp=()=>new Date().toISOString();

export const APEX_TYPED_ACTIONS=Object.freeze({
 read:{description:'Lire une ressource autorisée',permission:0,reversible:true},
 search:{description:'Rechercher sans modifier',permission:0,reversible:true},
 inspect:{description:'Inspecter état, fichier ou interface',permission:0,reversible:true},
 open_view:{description:'Ouvrir une vue interne',permission:0,reversible:true},
 open_app:{description:'Ouvrir une application locale autorisée',permission:1,reversible:true},
 move_window:{description:'Positionner une fenêtre sur un écran',permission:1,reversible:true},
 run_test:{description:'Exécuter un test isolé',permission:1,reversible:true},
 generate_preview:{description:'Produire un aperçu sans publication',permission:1,reversible:true},
 create_file:{description:'Créer un fichier local',permission:2,reversible:true},
 update_file:{description:'Modifier un fichier local',permission:2,reversible:true},
 rename_file:{description:'Renommer un fichier local',permission:2,reversible:true},
 install_skill:{description:'Installer une compétence validée',permission:2,reversible:true},
 calendar_write:{description:'Modifier un agenda externe',permission:3,reversible:true},
 send_message:{description:'Envoyer un message externe',permission:3,reversible:false},
 publish:{description:'Publier vers un service externe',permission:3,reversible:false},
 push:{description:'Pousser du code vers un dépôt partagé',permission:3,reversible:true},
 deploy:{description:'Déployer un environnement partagé',permission:3,reversible:true},
 delete:{description:'Supprimer une ressource',permission:4,reversible:false},
 payment:{description:'Effectuer un paiement',permission:4,reversible:false},
 transfer:{description:'Effectuer un transfert de valeur',permission:4,reversible:false},
 revoke:{description:'Révoquer un accès',permission:4,reversible:false},
 rotate_secret:{description:'Changer un secret',permission:4,reversible:false},
 production_migration:{description:'Modifier un schéma de production',permission:4,reversible:false}
});

export const APEX_STACK_LAYERS=Object.freeze([
 {id:'filesystem',label:'File System',role:'Contexte local, projets, fichiers et preuves'},
 {id:'connections',label:'Connections / MCP',role:'Connecteurs explicitement autorisés'},
 {id:'skills',label:'Skills',role:'Compétences versionnées, testées et qualifiées'},
 {id:'routines',label:'Routines',role:'Workflows répétables compilés'},
 {id:'agents',label:'Agents',role:'Rôles spécialisés à périmètre limité'},
 {id:'verification',label:'Verification',role:'Critique, tests, preuves et contrat de fin'}
]);

export const APEX_READINESS_CHECKS=Object.freeze([
 ['localhostOnly','API locale uniquement','security',true],
 ['originAllowlist','Origines réseau autorisées','security',true],
 ['bodyLimit','Taille de requête bornée','security',true],
 ['typedActions','Actions typées fail-closed','security',true],
 ['leastPrivilege','Moindre privilège','security',true],
 ['approvalGate','Validation humaine sensible','security',true],
 ['killSwitch','STOP ALBERT','recovery',true],
 ['evidenceGate','Aucun succès sans preuve','quality',true],
 ['inputValidation','Validation des entrées','security',true],
 ['secretHygiene','Secrets hors UI et journaux','security',true],
 ['rateLimits','Limites d’usage','security',false],
 ['dependencyAudit','Audit dépendances','supply-chain',false],
 ['recovery','Sauvegarde et rollback','recovery',false],
 ['emptyLoadingErrorStates','États vide/chargement/erreur','ux',false],
 ['accessibility','Clavier, focus, contraste, mouvement','ux',false],
 ['responsive','Formats compacts vérifiés','ux',false],
 ['observability','Événements inspectables','operations',false],
 ['antiSlopReview','Revue design anti-générique','quality',false]
]);

export function readinessAudit(signals={}){
 const checks=APEX_READINESS_CHECKS.map(([id,label,category,critical])=>{
  const value=signals[id],status=value===true?'pass':value===false?'fail':'unknown';
  return{id,label,category,critical,status};
 });
 const passed=checks.filter(row=>row.status==='pass').length;
 const failed=checks.filter(row=>row.status==='fail').length;
 const unknown=checks.filter(row=>row.status==='unknown').length;
 const blockers=checks.filter(row=>row.critical&&row.status!=='pass').map(row=>row.id);
 return{
  score:Math.round((passed/checks.length)*100),
  coverage:Math.round(((passed+failed)/checks.length)*100),
  passed,failed,unknown,total:checks.length,
  ready:blockers.length===0&&failed===0,
  blockers,checks
 };
}

export function compileApexRoutine(input={}){
 const trigger=['manual','event','hourly','daily'].includes(input.trigger)?input.trigger:'manual';
 const rows=Array.isArray(input.steps)?input.steps.slice(0,24):[];
 if(!rows.length)throw new Error('Une routine doit contenir au moins une étape.');
 const steps=rows.map((row,index)=>{
  if(!row||!APEX_TYPED_ACTIONS[row.action])throw new Error('Action de routine inconnue.');
  const typed=typedAction(row.action,row.payload&&typeof row.payload==='object'?row.payload:{});
  return{index,action:typed.type,permission:typed.permission,approvalRequired:typed.approvalRequired,reversible:typed.reversible,payload:typed.input};
 });
 return{
  id:clean(input.id,120)||'routine-'+Date.now().toString(36),
  name:clean(input.name,160)||'Routine sans nom',
  trigger,steps,status:'compiled',autoExecute:false,createdAt:stamp()
 };
}

export function compileResearchWorkflow(input={}){
 const intent=clean(input.intent,4000);
 if(!intent)throw new Error('Intention vide.');
 const connections=[...new Set((Array.isArray(input.connections)?input.connections:[]).map(v=>clean(v,120)).filter(Boolean))].slice(0,20);
 const research=/recherche|research|compare|vérifie|verifie|source|actualité|actualite/i.test(intent);
 const external=/publie|envoie|mail|réseau|reseau|calendrier|deploy|déploie|deploie/i.test(intent);
 const nodes=[
  {id:'intent',role:'intake',dependsOn:[],gate:'none'},
  {id:'spec',role:'specifier',dependsOn:['intent'],gate:'constitution'},
  {id:'plan',role:'planner',dependsOn:['spec'],gate:'least-privilege'}
 ];
 let dependency='plan';
 if(research){
  nodes.push(
   {id:'scout',role:'source-scout',dependsOn:['plan'],gate:'read-only'},
   {id:'critic',role:'source-critic',dependsOn:['scout'],gate:'cross-check'},
   {id:'synthesis',role:'synthesizer',dependsOn:['critic'],gate:'provenance'}
  );
  dependency='synthesis';
 }
 nodes.push(
  {id:'execute',role:'executor',dependsOn:[dependency],gate:external?'permission-broker':'typed-action'},
  {id:'review',role:'critic',dependsOn:['execute'],gate:'independent-review'},
  {id:'verify',role:'verifier',dependsOn:['review'],gate:'tests'},
  {id:'evidence',role:'evidence-keeper',dependsOn:['verify'],gate:'completion-contract'}
 );
 return{version:1,intent,researchMode:research,externalAction:external,connections,stack:APEX_STACK_LAYERS,nodes};
}

export function typedAction(type,input={}){
 const definition=APEX_TYPED_ACTIONS[type];
 if(!definition)throw new Error('Action APEX inconnue.');
 const risk=actionRisk({type,...input});
 return{
  id:'action-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
  type,
  input:clone(input),
  permission:risk.level,
  approvalRequired:risk.approval,
  reversible:definition.reversible&&input.irreversible!==true,
  createdAt:stamp(),
  status:'proposed'
 };
}

export function capabilityRegistry(runtime={}){
 const local=runtime.localRuntime===true;
 const albert=runtime.albertRuntime===true;
 const online=runtime.online===true;
 const providers=runtime.providers&&typeof runtime.providers==='object'?runtime.providers:{};
 const providerState=name=>providers[name]?.state||'unknown';
 const rows=[
  ['orchestrator','Orchestrateur APEX','ready','core'],
  ['spec','Constitution + Spec + Convergence','ready','core'],
  ['permissions','Permission Broker','ready','security'],
  ['events','Event Bus + Ambient Inbox','ready','core'],
  ['evidence','Completion Contract + Evidence','ready','security'],
  ['readiness','Launch Readiness Audit','ready','quality'],
  ['routines','Routine Compiler','ready','automation'],
  ['research','Recherche multi-agent vérifiée','ready','research'],
  ['voice','Voix navigateur',runtime.browserVoice===true?'available':'unavailable','voice'],
  ['localRuntime','Runtime Windows ALBERT',albert?'live':local?'unavailable':'offline','local'],
  ['pcControl','Contrôle PC typé',local?'available':'offline','local'],
  ['google','Google Workspace',providerState('google'),'external'],
  ['metricool','Réseaux sociaux',providerState('metricool'),'external'],
  ['stripe','Stripe',providerState('stripe'),'external'],
  ['vercel','Vercel',providerState('vercel'),'external'],
  ['openai','Moteur IA serveur',providerState('openai'),'external'],
  ['internet','Internet',online?'live':'offline','network']
 ];
 return rows.map(([id,label,state,group])=>({id,label,state,group}));
}

export function normalizeExternalEvent(raw={}){
 const type=clean(raw.type||raw.event_type||raw.kind||'external.event',100)||'external.event';
 const createdAt=raw.createdAt||raw.created_at||stamp();
 const stable=clean(raw.id||raw.event_id||raw.command_id||raw.device_id||[type,createdAt,raw.status||'',raw.action||''].join(':'),300);
 const payload=raw.payload&&typeof raw.payload==='object'?clone(raw.payload):clone(raw);
 return{id:'external-'+stable,type,priority:raw.priority||eventPriority(type,payload),createdAt,payload};
}

export function ambientInbox(events,{max=60}={}){
 const seen=new Set(),result=[];
 for(const raw of Array.isArray(events)?events:[]){
  const event=raw?.type&&raw?.createdAt?raw:normalizeExternalEvent(raw);
  const key=clean(event.id||event.type+':'+JSON.stringify(event.payload),500);
  if(!key||seen.has(key))continue;
  seen.add(key);
  result.push({...event,delivery:deliveryFor(event)});
  if(result.length>=max)break;
 }
 return result;
}

export function deliveryFor(event){
 const priority=event?.priority||'quiet';
 if(priority==='critical')return 'voice+visual';
 if(priority==='attention')return 'visual+sound';
 if(priority==='normal')return 'visual';
 return 'silent';
}

export function shouldInterrupt(event,{quiet=false,sessionBusy=false,maxVoicePerWindow=2,voiceCount=0}={}){
 if(quiet&&event?.priority!=='critical')return false;
 if(voiceCount>=maxVoicePerWindow&&event?.priority!=='critical')return false;
 if(sessionBusy&&event?.priority==='normal')return false;
 return deliveryFor(event).startsWith('voice');
}

function semver(value){
 const match=/^(\d+)\.(\d+)\.(\d+)$/.exec(String(value||''));
 return match?match.slice(1).map(Number):null;
}
export function createSkillManifest(input={}){
 const version=clean(input.version||'1.0.0',40);
 if(!semver(version))throw new Error('Version de skill invalide.');
 const actions=[...new Set((Array.isArray(input.actions)?input.actions:[]).map(v=>clean(v,80)).filter(v=>APEX_TYPED_ACTIONS[v]))];
 const tests=(Array.isArray(input.tests)?input.tests:[]).map(v=>clean(v,300)).filter(Boolean).slice(0,50);
 return{
  id:clean(input.id,100)||'skill-'+Math.random().toString(36).slice(2,9),
  name:clean(input.name,140)||'Skill sans nom',
  version,
  description:clean(input.description,1000),
  actions,
  tests,
  successRate:0,
  runs:0,
  trust:'experimental',
  installed:false,
  createdAt:stamp(),
  updatedAt:stamp()
 };
}

export function qualifySkill(skill,{passed=0,failed=0}={}){
 const total=Math.max(0,Number(passed)||0)+Math.max(0,Number(failed)||0);
 const successRate=total?Math.max(0,Math.min(1,passed/total)):0;
 let trust='experimental';
 if(total>=100&&successRate>=.99)trust='trusted';
 else if(total>=20&&successRate>=.95)trust='qualified';
 else if(total>=5&&successRate>=.8)trust='observed';
 return{...clone(skill),runs:total,successRate,trust,installed:trust!=='experimental',updatedAt:stamp()};
}

export function nextSkillVersion(version,kind='patch'){
 const parts=semver(version);if(!parts)throw new Error('Version de skill invalide.');
 const [major,minor,patch]=parts;
 if(kind==='major')return [major+1,0,0].join('.');
 if(kind==='minor')return [major,minor+1,0].join('.');
 return [major,minor,patch+1].join('.');
}

export function sessionSnapshot(state={}){
 return{
  version:1,
  createdAt:stamp(),
  mode:clean(state.mode,20)||'AUTO',
  resourceProfile:clean(state.resourceProfile,20)||'NORMAL',
  session:clone(state.session||{}),
  activeTasks:(Array.isArray(state.tasks)?state.tasks:[]).filter(t=>['running','review','waiting'].includes(t.status)).slice(-30).map(t=>({
   id:t.id,intent:clean(t.intent,2000),status:t.status,spec:t.spec,graph:t.graph,progress:t.progress||null
  })),
  needYou:clone((Array.isArray(state.needYou)?state.needYou:[]).slice(-30))
 };
}

export function distillSession(state={}){
 const tasks=Array.isArray(state.tasks)?state.tasks:[];
 const verified=tasks.filter(t=>t.status==='verified');
 const failed=tasks.filter(t=>t.status==='failed');
 const pending=tasks.filter(t=>['running','review','waiting'].includes(t.status));
 return{
  createdAt:stamp(),
  summary:{
   verified:verified.length,
   failed:failed.length,
   pending:pending.length,
   approvals:Array.isArray(state.needYou)?state.needYou.length:0
  },
  decisions:verified.slice(-20).map(t=>({intent:clean(t.intent,500),result:'verified',evidence:t.evidence?.id||null})),
  failures:failed.slice(-20).map(t=>({intent:clean(t.intent,500),error:clean(t.error,600)})),
  resume:pending.slice(-20).map(t=>({id:t.id,intent:clean(t.intent,500),phase:t.progress?.phase||null}))
 };
}

export function assetProvenance(input={}){
 const source=['generated','found','uploaded','edited'].includes(input.source)?input.source:'generated';
 return{
  id:clean(input.id,160)||'asset-'+Date.now().toString(36),
  source,
  origin:clean(input.origin,1200),
  model:clean(input.model,160),
  prompt:clean(input.prompt,5000),
  license:clean(input.license,500),
  credit:clean(input.credit,500),
  project:clean(input.project,160),
  parentIds:(Array.isArray(input.parentIds)?input.parentIds:[]).map(v=>clean(v,160)).filter(Boolean).slice(0,20),
  createdAt:stamp()
 };
}

export function modelQualification(input={}){
 const attempts=Math.max(0,Number(input.attempts)||0),usable=Math.max(0,Number(input.usable)||0);
 const firstTry=Math.max(0,Math.min(1,Number(input.firstTryRate)||0));
 const latency=Math.max(0,Number(input.latencyMs)||0);
 const cost=Math.max(0,Number(input.costPerRun)||0);
 const quality=Math.max(0,Math.min(100,Number(input.quality)||0));
 const reliability=attempts?Math.max(0,Math.min(1,usable/attempts)):0;
 const score=Math.round((quality*.55)+(reliability*100*.25)+(firstTry*100*.20));
 return{
  model:clean(input.model,160),
  capability:clean(input.capability,80)||'general',
  attempts,usable,reliability,firstTryRate:firstTry,latencyMs:latency,costPerRun:cost,quality,score,
  qualified:attempts>=5&&reliability>=.8&&quality>=60,
  measuredAt:stamp()
 };
}

export function impactReport(input={}){
 const files=[...new Set((Array.isArray(input.files)?input.files:[]).map(v=>clean(v,500)).filter(Boolean))].slice(0,100);
 const systems=[...new Set((Array.isArray(input.systems)?input.systems:[]).map(v=>clean(v,160)).filter(Boolean))].slice(0,50);
 const external=(Array.isArray(input.external)?input.external:[]).map(v=>clean(v,300)).filter(Boolean).slice(0,50);
 const risk=Math.min(100,files.length*2+systems.length*6+external.length*10+(input.production?25:0));
 return{files,systems,external,production:Boolean(input.production),risk,level:risk>=70?'high':risk>=35?'medium':'low',createdAt:stamp()};
}
