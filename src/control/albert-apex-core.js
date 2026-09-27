export const ALBERT_OPERATION_MODES=Object.freeze(['AUTO','LOCAL','HYBRID','INTERNET']);
export const ALBERT_RESOURCE_PROFILES=Object.freeze(['ECO','NORMAL','APEX']);
export const ALBERT_TASK_STATUS=Object.freeze(['queued','running','waiting','review','verified','failed','cancelled']);
export const ALBERT_PERMISSION_LEVELS=Object.freeze({
 read:0,local_safe:1,write_local:2,external:3,critical:4
});
export const ALBERT_DEFAULT_CONSTITUTION=Object.freeze({
 version:1,
 principles:[
  'Ne jamais déclarer une action terminée sans preuve adaptée.',
  'Préférer un workflow déterministe à un agent autonome quand il suffit.',
  'Limiter les permissions au strict nécessaire.',
  'Préserver les données privées en local dès que possible.',
  'Rendre toute modification locale réversible quand la plateforme le permet.',
  'Séparer données, instructions, secrets et sorties de modèles.',
  'Tester avant de publier, déployer, fusionner ou remplacer un état validé.',
  'Tracer demande → spécification → plan → exécution → test → résultat.'
 ],
 mandatoryChecks:['intent','risk','permissions','execution','verification','evidence'],
 blockedPatterns:['skip-permissions','secret-in-prompt','unverified-success']
});

const now=()=>new Date().toISOString();
const text=(value,max=4000)=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,max);
const id=(prefix='a')=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));

export function createAlbertConstitution(overrides={}){
 const principles=[...new Set([...(ALBERT_DEFAULT_CONSTITUTION.principles||[]),...(Array.isArray(overrides.principles)?overrides.principles.map(v=>text(v,500)).filter(Boolean):[])])].slice(0,40);
 const mandatoryChecks=[...new Set([...(ALBERT_DEFAULT_CONSTITUTION.mandatoryChecks||[]),...(Array.isArray(overrides.mandatoryChecks)?overrides.mandatoryChecks.map(v=>text(v,80)).filter(Boolean):[])])].slice(0,30);
 return{
  version:Number.isSafeInteger(overrides.version)&&overrides.version>0?overrides.version:1,
  project:text(overrides.project||'ALBERT APEX',120),
  principles,
  mandatoryChecks,
  blockedPatterns:[...ALBERT_DEFAULT_CONSTITUTION.blockedPatterns],
  updatedAt:now()
 };
}

function classifyIntent(prompt){
 const q=prompt.toLowerCase();
 if(/\b(corrige|bug|erreur|panne|répare|repare|fix)\b/.test(q))return 'bug';
 if(/\b(image|vidéo|video|audio|voix|montage|visuel|créatif|creatif)\b/.test(q))return 'creative';
 if(/\b(recherche|cherche|analyse|rapport|source|étude|etude)\b/.test(q))return 'research';
 if(/\b(code|fonction|application|api|module|composant|développe|developpe|implémente|implemente)\b/.test(q))return 'build';
 if(/\b(mail|agenda|publie|publication|linkedin|instagram|tiktok|envoie|message)\b/.test(q))return 'operation';
 return 'general';
}

function defaultAcceptance(kind){
 const base=['Le résultat correspond à la demande explicite.','Aucune action non demandée n’est considérée comme accomplie.'];
 if(kind==='bug')return [...base,'Le problème est reproductible avant correction.','Un test de non-régression confirme la correction.'];
 if(kind==='build')return [...base,'Le changement passe les tests applicables.','Le résultat est vérifié dans son environnement cible.'];
 if(kind==='creative')return [...base,'Les assets obligatoires sont préservés.','Le rendu final est contrôlé avant export.'];
 if(kind==='research')return [...base,'Les faits externes importants sont sourcés.','Les incertitudes sont distinguées des faits.'];
 if(kind==='operation')return [...base,'La cible de l’action est explicitement résolue.','Une action externe n’est réussie qu’après confirmation du fournisseur.'];
 return base;
}

export function compileAlbertSpec(input,{project='ALBERT APEX',constitution=createAlbertConstitution({project})}={}){
 const prompt=text(typeof input==='string'?input:input?.prompt,12000);
 if(!prompt)throw new Error('Une intention est requise pour produire une spécification.');
 const kind=classifyIntent(prompt);
 const supplied=typeof input==='object'&&input?input:{};
 const constraints=(Array.isArray(supplied.constraints)?supplied.constraints:[]).map(v=>text(v,500)).filter(Boolean).slice(0,40);
 const acceptance=(Array.isArray(supplied.acceptance)?supplied.acceptance:defaultAcceptance(kind)).map(v=>text(v,500)).filter(Boolean).slice(0,40);
 return{
  id:id('spec'),
  version:1,
  project:text(project,120),
  kind,
  intent:prompt,
  constraints,
  acceptance,
  constitutionVersion:constitution.version,
  frozen:true,
  createdAt:now(),
  updatedAt:now()
 };
}

const TASK_LIBRARY={
 understand:{title:'Comprendre l’intention',phase:'INTENT',permission:'read'},
 assess:{title:'Évaluer risques et dépendances',phase:'ASSESS',permission:'read'},
 plan:{title:'Construire le plan',phase:'PLAN',permission:'read'},
 execute:{title:'Exécuter la modification',phase:'EXECUTE',permission:'write_local'},
 review:{title:'Revoir le résultat',phase:'REVIEW',permission:'read'},
 verify:{title:'Vérifier les critères',phase:'VERIFY',permission:'read'},
 evidence:{title:'Assembler les preuves',phase:'EVIDENCE',permission:'read'}
};

function task(key,deps=[]){
 const base=TASK_LIBRARY[key];
 return{id:id('task'),key,title:base.title,phase:base.phase,permission:base.permission,status:'queued',deps:[...deps],attempts:0,startedAt:null,endedAt:null,error:'',evidence:[]};
}

export function compileAlbertTaskGraph(spec){
 if(!spec?.id||!spec?.intent)throw new Error('Spécification invalide.');
 const understand=task('understand');
 const assess=task('assess',[understand.id]);
 const plan=task('plan',[assess.id]);
 const execute=task('execute',[plan.id]);
 const review=task('review',[execute.id]);
 const verify=task('verify',[review.id]);
 const evidence=task('evidence',[verify.id]);
 return{id:id('graph'),specId:spec.id,createdAt:now(),tasks:[understand,assess,plan,execute,review,verify,evidence]};
}

export function runnableAlbertTasks(graph){
 const tasks=Array.isArray(graph?.tasks)?graph.tasks:[];
 const done=new Set(tasks.filter(t=>['verified','cancelled'].includes(t.status)).map(t=>t.id));
 return tasks.filter(t=>t.status==='queued'&&t.deps.every(dep=>done.has(dep)));
}

export function transitionAlbertTask(graph,taskId,status,{error='',evidence}={}){
 if(!ALBERT_TASK_STATUS.includes(status))throw new Error('État de tâche invalide.');
 const next=clone(graph),target=next.tasks.find(t=>t.id===taskId);
 if(!target)throw new Error('Tâche inconnue.');
 const terminal=['verified','failed','cancelled'].includes(target.status);
 if(terminal&&target.status!==status)throw new Error('Une tâche terminée ne peut pas changer d’état.');
 if(status==='running'){target.startedAt=target.startedAt||now();target.attempts=Math.min(99,(target.attempts||0)+1);}
 if(['verified','failed','cancelled'].includes(status))target.endedAt=now();
 target.status=status;
 target.error=text(error,1200);
 if(Array.isArray(evidence))target.evidence=evidence.slice(0,50).map(v=>text(v,1000)).filter(Boolean);
 return next;
}

export function createAlbertEvent(type,payload={},priority){
 const p=priority||eventPriority(type,payload);
 return{id:id('evt'),type:text(type,100)||'unknown',priority:p,createdAt:now(),payload:clone(payload)};
}

export function eventPriority(type,payload={}){
 const name=String(type||'').toLowerCase();
 if(/security|payment|failed|critical|secret|breach/.test(name))return 'critical';
 if(/approval|permission|conflict|warning|offline/.test(name))return 'attention';
 if(/completed|mail|calendar|deployment|message/.test(name))return payload.urgent?'attention':'normal';
 return 'quiet';
}

export function actionRisk(action={}){
 const type=String(action.type||'');
 if(['read','search','inspect','status','open_view'].includes(type))return {level:0,label:'lecture',approval:false};
 if(['open_app','move_window','run_test','generate_preview'].includes(type))return {level:1,label:'local sûr',approval:false};
 if(['create_file','update_file','rename_file','install_skill'].includes(type))return {level:2,label:'écriture locale',approval:Boolean(action.irreversible)};
 if(['send_message','publish','push','deploy','calendar_write'].includes(type))return {level:3,label:'action externe',approval:true};
 if(['delete','payment','transfer','revoke','rotate_secret','production_migration'].includes(type))return {level:4,label:'critique',approval:true};
 return {level:3,label:'inconnue',approval:true};
}

export function permissionDecision(action,{grants=[]}={}){
 const risk=actionRisk(action);
 const key=text(action.capability||action.type,100);
 const granted=grants.some(g=>g===key||g==='level:'+risk.level);
 return{
  allowed:risk.level<=1||granted,
  approvalRequired:risk.approval&&!granted,
  level:risk.level,
  label:risk.label,
  capability:key
 };
}

export function routeAlbertModel({kind='general',mode='AUTO',privacy='standard',runtime={},available=[]}={}){
 const candidates=Array.isArray(available)?available:[];
 const local=candidates.filter(m=>m?.local===true&&m.available!==false);
 const cloud=candidates.filter(m=>m?.local!==true&&m.available!==false);
 const capability=kind==='creative'?'vision':kind==='build'||kind==='bug'?'code':kind==='research'?'reasoning':'chat';
 const match=list=>list.find(m=>Array.isArray(m.capabilities)&&m.capabilities.includes(capability))||list[0]||null;
 if(mode==='LOCAL'||privacy==='strict')return {route:'local',model:match(local),capability,reason:'Confidentialité ou mode local.'};
 if(mode==='INTERNET')return {route:'cloud',model:match(cloud),capability,reason:'Mode Internet demandé.'};
 if(mode==='HYBRID')return {route:local.length?'hybrid-local-first':'cloud',model:match(local)||match(cloud),capability,reason:'Local prioritaire avec relais cloud.'};
 const pressure=Number(runtime.vramFreeMb||0)>0&&Number(runtime.vramFreeMb)<2500;
 return pressure&&cloud.length?{route:'cloud',model:match(cloud),capability,reason:'Pression VRAM détectée.'}:{route:local.length?'local':'cloud',model:match(local)||match(cloud),capability,reason:'Route automatique.'};
}

export function resourcePolicy(profile='NORMAL'){
 if(profile==='ECO')return{profile,maxParallel:1,preferLocalSmall:true,allowHeavyCreative:false,background:true};
 if(profile==='APEX')return{profile,maxParallel:4,preferLocalSmall:false,allowHeavyCreative:true,background:true};
 return{profile:'NORMAL',maxParallel:2,preferLocalSmall:false,allowHeavyCreative:true,background:true};
}

const signature=value=>text(value,2000).toLowerCase().replace(/\s+/g,' ').replace(/[^a-z0-9à-ÿ ]/gi,'').slice(0,500);
export function inspectAlbertStrategy(history,prompt){
 const sig=signature(prompt),recent=(Array.isArray(history)?history:[]).slice(-8);
 const same=recent.filter(item=>signature(item.intent||item.prompt||'')===sig).length;
 const failures=recent.filter(item=>item.status==='failed').length;
 if(same>=2)return{state:'loop-risk',switchStrategy:true,reason:'Même intention répétée plusieurs fois.'};
 if(failures>=3)return{state:'degraded',switchStrategy:true,reason:'Plusieurs échecs récents détectés.'};
 return{state:'nominal',switchStrategy:false,reason:'Aucune boucle détectée.'};
}

export function evaluateCompletion({spec,graph,evidence={}}={}){
 const tasks=Array.isArray(graph?.tasks)?graph.tasks:[];
 const failed=tasks.some(t=>t.status==='failed');
 const pending=tasks.some(t=>!['verified','cancelled'].includes(t.status));
 const checks={
  spec:Boolean(spec?.id&&spec?.intent),
  noFailure:!failed,
  tasksVerified:tasks.length>0&&!pending,
  executed:evidence.executed===true,
  tested:evidence.tested===true,
  verified:evidence.verified===true,
  reversible:evidence.reversible!==false,
  documented:evidence.documented===true
 };
 const complete=Object.values(checks).every(Boolean);
 return{complete,state:complete?'VERIFIED':failed?'FAILED':'NOT_VERIFIED',checks};
}

export function createEvidenceBundle(input={}){
 const files=(Array.isArray(input.files)?input.files:[]).map(v=>text(v,500)).filter(Boolean).slice(0,100);
 const tests=(Array.isArray(input.tests)?input.tests:[]).map(v=>text(v,500)).filter(Boolean).slice(0,100);
 const screenshots=(Array.isArray(input.screenshots)?input.screenshots:[]).map(v=>text(v,1000)).filter(Boolean).slice(0,50);
 return{
  id:id('evidence'),
  createdAt:now(),
  files,tests,screenshots,
  externalConfirmation:text(input.externalConfirmation,1000),
  notes:text(input.notes,4000)
 };
}

export function createAlbertSession({mode='AUTO',resourceProfile='NORMAL'}={}){
 return{id:id('session'),startedAt:now(),endedAt:null,mode:ALBERT_OPERATION_MODES.includes(mode)?mode:'AUTO',resourceProfile:ALBERT_RESOURCE_PROFILES.includes(resourceProfile)?resourceProfile:'NORMAL',summary:'',taskIds:[]};
}

export function createApexState(){
 const session=createAlbertSession();
 return{
  version:2,
  mode:'AUTO',
  resourceProfile:'NORMAL',
  killSwitch:false,
  constitution:createAlbertConstitution(),
  session,
  tasks:[],
  events:[],
  needYou:[],
  history:[],
  health:{orchestrator:'ready',spec:'ready',permissions:'ready',events:'ready',evidence:'ready',localRuntime:'unknown'},
  capabilities:{
   orchestrator:'ready',
   specCompiler:'ready',
   taskGraph:'ready',
   permissionBroker:'ready',
   metacognitiveSupervisor:'ready',
   evidenceContract:'ready',
   modelRouter:'policy-ready',
   localRuntime:'external'
  }
 };
}

export function normalizeApexState(raw){
 const base=createApexState();
 if(!raw||typeof raw!=='object')return base;
 return{
  ...base,
  mode:ALBERT_OPERATION_MODES.includes(raw.mode)?raw.mode:base.mode,
  resourceProfile:ALBERT_RESOURCE_PROFILES.includes(raw.resourceProfile)?raw.resourceProfile:base.resourceProfile,
  killSwitch:Boolean(raw.killSwitch),
  constitution:createAlbertConstitution(raw.constitution),
  session:raw.session&&typeof raw.session==='object'?{...base.session,...raw.session}:base.session,
  tasks:Array.isArray(raw.tasks)?raw.tasks.slice(-60):[],
  events:Array.isArray(raw.events)?raw.events.slice(-100):[],
  needYou:Array.isArray(raw.needYou)?raw.needYou.slice(-30):[],
  history:Array.isArray(raw.history)?raw.history.slice(-80):[],
  health:{...base.health,...(raw.health||{})},
  capabilities:{...base.capabilities,...(raw.capabilities||{})}
 };
}
