import {BANKING_ROUTES,CRYPTO_ROUTES,FINANCE_GATES,FINANCE_SOURCES,FINANCE_SOURCE_DATE} from './finance-sources.js';
export const PROJECT_FINANCE_KEY='threeb_finance_project_v1';
export const MONEY_LIMIT=100_000_000_000;
export const PROJECT_BACKUP_MAX_BYTES=2_000_000;
export const BUDGET_FIELDS={revenueMinor:'Encaissements clients',otherIncomeMinor:'Autres encaissements confirmés',teamMinor:'Équipe',technologyMinor:'Technique',complianceMinor:'Conformité',otherCostsMinor:'Autres décaissements'};
export const GATE_STATUSES={missing:'À réunir',draft:'En préparation',review:'En revue',documented:'Preuve référencée (déclarée)'};
export const FUNDING_STATUSES={identified:'Piste identifiée',preparing:'Dossier en préparation',ready:'Prêt pour revue',submitted:'Envoyé hors application',feedback:'Retour reçu',approved:'Accord déclaré',rejected:'Refus déclaré',received:'Versement déclaré'};
export const FUNDING_TYPES={equity:'Capital',loan:'Prêt',grant:'Aide / subvention',own:'Apport',other:'Autre'};
export const PROVIDER_TYPES={payment:'Paiement',kyc:'KYC / KYB',custody:'Conservation',crypto:'Services crypto',cloud:'Infrastructure',other:'Autre'};
const SCENARIO_IDS=['prudent','reference','growth'];
export const financeProjectToday=()=>{const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');};
const clone=value=>JSON.parse(JSON.stringify(value));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function text(value,max=500){if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error('Texte invalide ou trop long.');return value.trim();}
function integer(value,max=MONEY_LIMIT){if(!Number.isSafeInteger(value)||value<0||value>max)throw Error('Montant entier hors limites.');return value;}
function member(value,map){if(typeof value!=='string'||!Object.hasOwn(map,value))throw Error('Choix inconnu.');return value;}
function date(value){if(value==='')return '';if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw Error('Date invalide.');return value;}
function month(value){if(typeof value!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(value))throw Error('Le mois doit être compris entre 2000 et 2099.');return value;}
function id(value){if(typeof value!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(value))throw Error('Identifiant invalide.');return value;}
function ref(value){return text(value,300);}
function reviewDate(value){const checked=date(value);if(checked&&checked>financeProjectToday())throw Error('Une revue réalisée ne peut pas porter une date future. Utilise l’échéance pour la planifier.');return checked;}
function list(value,max,normalizer){if(!Array.isArray(value)||value.length>max)throw Error('Liste invalide ou trop longue.');const items=value.map(normalizer);if(new Set(items.map(item=>item.id)).size!==items.length)throw Error('Identifiants en double.');return items;}
function normalizeRecord(raw,kind){
 if(!isObject(raw))throw Error('Fiche invalide.');
 if(kind==='milestone'){
  if(!FINANCE_GATES.some(gate=>gate.id===raw.id))throw Error('Jalon inconnu.');
  const item={id:raw.id,status:member(raw.status,GATE_STATUSES),owner:text(raw.owner,100),due:date(raw.due),evidence:ref(raw.evidence),reviewer:text(raw.reviewer,100),checked:reviewDate(raw.checked),next:text(raw.next,1000)};
  if(item.status==='documented'&&(!item.evidence||!item.reviewer||!item.checked))throw Error('Une preuve référencée exige une référence, un relecteur et une date de revue.');return item;
 }
 if(kind==='funding'){
  const item={id:id(raw.id),title:text(raw.title,120),institution:text(raw.institution,120),type:member(raw.type,FUNDING_TYPES),amountMinor:integer(raw.amountMinor),status:member(raw.status,FUNDING_STATUSES),deadline:date(raw.deadline),next:text(raw.next,1000),eligibility:text(raw.eligibility,1000),evidence:ref(raw.evidence)};
  if(!item.title)throw Error('Nomme la piste de financement.');
  if(['submitted','approved','received','rejected','feedback'].includes(item.status)&&!item.evidence)throw Error('Cet état exige une référence de justificatif, conservé hors de l’application.');return item;
 }
 const item={id:id(raw.id),name:text(raw.name,120),type:member(raw.type,PROVIDER_TYPES),entity:text(raw.entity,150),registry:text(raw.registry,500),checked:reviewDate(raw.checked),scope:text(raw.scope,1000),next:text(raw.next,1000),evidence:ref(raw.evidence)};
 if(!item.name)throw Error('Nomme le prestataire pressenti.');
 if(item.registry){let url;try{url=new URL(item.registry);}catch{throw Error('Le lien de registre doit être une URL HTTPS.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Le lien de registre doit être HTTPS, sans identifiants.');}
 return item;
}
export function newFinanceProject(startMonth=financeProjectToday().slice(0,7)){
 return {version:1,profile:{name:'3B International',legalName:'',jurisdiction:'France / Union européenne — hypothèse à confirmer',purpose:'',customers:'',businessModel:'',lead:''},architecture:{banking:'undecided',crypto:'undecided',fundFlow:'',roles:''},budget:{startMonth:month(startMonth),openingMinor:0,months:Array.from({length:12},()=>Object.fromEntries(Object.keys(BUDGET_FIELDS).map(field=>[field,0])))},scenarios:[{id:'prudent',name:'Prudent',revenueBps:7000,costBps:11500},{id:'reference',name:'Référence',revenueBps:10000,costBps:10000},{id:'growth',name:'Développement',revenueBps:12000,costBps:11000}],scenarioId:'reference',milestones:FINANCE_GATES.map(gate=>({id:gate.id,status:'missing',owner:'',due:'',evidence:'',reviewer:'',checked:'',next:''})),providers:[],funding:[]};
}
export function validateFinanceProject(raw){
 if(!isObject(raw)||raw.version!==1||!isObject(raw.profile)||!isObject(raw.architecture)||!isObject(raw.budget))throw Error('Sauvegarde de projet incompatible.');
 const profile=Object.fromEntries(['name','legalName','jurisdiction','purpose','customers','businessModel','lead'].map(field=>[field,text(raw.profile[field],['purpose','customers','businessModel'].includes(field)?2000:200)]));
 if(!profile.name||!profile.jurisdiction)throw Error('Le nom de projet et le territoire sont requis.');
 const architecture={banking:member(raw.architecture.banking,BANKING_ROUTES),crypto:member(raw.architecture.crypto,CRYPTO_ROUTES),fundFlow:text(raw.architecture.fundFlow,3000),roles:text(raw.architecture.roles,3000)};
 if(!Array.isArray(raw.budget.months)||raw.budget.months.length!==12)throw Error('Le budget doit contenir exactement 12 mois.');
 const budget={startMonth:month(raw.budget.startMonth),openingMinor:integer(raw.budget.openingMinor),months:raw.budget.months.map(row=>{if(!isObject(row))throw Error('Mois invalide.');return Object.fromEntries(Object.keys(BUDGET_FIELDS).map(field=>[field,integer(row[field])]));})};
 const scenarios=list(raw.scenarios,3,item=>({id:id(item.id),name:text(item.name,40),revenueBps:integer(item.revenueBps,30000),costBps:integer(item.costBps,30000)}));
 if(scenarios.length!==3||SCENARIO_IDS.some(value=>!scenarios.some(item=>item.id===value))||scenarios.some(item=>!item.name)||!SCENARIO_IDS.includes(raw.scenarioId))throw Error('Scénarios invalides.');
 const milestones=list(raw.milestones,FINANCE_GATES.length,item=>normalizeRecord(item,'milestone'));
 if(milestones.length!==FINANCE_GATES.length)throw Error('Le registre de jalons est incomplet.');
 return {version:1,profile,architecture,budget,scenarios,scenarioId:raw.scenarioId,milestones,providers:list(raw.providers,40,item=>normalizeRecord(item,'provider')),funding:list(raw.funding,50,item=>normalizeRecord(item,'funding'))};
}
// Parse euros and percentages using decimal digits, never binary floating-point money arithmetic.
export function parseProjectMoney(value){
 if(typeof value!=='string'||!/^\d{1,10}(?:[.,]\d{1,2})?$/.test(value.trim()))throw Error('Saisis un montant positif en euros, avec au maximum 2 décimales.');
 const [whole,fraction='']=value.trim().replace(',','.').split('.'),minor=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(minor>BigInt(MONEY_LIMIT))throw Error('Le montant dépasse la limite du plan (1 milliard d’euros).');return Number(minor);
}
export function parseProjectPercent(value){const n=parseProjectMoney(value);if(n>30000)throw Error('Le coefficient doit être compris entre 0 et 300 %.');return n;}
export function moneyInput(minor){return (BigInt(minor)/100n).toString()+','+(BigInt(minor)%100n).toString().padStart(2,'0');}
export const formatProjectMoney=minor=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(minor/100);
export function projectMonthLabel(start,index){const [year,m]=start.split('-').map(Number);return new Intl.DateTimeFormat('fr-FR',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,m-1+index,1)));}
function scale(minor,bps){return Number((BigInt(minor)*BigInt(bps)+5000n)/10000n);}
export function calculateProjectCashflow(state,scenarioId=state.scenarioId){
 const plan=validateFinanceProject(state),scenario=plan.scenarios.find(item=>item.id===scenarioId);if(!scenario)throw Error('Scénario inconnu.');
 let closing=plan.budget.openingMinor,totalIn=0,totalOut=0,min=closing;
 const months=plan.budget.months.map((row,index)=>{const opening=closing,revenue=scale(row.revenueMinor,scenario.revenueBps),other=row.otherIncomeMinor,costs=Object.fromEntries(['teamMinor','technologyMinor','complianceMinor','otherCostsMinor'].map(field=>[field,scale(row[field],scenario.costBps)])),inflow=revenue+other,outflow=Object.values(costs).reduce((a,b)=>a+b,0),net=inflow-outflow;closing+=net;totalIn+=inflow;totalOut+=outflow;min=Math.min(min,closing);return {index,label:projectMonthLabel(plan.budget.startMonth,index),opening,revenue,other,costs,inflow,outflow,net,closing};});
 return {scenario,months,totalIn,totalOut,closing,min,gap:Math.max(0,-min),firstNegative:months.find(item=>item.closing<0)?.index??null};
}
function editTarget(state,section,key){
 if(['profile','architecture'].includes(section))return state[section];
 if(section==='budget')return {startMonth:state.budget.startMonth,openingMinor:state.budget.openingMinor};
 if(section==='month'){if(!Number.isInteger(key)||key<0||key>11)throw Error('Mois introuvable.');return state.budget.months[key];}
 const map={scenario:'scenarios',milestone:'milestones',provider:'providers',funding:'funding'};
 if(!map[section])throw Error('Section inconnue.');const record=state[map[section]].find(item=>item.id===key);if(!record)throw Error('Cette fiche a été retirée. Copie ton brouillon avant de fermer.');return record;
}
export function applyFinanceProjectDraft(state,{section,key,draft,baseline}){
 const next=clone(validateFinanceProject(state)),current=editTarget(next,section,key);
 if(!isObject(draft)||!isObject(baseline))throw Error('Brouillon invalide.');
 const changes=Object.keys(current).filter(field=>field!=='id'&&Object.hasOwn(draft,field)&&!eq(draft[field],baseline[field]));
 if(changes.some(field=>!eq(current[field],baseline[field])&&!eq(current[field],draft[field])))throw Error('Un champ modifié a changé dans un autre onglet. Ton brouillon reste ouvert ; copie-le, puis recharge la fiche pour comparer.');
 for(const field of changes)current[field]=draft[field];
 if(section==='budget')Object.assign(next.budget,current);
 return validateFinanceProject(next);
}
export function addFinanceProjectRecord(state,kind,draft,recordId=globalThis.crypto?.randomUUID?.()){
 if(!['provider','funding'].includes(kind))throw Error('Type de fiche inconnu.');const record=normalizeRecord({...draft,id:recordId},kind),field=kind==='provider'?'providers':'funding';
 if(state[field].some(item=>item.id===record.id))throw Error('Identifiant déjà utilisé.');return validateFinanceProject({...state,[field]:[...state[field],record]});
}
export function removeFinanceProjectRecord(state,kind,recordId,baseline){
 const field=kind==='provider'?'providers':kind==='funding'?'funding':null;if(!field)throw Error('Type inconnu.');const current=state[field].find(item=>item.id===recordId);if(!current)return state;
 if(!eq(current,baseline))throw Error('Cette fiche a changé. Ferme le formulaire puis rouvre-la avant de confirmer son retrait.');return validateFinanceProject({...state,[field]:state[field].filter(item=>item.id!==recordId)});
}
export function projectReadiness(state){
 const missing=FINANCE_GATES.filter(gate=>state.milestones.find(item=>item.id===gate.id)?.status!=='documented');
 return {documented:FINANCE_GATES.length-missing.length,total:FINANCE_GATES.length,missing,bankingQualified:state.architecture.banking!=='undecided',cryptoQualified:state.architecture.crypto!=='undecided',realServicesActivated:false};
}
export function exportFinanceProject(state){return JSON.stringify({format:'3b-finance-project',...validateFinanceProject(state)},null,2);}
export function importFinanceProject(source){if(typeof source!=='string'||new TextEncoder().encode(source).length>PROJECT_BACKUP_MAX_BYTES)throw Error('Choisis une sauvegarde JSON de moins de 2 Mo.');let raw;try{raw=JSON.parse(source);}catch{throw Error('JSON illisible.');}if(raw?.format!=='3b-finance-project')throw Error('Ce fichier n’est pas une sauvegarde de l’atelier finance 3B.');return validateFinanceProject(raw);}
export function loadFinanceProject(storage){
 try{const target=storage??globalThis.localStorage,raw=target.getItem(PROJECT_FINANCE_KEY);return {state:raw===null?newFinanceProject():validateFinanceProject(JSON.parse(raw)),warning:'',blocked:false};}
 catch{return {state:newFinanceProject(),warning:'Sauvegarde locale illisible ou stockage indisponible. Elle n’a pas été remplacée. Exporte les informations affichées avant récupération.',blocked:true};}
}
export function createFinanceProjectSession({storage,locks=globalThis.navigator?.locks}={}){
 const loaded=loadFinanceProject(storage);let current=loaded.state,queue=Promise.resolve();
 return {loaded,getState:()=>current,commit(change){
  const execute=()=>{try{
   const target=storage??globalThis.localStorage,raw=target.getItem(PROJECT_FINANCE_KEY);let latest;
   try{latest=raw===null?newFinanceProject():validateFinanceProject(JSON.parse(raw));}catch{throw Error('La sauvegarde existante est illisible ou incompatible. Elle est conservée ; récupère-la avant de recommencer.');}
   const next=validateFinanceProject(typeof change==='function'?change(latest):change);
   // The lock serializes cooperating tabs. Compare again for non-cooperating writers.
   if(target.getItem(PROJECT_FINANCE_KEY)!==raw)throw Error('Le projet a changé pendant l’enregistrement. Réessaie sans fermer ton brouillon.');
   target.setItem(PROJECT_FINANCE_KEY,JSON.stringify(next));current=next;return {ok:true,state:next,warning:''};
  }catch(error){return {ok:false,state:current,warning:error?.message||'Enregistrement impossible. Le brouillon reste ouvert.'};}};
  const result=queue.catch(()=>{}).then(()=>locks?.request?locks.request(PROJECT_FINANCE_KEY,execute):execute()).catch(()=>({ok:false,state:current,warning:'Stockage indisponible. Le brouillon reste ouvert ; conserve-le avant de quitter.'}));queue=result;return result;
 }};
}
export function exportProjectCashflowCsv(state){
 const flow=calculateProjectCashflow(state),rows=[['Plan de travail 3B — hypothèses, EUR, non certifié'],['Scénario',flow.scenario.name],['Mois','Ouverture','Clients','Autres encaissements confirmés','Décaissements','Variation','Clôture'],...flow.months.map(row=>[row.label,...['opening','revenue','other','outflow','net','closing'].map(field=>moneyInputSigned(row[field]))])];
 return '\ufeff'+rows.map(row=>row.map(value=>{const raw=String(value),safe=/^\s*[=+@-]/.test(raw)&&!/^\-?\d+,\d{2}$/.test(raw)?"'"+raw:raw;return '"'+safe.replaceAll('"','""')+'"';}).join(';')).join('\r\n');
}
function moneyInputSigned(value){return value<0?'-'+moneyInput(-value):moneyInput(value);}
export function exportFinanceBusinessBrief(state){
 const plan=validateFinanceProject(state),flow=calculateProjectCashflow(plan),ready=projectReadiness(plan),blank=value=>value||'À compléter';
 return ['# '+plan.profile.name+' — dossier de travail finance','',`Généré le ${financeProjectToday()}. Hypothèse : ${plan.profile.jurisdiction}.`,'Informations déclarées par le porteur. Aucun agrément 3B vérifié, aucun dépôt ni demande envoyé par l’application. Aucun fonds réel géré.','', '## Projet',...Object.entries({Entité:plan.profile.legalName,Porteur:plan.profile.lead,Offre:plan.profile.purpose,Clients:plan.profile.customers,'Modèle économique':plan.profile.businessModel}).map(([label,value])=>`${label} : ${blank(value)}`),'','## Architecture',`Banque / paiements : ${BANKING_ROUTES[plan.architecture.banking]}`,`Crypto : ${CRYPTO_ROUTES[plan.architecture.crypto]}`,`Flux : ${blank(plan.architecture.fundFlow)}`,`Responsabilités : ${blank(plan.architecture.roles)}`,'','## Trésorerie 12 mois',`Début : ${plan.budget.startMonth}. Scénario : ${flow.scenario.name}. Coefficients : clients ${moneyInput(flow.scenario.revenueBps)} %, décaissements ${moneyInput(flow.scenario.costBps)} %.`,`Ouverture : ${formatProjectMoney(plan.budget.openingMinor)}. Encaissements : ${formatProjectMoney(flow.totalIn)}. Décaissements : ${formatProjectMoney(flow.totalOut)}. Clôture : ${formatProjectMoney(flow.closing)}.`,`Besoin minimal calculé pour éviter une clôture mensuelle négative : ${formatProjectMoney(flow.gap)}. Ce résultat ne mesure ni le capital réglementaire ni le BFR intramensuel.`,`Les candidatures de financement ne sont jamais ajoutées automatiquement aux encaissements. Prolonger les prévisions sur trois exercices et documenter les hypothèses.`,...flow.months.map(row=>`${row.label} : entrées ${formatProjectMoney(row.inflow)} / sorties ${formatProjectMoney(row.outflow)} / clôture ${formatProjectMoney(row.closing)}`),'','## Jalons et justificatifs',...FINANCE_GATES.flatMap(gate=>{const item=plan.milestones.find(value=>value.id===gate.id);return [`- ${gate.title} — ${GATE_STATUSES[item.status]}`,`  Responsable : ${blank(item.owner)} ; échéance : ${blank(item.due)} ; référence : ${blank(item.evidence)} ; relecteur : ${blank(item.reviewer)} ; revue : ${blank(item.checked)}.`,`  Livrable : ${gate.deliverable}`,`  Prochaine action : ${blank(item.next)}`];}),`Références documentées déclarées : ${ready.documented}/${ready.total}. Services réels activés : non. La complétude de cette liste n’établit pas la conformité.`,'','## Prestataires pressentis',...(plan.providers.length?plan.providers.map(item=>`- ${item.name} (${PROVIDER_TYPES[item.type]}) — entité ${blank(item.entity)} ; registre ${blank(item.registry)} ; contrôle déclaré ${blank(item.checked)} ; périmètre ${blank(item.scope)} ; référence ${blank(item.evidence)} ; suite ${blank(item.next)}`):['Aucun prestataire renseigné. Aucun partenaire ni contrat confirmé.']),'','## Financements et candidatures',...(plan.funding.length?plan.funding.map(item=>`- ${item.title} / ${blank(item.institution)} — ${FUNDING_TYPES[item.type]}, demandé ${formatProjectMoney(item.amountMinor)}, ${FUNDING_STATUSES[item.status]} ; échéance ${blank(item.deadline)} ; référence ${blank(item.evidence)} ; éligibilité ${blank(item.eligibility)} ; suite ${blank(item.next)}`):['Aucune piste renseignée. Aucune éligibilité, candidature ou ressource acquise vérifiée.']),'','## Sources officielles',`Références contrôlées le ${FINANCE_SOURCE_DATE}. Leur consultation ne vérifie pas le dossier 3B.`,...FINANCE_SOURCES.map(source=>`- ${source.authority} — ${source.title} : ${source.url}\n  ${source.note}${source.verification?' Contrôle : '+source.verification+'.':''}`),'','## Prototype token', 'Prototype Solidity ERC20 séparé : ThreeBTokenPrototype, T3B, 18 décimales, émission initiale fixe, tests EVM locaux. Aucun déploiement public prouvé. Le jeton fictif de démonstration (2 décimales) n’est pas ce contrat. Aucun pont automatique ni valeur garantie.',''].join('\n');
}
