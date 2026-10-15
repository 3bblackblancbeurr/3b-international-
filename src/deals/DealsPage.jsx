import {useEffect,useState} from 'react';
import {ArrowUpRight,RefreshCw,BadgePercent,Search,ShieldCheck,Clock3} from 'lucide-react';
import {CATEGORIES,activeDeals,safeSource} from './feed.js';
import './deals.css';
const date=value=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'}).format(new Date(value));
export default function DealsPage(){
 const [feed,setFeed]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[category,setCategory]=useState('all'),[query,setQuery]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{
  const controller=new AbortController();let busy=false;
  async function load(){
   if(busy)return;busy=true;setLoading(true);
   try{const r=await fetch('/data/3-bons-plans.json',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});if(!r.ok)throw Error();const data=await r.json();if(data.schemaVersion!==1||!Array.isArray(data.deals))throw Error();setFeed(data);setError('');setNow(Date.now());}
   catch(e){if(!controller.signal.aborted)setError('La sélection est momentanément indisponible. Réessaie dans un instant.');}
   finally{busy=false;if(!controller.signal.aborted)setLoading(false);}
  }
  function resume(){if(!document.hidden)load();}
  load();const tick=setInterval(()=>setNow(Date.now()),30000),refresh=setInterval(resume,300000);
  window.addEventListener('threeb:refresh-deals',load);window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);
  return()=>{controller.abort();clearInterval(tick);clearInterval(refresh);window.removeEventListener('threeb:refresh-deals',load);window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);};
 },[]);
 const deals=activeDeals(feed,now),normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const words=normalize(query).trim().split(/\s+/).filter(Boolean);
 const visible=deals.filter(d=>words.every(w=>normalize(`${d.title} ${d.location} ${d.conditions} ${d.source}`).includes(w)));
 const groups=CATEGORIES.filter(c=>category==='all'||category===c.id);
 return <section className="bp-page" aria-labelledby="bp-title">
  <header className="bp-hero"><span className="bp-kicker"><BadgePercent size={18}/> LES TROUVAILLES 3B</span><h1 id="bp-title">3 bons plans<span>Le quotidien, en mieux.</span></h1><p>Jusqu’à trois offres utiles par catégorie. Des prix lisibles, des conditions claires, des liens directs.</p><div className="bp-status"><span><ShieldCheck size={16}/>{deals.length} offre{deals.length>1?'s':''} vérifiée{deals.length>1?'s':''} récemment</span><span><Clock3 size={16}/>Retrait automatique après 30 h sans vérification</span></div></header>
  <div className="bp-tools"><label className="bp-search"><Search size={18}/><span className="sr-only">Chercher un produit, une ville ou une enseigne</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Un produit, une ville, une enseigne…" type="search"/></label><button type="button" disabled={loading} onClick={()=>window.dispatchEvent(new Event('threeb:refresh-deals'))}><RefreshCw size={17}/>{loading?'Chargement…':'Actualiser'}</button></div>
  <nav className="bp-filters" aria-label="Catégories de bons plans">{[{id:'all',label:'Tout voir'},...CATEGORIES].map(c=><button key={c.id} type="button" aria-pressed={category===c.id} onClick={()=>setCategory(c.id)}>{c.label}</button>)}</nav>
  <div aria-live="polite">{error&&<p role="status" className="bp-notice">{error}</p>}{loading&&!feed&&<p>Recherche de la sélection…</p>}</div>
  {groups.map(c=>{const items=visible.filter(d=>d.category===c.id);return <section className="bp-section" key={c.id} aria-labelledby={`bp-${c.id}`}><header><span className="bp-category-symbol" aria-hidden="true">{c.symbol}</span><div><h2 id={`bp-${c.id}`}>{c.label}</h2><p>{c.description}</p></div><small>{items.length} / 3</small></header><div className="bp-grid">{items.map((d,i)=><article key={d.id} className="bp-card"><div className="bp-card-top"><span>0{i+1} · {d.source}</span><span>{d.kind==='aide'?'Aide / dispositif':'Offre'}</span></div><h3>{d.title}</h3><strong className="bp-price">{d.price}</strong><p className="bp-benefit">{d.benefit}</p><p className="bp-place">{d.location}</p><details><summary>Conditions et validité</summary><p>{d.conditions}</p><p>Vérifiée le {date(d.verifiedAt)} · Fin annoncée : {d.expiresAt?date(d.expiresAt):'non précisée'}.</p><p>Le prix et la disponibilité peuvent évoluer chez le fournisseur.</p></details><a href={safeSource(d.url)} target="_blank" rel="noopener noreferrer">Voir chez {d.source}<ArrowUpRight size={18}/></a></article>)}</div>{!items.length&&!loading&&<p className="bp-empty">{query?'Aucun résultat pour cette recherche.':'Aucun bon plan suffisamment vérifié pour le moment. La prochaine sélection apparaîtra ici.'}</p>}</section>;})}
  <footer className="bp-footer">Objectif : une sélection renouvelée chaque jour. Une offre encore intéressante peut être conservée après une nouvelle vérification. Une catégorie reste vide si aucune offre fiable n’est trouvée. Les aides sont soumises à leurs critères d’éligibilité ; une annonce immobilière ne garantit pas l’attribution d’un logement.</footer>
 </section>;
}
