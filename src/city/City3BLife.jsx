import {Button} from '../design-system/index.jsx';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,BriefcaseBusiness,BusFront,CheckCircle2,Clock3,Flag,Heart,Home,Leaf,LockKeyhole,PartyPopper,Users} from 'lucide-react';
import {CITY_LIFE_ACTIVITY,CITY_LIFE_BUILD_ACTIONS,CITY_LIFE_POLICIES,cityLifeNextStep,cityLifeSnapshot,cityResidentRoutes} from './city3b-life.js';
import './city3b-life.css';

const residentColor=index=>['var(--3b-champagne-highlight)','var(--3b-matrix)','var(--3b-success)','var(--3b-warning)'][index%4];

export function useCityMotion(ref){
 const [allowed,setAllowed]=useState(false),[mobile,setMobile]=useState(false);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),small=window.matchMedia('(max-width: 720px)');let visible=true;
  const update=()=>{setAllowed(!reduced.matches&&document.documentElement.dataset.motion!=='reduced'&&!document.hidden&&visible);setMobile(small.matches);};
  const preferenceObserver=new MutationObserver(update);preferenceObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{rootMargin:'80px'}):null;
  if(ref.current)observer?.observe(ref.current);reduced.addEventListener('change',update);small.addEventListener('change',update);document.addEventListener('visibilitychange',update);update();
  return()=>{observer?.disconnect();preferenceObserver.disconnect();reduced.removeEventListener('change',update);small.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
 },[ref]);
 return {allowed,mobile};
}

export function CityInhabitantsLayer({data,motion,mobile}){
 const routes=useMemo(()=>cityResidentRoutes(data,mobile?16:24),[data,mobile]);
 return <g className="city3b-inhabitants-layer" aria-hidden="true">{routes.map((r,i)=><g key={r.id} className="city3b-resident" data-activity={r.activity} transform={motion&&r.moving?undefined:`translate(${r.x} ${r.z})`}>
  <title>{r.name} · {CITY_LIFE_ACTIVITY[r.activity]||'Dans le quartier'}</title>
  <circle r="1.2" className="city3b-resident-shadow"/><circle r=".68" fill={residentColor(i)}/><path d="M -.5 .9 L .5 .9"/>
  {motion&&r.moving&&<animateMotion dur={`${r.duration}s`} begin={`${r.delay}s`} repeatCount="indefinite" path={r.path}/>}
 </g>)}</g>;
}

export function CityLifePreview({data,onOpen,onAction}){
 const life=cityLifeSnapshot(data),step=cityLifeNextStep(life);
 return <section className="city3b-life-preview city3b-panel"><div><p className="city3b-kicker">LA VIE DES QUARTIERS</p><h3><Users size={20}/> Une ville habitée</h3><p>{life.available?`${life.population} habitants · ${life.employed} actifs avec un emploi · cycle ${life.day}`:'La vie des quartiers sera disponible dès que le service de la ville aura été actualisé. La construction reste ouverte.'}</p></div>
  {life.available&&<><div className="city3b-life-preview-health"><strong>{life.happiness}%</strong><span>bien-être</span></div><div className="city3b-actions"><Button variant="champagne" type="button" className="city3b-btn primary" onClick={onOpen}>Habitants & événements</Button>{step&&<Button variant="matrix" type="button" className="city3b-btn blue" onClick={()=>onAction(step.action)}>{step.title} <ArrowRight size={15}/></Button>}</div></>}
 </section>;
}

export default function City3BLife({data,busy,onAction,onCommand,onRefresh}){
 const life=cityLifeSnapshot(data),step=cityLifeNextStep(life),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const update=()=>{if(!document.hidden)setNow(Date.now());};const timer=setInterval(update,1000);return()=>clearInterval(timer);},[]);
 if(!life.available)return <section className="city3b-panel"><p className="city3b-kicker">VIE DES QUARTIERS</p><h2>La simulation est momentanément indisponible.</h2><p>Continue à construire et à accomplir les missions. Tes constructions restent enregistrées.</p><Button variant="ghost" type="button" className="city3b-btn" disabled={busy} onClick={onRefresh}>Actualiser</Button></section>;
 const seconds=Math.max(0,Math.ceil((Date.parse(life.nextTickAt)-now)/1000)),claimed=life.events.filter(e=>e.status==='claimed').length;
 const chart=life.history,maximum=Math.max(1,...chart.map(d=>Number(d.population)||0));
 return <section className="city3b-life-dashboard">
  <header className="city3b-life-heading"><div><p className="city3b-kicker">MA VILLE · CYCLE {life.day}</p><h2>Le quotidien prend vie.</h2><p>Logements, services et emplois se répondent. Les habitants choisissent leur activité au fil des cycles de la ville.</p></div><div className="city3b-life-clock"><Clock3 size={18}/><strong>{seconds?`${seconds}s avant le prochain cycle`:'Un nouveau cycle est disponible'}</strong></div></header>
  <div className="city3b-life-summary">
   <Metric icon={Users} value={life.population} label="habitants installés" detail={`${life.housingCapacity} places dans les logements`}/>
   <Metric icon={BriefcaseBusiness} value={`${life.employed}/${life.workingPopulation}`} label="actifs avec un emploi" detail={`${life.jobs} postes disponibles`}/>
   <Metric icon={Heart} value={`${life.happiness}%`} label="bien-être du quartier" detail="Besoins, emplois et mobilité"/>
   <Metric icon={BusFront} value={`${life.mobility}%`} label="mobilité" detail={`${life.connectedBuildings||0}/${life.placedBuildings||0} bâtiments près d’une route`}/>
  </div>
  {step&&<article className="city3b-life-advice"><div><Flag size={20}/><span><strong>{step.title}</strong><p>{step.description}</p></span></div><Button variant="champagne" type="button" className="city3b-btn primary" onClick={()=>onAction(step.action)}>Passer à l’action <ArrowRight size={15}/></Button></article>}
  <section className="city3b-panel"><div className="city3b-life-section-title"><h3>Les besoins du quotidien</h3><span>Capacités des bâtiments terminés</span></div><div className="city3b-life-needs">{life.needs.map(n=><article key={n.code} data-low={n.score<60}><div><strong>{n.label}</strong><b>{n.score}%</b></div><div className="city3b-life-bar" role="progressbar" aria-label={`Couverture ${n.label}`} aria-valuenow={n.score} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${n.score}%`}}/></div><small>{n.capacity} places de service · {n.demand} demandées</small><Button variant="ghost" type="button" className="city3b-btn" onClick={()=>onAction({tab:'build',building:CITY_LIFE_BUILD_ACTIONS[n.code]})}>Développer ce service</Button></article>)}</div></section>
  <section className="city3b-panel"><h3>Choisir une orientation</h3><p>Une décision gratuite et réversible. Elle complète tes constructions ; elle ne crée aucun équipement à leur place.</p><div className="city3b-life-policies">{CITY_LIFE_POLICIES.map(p=><Button variant="ghost" key={p.code} type="button" disabled={busy} aria-pressed={life.policy===p.code} onClick={()=>onCommand('policy_set',p.code)}><strong>{p.title}</strong><span>{p.description}</span>{life.policy===p.code&&<CheckCircle2 size={18}/>}</Button>)}</div></section>
  <section className="city3b-panel"><div className="city3b-life-section-title"><h3><PartyPopper size={20}/> Les rendez-vous des quartiers</h3><span>{claimed}/{life.events.length} accomplis</span></div><p>Prépare les lieux, puis maintiens les objectifs pendant les cycles indiqués. Chaque rendez-vous attribue une récompense unique et permanente.</p><div className="city3b-life-events">{life.events.map(e=><LifeEvent key={e.code} event={e} busy={busy} onCommand={onCommand} onAction={onAction}/>)}</div></section>
  <section className="city3b-panel"><h3>Les habitants du quartier</h3><p>La carte montre jusqu’à {life.sampleSize||0} habitants représentatifs de la population. Leurs logements, lieux de travail et destinations correspondent aux constructions actuelles.</p>{!life.inhabitants.length?<div className="city3b-empty">Place une maison et laisse passer un premier cycle pour accueillir les voisins.</div>:<div className="city3b-life-residents">{life.inhabitants.map((r,i)=><article key={r.id}><span className="city3b-resident-avatar" style={{'--resident-color':residentColor(i)}}><Users size={18}/></span><div><strong>{r.name}</strong><small>{CITY_LIFE_ACTIVITY[r.activity]||'Dans le quartier'}</small></div><span>{r.workPlacementId?<BriefcaseBusiness size={15}/>:<Home size={15}/>}</span></article>)}</div>}</section>
  {chart.length>0&&<section className="city3b-panel"><h3>Les derniers cycles</h3><div className="city3b-life-history" aria-label="Population enregistrée sur les douze derniers cycles">{chart.map(row=><div key={row.day}><span>{row.population}</span><i style={{height:`${Math.max(3,Number(row.population)/maximum*75)}px`}}/><small>{row.day}</small></div>)}</div></section>}
  <p className="city3b-life-note"><Leaf size={16}/> Un cycle dure 30 secondes. La reprise récupère au maximum 12 cycles ; ton absence n’entraîne aucune pénalité. Ranger un logement réduit les places et la population correspondante.</p>
 </section>;
}
function Metric({icon:Icon,value,label,detail}){return <article><Icon size={20}/><strong>{value}</strong><span>{label}</span><small>{detail}</small></article>}
function LifeEvent({event:e,busy,onCommand,onAction}){
 const active=['active','ready'].includes(e.status),locked=e.status==='locked',claimed=e.status==='claimed';
 return <article className="city3b-life-event" data-status={e.status}><div className="city3b-life-event-status">{claimed?<><CheckCircle2 size={16}/> Accompli</>:locked?<><LockKeyhole size={15}/> À venir</>:e.status==='ready'?<><PartyPopper size={17}/> Récompense prête</>:active?<><Clock3 size={16}/> En préparation</>:<><Flag size={16}/> Disponible</>}</div><small>{e.voice}</small><h4>{e.title}</h4><p>{e.description}</p><ul>{(e.requirements||[]).map(r=><li key={r.metric}><span>{r.label}</span><b>{Math.min(r.target,r.current||0)}/{r.target}</b></li>)}</ul><div className="city3b-life-event-cycles"><span>{e.heldCycles||0}/{e.cycles} cycles maintenus</span><span>{e.coins} Coins · +{e.cityXp} XP ville</span></div>{!claimed&&!locked&&<div className="city3b-actions">{e.status==='ready'?<Button variant="champagne" type="button" className="city3b-btn primary" disabled={busy} onClick={()=>onCommand('event_claim',e.code)}>Recevoir la récompense</Button>:<><Button variant="matrix" type="button" className="city3b-btn blue" disabled={busy||active} onClick={()=>onCommand('event_start',e.code)}>{active?'Rendez-vous engagé':'Préparer ce rendez-vous'}</Button><Button variant="ghost" type="button" className="city3b-btn" onClick={()=>onAction(e.action)}>Préparer les lieux</Button></>}</div>}{locked&&<p className="city3b-life-note">Accomplis le rendez-vous précédent pour ouvrir celui-ci.</p>}</article>;
}
