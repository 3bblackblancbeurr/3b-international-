import {useEffect,useMemo,useRef,useState} from 'react';
import {
 ArrowLeft,ArrowRight,BookOpen,Camera,Check,ChevronRight,Compass,Footprints,
 Globe2,HeartHandshake,LockKeyhole,Orbit,ScanLine,ShieldCheck,Sparkles,
 Volume2,VolumeX,Accessibility,PenLine,Gamepad2,HandHeart,CheckCircle2
} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import HeritagePanel from './HeritagePanel.jsx';
import ScannerPanel from './ScannerPanel.jsx';
import {applyReadMode,readReadMode,saveReadMode} from './accessibility.js';
import {
 EXPERIENCES,VALUES,GOALS,HELP_IDEAS,MINUTES,INTENSITIES,TIME_LABEL,
 JOURNEY_STORAGE_KEY,normalizeJourney,journeyFor,circleProgress,
 safeParseStorage,safeWriteStorage,nextValueState
} from './model.js';
import './maintenant.css';

const ICONS={boussole:Compass,cercle:Orbit,coup:HeartHandshake,scanner:ScanLine,heritage:BookOpen,universel:Accessibility};
const GOAL_ICONS={bouger:Footprints,apprendre:BookOpen,aider:HandHeart,explorer:Globe2,creer:PenLine,jouer:Gamepad2};

export default function MaintenantPage({goTo}){
 const [active,setActive]=useState('boussole');
 const [journey,setJourney]=useState(()=>safeParseStorage(localStorage,JOURNEY_STORAGE_KEY,normalizeJourney));
 const [readMode,setReadMode]=useState(readReadMode);
 const [selectedValue,setSelectedValue]=useState('justice');
 const [selectedHelp,setSelectedHelp]=useState('ecouter');
 const [stepsDone,setStepsDone]=useState([]);
 const [notice,setNotice]=useState('');
 const [speaking,setSpeaking]=useState(false);
 const speech=useRef(null);
 const plan=useMemo(()=>journeyFor(journey),[journey]);
 const value=VALUES.find(v=>v.id===selectedValue)||VALUES[0];
 const help=HELP_IDEAS.find(v=>v.id===selectedHelp)||HELP_IDEAS[0];
 const completed=circleProgress(journey);
 const selectedIndex=EXPERIENCES.findIndex(e=>e.id===active);

 useEffect(()=>{if(!safeWriteStorage(localStorage,JOURNEY_STORAGE_KEY,journey))setNotice('Préférences temporaires : stockage local indisponible.');},[journey]);
 useEffect(()=>{saveReadMode(readMode);},[readMode]);
 useEffect(()=>()=>{window.speechSynthesis?.cancel();speech.current=null;},[]);
 useEffect(()=>{setStepsDone([]);},[journey.goal,journey.minutes,journey.intensity]);
 function changeJourney(patch){setNotice('');setJourney(old=>normalizeJourney({...old,...patch}));}
 function go(tab){
  setActive(tab);
  if(speech.current){window.speechSynthesis?.cancel();speech.current=null;setSpeaking(false);}
 }
 function onTabKey(event,index){
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?EXPERIENCES.length-1:
   (index+(event.key==='ArrowRight'?1:-1)+EXPERIENCES.length)%EXPERIENCES.length;
  go(EXPERIENCES[next].id);
  document.getElementById('now-tab-'+EXPERIENCES[next].id)?.focus({preventScroll:true});
 }
 function selectGoal(id){changeJourney({goal:id});setStepsDone([]);}
 function toggleStep(index){setStepsDone(old=>old.includes(index)?old.filter(i=>i!==index):[...old,index].sort());}
 function toggleValue(){
  setNotice('');
  setJourney(old=>nextValueState(old,value.id));
 }
 function prepareHelp(){
  try{sessionStorage.setItem('3b-community-intent','collaboration');}catch{/* optional */ }
  goTo('community');
 }
 function toggleSpeech(){
  if(speaking){window.speechSynthesis?.cancel();speech.current=null;setSpeaking(false);return;}
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){
   setNotice('Lecture vocale non disponible sur cet appareil.');return;
  }
  const text=[plan.subtitle,...plan.steps.map(s=>s.title+'. '+s.detail)].join('. ').slice(0,1100);
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='fr-FR';utterance.rate=.92;utterance.pitch=1;
  utterance.onend=()=>{if(speech.current===utterance){speech.current=null;setSpeaking(false);}};
  utterance.onerror=()=>{if(speech.current===utterance){speech.current=null;setSpeaking(false);setNotice('La lecture vocale s’est interrompue.');}};
  try{window.speechSynthesis.cancel();speech.current=utterance;window.speechSynthesis.speak(utterance);setSpeaking(true);}
  catch{setNotice('La lecture vocale a été bloquée par l’appareil.');setSpeaking(false);}
 }
 return <section className="now-app" aria-labelledby="now-title">
  <header className="now-hero">
   <p className="now-hero-kicker">3B INTERNATIONAL · BLACK BLANC BEUR</p>
   <div className="now-halo" aria-hidden="true"><span className="now-halo-core">3B</span><i className="now-halo-star now-halo-one"/><i className="now-halo-star now-halo-two"/></div>
   <div className="now-hero-copy">
    <span className="now-eyebrow">TON UNIVERS. TA VIE. TES POSSIBILITÉS.</span>
    <h1 id="now-title">3B <em>Maintenant.</em></h1>
    <p>Six façons d’avancer, de découvrir et de transmettre. Une seule expérience, à ton rythme.</p>
    <Button variant="champagne" className="now-hero-action" type="button" onClick={()=>document.getElementById('now-experiences')?.scrollIntoView({behavior:readMode.calm?'instant':'smooth',block:'start'})}>Choisir mon expérience <ArrowRight size={19}/></Button>
   </div>
  </header>

  <div className="now-experience-wrap" id="now-experiences">
   <p className="now-section-kicker">LES SIX EXPÉRIENCES · CHOISIS TON CHEMIN</p>
   <nav className="now-switcher" role="tablist" aria-label="Expériences de 3B Maintenant">
    {EXPERIENCES.map((e,index)=>{
     const Icon=ICONS[e.id];
     return <Button variant="ghost" type="button" role="tab" key={e.id} id={'now-tab-'+e.id}
      aria-selected={active===e.id} aria-controls="now-active-panel"
      tabIndex={active===e.id?0:-1} onClick={()=>go(e.id)}
      onKeyDown={event=>onTabKey(event,index)} className={active===e.id?'selected':''}>
      <Icon size={21} strokeWidth={1.65}/><span>{e.short}</span>
     </Button>;
    })}
   </nav>
   <div id="now-active-panel" role="tabpanel" aria-labelledby={'now-tab-'+active} tabIndex={-1} className="now-active-pane" key={active}>
    {active==='boussole'&&<section className="now-pane now-compass" aria-labelledby="now-compass-title">
     <p className="now-overline"><Compass size={16}/> LA BOUSSOLE 3B</p>
     <h2 id="now-compass-title">Qu’as-tu envie de faire aujourd’hui ?</h2>
     <p className="now-lead">Choisis une intention. La Boussole te propose un vrai chemin à travers les espaces déjà présents dans 3B.</p>
     <div className="now-goals" aria-label="Choisis ton intention">{GOALS.map(g=>{
      const Icon=GOAL_ICONS[g.id];
      return <Button variant="ghost" type="button" key={g.id} aria-pressed={journey.goal===g.id} onClick={()=>selectGoal(g.id)}>
       <Icon size={23} strokeWidth={1.55}/><span>{g.label}</span><small>{g.subtitle}</small>
      </Button>;
     })}</div>
     <div className="now-controls">
      <fieldset><legend>Combien de temps ?</legend><div className="now-choices">
       {MINUTES.map(n=><Button variant="ghost" key={n} type="button" aria-pressed={journey.minutes===n} onClick={()=>changeJourney({minutes:n})}>{TIME_LABEL[n]}</Button>)}
      </div></fieldset>
      <fieldset><legend>Quel rythme ?</legend><div className="now-choices">
       {INTENSITIES.map(t=><Button variant="ghost" key={t.id} type="button" aria-pressed={journey.intensity===t.id} onClick={()=>changeJourney({intensity:t.id})}>{t.label}</Button>)}
      </div></fieldset>
     </div>
     <div className="now-mission">
      <div className="now-mission-top"><span>TON PARCOURS · {TIME_LABEL[plan.minutes]}</span><span>{stepsDone.length}/3 repères personnels</span></div>
      <h3>{plan.subtitle}<em> — {plan.pace}</em></h3>
      <p className="now-plan-coaching">{plan.coaching}</p>
      <ol>{plan.steps.map((s,i)=><li key={s.title}>
       <Button variant="ghost" type="button" onClick={()=>toggleStep(i)} aria-pressed={stepsDone.includes(i)}>
        <span className="now-step-marker">{stepsDone.includes(i)?<Check size={17}/>:String(i+1).padStart(2,'0')}</span>
        <span><strong>{s.title}<em className="now-step-time">{s.allocatedMinutes} min</em></strong><small>{s.detail}</small></span>
       </Button>
      </li>)}</ol>
      <Button variant="champagne" className="now-primary" type="button" onClick={()=>goTo(plan.route)}>Continuer dans {GOALS.find(g=>g.id===journey.goal)?.label==='Bouger'?'Santé 3B':'3B'} <ArrowRight size={19}/></Button>
      <p className="now-small">Cocher une étape est un repère facultatif, pas une preuve ni une récompense officielle.</p>
     </div>
    </section>}

    {active==='cercle'&&<section className="now-pane now-circle" aria-labelledby="now-circle-title">
     <p className="now-overline"><Orbit size={16}/> LE CERCLE VIVANT · HUIT HÉRITAGES</p>
     <h2 id="now-circle-title">Les valeurs prennent vie.</h2>
     <p className="now-lead">Huit royaumes. Huit gardiens. Huit occasions de réfléchir et d’agir. Explore chaque héritage sans compétition.</p>
     <div className="now-circle-stage">
      <div className="now-circle-meter" role="progressbar" aria-label="Valeurs marquées personnellement" aria-valuemin={0} aria-valuemax={8} aria-valuenow={completed} style={{'--now-progress':String(completed*45)+'deg'}}>
       <div className="now-circle-meter-inner"><span>{completed}<small>/ 8</small></span><small>repères personnels</small></div>
      </div>
      <div className="now-value-map">{VALUES.map(v=><Button variant="ghost" key={v.id} type="button" onClick={()=>setSelectedValue(v.id)} aria-pressed={selectedValue===v.id} data-saved={journey.values[v.id]?'true':'false'}><span>{v.name}</span><small>{v.country}</small></Button>)}</div>
     </div>
     <div className="now-value-detail">
      <p className="now-overline">{value.country.toUpperCase()} · {value.guardian.toUpperCase()}</p>
      <h3>{value.name}</h3>
      <p>{value.question}</p>
      <small>Une idée à essayer : {value.idea}</small>
      <div className="now-actions">
       <Button variant="champagne" className="now-primary" type="button" onClick={toggleValue}>{journey.values[value.id]?<CheckCircle2 size={18}/>:<Check size={18}/>} {journey.values[value.id]?'Retirer mon repère':'Marquer comme exploré'}</Button>
       <Button variant="ghost" className="now-quiet" type="button" onClick={()=>goTo(value.route)}>Découvrir l’histoire <ChevronRight size={17}/></Button>
      </div>
     </div>
     <p className="now-disclaimer">Cette progression reste un souvenir personnel sur cet appareil. Elle ne vérifie aucune action réelle et ne modifie ni ton Passeport, ni tes XP, ni tes avantages.</p>
    </section>}

    {active==='coup'&&<section className="now-pane now-help" aria-labelledby="now-help-title">
     <p className="now-overline"><HeartHandshake size={16}/> 3B COUP DE MAIN</p>
     <h2 id="now-help-title">Un geste, un vrai lien.</h2>
     <p className="now-lead">Commence par un geste simple. Le collectif peut t’aider à échanger, sans forcer les rencontres ni exposer la vie privée des gens.</p>
     <div className="now-help-list">{HELP_IDEAS.map(h=><Button variant="ghost" type="button" key={h.id} aria-pressed={selectedHelp===h.id} onClick={()=>setSelectedHelp(h.id)}><span className="now-help-number">{String(HELP_IDEAS.indexOf(h)+1).padStart(2,'0')}</span><span><strong>{h.title}</strong><small>{h.detail}</small></span><ChevronRight size={20}/></Button>)}</div>
     <div className="now-help-detail">
      <span className="now-overline">MON IDÉE</span><h3>{help.title}</h3><p>{help.tip}</p>
      <Button variant="champagne" className="now-primary" type="button" onClick={prepareHelp}>Préparer une proposition dans la Communauté <ArrowRight size={18}/></Button>
     </div>
     <p className="now-disclaimer"><ShieldCheck size={16}/> Aucune demande d’aide n’est publiée automatiquement. Vérifie toute proposition, protège les mineurs, évite les coordonnées publiques et signale les comportements suspects.</p>
    </section>}

    {active==='scanner'&&<ScannerPanel goTo={goTo}/>}
    {active==='heritage'&&<HeritagePanel/>}

    {active==='universel'&&<section className="now-pane now-universal" aria-labelledby="now-universal-title">
     <p className="now-overline"><Accessibility size={16}/> MODE UNIVERSEL · POUR CHACUN</p>
     <h2 id="now-universal-title">3B, à ta façon.</h2>
     <p className="now-lead">Moins de distractions. Des textes lisibles. Et une navigation accessible, sans te demander de devenir un expert du téléphone.</p>
     <div className="now-read-controls">
      <Button variant="ghost" type="button" aria-pressed={readMode.large} onClick={()=>setReadMode(x=>({...x,large:!x.large}))}><span><strong>Textes plus grands</strong><small>Pour mieux lire dans les rubriques courantes.</small></span><span className="now-toggle" aria-hidden="true"/></Button>
      <Button variant="ghost" type="button" aria-pressed={readMode.contrast} onClick={()=>setReadMode(x=>({...x,contrast:!x.contrast}))}><span><strong>Contraste renforcé</strong><small>Pour rendre les informations plus nettes.</small></span><span className="now-toggle" aria-hidden="true"/></Button>
      <Button variant="ghost" type="button" aria-pressed={readMode.calm} onClick={()=>setReadMode(x=>({...x,calm:!x.calm}))}><span><strong>Animations apaisées</strong><small>Une interface plus calme, lorsque tu le souhaites.</small></span><span className="now-toggle" aria-hidden="true"/></Button>
     </div>
     <div className="now-read-out">
      <h3>Écouter mon parcours</h3><p>Lecture en français du parcours choisi dans la Boussole, par la fonction vocale du téléphone lorsque disponible.</p>
      <Button variant="champagne" className="now-primary" type="button" onClick={toggleSpeech}>{speaking?<VolumeX size={19}/>:<Volume2 size={19}/>} {speaking?'Arrêter la lecture':'Écouter maintenant'}</Button>
     </div>
     <p className="now-disclaimer">La lecture vocale utilise les fonctions de ton appareil ; leur fonctionnement et leur confidentialité dépendent du système. Aucun microphone n’est activé ici. Les réglages visuels sont conservés localement.</p>
    </section>}
   </div>
  </div>
  {notice&&<p className="now-global-notice" role="status">{notice}</p>}
  <footer className="now-footer"><LockKeyhole size={15}/> Parcours et repères conservés sur cet appareil · Pas de géolocalisation automatique · Aucune action réelle prétendument vérifiée</footer>
 </section>;
}
