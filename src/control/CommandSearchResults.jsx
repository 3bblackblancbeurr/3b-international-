import {Activity,Boxes,GitBranch,Search,ShieldCheck,TerminalSquare,Workflow} from 'lucide-react';

const MODULES=[
 {id:'cc-now',label:'État général',keywords:'accueil maintenant santé générale',Icon:Activity},
 {id:'cc-brief',label:'Brief du jour',keywords:'brief quotidien résumé journée',Icon:Activity},
 {id:'cc-alerts',label:'Centre d’attention',keywords:'alertes notifications urgent important',Icon:Activity},
 {id:'cc-nexus',label:'Nexus 3B',keywords:'services connexions sources',Icon:Workflow},
 {id:'cc-integrations',label:'Centre d’intégrations',keywords:'email réseaux finance agenda vercel api',Icon:Workflow},
 {id:'cc-traffic',label:'Radar 3B',keywords:'trafic fréquentation visites analytics',Icon:Activity},
 {id:'cc-dev',label:'Dev Center',keywords:'github ci commit pr déploiement',Icon:GitBranch},
 {id:'cc-security',label:'Security Center',keywords:'sécurité permissions allowlist audit',Icon:ShieldCheck},
 {id:'cc-projects',label:'Projects Center',keywords:'projets passeport monde origins nosbloc jeux',Icon:Boxes},
 {id:'cc-actions',label:'Actions PC',keywords:'pc commandes ping github supabase unreal',Icon:TerminalSquare}
];

const norm=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export default function CommandSearchResults({query,commands,events,onNavigate}){
 const q=norm(query).trim();
 if(q.length<2)return null;

 const moduleHits=MODULES.filter(item=>norm(item.label+' '+item.keywords).includes(q)).slice(0,5);
 const commandHits=(commands||[]).filter(item=>norm(item.command_type+' '+item.status+' '+(item.error_message||'')).includes(q)).slice(0,3);
 const eventHits=(events||[]).filter(item=>norm(item.event_type+' '+JSON.stringify(item.detail||{})).includes(q)).slice(0,3);
 const empty=!moduleHits.length&&!commandHits.length&&!eventHits.length;

 return <div className="control-search-results" role="listbox" aria-label="Résultats Command OS">
  <div className="control-search-head"><Search size={13}/><span>RÉSULTATS INSTANTANÉS</span></div>
  {moduleHits.map(item=>{
   const Icon=item.Icon;
   return <button type="button" key={item.id} onClick={()=>onNavigate(item.id)}><Icon size={14}/><span><strong>{item.label}</strong><small>Ouvrir le module</small></span></button>;
  })}
  {commandHits.map(item=><div className="control-search-data" key={'command-'+item.id}><TerminalSquare size={14}/><span><strong>{item.command_type}</strong><small>{item.status}</small></span></div>)}
  {eventHits.map(item=><div className="control-search-data" key={'event-'+item.id}><Activity size={14}/><span><strong>{item.event_type}</strong><small>Événement audité</small></span></div>)}
  {empty&&<div className="control-search-empty"><Search size={14}/><span>Aucun module ou événement chargé ne correspond.</span></div>}
 </div>;
}