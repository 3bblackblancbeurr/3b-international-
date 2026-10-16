import {Button} from '../design-system/index.jsx';
import {useEffect,useId,useState} from 'react';
import {ArrowRight,ArrowUpRight,Check,ChevronRight,Compass,HeartHandshake,ScanLine,ShieldCheck,Sparkles,Sun,Volume2,BookHeart,Accessibility} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {CIRCLE_VALUES,NOW_SECTIONS,LIFE_GOALS,DURATIONS,dayKey,planFor,progressPercent,loadNowProgress,saveNowProgress} from './routines.js';
import HelpDesk from './HelpDesk.jsx';
import UsefulScanner from './UsefulScanner.jsx';
import HeritageVault from './HeritageVault.jsx';
import UniversalModes from './UniversalModes.jsx';
import './now.css';

const SECTIONS_ICONS={boussole:Compass,cercle:Sparkles,aide:HeartHandshake,scanner:ScanLine,heritage:BookHeart,universel:Accessibility};
const RADIUS=116,CIRCUMFERENCE=2*Math.PI*RADIUS;
function LivingCircle({completed=[],compact=false}){
 const gradientId=useId().replaceAll(':','');
 const count=completed.length;
 return <div className={'now-ring '+(compact?'now-ring--compact':'')} role="img" aria-label={'Cercle vivant : '+count+' valeurs marquées sur huit aujourd’hui'}>
  <span className="now-ring-light now-ring-light-one" aria-hidden="true"/>
  <span className="now-ring-light now-ring-light-two" aria-hidden="true"/>
  <svg viewBox="0 0 320 320" className="now-ring-svg" aria-hidden="true">
   <defs>
    <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--3b-champagne-highlight)"/><stop offset=".47" stopColor="var(--3b-champagne)"/><stop offset="1" stopColor="var(--3b-champagne-highlight)"/></linearGradient>
   </defs>
   <circle cx="160" cy="160" r="104" className="now-ring-underlay" fill="none"/>
   <g transform="rotate(-90 160 160)">
    {CIRCLE_VALUES.map((item,i)=>{
     const active=completed.includes(item.id);
     return <circle key={item.id} cx="160" cy="160" r={RADIUS} fill="none"
      stroke={active?'url(#'+gradientId+')':'var(--3b-now-steel)'} strokeWidth={active?15:10}
      strokeLinecap="round" strokeDasharray={(CIRCUMFERENCE/8-13)+' '+CIRCUMFERENCE}
      strokeDashoffset={-(i*CIRCUMFERENCE/8)+1} opacity={active?1:.54} className="now-ring-segment"/>;
    })}
   </g>
   <circle cx="160" cy="160" r="84" className="now-ring-core" fill="none"/>
  </svg>
  <div className="now-ring-center"><span className="now-ring-monogram">3B</span><strong>{count}<small>/8</small></strong><span>VALEURS DU JOUR</span></div>
 </div>;
}
function NowCompass({progress,save,goTo}){
 const plan=planFor(progress.goal,progress.duration);
 return <section className="now-feature" aria-labelledby="boussole-title">
  <p className="now-eyebrow">01 / TA DIRECTION</p>
  <h2 id="boussole-title">Qu’as-tu envie de faire aujourd’hui ?</h2>
  <p className="now-intro">Pas de questionnaire interminable. Un choix, du temps disponible et une action concrète dans les rubriques 3B qui existent déjà.</p>
  <div className="now-compass-grid" role="group" aria-label="Choisir une envie">
   {LIFE_GOALS.map((item,index)=><Button variant="neutral" type="button" key={item.id} aria-pressed={progress.goal===item.id} onClick={()=>save({...progress,goal:item.id,planDone:false})}>
    <span className="now-goal-index">{String(index+1).padStart(2,'0')}</span><strong>{item.name}</strong><ChevronRight size={18} aria-hidden="true"/>
   </Button>)}
  </div>
  <div className="now-duration" role="group" aria-label="Temps disponible">
   <strong>J’ai environ</strong>
   {DURATIONS.map(minutes=><Button variant="neutral" key={minutes} type="button" aria-pressed={progress.duration===minutes} onClick={()=>save({...progress,duration:minutes,planDone:false})}>{minutes===60?'1 heure':minutes+' min'}</Button>)}
  </div>
  <div className="now-plan">
   <span className="now-eyebrow">TA MISSION · {plan.minutes} MINUTES</span>
   <h3>{plan.heading}</h3><p>{plan.description}</p>
   <ol><li>{plan.firstStep}</li>{plan.steps.map(item=><li key={item}>{item}</li>)}</ol>
   <div className="now-action-row">
    <Button variant="neutral" type="button" className="now-primary" onClick={()=>goTo(plan.route)}>Ouvrir {LIFE_GOALS.find(x=>x.id===progress.goal)?.name.toLowerCase()==='jouer'?'Jeux 3B':'la rubrique 3B'} <ArrowUpRight size={18}/></Button>
    <Button variant="neutral" type="button" className="now-quiet" aria-pressed={progress.planDone} onClick={()=>save({...progress,planDone:!progress.planDone})}>{progress.planDone?<Check size={18}/>:<Sun size={18}/>} {progress.planDone?'Fait aujourd’hui':'J’ai terminé'}</Button>
   </div>
  </div>
  <p className="now-discretion">Tu confirmes toi-même tes actions : aucun pas, réussite ou XP n’est inventé. Rien n’est envoyé au Passeport ni à un partenaire.</p>
 </section>;
}
function NowCircle({progress,save,goTo}){
 const done=progress.completed||[];
 return <section className="now-feature" aria-labelledby="cercle-title">
  <p className="now-eyebrow">02 / NOS HUIT VALEURS</p><h2 id="cercle-title">Le Cercle Vivant.</h2>
  <p className="now-intro">Chaque valeur du Monde du 3B t’inspire une petite action dans la vraie vie. Ce cercle se renouvelle chaque jour, sans compétition ni récompense fictive.</p>
  <div className="now-circle-layout">
   <LivingCircle completed={done}/>
   <div className="now-circle-guide"><span className="now-eyebrow">TON PARCOURS PERSONNEL</span><h3>{done.length===8?'Huit valeurs réunies.':done.length===0?'Tout commence par un geste.':'Tu avances à ton rythme.'}</h3>
    <p>{progressPercent(done)} % de tes actions déclarées aujourd’hui. Même une seule action compte.</p>
    <div className="now-circle-legend"><span><i/> Déjà fait</span><span><i/> À découvrir</span></div>
   </div>
  </div>
  <div className="now-values" role="list" aria-label="Les huit valeurs et leurs actions">
   {CIRCLE_VALUES.map((value,index)=><div className="now-value-row" role="listitem" key={value.id}>
    <span className="now-value-num">{String(index+1).padStart(2,'0')}</span>
    <div className="now-value-copy"><strong>{value.name}</strong><small>{value.country} · {value.guardian}</small><p>{value.quest}</p></div>
    <Button variant="neutral" className="now-value-check" type="button" aria-pressed={done.includes(value.id)} onClick={()=>save({...progress,completed:done.includes(value.id)?done.filter(x=>x!==value.id):[...done,value.id]})}>{done.includes(value.id)?<><Check size={17}/> Fait</>:'À faire'}</Button>
    <Button variant="neutral" type="button" className="now-value-link" onClick={()=>goTo(value.route)} aria-label={'Explorer '+value.name+' dans 3B'}><ArrowUpRight size={19}/></Button>
   </div>)}
  </div>
  <p className="now-discretion">Ces gestes sont déclaratifs et privés, pas des preuves d’identité, des validations d’activité ou des conditions d’accès au Passeport. Le Monde du 3B reste indépendant.</p>
 </section>;
}
export default function NowPage({goTo}){
 const {user}=useLoyalty(),uid=user?.id||null;
 const [tab,setTab]=useState('boussole'),[progress,setProgress]=useState(()=>loadNowProgress(uid,window.localStorage));
 const [message,setMessage]=useState(''),[day,setDay]=useState(dayKey);
 useEffect(()=>{
  const today=dayKey();
  setDay(today);setProgress(loadNowProgress(uid,window.localStorage,today));setMessage('');
 },[uid]);
 useEffect(()=>{
  const sync=()=>{
   const today=dayKey();
   if(day!==today){setDay(today);setProgress(loadNowProgress(uid,window.localStorage,today));}
  };
  window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync);
  return()=>{window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync)};
 },[day,uid]);
 function save(next){
  const values={...next,date:day};
  if(!saveNowProgress(uid,values,window.localStorage,day))setMessage('Le stockage local est désactivé : cette progression ne sera pas conservée après fermeture.');
  else setMessage('');
  setProgress(values);
 }
 function choose(next){setTab(next);setMessage('');}
 function navigateKeys(event,index){
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?NOW_SECTIONS.length-1:(index+(event.key==='ArrowRight'?1:-1)+NOW_SECTIONS.length)%NOW_SECTIONS.length;
  const dest=NOW_SECTIONS[next].id;choose(dest);document.getElementById('now-tab-'+dest)?.focus();
 }
 return <section className="now-experience" aria-labelledby="now-heading" data-now-section={tab}>
  <header className="now-hero">
   <div className="now-hero-copy">
    <p className="now-eyebrow"><span className="now-pulse"/> BLACK · BLANC · BEUR / L’EXPÉRIENCE QUOTIDIENNE</p>
    <h1 id="now-heading">3B <em>Maintenant.</em></h1>
    <p>Ton univers ne s’arrête plus à l’écran. Une petite action, une découverte, un souvenir ou un coup de main : <strong>choisis ce qui compte pour toi.</strong></p>
    <div className="now-hero-actions"><Button variant="neutral" className="now-primary" type="button" onClick={()=>choose('boussole')}><Compass size={19}/> Trouver ma direction</Button><Button variant="neutral" type="button" className="now-quiet" onClick={()=>choose('cercle')}><Sparkles size={17}/> Voir mon Cercle</Button></div>
    <span className="now-hero-foot"><ShieldCheck size={15}/> Sans suivi permanent · Choix libre · Première expérience gratuite</span>
   </div>
   <div className="now-hero-visual"><LivingCircle completed={progress.completed}/><span className="now-visual-caption">{new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long'}).format(new Date())}</span></div>
  </header>
  <nav className="now-feature-nav" role="tablist" aria-label="Explorer les six expériences de 3B Maintenant">
   {NOW_SECTIONS.map((item,index)=>{
    const Icon=SECTIONS_ICONS[item.id];
    return <Button variant="neutral" key={item.id} role="tab" id={'now-tab-'+item.id} tabIndex={tab===item.id?0:-1} aria-selected={tab===item.id} aria-controls="now-feature-content" onClick={()=>choose(item.id)} onKeyDown={event=>navigateKeys(event,index)}>
     <Icon size={21} strokeWidth={1.7} aria-hidden="true"/><span>{item.name}</span>
    </Button>;
   })}
  </nav>
  <div id="now-feature-content" role="tabpanel" tabIndex={0} aria-labelledby={'now-tab-'+tab} className="now-feature-content">
   {tab==='boussole'&&<NowCompass progress={progress} save={save} goTo={goTo}/>}
   {tab==='cercle'&&<NowCircle progress={progress} save={save} goTo={goTo}/>}
   {tab==='aide'&&<HelpDesk goTo={goTo}/>}
   {tab==='scanner'&&<UsefulScanner/>}
   {tab==='heritage'&&<HeritageVault uid={uid}/>}
   {tab==='universel'&&<UniversalModes/>}
  </div>
  {message&&<p className="now-message" role="status">{message}</p>}
  <footer className="now-bottom"><span>3B INTERNATIONAL · TON CHEMIN, TON RYTHME.</span><Button variant="neutral" type="button" className="now-quiet" onClick={()=>goTo('home')}>Retour à l’accueil <ArrowRight size={16}/></Button></footer>
 </section>;
}
