import {styleFor} from './weapon-styles.js';
import {AvatarCinematic} from '../AvatarCinematic.jsx';
import {originsCharacterSequence} from './avatar-sequence.js';
import {COUNTRIES,isCountry,countryLayout} from './countries.js';
import CharacterCreator from './CharacterCreator.jsx';
import React,{useEffect,useRef,useState} from 'react';

import {ArrowLeft,BookOpen,Compass,Eye,Footprints,Map as MapIcon,Pause,Play,RotateCcw,Settings,Shield,Sparkles,Swords,X,Diamond,Volume2} from 'lucide-react';

import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';

import {load,persist} from './state.js';

import {createOriginsScene} from './scene.js';

import {BUILDINGS,ROOMS,ROADS,WORLDS,QUESTS,POINTS,objective} from './data.js';

import './origins.css';



function MapView({snapshot,large=false,onRoute}){

 const s=snapshot?.state||{zone:'sanctuary',flags:{}},p=snapshot?.position||{x:0,z:23};

 const layout=countryLayout(s.zone),mapBuildings=layout?.buildings||BUILDINGS,mapRoads=layout?.roads||ROADS;
 const points=layout?layout.points:s.zone==='sanctuary'?[{id:'circle',...POINTS.circle},...WORLDS]:Object.entries(POINTS).filter(([id,p])=>p.zone==='france'&&!['seal','trial','echo','echo2','fragment','secret','memory','flower'].includes(id)).map(([id,p])=>({id,...p}));

 return <svg className={'origins-map '+(large?'origins-map-large':'')} viewBox={s.zone==='sanctuary'?'-43 -43 86 86':(large||p.z< -78?'-115 -150 225 200':'-69 -84 138 130')} role="img" aria-label={'Plan du '+(s.zone==='sanctuary'?'Sanctuaire':(COUNTRIES[s.zone]?.district||'quartier France'))}>

  <rect x="-120" y="-155" width="240" height="270" fill="#1d3438"/>

  {s.zone==='sanctuary'?<><circle r="38" fill="#476063"/><circle r="22" fill="none" stroke="#998c6e" strokeWidth=".3"/><circle r="12" fill="none" stroke="#998c6e" strokeWidth=".3"/><path d="M -6 0 L 6 0" stroke="#e7d9b6" strokeWidth="2"/></>:<>

   {mapRoads.map((r,i)=><polyline key={i} points={r.map(p=>p.join(',')).join(' ')} fill="none" stroke="#b6ac91" strokeWidth="3.3" strokeLinejoin="round" strokeLinecap="round"/>)}

   {[...mapBuildings,...(layout?[]:ROOMS).map(r=>({...r,width:r.w,depth:r.d}))].map(b=><rect key={b.id} x={b.x-b.width/2} y={b.z-b.depth/2} width={b.width} height={b.depth} rx=".7" fill="#607476" stroke="#81908c" strokeWidth=".45" transform={`rotate(${-(b.angle||0)*180/Math.PI} ${b.x} ${b.z})`}/>)}

   {!layout&&<path d="M -17 -34 L 17 -34" stroke="#dac699" strokeWidth="2"/>}

  </>}

  {points.map(q=><circle key={q.id} cx={q.x} cy={q.z} r={q.id===snapshot?.objective?.target?1.8:1} fill={q.id===snapshot?.objective?.target?'#ffe2a0':'#b7d7d8'}/>) }

  <path d="M 0 -2.2 L 1.6 1.5 L 0 .8 L -1.6 1.5 Z" transform={`translate(${p.x} ${p.z}) rotate(${180-(snapshot?.heading||Math.PI)*180/Math.PI})`} fill="#fff2cf" stroke="#12272a" strokeWidth=".4"/>

  <text x={s.zone==='sanctuary'?35:58} y={s.zone==='sanctuary'?-35:-74} fill="#e5ddc4" fontSize="4" textAnchor="middle">N</text>

 </svg>;

}

function Panel({title,children,close}){const ref=useRef();useEffect(()=>{const d=ref.current;d.showModal();return()=>d.close();},[]);return <dialog className="origins-panel" ref={ref} onCancel={e=>{e.preventDefault();close();}} aria-label={title}><header><h2>{title}</h2><button onClick={close} aria-label="Fermer"><X/></button></header>{children}</dialog>;}

export default function OriginsPage(props){const account=useLoyalty();return account.loading?<div className="origins-wait">Ouverture du Monde 3B…</div>:<Session key={account.user?.id||'guest'} uid={account.user?.id} {...props}/>;}

function Session({uid,goTo,onPrevious}){

 const pendingRoute=useRef(null),host=useRef(),scene=useRef(),messageTimer=useRef(),[snapshot,setSnapshot]=useState(null),[initial]=useState(()=>load(localStorage,uid)),[panel,setPanel]=useState('start'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(null),[saveError,setSaveError]=useState(false);

 useEffect(()=>{let live=true;try{scene.current=createOriginsScene(host.current,{initial,onSnapshot:v=>{if(live)setSnapshot(v);},onLoad:v=>{if(live)setLoading(v);},onError:e=>{if(live)setError(e);},onSave:s=>{const ok=persist(localStorage,uid,s);if(live)setSaveError(!ok);return ok;},onMessage:m=>{if(!live)return;setMessage(m);clearTimeout(messageTimer.current);if(!m.speaker&&!m.choices)messageTimer.current=setTimeout(()=>setMessage(null),6500);}});scene.current.pause(true);}catch(e){setError('Le rendu 3D ne démarre pas : '+e.message);setLoading(false);}return()=>{live=false;clearTimeout(messageTimer.current);scene.current?.destroy();scene.current=null;};},[uid,initial]);

 useEffect(()=>{scene.current?.pause(!!panel||!!error);if(!panel&&!error&&pendingRoute.current){const id=pendingRoute.current;pendingRoute.current=null;if(!scene.current?.navigate(id))setMessage({text:'Ce lieu est inaccessible depuis ta position actuelle.'});}},[panel,error]);

 useEffect(()=>{const key=e=>{if(panel==='character'||panel==='awakening')return;if(e.key==='Escape'&&!e.repeat){e.preventDefault();setPanel(p=>p?null:'pause');}if(e.key.toLowerCase()==='m'&&!e.repeat&&!['INPUT','SELECT'].includes(e.target.tagName))setPanel(p=>p==='map'?null:'map');if(e.key.toLowerCase()==='i'&&!e.repeat&&!['INPUT','SELECT'].includes(e.target.tagName))setPanel(p=>p==='journal'?null:'journal');};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[panel]);

 const immediate=kind=>({onPointerDown:e=>{if(e.button!==0)return;e.preventDefault();action(kind);},onClick:e=>{if(e.detail===0)action(kind);}});
 const s=snapshot?.state||initial,task=snapshot?.objective||objective(s),c=snapshot?.combat||{hp:100,energy:60,stamina:100},settings=s.settings;const weaponStyle=styleFor(s.avatar);const reinforced=isCountry(s.zone)?s.regions[s.zone].upgrade:s.equipment==='artisan';

 function focus(){host.current?.querySelector('canvas')?.focus({preventScroll:true});}

 function close(){setPanel(null);setTimeout(focus,0);}

 function action(kind){scene.current?.action(kind);focus();}

 function route(id){pendingRoute.current=id;close();}

 function start(){if(!s.avatar.created){setPanel('character');return;}close();scene.current?.startAudio();}
 async function saveCharacter(avatar,looks){await scene.current.avatar(avatar,looks);setPanel('awakening');scene.current?.startAudio();}

 function change(key,value){scene.current?.settings({[key]:value});}

 const bearing=(-(snapshot?.yaw||0)*180/Math.PI%360+360)%360,compass=['N','NE','E','SE','S','SO','O','NO'][Math.round(bearing/45)%8];

 return <section className="origins" aria-label="3B ORIGINS — Le Cercle Brisé">

  <div className="origins-viewport" ref={host}/>

  {!panel&&<>

   <header className="origins-top"><div className="origins-vitals"><span>{s.avatar.name} <small>{s.xp} XP · Lien {s.bond}</small></span><meter aria-label="Vie" min="0" max="100" value={c.hp}/><div><meter aria-label="Endurance" min="0" max="100" value={c.stamina}/><meter aria-label="Énergie du Cercle" min="0" max="100" value={c.energy}/></div></div><div className="origins-bearing"><Compass size={17}/><b>{compass}</b><span>{Math.round(bearing)}°</span></div><button onClick={()=>setPanel('pause')} aria-label="Pause"><Pause size={22}/></button></header>

   <div className="origins-task"><span>{s.zone==='sanctuary'?'SANCTUAIRE DU CERCLE':(COUNTRIES[s.zone]?COUNTRIES[s.zone].name+' · '+COUNTRIES[s.zone].district:'FRANCE · JUSTICE')}</span><p>{task.text}</p>{isCountry(s.zone)&&<small>{s.regions[s.zone].supplies} matériaux · Jardin {s.regions[s.zone].restored}/3 · {s.regions[s.zone].wins} victoires</small>}</div>

   <button className="origins-minimap" onClick={()=>setPanel('map')} aria-label="Ouvrir la carte"><MapView snapshot={snapshot}/></button>

   {c.active&&<div className="origins-enemy"><span>{c.enemyName||'Manifestation de l’Oubli'}</span><meter aria-label="Vie de l’adversaire" min="0" max={c.enemyMax||130} value={c.enemy}/>{c.state==='windup'&&<><progress aria-label="Préparation de l’attaque adverse" max="1" value={c.telegraph}/><em>{c.areaAttack?'Sors du cercle au sol':'Évite la zone devant l’adversaire'}</em></>}<small>{c.state==='windup'?'Attaque annoncée · esquive !':c.state==='recover'?'Ouverture · frappe maintenant':c.state==='stagger'?'L’Oubli recule':'Écoute les deux voix. Protège leurs souvenirs.'}</small></div>}

   {weaponStyle&&<div className="origins-style-status" role="status">{c.detached>0?'Lames éloignées · aucune parade · '+Math.ceil(c.detached)+' s':c.recalling>0?'Rappel des lames…':c.guarding>0?'Garde frontale · marche ralentie':weaponStyle.name}</div>}
   {c.active&&c.counter>0&&<div className="origins-counter" role="status">Esquive réussie · contre +25 %</div>}
   {c.active&&c.combo>1&&<div className="origins-combo" aria-label={c.combo+' coups consécutifs'}><strong>×{c.combo}</strong><span>Enchaînement</span></div>}
   {(c.guard>0||c.slow>0)&&<div className="origins-support-status" role="status">{c.guard>0?'Protection : prochain impact':'Adversaire ralenti'} · {Math.ceil(c.guard||c.slow)} s</div>}
   {snapshot?.vision>0&&<div className="origins-vision">VISION DE MÉMOIRE · {Math.ceil(snapshot.vision)} s</div>}

   <div className="origins-bottom"><div className="origins-quick"><button onClick={()=>setPanel('journal')} aria-label="Journal"><BookOpen size={19}/></button><button onClick={()=>action('recenter')} aria-label="Recentrer la caméra"><RotateCcw size={19}/></button><span className="origins-keyboard">ZQSD / WASD · Maj courir<br/>Glisser pour regarder · clic pour marcher</span><span className="origins-touchhint">Gauche : déplacer<br/>Droite : regarder</span></div>

    <div className="origins-actions">

     <button onClick={()=>action('wolf')} disabled={c.active&&snapshot?.wolf?.cooldown>0} title={c.active?snapshot?.wolf?.power:undefined} aria-label="Commander le loup"><Footprints/><span>{c.active?(snapshot?.wolf?.cooldown>0?Math.ceil(snapshot.wolf.cooldown)+' s':'Soutien'):'Loup'} <kbd>F</kbd></span></button>

     <button onClick={()=>action('vision')} disabled={snapshot?.visionCooldown>0} aria-label="Vision de Mémoire"><Eye/><span>{snapshot?.visionCooldown>0?Math.ceil(snapshot.visionCooldown)+' s':'Mémoire'} <kbd>V</kbd></span></button>

     <button {...immediate('light')} disabled={c.stamina<(c.lightCost??7)} aria-label="Attaque rapide"><Swords/><span>Rapide <kbd>J</kbd></span></button>

     <button {...immediate('heavy')} disabled={c.stamina<(c.heavyCost??27)} aria-label="Attaque puissante"><Shield/><span>Puissante <kbd>K</kbd></span></button>

     <button {...immediate('dodge')} disabled={c.stamina<24} aria-label="Esquive"><ArrowLeft/><span>Esquive <kbd>␣</kbd></span></button>

     <button {...immediate('circle')} disabled={s.avatar.weapon==='scissors'?c.recalling>0||(!c.detached&&c.energy<20):c.energy<40} aria-label="Pouvoir du Cercle"><Sparkles/><span>{s.avatar.weapon==='scissors'?(c.detached?'Rappeler':'Séparer'):weaponStyle?.technique||'Cercle'} <kbd>R</kbd></span></button>

    {weaponStyle&&<button {...immediate('guard')} disabled={c.stamina<12||c.detached>0||c.recalling>0} aria-label="Garde directionnelle"><Shield/><span>{c.guarding?'Abaisser':'Garde'} <kbd>G</kbd></span></button>}
    </div>

   </div>

   {!c.active&&snapshot?.nearby&&<button className="origins-interact" onClick={()=>action('interact')}><kbd>E</kbd>{snapshot.nearby.name}</button>}

   {message&&<div className="origins-dialogue" role="status">{message.speaker&&<strong>{message.speaker}</strong>}<p>{message.text}</p>{message.choices&&<div className="origins-dialogue-choices">{message.choices.map(c=><button key={c.topic} onClick={()=>scene.current?.dialogue(c.id,c.topic)}>{c.label}</button>)}</div>}<button onClick={()=>{setMessage(null);focus();}} aria-label="Fermer le dialogue"><X size={17}/></button></div>}

   {snapshot?.cinematic&&<div className="origins-cinematic" role="region" aria-label="Cinématique du monde"><div><strong>{snapshot.cinematic.title}</strong><p>{snapshot.cinematic.line}</p><nav><button onClick={()=>scene.current?.skip()}>Passer</button><button onClick={()=>scene.current?.cinemaPause()}>{snapshot.cinematic.paused?'Reprendre la scène':'Pause scène'}</button><button aria-pressed={snapshot.cinematic.reading} onClick={()=>scene.current?.cinemaRead()}>{snapshot.cinematic.reading?'Lecture automatique':'Mode lecture'}</button></nav></div></div>}

  </>}

  {loading&&<div className="origins-loading" role="status"><span className="origins-spinner"/>Construction du lieu…<small>Chargement des modèles et des matières</small></div>}

  {saveError&&<div className="origins-save-error" role="alert">Sauvegarde locale indisponible : libère de l’espace avant de quitter.</div>}

  {error&&<div className="origins-failure" role="alert"><h2>Le lieu n’a pas pu s’ouvrir</h2><p>{error}</p><button onClick={()=>location.reload()}>Réessayer</button><button onClick={()=>goTo('accueil')}>Retour à l’application</button></div>}

  {panel==='start'&&<div className="origins-start"><div><p className="origins-eyebrow">3B INTERNATIONAL</p><h1>ORIGINS</h1><h2>LE CERCLE BRISÉ</h2><p>Certains lieux n’attendent pas d’être découverts.<br/>Ils attendent qu’on se souvienne.</p><button className="origins-primary" disabled={loading||!!error} onClick={start}><Play size={19}/>{s.flags.awakened?'Reprendre l’aventure':'Entrer dans le Sanctuaire'}</button><button disabled={loading||!!error} onClick={()=>setPanel('character')}>Créer ou modifier mon personnage</button><small>Ton personnage · ton loup · ton histoire</small><button className="origins-textbutton" onClick={()=>goTo('accueil')}>Retour à l’application</button></div><footer>BLACK • BLANC • BEUR<br/><span>Ce n’est pas une marque, c’est un héritage.</span></footer></div>}

  {panel&&panel!=='start'&&<Panel title={panel==='awakening'?'L’Éveil de l’Héritage':panel==='character'?'Mon personnage':panel==='pause'?'L’aventure attend':panel==='settings'?'Paramètres':panel==='map'?'Les lieux retrouvés':panel==='inventory'?'Équipement et fragments':'Journal de '+s.avatar.name} close={panel==='character'?()=>setPanel('start'):close}>

   {panel==='awakening'&&<AvatarCinematic avatar={s.avatar} sequence={originsCharacterSequence(s.avatar,s.xp)} onDone={close}/>}
   {panel==='character'&&<CharacterCreator xp={s.xp} avatar={s.avatar} looks={s.looks} onSave={saveCharacter} onCancel={()=>setPanel('start')}/>}
   {panel==='pause'&&<div className="origins-menu"><button className="origins-primary" onClick={close}><Play/>Reprendre</button><button onClick={()=>setPanel('character')}>Mon personnage</button><button onClick={()=>setPanel('awakening')}>Revoir mon éveil</button><button onClick={()=>setPanel('journal')}><BookOpen/>Histoire et quêtes</button><button onClick={()=>goTo('arena')}><Swords/>Arène · duels et entraînement</button><button onClick={()=>setPanel('map')}><MapIcon/>Carte</button><button onClick={()=>setPanel('inventory')}><Diamond/>Équipement et fragments</button><button onClick={()=>setPanel('settings')}><Settings/>Paramètres</button><button onClick={()=>goTo('accueil')}><ArrowLeft/>Retour à l’application</button><details><summary>Version précédente</summary><p>L’ancienne aventure et ses sauvegardes restent accessibles séparément.</p><button onClick={onPrevious}>Ouvrir la version précédente</button></details><small>Sauvegarde sur cet appareil · personnage et progression.</small></div>}

   {panel==='settings'&&<div className="origins-settings"><label>Qualité graphique<select value={settings.quality} onChange={e=>change('quality',e.target.value)}><option value="auto">Automatique · qualité adaptative</option><option value="high">Élevée · détails maximum</option><option value="light">Allégée · priorité fluidité</option></select></label><label>Sensibilité caméra<input type="range" min=".25" max="2" step=".05" value={settings.sensitivity} onChange={e=>change('sensitivity',+e.target.value)}/></label><label>Distance caméra<input type="range" min="6" max="12" step=".5" value={settings.zoom} onChange={e=>change('zoom',+e.target.value)}/></label><label className="origins-check"><input type="checkbox" checked={settings.follow} onChange={e=>change('follow',e.target.checked)}/>Caméra derrière le sens de marche</label><label className="origins-check"><input type="checkbox" checked={settings.shake} onChange={e=>change('shake',e.target.checked)}/>Légères secousses d’impact</label><label>Ambiance musicale<input type="range" min="0" max="1" step=".05" value={settings.music} onChange={e=>change('music',+e.target.value)}/></label><label>Bruitages<input type="range" min="0" max="1" step=".05" value={settings.effects} onChange={e=>change('effects',+e.target.value)}/></label><p className="origins-muted">{snapshot?.fps||'—'} images/s observées · {snapshot?.drawCalls||0} appels de rendu. Cette mesure concerne ce navigateur. En automatique, la résolution et les ombres s’adaptent à la fluidité ; les modèles sont choisis au prochain changement de lieu.</p></div>}

   {panel==='journal'&&<><p className="origins-current">{task.text}</p><button onClick={()=>route(task.target)}>Rejoindre le prochain lieu</button><div className="origins-quests">{isCountry(s.zone)?<article><small>VIE DU QUARTIER · {COUNTRIES[s.zone].name}</small><h3>Restaurer, se préparer et explorer</h3><ol><li>Récolter des matériaux au jardin.</li><li>Restaurer le jardin : {s.regions[s.zone].restored}/3.</li><li>Renforcer la tenue : {s.regions[s.zone].upgrade?'fait':'à faire'}.</li><li>Repousser l’Oubli pour ouvrir une nouvelle récolte : {s.regions[s.zone].wins} victoires.</li><li>Se reposer au refuge et découvrir le monument sur la carte.</li></ol><p>Tu peux poursuivre tes explorations et tes rencontres après la restauration.</p></article>:QUESTS.map(q=><article key={q.id}><small>{q.kind==='main'?'QUÊTE PRINCIPALE':'RENCONTRE'} · {s.rewards.includes(q.id)?'Accomplie':q.kind==='side'&&!(q.id==='garden'?s.flags.gardenAccepted:s.flags.memoryAccepted)?'À découvrir':'En cours'}</small><h3>{q.title}</h3><ol>{q.steps.map(text=><li key={text}>{text}</li>)}</ol></article>)}</div></>}

   {panel==='inventory'&&<div className="origins-inventory"><article><h3>Quartier de Paris</h3><p>{s.paris.materials} matériaux · {s.paris.coins} pièces · {s.paris.deliveries} livraisons</p><p>Atelier : {s.paris.workshop?'restauré':'à restaurer'}. Récolte au jardin ouest, puis prépare les livraisons à l’atelier.</p></article><article><Diamond/><h3>{s.flags.justice?'Fragment de Justice':'Le Cercle attend son premier fragment'}</h3><p>{s.flags.returned?'Replacé au Sanctuaire.':s.flags.justice?'Rapporte-le au Sanctuaire.':'La France garde une mémoire à retrouver.'}</p></article><article><Shield/><h3>{reinforced?'Tenue renforcée par l’artisan':'Tenue Héritage'}</h3><p>{reinforced?'Attaque puissante : 20 endurance au lieu de 27.':'Ton apparence reste personnalisable. Rends visite à l’artisan pour renforcer ta tenue.'}</p></article><article><Footprints/><h3>Le loup · lien {s.bond}</h3><p>{s.bond>=3?'Recherche étendue à 12 mètres.':s.bond>=2?'La confiance permet de tenir les sceaux.':'Chercher ensemble renforce la confiance.'}</p></article><p>{s.xp} XP d’aventure. Aucun avantage commercial attribué par cette sauvegarde.</p></div>}

   {panel==='map'&&<><MapView snapshot={snapshot} large/><p>Choisis un lieu pour y marcher. Tu peux reprendre la main à tout moment.</p><div className="origins-map-points">{(isCountry(s.zone)?countryLayout(s.zone).points.map(p=>[p.id,p.name]):s.zone==='sanctuary'?[['circle',POINTS.circle.name],...WORLDS.map(w=>[w.id,'Porte '+w.name])]:[['eiffel','Parvis de la tour Eiffel'],['resident','Place des Liens'],['atelier','Atelier'],['refuge','Maison des souvenirs'],['trace','Fontaine'],['guardian','Gardien'],['seal','Sceau gauche'],['trial','Plateau droit'],['echo','Premier témoignage'],['echo2','Second témoignage'],['fragment','Fond des Archives'],['memory','Passage haut'],['flower','Jardin ouest'],['secret','Tilleul'],['arrival','Retour au Sanctuaire']]).map(([id,name])=><button key={id} onClick={()=>route(id)}>{name}</button>)}</div></>}

  </Panel>}

 </section>;

}
