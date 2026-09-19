import {AvatarCinematic} from './AvatarCinematic.jsx';
import React,{useMemo,useState} from 'react';
import {ArenaStage} from '../arena/ArenaStage.jsx';
import {LOOKS,TRAVEL_GEAR} from './wardrobe.js';
import {COUNTRIES} from './catalog.js';
import {blankAvatar,normalizeAvatar,SKINS,OUTFITS,AVATAR_PATHS} from './avatar-rules.js';
import {WEAPONS,COMPANIONS} from './arsenal.js';
import {EVOLUTION_XP,formName} from './arsenal-progression.js';
import {WEAPON_ART_ATLAS,weaponArtStyle,weaponDisplayName,weaponStats} from './weapon-art.js';
import '../arena/arena.css';
import './weapon-customizer.css';
import './avatar-customizer.css';

const STEPS=[
 ['identity','Identité'],['face','Visage'],['body','Corps'],['style','Tenue'],
 ['accessories','Accessoires'],['weapon','Arme'],['world','Monde'],['finish','Finaliser']
];
const HAIRS=['Rasé','Coupe courte','Chignons','Raie souple','Cheveux longs','Court texturé','Barbe et crâne rasé'];
const FACE_PRESETS=[
 {name:'Neutre',face:0,jaw:0,nose:0},{name:'Doux',face:.35,jaw:-.25,nose:-.15},
 {name:'Défini',face:-.15,jaw:.55,nose:.1},{name:'Large',face:.65,jaw:.25,nose:.25}
];

export function AvatarPanel({save,act,onDone}){
 const initial=useMemo(()=>normalizeAvatar(save.adventure.avatar),[save.adventure.avatar]);
 const [draft,setDraft]=useState(initial),[message,setMessage]=useState(''),[weaponMessage,setWeaponMessage]=useState('');
 const [revealed,setRevealed]=useState(false),[savedAvatar,setSavedAvatar]=useState(initial),[activeStep,setActiveStep]=useState('identity');
 const [previewFocus,setPreviewFocus]=useState('body'),[previewPose,setPreviewPose]=useState('idle'),[previewAngle,setPreviewAngle]=useState(0),[weaponDrawn,setWeaponDrawn]=useState(true);
 const set=(key,value)=>setDraft(d=>({...d,[key]:value}));
 const stepIndex=STEPS.findIndex(([id])=>id===activeStep);
 const selectedWeapon=WEAPONS.find(w=>w.id===draft.weapon)||WEAPONS[0],stats=weaponStats(selectedWeapon),xp=Number.isFinite(save.xp)?Math.max(0,save.xp):0;
 const maxWeaponForm=EVOLUTION_XP.reduce((max,need,index)=>xp>=need?index:max,0);
 const chooseWeapon=id=>{setDraft(d=>({...d,weapon:id,weaponForm:0}));setWeaponMessage('');};
 const chooseWeaponForm=tier=>{if(tier<=maxWeaponForm){set('weaponForm',tier);setWeaponMessage('');}};
 const goto=id=>{setActiveStep(id);setMessage('');document.querySelector('.avatar-editor-v2')?.scrollIntoView({behavior:'smooth',block:'start'});};
 const randomize=()=>{
  const pick=a=>a[Math.floor(Math.random()*a.length)],base=blankAvatar();
  setDraft(d=>normalizeAvatar({...base,...d,
   body:pick(['homme','femme']),shape:pick(['equilibre','elance','solide']),skin:Math.floor(Math.random()*SKINS.length),skinColor:null,
   hair:Math.floor(Math.random()*HAIRS.length),hairColor:pick(['#201813','#352a24','#6c4b31','#171717','#8b6b4a']),
   face:(Math.random()*1.4-.7),jaw:(Math.random()*1.4-.7),nose:(Math.random()*1.4-.7),
   height:.92+Math.random()*.16,build:.9+Math.random()*.2,style:pick(['voyageur','sentinelle','mystique']),
   color:Math.floor(Math.random()*OUTFITS.length),fabricColor:null,accentColor:pick(['#d7bd83','#a9d7ff','#e6d2a5','#c9a7df']),
   pattern:pick(['uni','bandes','damier','insigne','broderie']),headwear:pick(['none','beret','brim','hood']),outer:pick(['none','cape','scarf']),
   bag:Math.random()>.5,belt:pick(['none','simple','utility']),pendant:Math.random()>.55,boots:Math.floor(Math.random()*3),
   weapon:pick(WEAPONS).id,weaponForm:0,companion:pick(COMPANIONS).id,path:pick(Object.keys(AVATAR_PATHS)),origin:pick(['3b',...COUNTRIES.map(c=>c.id)])
  })));
 };
 if(revealed)return <AvatarCinematic avatar={savedAvatar} onDone={()=>{setRevealed(false);onDone?.();}}/>;
 return <div className="avatar-editor-v2">
  <aside className="avatar-preview-v2">
   <div className="avatar-preview-stage"><ArenaStage avatar={draft} focus={previewFocus} pose={previewPose} angle={previewAngle} weaponState={weaponDrawn?'preview':'world'}/></div>
   <div className="avatar-preview-toolbar" aria-label="Contrôles de prévisualisation">
    <div><button type="button" aria-pressed={previewFocus==='body'} onClick={()=>setPreviewFocus('body')}>Corps</button><button type="button" aria-pressed={previewFocus==='face'} onClick={()=>setPreviewFocus('face')}>Visage</button></div>
    <div><button type="button" aria-pressed={previewAngle===0} onClick={()=>setPreviewAngle(0)}>Face</button><button type="button" aria-pressed={previewAngle===Math.PI/2} onClick={()=>setPreviewAngle(Math.PI/2)}>Profil</button><button type="button" aria-pressed={previewAngle===Math.PI} onClick={()=>setPreviewAngle(Math.PI)}>Dos</button></div>
    <div><button type="button" aria-pressed={previewPose==='idle'} onClick={()=>setPreviewPose('idle')}>Repos</button><button type="button" aria-pressed={previewPose==='walk'} onClick={()=>setPreviewPose('walk')}>Marche</button><button type="button" aria-pressed={previewPose==='run'} onClick={()=>setPreviewPose('run')}>Course</button><button type="button" onClick={()=>setPreviewPose(p=>p==='attack'?'idle':'attack')}>Attaque</button></div>
   </div>
   <p className="avatar-preview-hint">Glisse sur le personnage pour tourner librement. Les modifications légères se mettent à jour sans recharger le modèle 3D.</p>
  </aside>

  <form className="avatar-fields-v2" onSubmit={e=>{e.preventDefault();const normalized=normalizeAvatar({...draft,created:true});if(act({type:'avatar',avatar:normalized})){setSavedAvatar(normalized);setMessage('Ton personnage est enregistré.');setRevealed(true);}}}>
   <header className="avatar-creator-header">
    <div><span>MONDE DU 3B</span><h2>Créer mon personnage</h2><p>Personnalise ton identité, ton apparence, ta tenue, ton arme et ta voie avant d’entrer dans le monde ouvert.</p></div>
    <button type="button" className="avatar-random" onClick={randomize}>Personnage aléatoire</button>
   </header>

   <nav className="avatar-step-nav" aria-label="Étapes de personnalisation">{STEPS.map(([id,label],index)=><button type="button" key={id} aria-current={activeStep===id?'step':undefined} onClick={()=>goto(id)}><b>{String(index+1).padStart(2,'0')}</b><span>{label}</span></button>)}</nav>

   {activeStep==='identity'&&<section className="avatar-step-card">
    <div className="avatar-step-heading"><span>01</span><div><h3>Identité</h3><p>Les informations de base de ton personnage.</p></div></div>
    <label>Nom du personnage<input maxLength={20} required value={draft.name} onChange={e=>set('name',e.target.value)}/></label>
    <fieldset><legend>Silhouette de base</legend><div className="avatar-choice-grid two">{['homme','femme'].map(body=><button type="button" key={body} aria-pressed={draft.body===body} onClick={()=>set('body',body)}>{body==='homme'?'Homme':'Femme'}</button>)}</div></fieldset>
    <div className="avatar-inline-note">Le choix de silhouette ne verrouille ni les vêtements, ni les couleurs, ni les origines.</div>
   </section>}

   {activeStep==='face'&&<section className="avatar-step-card">
    <div className="avatar-step-heading"><span>02</span><div><h3>Visage & cheveux</h3><p>Travaille le visage de près avec le bouton « Visage » sous l’aperçu.</p></div></div>
    <fieldset><legend>Teint</legend><div className="avatar-swatches-v2">{SKINS.map((s,i)=><button type="button" key={s} aria-label={'Teint '+(i+1)} aria-pressed={!draft.skinColor&&draft.skin===i} onClick={()=>setDraft(d=>({...d,skin:i,skinColor:null}))} style={{background:s}}/>)}</div></fieldset>
    <label className="avatar-color-line">Teint personnalisé<input type="color" value={draft.skinColor||SKINS[draft.skin]} onChange={e=>set('skinColor',e.target.value)}/><button type="button" onClick={()=>set('skinColor',null)}>Utiliser la palette</button></label>
    <fieldset><legend>Presets de visage</legend><div className="avatar-choice-grid four">{FACE_PRESETS.map(p=><button type="button" key={p.name} onClick={()=>setDraft(d=>({...d,face:p.face,jaw:p.jaw,nose:p.nose}))}>{p.name}</button>)}</div></fieldset>
    <fieldset><legend>Réglages fins</legend>{[['face','Largeur du visage'],['jaw','Mâchoire'],['nose','Nez']].map(([key,label])=><label className="avatar-range-v2" key={key}><span>{label}</span><input type="range" min="-1" max="1" step=".05" value={draft[key]} onChange={e=>set(key,Number(e.target.value))}/><output>{Number(draft[key]).toFixed(2)}</output></label>)}</fieldset>
    <div className="avatar-grid-2"><label>Coiffure<select value={draft.hair} onChange={e=>set('hair',Number(e.target.value))}>{HAIRS.map((name,i)=><option key={name} value={i}>{name}</option>)}</select></label><label>Couleur des cheveux<input type="color" value={draft.hairColor} onChange={e=>set('hairColor',e.target.value)}/></label></div>
   </section>}

   {activeStep==='body'&&<section className="avatar-step-card">
    <div className="avatar-step-heading"><span>03</span><div><h3>Corps</h3><p>Ces paramètres existaient déjà dans le moteur mais n’étaient pas accessibles dans l’ancien écran.</p></div></div>
    <label>Morphologie<select value={draft.shape} onChange={e=>set('shape',e.target.value)}><option value="equilibre">Équilibrée</option><option value="elance">Élancée</option><option value="solide">Solide</option></select></label>
    <label className="avatar-range-v2"><span>Taille</span><input type="range" min=".9" max="1.1" step=".01" value={draft.height} onChange={e=>set('height',Number(e.target.value))}/><output>{Math.round(draft.height*100)}%</output></label>
    <label className="avatar-range-v2"><span>Corpulence</span><input type="range" min=".88" max="1.15" step=".01" value={draft.build} onChange={e=>set('build',Number(e.target.value))}/><output>{Math.round(draft.build*100)}%</output></label>
    <div className="avatar-inline-note">La silhouette reste volontairement réaliste : les valeurs sont limitées pour éviter les déformations du squelette et des vêtements.</div>
   </section>}

   {activeStep==='style'&&<section className="avatar-step-card">
    <div className="avatar-step-heading"><span>04</span><div><h3>Tenue</h3><p>Pars d’un look complet ou construis ta tenue détail par détail.</p></div></div>
    <fieldset className="avatar-looks-v2"><legend>Looks complets</legend><div>{LOOKS.map(look=><button type="button" key={look.id} onClick={()=>{const {id,name,...changes}=look;setDraft(d=>({...d,...changes}));}}><i style={{background:look.fabricColor,borderColor:look.accentColor}}/><span>{look.name}</span></button>)}</div></fieldset>
    <div className="avatar-grid-2"><label>Coupe de la tenue<select value={draft.style} onChange={e=>set('style',e.target.value)}><option value="voyageur">Voyage · tenue légère</option><option value="sentinelle">Sentinelle · manteau de garde</option><option value="mystique">Résonance · cape d’exploration</option></select></label><label>Matière<select value={draft.fabric} onChange={e=>set('fabric',e.target.value)}><option value="cotton">Coton</option><option value="linen">Lin</option><option value="satin">Satin</option><option value="leather">Cuir</option></select></label></div>
    <fieldset><legend>Palette rapide</legend><div className="avatar-swatches-v2">{OUTFITS.map((s,i)=><button type="button" key={s} aria-label={'Couleur '+(i+1)} aria-pressed={!draft.fabricColor&&draft.color===i} onClick={()=>setDraft(d=>({...d,color:i,fabricColor:null}))} style={{background:s}}/>)}</div></fieldset>
    <div className="avatar-color-grid">{[['fabricColor','Tissu',OUTFITS[draft.color]],['accentColor','Détails','#d7bd83'],['trouserColor','Pantalon','#77644d'],['bootColor','Chaussures','#695239']].map(([key,label,fallback])=><label key={key}>{label}<input type="color" value={draft[key]||fallback} onChange={e=>set(key,e.target.value)}/></label>)}</div>
    <div className="avatar-grid-2"><label>Motif<select value={draft.pattern} onChange={e=>set('pattern',e.target.value)}>{[['uni','Uni'],['bandes','Rayures'],['damier','Damier'],['insigne','Signature 3B'],['broderie','Broderie géométrique']].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label className="avatar-range-v2"><span>Taille du motif</span><input type="range" min=".5" max="3" step=".1" value={draft.patternScale} onChange={e=>set('patternScale',Number(e.target.value))}/><output>{draft.patternScale.toFixed(1)}×</output></label></div>
   </section>}

   {activeStep==='accessories'&&<section className="avatar-step-card">
    <div className="avatar-step-heading"><span>05</span><div><h3>Accessoires</h3><p>Plusieurs options existaient déjà dans les données mais étaient invisibles dans l’ancien créateur.</p></div></div>
    <div className="avatar-grid-2"><label>Couvre-chef<select value={draft.headwear} onChange={e=>set('headwear',e.target.value)}><option value="none">Aucun</option><option value="beret">Béret</option><option value="brim">Chapeau de voyage</option><option value="hood">Capuche</option></select></label><label>Accessoire extérieur<select value={draft.outer} onChange={e=>set('outer',e.target.value)}><option value="none">Aucun</option><option value="cape">Cape</option><option value="scarf">Écharpe</option><option value="apron">Tablier d’artisan</option></select></label></div>
    {draft.headwear==='hood'&&<label className="avatar-range-v2"><span>Ajustement de la capuche</span><input type="range" min=".9" max="1.15" step=".01" value={draft.hoodFit} onChange={e=>set('hoodFit',Number(e.target.value))}/><output>{Math.round(draft.hoodFit*100)}%</output></label>}
    {draft.outer==='cape'&&<label className="avatar-range-v2"><span>Longueur de la cape</span><input type="range" min=".7" max="1.25" step=".01" value={draft.capeLength} onChange={e=>set('capeLength',Number(e.target.value))}/><output>{Math.round(draft.capeLength*100)}%</output></label>}
    <div className="avatar-grid-2"><label>Ceinture<select value={draft.belt} onChange={e=>set('belt',e.target.value)}><option value="none">Aucune</option><option value="simple">Simple</option><option value="utility">Utilitaire</option></select></label><label>Chaussures<select value={draft.boots} onChange={e=>set('boots',Number(e.target.value))}><option value="0">Chaussures de voyage</option><option value="1">Bottes d’exploration</option><option value="2">Bottes de garde</option></select></label></div>
    <div className="avatar-toggle-grid"><label><input type="checkbox" checked={draft.bag} onChange={e=>set('bag',e.target.checked)}/><span>Sac de voyage</span></label><label><input type="checkbox" checked={draft.pendant} onChange={e=>set('pendant',e.target.checked)}/><span>Pendentif</span></label></div>
    <div className="avatar-color-grid two"><label>Couleur extérieure<input type="color" value={draft.outerColor||draft.fabricColor||OUTFITS[draft.color]} onChange={e=>set('outerColor',e.target.value)}/></label><label>Métal / bijoux<input type="color" value={draft.metalColor||'#c9ad75'} onChange={e=>set('metalColor',e.target.value)}/></label></div>
    <label>Équipement de voyage<select value={draft.travelGear} onChange={e=>set('travelGear',e.target.value)}>{Object.entries(TRAVEL_GEAR).map(([id,g])=><option key={id} value={id}>{g.name}</option>)}</select></label><p className="avatar-description">{TRAVEL_GEAR[draft.travelGear].description} Sans effet dans l’arène.</p>
   </section>}

   {activeStep==='weapon'&&<section className="avatar-step-card avatar-step-weapon">
    <div className="avatar-step-heading"><span>06</span><div><h3>Arme</h3><p>Choisis l’arme premium puis vérifie-la en main, rangée, en marche, en course ou pendant une attaque.</p></div></div>
    <div className="weapon-preview-toggle"><button type="button" aria-pressed={!weaponDrawn} onClick={()=>setWeaponDrawn(false)}>Rangée</button><button type="button" aria-pressed={weaponDrawn} onClick={()=>setWeaponDrawn(true)}>Dégainée</button></div>
    <section className="avatar-weapon-studio" style={{'--weapon-atlas':`url("${WEAPON_ART_ATLAS}")`}} aria-label="Personnalisation de l’arme">
     <header className="weapon-studio-header"><span className="weapon-studio-kicker">PERSONNALISATION</span><h2>Choix de l’arme</h2></header>
     <div className="weapon-stage">
      <div className="weapon-stage-art"><span className="weapon-art weapon-hero-art" style={weaponArtStyle(selectedWeapon.id)} role="img" aria-label={weaponDisplayName(selectedWeapon)}/></div>
      <div className="weapon-hero-info"><span className="weapon-type-pill">{selectedWeapon.kind} · {selectedWeapon.form}</span><h3>{weaponDisplayName(selectedWeapon)}</h3><p>{selectedWeapon.description}</p>
       {[['Puissance',stats.power],['Vitesse',stats.speed],['Portée',stats.range]].map(([label,value])=><div className="weapon-stat" key={label}><span>{label}</span><span className="weapon-stat-track"><i className="weapon-stat-fill" style={{'--value':value}}/></span><b>{value}</b></div>)}
      </div>
     </div>
     <div className="weapon-gallery-label"><span>Arsenal 3B</span><small>Glisse pour parcourir · {WEAPONS.length} armes</small></div>
     <div className="weapon-gallery" role="list">{WEAPONS.map(w=><button className="weapon-card" type="button" role="listitem" key={w.id} aria-pressed={draft.weapon===w.id} onClick={()=>chooseWeapon(w.id)}><span className="weapon-art weapon-card-art" style={weaponArtStyle(w.id)} aria-hidden="true"/><strong>{weaponDisplayName(w)}</strong><small>{w.kind} · {w.country==='3b'?'International':w.country}</small></button>)}</div>
     <div className="weapon-evolution-label"><span>Évolution de l’arme</span><small>{xp} XP monde</small></div>
     <div className="weapon-evolution-grid">{EVOLUTION_XP.map((need,tier)=><button className="weapon-form-button" type="button" key={tier} disabled={tier>maxWeaponForm} aria-pressed={draft.weaponForm===tier} onClick={()=>chooseWeaponForm(tier)}><b>{formName(selectedWeapon,tier)}</b><small>{tier===0?'Disponible':tier<=maxWeaponForm?'Débloquée':need+' XP requis'}</small></button>)}</div>
     <button className="weapon-equip" type="button" onClick={()=>{setWeaponDrawn(true);setWeaponMessage(weaponDisplayName(selectedWeapon)+' équipée pour ton personnage.');}}>Équiper</button>
     <p className="weapon-equipped-note" role="status">{weaponMessage}</p>
    </section>
   </section>}

   {activeStep==='world'&&<section className="avatar-step-card">
    <div className="avatar-step-heading"><span>07</span><div><h3>Monde & héritage</h3><p>Origines, pays de cœur, voie de pouvoir et compagnon restent indépendants de ton apparence.</p></div></div>
    <label>Origines personnelles · tous les pays<input maxLength={50} placeholder="Pays ou origines de ton choix" value={draft.nationality} onChange={e=>set('nationality',e.target.value)}/></label>
    <label>Pays de cœur dans le Monde 3B<select value={draft.origin} onChange={e=>set('origin',e.target.value)}><option value="3b">L’Union des huit portes</option>{COUNTRIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <fieldset><legend>Voie de pouvoir</legend><div className="avatar-power-grid">{Object.entries(AVATAR_PATHS).map(([id,p])=><button type="button" key={id} aria-pressed={draft.path===id} onClick={()=>set('path',id)} style={{'--power':p.color}}><strong>{p.name}</strong><span>{p.description}</span></button>)}</div></fieldset>
    <fieldset><legend>Compagnon</legend><div className="avatar-companion-grid">{COMPANIONS.map(c=><button type="button" key={c.id} aria-pressed={draft.companion===c.id} onClick={()=>set('companion',c.id)}><i style={{background:c.color}}/><strong>{c.name}</strong><small>{c.description}</small></button>)}</div></fieldset>
   </section>}

   {activeStep==='finish'&&<section className="avatar-step-card avatar-finish-card">
    <div className="avatar-step-heading"><span>08</span><div><h3>Prêt pour le Monde du 3B</h3><p>Vérifie une dernière fois ton personnage avant de commencer le voyage.</p></div></div>
    <div className="avatar-summary-grid">
     <div><span>Nom</span><strong>{draft.name||'Voyageur'}</strong></div><div><span>Silhouette</span><strong>{draft.body==='femme'?'Femme':'Homme'} · {draft.shape}</strong></div>
     <div><span>Tenue</span><strong>{draft.style} · {draft.fabric}</strong></div><div><span>Arme</span><strong>{weaponDisplayName(selectedWeapon)}</strong></div>
     <div><span>Pays de cœur</span><strong>{draft.origin==='3b'?'Union des huit portes':COUNTRIES.find(c=>c.id===draft.origin)?.name||draft.origin}</strong></div><div><span>Voie</span><strong>{AVATAR_PATHS[draft.path].name}</strong></div>
     <div><span>Compagnon</span><strong>{COMPANIONS.find(c=>c.id===draft.companion)?.name}</strong></div><div><span>Équipement</span><strong>{TRAVEL_GEAR[draft.travelGear].name}</strong></div>
    </div>
    <p className="avatar-inline-note">Tu pourras revenir modifier ton personnage plus tard. Les choix d’apparence n’augmentent pas artificiellement les statistiques d’arène.</p>
    <button className="world-primary avatar-final-submit" type="submit">{save.adventure.avatar.created?'Enregistrer les modifications':'Commencer mon voyage'}</button><p role="status">{message}</p>
   </section>}

   <footer className="avatar-step-footer">
    <button type="button" disabled={stepIndex<=0} onClick={()=>goto(STEPS[Math.max(0,stepIndex-1)][0])}>← Précédent</button>
    <span>Étape {stepIndex+1} / {STEPS.length}</span>
    {stepIndex<STEPS.length-1?<button type="button" className="avatar-next" onClick={()=>goto(STEPS[stepIndex+1][0])}>Suivant →</button>:<button type="submit" className="avatar-next">Valider</button>}
   </footer>
  </form>
 </div>;
}
