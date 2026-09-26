import {useMemo,useState} from 'react';
import {
 Activity,AppWindow,BrainCircuit,CalendarDays,ChevronDown,ChevronRight,ChevronUp,
 CircleOff,Database,Eye,EyeOff,Github,Mail,Monitor,Radar,Share2,ShieldCheck,
 WalletCards,Workflow
} from 'lucide-react';

const stateLabel={
 connected:'Connecté',
 available:'Disponible',
 partial:'Partiel',
 checking:'Contrôle…',
 degraded:'Dégradé',
 offline:'Hors ligne',
 disconnected:'Non connecté'
};

function fromBoolean(value,{ok='connected',bad='degraded',pending='checking'}={}){
 if(value===true)return ok;
 if(value===false)return bad;
 return pending;
}

function DomainCard({domain,onJump}){
 const body=<>
  <span className="control-nexus-domain-icon"><domain.Icon size={17}/></span>
  <div className="control-nexus-domain-copy">
   <strong>{domain.label}</strong>
   <small>{domain.detail}</small>
  </div>
  <span className={'control-nexus-state is-'+domain.state}>{stateLabel[domain.state]||domain.state}</span>
  {domain.anchor&&<ChevronRight className="control-nexus-chevron" size={15}/>}
 </>;
 if(domain.anchor)return <button type="button" className="control-nexus-domain" onClick={()=>onJump(domain.anchor)}>{body}</button>;
 return <article className="control-nexus-domain">{body}</article>;
}

export default function CommandNexus({
 pulse,
 dataAvailable,
 error,
 primaryDevice,
 primaryOnline,
 alerts,
 lastSync,
 privacyMode,
 onPrivacyChange,
 onJump
}){
 const[expanded,setExpanded]=useState(false);

 const domains=useMemo(()=>{
  const coreState=dataAvailable?(error?'degraded':'connected'):(error?'degraded':'checking');
  const pcState=primaryOnline?'connected':primaryDevice?'offline':'disconnected';
  const githubState=fromBoolean(pulse?.github);
  const productionState=fromBoolean(pulse?.production);

  return[
   {id:'app',label:'Application 3B',Icon:AppWindow,state:productionState,detail:pulse?.production===true?'Production répond au contrôle réel':pulse?.production===false?'Production inaccessible au dernier contrôle':'Vérification en cours',anchor:'cc-now'},
   {id:'radar',label:'Radar 3B',Icon:Radar,state:'available',detail:'Module réel · données RPC affichées si disponibles',anchor:'cc-traffic'},
   {id:'supabase',label:'Supabase',Icon:Database,state:coreState,detail:dataAvailable?'Control Center authentifié côté serveur':error?'Dernières données conservées si disponibles':'Synchronisation du propriétaire',anchor:'cc-live'},
   {id:'github',label:'GitHub / CI',Icon:Github,state:githubState,detail:pulse?.github===true?(pulse?.workflow||'Dépôt public et Actions joignables'):pulse?.github===false?'GitHub indisponible au dernier contrôle':'Vérification en cours',anchor:'cc-log'},
   {id:'pc',label:'PC autorisé',Icon:Monitor,state:pcState,detail:primaryDevice?(primaryOnline?'Agent connecté':'Appareil connu · agent hors ligne'):'Aucun appareil appairé',anchor:'cc-devices'},
   {id:'security',label:'Sécurité',Icon:ShieldCheck,state:dataAvailable?'available':coreState,detail:'Accès propriétaire serveur · allowlist · journal d’audit',anchor:'cc-log'},
   {id:'deploy',label:'Vercel',Icon:Workflow,state:pulse?.production===null?'checking':'partial',detail:'Santé production disponible · API Vercel non connectée'},
   {id:'projects',label:'Projets 3B',Icon:Activity,state:pulse?.github===true?'partial':'disconnected',detail:pulse?.github===true?'Activité GitHub disponible · jalons dédiés non connectés':'Source projets dédiée non connectée'},
   {id:'email',label:'Emails',Icon:Mail,state:'disconnected',detail:'Aucun compte e-mail connecté à Command OS'},
   {id:'social',label:'Réseaux sociaux',Icon:Share2,state:'disconnected',detail:'TikTok / YouTube / Instagram non connectés'},
   {id:'finance',label:'Finances',Icon:WalletCards,state:'disconnected',detail:'Aucune source financière connectée'},
   {id:'calendar',label:'Agenda',Icon:CalendarDays,state:'disconnected',detail:'Aucun calendrier connecté à Command OS'},
   {id:'ai',label:'3B IA Command',Icon:BrainCircuit,state:'disconnected',detail:'Assistant de synthèse dédié non connecté'}
  ];
 },[dataAvailable,error,primaryDevice,primaryOnline,pulse]);

 const brief=useMemo(()=>[
  {
   label:'ATTENTION',
   value:alerts.length?alerts.length+' point'+(alerts.length>1?'s':''):'Aucune alerte',
   detail:alerts[0]?.title||'Aucun événement prioritaire détecté.'
  },
  {
   label:'PRODUCTION',
   value:pulse?.production===true?'En ligne':pulse?.production===false?'À vérifier':'Contrôle…',
   detail:pulse?.production===true?'Le point de contrôle public répond.':'Basé uniquement sur le dernier contrôle disponible.'
  },
  {
   label:'DÉVELOPPEMENT',
   value:pulse?.ci==='success'?'CI verte':pulse?.ci==='running'?'CI en cours':pulse?.ci?'CI à vérifier':'CI inconnue',
   detail:pulse?.commit?((pulse.commitSha?pulse.commitSha+' · ':'')+pulse.commit):'Aucun commit chargé.'
  },
  {
   label:'PC',
   value:primaryOnline?'En ligne':primaryDevice?'Hors ligne':'Non appairé',
   detail:primaryDevice?(privacyMode?'Appareil masqué en mode privé':primaryDevice.name):'Aucun agent PC disponible.'
  }
 ],[alerts,primaryDevice,primaryOnline,privacyMode,pulse]);

 const visible=expanded?domains:domains.slice(0,6);
 const connected=domains.filter(domain=>['connected','available','partial'].includes(domain.state)).length;
 const disconnected=domains.filter(domain=>domain.state==='disconnected').length;

 return <section className="control-section control-nexus" id="cc-nexus" aria-label="Nexus 3B et état des connexions">
  <header className="control-section-heading control-nexus-heading">
   <div>
    <p className="control-kicker"><Activity size={13}/> NEXUS · SOURCES RÉELLES</p>
    <h2>Nexus 3B</h2>
   </div>
   <button
    type="button"
    className={'control-privacy-toggle'+(privacyMode?' is-active':'')}
    onClick={()=>onPrivacyChange(!privacyMode)}
    aria-pressed={privacyMode}
   >
    {privacyMode?<EyeOff size={15}/>:<Eye size={15}/>}
    <span>{privacyMode?'Privé':'Masquer'}</span>
   </button>
  </header>

  <div className="control-command-brief" aria-label="Command Brief">
   <div className="control-command-brief-head">
    <div><span>COMMAND BRIEF</span><strong>Ce qui compte maintenant</strong></div>
    <small>{lastSync?'Synchro '+new Date(lastSync).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Synchronisation en cours'}</small>
   </div>
   <div className="control-command-brief-grid">
    {brief.map(item=><article key={item.label}>
     <span>{item.label}</span>
     <strong>{item.value}</strong>
     <small>{item.detail}</small>
    </article>)}
   </div>
  </div>

  <div className="control-nexus-summary">
   <div><span className="control-nexus-pulse"/><strong>{connected}</strong><small>domaines disponibles / partiels</small></div>
   <div><CircleOff size={14}/><strong>{disconnected}</strong><small>sources non connectées</small></div>
  </div>

  <div className="control-nexus-grid">
   {visible.map(domain=><DomainCard key={domain.id} domain={domain} onJump={onJump}/>)}
  </div>

  <button type="button" className="control-nexus-expand" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded}>
   {expanded?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
   <span>{expanded?'Réduire':'Voir tous les domaines'}</span>
  </button>

  <p className="control-nexus-truth">
   <ShieldCheck size={14}/>
   <span>Aucune donnée simulée : une source absente reste affichée « Non connecté » jusqu’à une intégration réelle et autorisée.</span>
  </p>
 </section>;
}
