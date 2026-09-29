import {useEffect,useMemo} from 'react';
import {useAlbertApex} from './AlbertApexContext.jsx';
import {APEX_STACK_LAYERS,ambientInbox,capabilityRegistry,readinessAudit} from './albert-apex-services.js';
import './albert-apex.css';

const MODE_COPY={
 AUTO:'Choisit la route selon confidentialité, disponibilité et ressources.',
 LOCAL:'Bloque les appels IA distants non nécessaires.',
 HYBRID:'Local d’abord, cloud uniquement si la tâche le justifie.',
 INTERNET:'Autorise la route cloud configurée.'
};
const PROFILE_COPY={
 ECO:'1 tâche lourde à la fois · économie de ressources.',
 NORMAL:'Équilibre fluidité, qualité et parallélisme.',
 APEX:'Priorité aux tâches lourdes quand la machine le permet.'
};
const TASK_LABEL={running:'EN COURS',review:'À VÉRIFIER',verified:'VÉRIFIÉ',failed:'ÉCHEC',cancelled:'ANNULÉ',queued:'PRÉVU',waiting:'ATTENTE'};

function Metric({label,value,detail,tone='neutral'}){
 return <div className={'apex-metric is-'+tone}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
function age(value){
 if(!value)return '—';
 const seconds=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/1000));
 if(seconds<60)return seconds+' s';
 if(seconds<3600)return Math.round(seconds/60)+' min';
 return Math.round(seconds/3600)+' h';
}

export default function AlbertApexPanel({online=false,runtime=null,privacyMode=false,externalEvents=[]}){
 const{state,setMode,setResourceProfile,ingestEvents,resolveNeed,killAll,resume,resetSession}=useAlbertApex();
 useEffect(()=>{ingestEvents(externalEvents);},[externalEvents,ingestEvents]);
 const latest=state.tasks.slice(-8).reverse();
 const active=state.tasks.filter(t=>t.status==='running').length;
 const verified=state.tasks.filter(t=>t.status==='verified').length;
 const failed=state.tasks.filter(t=>t.status==='failed').length;
 const runtimeState=online?'connecté':'hors ligne';
 const localAlbert=runtime?.albert&&typeof runtime.albert==='object'?runtime.albert:null;
 const vram=runtime&&Number.isFinite(Number(runtime.gpu_memory_total_mb))?Math.round(Number(runtime.gpu_memory_total_mb))+' Mo':'non reçue';
 const health=useMemo(()=>Object.entries(state.health),[state.health]);
 const capabilities=useMemo(()=>capabilityRegistry({online:typeof navigator==='undefined'?online:navigator.onLine,localRuntime:online,albertRuntime:Boolean(localAlbert?.installed),apexCore:Boolean(localAlbert?.apex_core?.online),browserVoice:typeof window!=='undefined'&&Boolean(window.SpeechRecognition||window.webkitSpeechRecognition||window.speechSynthesis)}),[online,localAlbert?.installed,localAlbert?.apex_core?.online]);
 const liveCapabilities=capabilities.filter(item=>['ready','live','available'].includes(item.state)).length;
 const inbox=useMemo(()=>ambientInbox(state.events,{max:8}),[state.events]);
 const readiness=useMemo(()=>readinessAudit({
  localhostOnly:true,
  originAllowlist:true,
  bodyLimit:true,
  typedActions:true,
  leastPrivilege:true,
  approvalGate:true,
  killSwitch:true,
  evidenceGate:true,
  inputValidation:true,
  secretHygiene:true,
  recovery:true,
  observability:true,
 }),[]);
 return <section className={'albert-apex-panel'+(state.killSwitch?' is-killed':'')} aria-label="ALBERT APEX OS">
  <header className="apex-head">
   <div><p>ALBERT APEX / OPERATING SYSTEM</p><h3>Intention → Spec → Action → Preuve</h3><span>Le cockpit n’annonce « terminé » qu’après vérification.</span></div>
   <div className={'apex-core-state '+(state.killSwitch?'bad':'good')}><i/><strong>{state.killSwitch?'STOP ALBERT':'CORE ARMÉ'}</strong></div>
  </header>

  <div className="apex-mode-grid" aria-label="Mode d’exécution">
   {Object.keys(MODE_COPY).map(mode=><button key={mode} className={state.mode===mode?'active':''} onClick={()=>setMode(mode)} disabled={state.killSwitch}><strong>{mode}</strong><span>{MODE_COPY[mode]}</span></button>)}
  </div>

  <div className="apex-profile-row" aria-label="Profil de ressources">
   {Object.keys(PROFILE_COPY).map(profile=><button key={profile} className={state.resourceProfile===profile?'active':''} onClick={()=>setResourceProfile(profile)} disabled={state.killSwitch}><strong>{profile}</strong><span>{PROFILE_COPY[profile]}</span></button>)}
  </div>

  <div className="apex-metrics">
   <Metric label="SESSION" value={state.session?.id?.slice(-8)||'—'} detail={'ouverte depuis '+age(state.session?.startedAt)} tone="good"/>
   <Metric label="TÂCHES" value={active+' actives'} detail={verified+' vérifiées · '+failed+' échecs'} tone={failed?'warn':'good'}/>
   <Metric label="RUNTIME LOCAL" value={runtimeState} detail={online?'VRAM '+vram:'aucune télémétrie fraîche'} tone={online?'good':'warn'}/>
   <Metric label="CAPACITÉS" value={liveCapabilities+' / '+capabilities.length} detail="déclarées et vérifiables" tone="good"/>
   <Metric label="READINESS" value={readiness.passed+' / '+readiness.total} detail={readiness.unknown+' contrôles à mesurer'} tone={readiness.blockers.length?'warn':'good'}/>
   <Metric label="CONFIDENTIALITÉ" value={privacyMode?'STRICTE':'STANDARD'} detail={privacyMode?'contexte sensible masqué':'règles APEX actives'} tone={privacyMode?'good':'neutral'}/>
  </div>

  <div className="apex-columns">
   <div className="apex-block">
    <div className="apex-block-title"><span>ALBERT WINDOWS LOCAL</span><strong>{localAlbert?.installed?((localAlbert.api_online||localAlbert.apex_core?.online)?'LIVE':'DÉTECTÉ'):online?'NON DÉTECTÉ':'HORS LIGNE'}</strong></div>
    {localAlbert?<div className="apex-health">
     <div><span>Installation</span><b className={localAlbert.installed?'good':'warn'}>{localAlbert.runtime_name||'absente'}</b></div>
     <div><span>API ALBERT :8765</span><b className={localAlbert.api_online?'good':'warn'}>{localAlbert.api_online?'online':'offline'}</b></div>
     <div><span>Core APEX :8766</span><b className={localAlbert.apex_core?.online?'good':'warn'}>{localAlbert.apex_core?.online?'online v'+(localAlbert.apex_core.version||'?'):'offline'}</b></div>
     <div><span>Package APEX</span><b className={localAlbert.apex_package_present?'good':'warn'}>{localAlbert.apex_package_present?'présent':'non détecté'}</b></div>
     <div><span>Lanceur</span><b className={localAlbert.launcher_present?'good':'warn'}>{localAlbert.launcher_present?'présent':'non détecté'}</b></div>
     <div><span>Desktop runtime</span><b className={localAlbert.desktop_present?'good':'warn'}>{localAlbert.desktop_present?'présent':'non détecté'}</b></div>
     <div><span>Ollama</span><b className={localAlbert.processes?.ollama?'good':'idle'}>{localAlbert.processes?.ollama?'actif':'arrêté'}</b></div>
     <div><span>Python</span><b className={localAlbert.processes?.python?'good':'idle'}>{localAlbert.processes?.python?'actif':'arrêté'}</b></div>
     <div><span>Modèles locaux</span><b className={localAlbert.model_count?'good':'idle'}>{localAlbert.model_count||0}</b></div>
     <div><span>Modules APEX locaux</span><b className={localAlbert.modules?.length?'good':'idle'}>{localAlbert.modules?.length||0}</b></div>
    </div>:<p className="apex-empty">La télémétrie ALBERT locale apparaîtra dès que le 3B Control Agent sera connecté.</p>}
    {!!localAlbert?.models?.length&&<p className="apex-runtime-detail"><strong>LLM :</strong> {localAlbert.models.slice(0,8).join(' · ')}</p>}
    {!!localAlbert?.modules?.length&&<p className="apex-runtime-detail"><strong>Modules :</strong> {localAlbert.modules.join(' · ')}</p>}
   </div>
   <div className="apex-block">
    <div className="apex-block-title"><span>PONT LOCAL</span><strong>{online?'AGENT CONNECTÉ':'AGENT OFFLINE'}</strong></div>
    <p className="apex-empty">{online?'Le Control Agent peut maintenant certifier l’installation ALBERT locale, ses modèles et son API sans donner de terminal libre au modèle.':'Aucune modification Windows n’est revendiquée tant que le PC ne remonte pas sa télémétrie.'}</p>
   </div>
  </div>

  <div className="apex-columns">
   <div className="apex-block">
    <div className="apex-block-title"><span>CONSTITUTION</span><strong>v{state.constitution.version}</strong></div>
    <ol>{state.constitution.principles.slice(0,5).map(rule=><li key={rule}>{rule}</li>)}</ol>
    <details><summary>Voir toutes les règles</summary><ol>{state.constitution.principles.slice(5).map(rule=><li key={rule}>{rule}</li>)}</ol></details>
   </div>

   <div className="apex-block">
    <div className="apex-block-title"><span>SANTÉ DU NOYAU</span><strong>{health.every(([,v])=>v==='ready'||v==='unknown')?'NOMINAL':'ATTENTION'}</strong></div>
    <div className="apex-health">{health.map(([key,value])=><div key={key}><span>{key}</span><b className={value==='ready'?'good':value==='unknown'?'idle':'warn'}>{value}</b></div>)}</div>
   </div>
  </div>

  <div className="apex-columns">
   <div className="apex-block">
    <div className="apex-block-title"><span>STACK APEX</span><strong>{APEX_STACK_LAYERS.length} COUCHES</strong></div>
    <div className="apex-health">{APEX_STACK_LAYERS.map(layer=><div key={layer.id}><span>{layer.label}</span><b className="good">ready</b></div>)}</div>
    <p className="apex-runtime-detail">Fichiers → Connexions/MCP → Skills → Routines → Agents → Vérification. Une couche ne contourne jamais les permissions de la précédente.</p>
   </div>
   <div className="apex-block">
    <div className="apex-block-title"><span>LAUNCH READINESS</span><strong>{readiness.score}% MESURÉ</strong></div>
    <div className="apex-health">{readiness.checks.slice(0,9).map(check=><div key={check.id}><span>{check.label}</span><b className={check.status==='pass'?'good':check.status==='fail'?'warn':'idle'}>{check.status}</b></div>)}</div>
    <p className="apex-runtime-detail">{readiness.unknown} points restent volontairement « unknown » tant qu’ils n’ont pas été mesurés sur le PC ou le projet ciblé.</p>
   </div>
  </div>

  <div className="apex-columns">
   <div className="apex-block">
    <div className="apex-block-title"><span>AMBIENT INBOX</span><strong>{inbox.length}</strong></div>
    <div className="apex-event-list">
     {inbox.length?inbox.map(event=><article key={event.id} className={'is-'+event.priority}>
      <div><strong>{event.type}</strong><span>{event.delivery}</span></div>
      <small>{event.createdAt?new Date(event.createdAt).toLocaleString('fr-FR'):'événement audité'}</small>
     </article>):<p className="apex-empty">Aucun événement APEX récent.</p>}
    </div>
   </div>
   <div className="apex-block">
    <div className="apex-block-title"><span>CAPABILITY REGISTRY</span><strong>{liveCapabilities}/{capabilities.length}</strong></div>
    <div className="apex-capabilities">
     {capabilities.map(item=><div key={item.id}><span>{item.label}</span><b data-state={item.state}>{item.state}</b></div>)}
    </div>
   </div>
  </div>

  <div className="apex-columns">
   <div className="apex-block">
    <div className="apex-block-title"><span>FILE D’EXÉCUTION</span><strong>{latest.length}</strong></div>
    <div className="apex-task-list">
     {latest.length?latest.map(task=><article key={task.id} className={'is-'+task.status}>
      <div><span>{TASK_LABEL[task.status]||task.status}</span><small>{task.spec?.kind||'général'} · {task.spec?.version?'spec v'+task.spec.version:'sans spec'}</small></div>
      <strong>{task.intent.slice(0,150)}</strong>
      <p>{task.progress?.label||task.strategy?.reason||'En attente de progression.'}</p>
      {task.completion&&<small className="apex-contract">{task.completion.state} · exécution {task.completion.checks?.executed?'✓':'–'} · test {task.completion.checks?.tested?'✓':'–'} · vérification {task.completion.checks?.verified?'✓':'–'}</small>}
     </article>):<p className="apex-empty">Aucune tâche APEX dans cette session.</p>}
    </div>
   </div>

   <div className="apex-block">
    <div className="apex-block-title"><span>NEED YOU</span><strong>{state.needYou.length}</strong></div>
    <div className="apex-need">
     {state.needYou.length?state.needYou.slice(-6).reverse().map(item=><article key={item.id}><div><strong>{item.title}</strong><span>{item.detail}</span></div><button onClick={()=>resolveNeed(item.id)}>Résolu</button></article>):<p className="apex-empty">Aucune validation humaine en attente.</p>}
    </div>
   </div>
  </div>

  <div className="apex-actions">
   {!state.killSwitch?<button className="danger" onClick={killAll}>STOP ALBERT</button>:<button className="resume" onClick={resume}>RÉARMER LE CORE</button>}
   <button onClick={resetSession} disabled={state.killSwitch}>Nouvelle session</button>
   <span>Les actions externes, suppressions, paiements et changements critiques restent derrière le Permission Broker.</span>
  </div>
 </section>;
}
