import {
 BrainCircuit,CalendarDays,Database,Github,Mail,Monitor,Radar,Share2,ShieldCheck,
 WalletCards,Workflow
} from 'lucide-react';

const LABELS={
 connected:'Connecté',available:'Disponible',partial:'Partiel',checking:'Contrôle…',
 degraded:'Dégradé',offline:'Hors ligne',disconnected:'Non connecté'
};

function Row({Icon,label,state,detail,next}){
 return <article className="control-integration-row">
  <span className="control-integration-icon"><Icon size={17}/></span>
  <div><strong>{label}</strong><small>{detail}</small>{next&&<em>{next}</em>}</div>
  <b className={'is-'+state}>{LABELS[state]||state}</b>
 </article>;
}

export default function IntegrationCenterPanel({pulse,dataAvailable,primaryDevice,primaryOnline}){
 const core=dataAvailable?'connected':'checking';
 const pc=primaryOnline?'connected':primaryDevice?'offline':'disconnected';
 const git=pulse?.github===true?'connected':pulse?.github===false?'degraded':'checking';
 const prod=pulse?.production===true?'available':pulse?.production===false?'degraded':'checking';

 const rows=[
  {Icon:Database,label:'Supabase / Control Center',state:core,detail:'Session propriétaire + données privées du cockpit.',next:'Déjà utilisé par Command OS.'},
  {Icon:Github,label:'GitHub / Actions',state:git,detail:'Commits, CI, PR et déploiements GitHub publics.',next:'Déjà utilisé par Dev Center.'},
  {Icon:Monitor,label:'PC 3B',state:pc,detail:primaryDevice?'Agent appairé connu.':'Aucun agent appairé.',next:primaryDevice?'Relancer l’agent si nécessaire.':'Appairer depuis le centre Appareils.'},
  {Icon:Radar,label:'Radar 3B',state:'available',detail:'Fréquentation agrégée via RPC Supabase.',next:'Déjà utilisé par Radar 3B.'},
  {Icon:Workflow,label:'Vercel',state:prod==='available'?'partial':prod,detail:'La disponibilité production est contrôlée, mais pas l’API Vercel complète.',next:'Nécessite une intégration serveur Vercel dédiée pour builds/rollback.'},
  {Icon:Mail,label:'E-mail',state:'disconnected',detail:'Aucun compte mail applicatif n’est branché à Command OS.',next:'Nécessite OAuth serveur et permissions explicites.'},
  {Icon:Share2,label:'Réseaux sociaux',state:'disconnected',detail:'TikTok / YouTube / Instagram ne sont pas branchés.',next:'Nécessite les API officielles et autorisations de chaque plateforme.'},
  {Icon:WalletCards,label:'Finances',state:'disconnected',detail:'Aucune source bancaire ou financière n’est connectée.',next:'Nécessite un fournisseur financier autorisé ; aucun montant ne sera simulé.'},
  {Icon:CalendarDays,label:'Agenda',state:'disconnected',detail:'Aucun calendrier n’est connecté à l’application.',next:'Nécessite OAuth calendrier côté serveur.'},
  {Icon:BrainCircuit,label:'3B IA Command',state:'disconnected',detail:'Aucun moteur IA dédié n’est encore branché au cockpit.',next:'À connecter seulement avec une source et des permissions définies.'},
  {Icon:ShieldCheck,label:'Sécurité',state:'available',detail:'Garde propriétaire, allowlist et journal d’audit actifs.',next:'Conserver cette barrière pour chaque future intégration.'}
 ];

 return <section className="control-section control-integrations control-hide-in-focus" id="cc-integrations" aria-label="Centre des intégrations Command OS">
  <header className="control-section-heading">
   <div><p className="control-kicker"><Workflow size={13}/> SOURCES · CONTRATS RÉELS</p><h2>Centre d’intégrations</h2></div>
   <span className="control-integrations-badge">{rows.filter(row=>['connected','available','partial'].includes(row.state)).length}/{rows.length}</span>
  </header>
  <div className="control-integration-list">{rows.map(row=><Row key={row.label} {...row}/>)}</div>
  <p className="control-integrations-note">Aucun connecteur futur ne doit placer de secret dans le frontend. Les clés et jetons sensibles restent côté serveur.</p>
 </section>;
}