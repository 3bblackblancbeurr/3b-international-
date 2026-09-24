import React,{useCallback,useEffect,useId,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {Camera,ImagePlus,ScanFace,Trash2,Type} from 'lucide-react';
import {passportInitials} from './identity.js';
import {appearanceFromSnapshot,appearanceStore,cleanInitials,isDirectorPortraitIdentity} from './appearance-store.js';
import DirectorMatrixPortrait from './DirectorMatrixPortrait.jsx';
import {matrixPortraitSource,officialDirectorPortrait} from './official-director-portrait.js';
import './passport-appearance.css';

const fallbackFor=identity=>passportInitials(identity);
const STORAGE_ERROR='Impossible d’enregistrer sur cet appareil. Vérifie l’espace disponible et l’accès au stockage du navigateur.';
const serverSnapshot=()=>null;

export function usePassportAppearance(identity){
 const identityKey=identity?.userId||'guest';
 const director=isDirectorPortraitIdentity(identity);
 const ownerKey=identityKey+':'+director;
 const owner=useRef(ownerKey),active=useRef(true);
 owner.current=ownerKey;
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const subscribe=useCallback(listener=>appearanceStore.subscribe(identity,listener),[identityKey]);
 const getSnapshot=useCallback(()=>appearanceStore.readSnapshot(identity),[identityKey]);
 const snapshot=useSyncExternalStore(subscribe,getSnapshot,serverSnapshot);
 const appearance=useMemo(()=>appearanceFromSnapshot(snapshot,identity),[snapshot,identityKey,identity?.name,identity?.handle,director]);
 const update=useCallback((change,expectedAppearance)=>{
  if(!active.current||owner.current!==ownerKey)return false;
  return appearanceStore.update(identity,change,expectedAppearance);
 },[ownerKey,identity?.name,identity?.handle]);

 return [appearance,update];
}

function imageElement(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file);
  const image=new Image();
  image.decoding='async';
  image.onload=()=>{URL.revokeObjectURL(url);resolve({drawable:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>{}});};
  image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Cette image ne peut pas être ouverte sur cet appareil.'));};
  image.src=url;
 });
}

async function decodePhoto(file){
 if(typeof createImageBitmap==='function'){
  try{
   const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
   return {drawable:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()};
  }catch{
   try{
    const bitmap=await createImageBitmap(file);
    return {drawable:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()};
   }catch{}
  }
 }
 return imageElement(file);
}

async function preparePhoto(file){
 const looksLikeImage=String(file?.type||'').startsWith('image/')||/\.(?:jpe?g|png|webp|avif)$/iu.test(String(file?.name||''));
 if(!file||!looksLikeImage)throw new Error('Choisis une photo compatible depuis ton téléphone.');
 if(file.size>16*1024*1024)throw new Error('La photo dépasse 16 Mo. Choisis une version plus légère.');
 const image=await decodePhoto(file);
 try{
  const targetWidth=560,targetHeight=604,targetRatio=targetWidth/targetHeight;
  const sourceRatio=image.width/image.height;
  let sx=0,sy=0,sw=image.width,sh=image.height;
  if(sourceRatio>targetRatio){
   sw=image.height*targetRatio;
   sx=(image.width-sw)/2;
  }else{
   sh=image.width/targetRatio;
   sy=(image.height-sh)/2;
  }
  const canvas=document.createElement('canvas');
  canvas.width=targetWidth;canvas.height=targetHeight;
  const context=canvas.getContext('2d',{alpha:false,desynchronized:true});
  if(!context)throw new Error('Le traitement de la photo est indisponible sur cet appareil.');
  context.fillStyle='#06141d';
  context.fillRect(0,0,targetWidth,targetHeight);
  context.drawImage(image.drawable,sx,sy,sw,sh,0,0,targetWidth,targetHeight);
  return canvas.toDataURL('image/jpeg',.82);
 }finally{image.close();}
}

function DigitalFace(){
 return <svg className="passport-digital-face" viewBox="0 0 220 238" aria-hidden="true" focusable="false">
  <g className="passport-face-grid">
   <path d="M35 42H185M26 76H194M21 112H199M23 148H197M32 184H188"/>
   <path d="M53 28V205M82 20V218M110 16V224M138 20V218M167 28V205"/>
  </g>
  <g className="passport-face-shell">
   <path d="M110 18C72 18 47 39 41 75l-5 45 13 58 25 33 36 14 36-14 25-33 13-58-5-45c-6-36-31-57-69-57Z"/>
   <path d="M42 91 26 104l4 42 19 17M178 91l16 13-4 42-19 17"/>
  </g>
  <g className="passport-face-geometry">
   <path d="m50 75 31-27 29-9 29 9 31 27-18 23-42-12-42 12Z"/>
   <path d="m49 113 29-17 32 9 32-9 29 17-14 46-47 21-47-21Z"/>
   <path d="m63 159 47 21 47-21-15 39-32 17-32-17Z"/>
   <path d="M78 96 66 119l28 5M142 96l12 23-28 5M110 86v70l-12 13 12 6 12-6-12-13"/>
  </g>
  <g className="passport-face-optics">
   <path d="M62 112c12-9 27-11 43-4l-8 10-25 1ZM158 112c-12-9-27-11-43-4l8 10 25 1Z"/>
   <circle cx="88" cy="114" r="2.6"/><circle cx="132" cy="114" r="2.6"/>
  </g>
  <g className="passport-face-core">
   <path d="M88 190h44M96 196h28"/>
   <path d="M110 31v18M52 79l17 8M168 79l-17 8M55 171l18-6M165 171l-18-6"/>
  </g>
  <g className="passport-face-nodes">
   <circle cx="110" cy="31" r="2.7"/><circle cx="52" cy="79" r="2.7"/><circle cx="168" cy="79" r="2.7"/>
   <circle cx="55" cy="171" r="2.7"/><circle cx="165" cy="171" r="2.7"/><circle cx="110" cy="214" r="2.7"/>
  </g>
  <path className="passport-face-scanline" d="M29 120H191"/>
 </svg>;
}

export function PassportPortrait({identity,animated=true,className=''}) {
 const[appearance]=usePassportAppearance(identity);
 const fallback=fallbackFor(identity);
 const requestedMode=appearance.mode;
 const mode=requestedMode==='photo'&&!appearance.photo?'initials':requestedMode;
 const initials=appearance.initials||fallback;
 const firstName=String(identity?.name||identity?.handle||fallback).trim().split(/\s+/u)[0];

 return <div className={['passport-portrait','passport-portrait-'+mode,className].filter(Boolean).join(' ')} data-animated={animated} data-portrait-mode={mode}>
  {mode==='photo'?<img className="passport-portrait-photo" src={appearance.photo} decoding="async" alt={identity?.name?`Photo de ${identity.name}`:'Photo du titulaire'}/>
   :mode==='matrix'?<DirectorMatrixPortrait photo={matrixPortraitSource(identity,appearance)} name={identity?.name} animated={animated}/>
   :mode==='digital'?<DigitalFace/>
   :mode==='name'?<div className="passport-portrait-first-name" aria-label={`Prénom ${firstName}`}>{firstName}</div>
   :<div className="passport-portrait-initials" aria-label={`Monogramme ${initials}`}>{initials}</div>}
  <span className="passport-portrait-scanbar" aria-hidden="true"/>
  <small className="passport-portrait-kind">{mode==='matrix'?'DIRECTEUR · MATRIX':mode==='photo'?'PHOTO':mode==='digital'?'DIGITAL':mode==='name'?'PRÉNOM':'MONOGRAMME'}</small>
 </div>;
}

export default function PassportAppearanceSettings({identity,compact=false}){
 return identity?.userId?<AppearanceSettings key={identity.userId+':'+isDirectorPortraitIdentity(identity)} identity={identity} compact={compact}/>:null;
}

function AppearanceSettings({identity,compact}){
 const[appearance,setAppearance]=usePassportAppearance(identity);
 const director=isDirectorPortraitIdentity(identity);
 const hasOfficialPortrait=!!officialDirectorPortrait(identity);
 const digitalMode=director?'matrix':'digital';
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);
 const inputRef=useRef(null);
 const uploadVersion=useRef(0);
 const headingId=useId();
 const fallback=useMemo(()=>fallbackFor(identity),[identity?.userId,identity?.name,identity?.handle]);
 useEffect(()=>()=>{uploadVersion.current+=1;},[]);
 useEffect(()=>{uploadVersion.current+=1;setBusy(false);},[appearance.mode]);

 const chooseMode=mode=>{
  uploadVersion.current+=1;setBusy(false);
  const saved=setAppearance(current=>({...current,mode}));
  setMessage(!saved?STORAGE_ERROR:mode==='photo'&&!appearance.photo?'Ajoute une photo pour activer ce mode.':'Choix enregistré sur cet appareil.');
 };

 const upload=async event=>{
  const file=event.target.files?.[0];
  event.target.value='';
  if(!file)return;
  const version=++uploadVersion.current;
  setBusy(true);setMessage('');
  try{
   const photo=await preparePhoto(file);
   if(version!==uploadVersion.current)return;
   const targetMode=appearance.mode==='matrix'?'matrix':'photo';
   const saved=setAppearance(current=>({...current,mode:targetMode,photo}),appearance);
   if(saved===null){
    setMessage('Le choix du portrait a changé pendant l’import. Relance simplement la photo si tu veux l’utiliser.');
    return;
   }
   setMessage(saved?targetMode==='matrix'?'Photo enregistrée pour composer ton visage en caractères Matrix bleus. Elle reste sur cet appareil.':'Photo prête et affichée sur ton Passeport.':STORAGE_ERROR);
  }catch(error){if(version===uploadVersion.current)setMessage(error.message||'La photo n’a pas pu être préparée.');}
  finally{if(version===uploadVersion.current)setBusy(false);}
 };

 const removePhoto=()=>{
  uploadVersion.current+=1;setBusy(false);
  const saved=setAppearance(current=>({...current,mode:current.mode==='matrix'?'matrix':'initials',photo:''}));
  setMessage(saved?appearance.mode==='matrix'&&hasOfficialPortrait?'Photo locale retirée. Ton portrait Matrix officiel est rétabli.':'Photo retirée de cet appareil.':STORAGE_ERROR);
 };

 return <section className={compact?'passport-appearance passport-appearance-compact':'passport-appearance'} aria-labelledby={headingId}>
  <div className="passport-appearance-heading">
   <div><p className="eyebrow">{director?'SIGNATURE DU DIRECTEUR':'IDENTITÉ VISUELLE'}</p><h2 id={headingId}>{director?'Ton visage, composé de Matrix bleu.':'Ton visage sur le Passeport.'}</h2><p>{director?'Les caractères numériques dessinent tes traits et tes ombres à partir de ta photo. Cette signature est réservée à ton profil Directeur · Fondateur.':'Choisis ce qui apparaît dans la zone d’identité. Tu peux changer d’avis plus tard.'}</p></div>
   <PassportPortrait identity={identity} className="passport-appearance-preview"/>
  </div>

  <div className="passport-appearance-modes" role="group" aria-label="Type de portrait du Passeport">
   <button type="button" aria-pressed={['name','initials'].includes(appearance.mode)} onClick={()=>chooseMode('name')}><Type size={18}/><span><strong>Prénom / initiales</strong><small>Identité en lettres</small></span></button>
   <button type="button" aria-pressed={appearance.mode===digitalMode} onClick={()=>chooseMode(digitalMode)}><ScanFace size={18}/><span><strong>{director?'Portrait Matrix':'Visage digital'}</strong><small>{director?'Tes traits en caractères bleus':'Avatar bleu animé · sans biométrie'}</small></span></button>
   <button type="button" aria-pressed={appearance.mode==='photo'} onClick={()=>chooseMode('photo')}><Camera size={18}/><span><strong>Ma photo</strong><small>Portrait personnel</small></span></button>
  </div>

  {['name','initials'].includes(appearance.mode)&&<div className="passport-name-options" role="group" aria-label="Affichage en lettres">
   <button type="button" aria-pressed={appearance.mode==='name'} onClick={()=>chooseMode('name')}>Mon prénom</button>
   <button type="button" aria-pressed={appearance.mode==='initials'} onClick={()=>chooseMode('initials')}>Mes initiales</button>
  </div>}
  {appearance.mode==='initials'&&<label className="passport-initials-field">Initiales affichées
   <input value={appearance.initials} maxLength={4} inputMode="text" autoCapitalize="characters" spellCheck="false"
    onChange={event=>{const saved=setAppearance(current=>({...current,initials:cleanInitials(event.target.value)||fallback}));setMessage(saved?'':STORAGE_ERROR);}}/>
   <small>Par défaut : {fallback}. Maximum 4 lettres ou chiffres.</small>
  </label>}

  {appearance.mode==='matrix'&&!appearance.photo&&<p className="passport-appearance-message">{hasOfficialPortrait?'Ton portrait Matrix officiel est disponible sur tous tes appareils. Tu peux choisir une autre photo uniquement pour cet appareil.':'Ajoute ta photo pour composer ton vrai visage en caractères Matrix. En attendant, ton avatar numérique exclusif est affiché.'}</p>}
  {(appearance.mode==='photo'||appearance.mode==='matrix')&&<div className="passport-photo-actions">
   <input ref={inputRef} className="passport-photo-input" type="file" accept="image/*" aria-label="Photo du Passeport" onChange={upload}/>
   <button type="button" className="surface-button" disabled={busy} onClick={()=>{if(inputRef.current){inputRef.current.value='';inputRef.current.click();}}}><ImagePlus size={17}/>{busy?'Préparation…':appearance.photo?'Changer ma photo':appearance.mode==='matrix'&&hasOfficialPortrait?'Choisir une autre photo':'Ajouter ma photo'}</button>
   {appearance.photo&&<button type="button" className="quiet-button" onClick={removePhoto}><Trash2 size={16}/>{appearance.mode==='matrix'&&hasOfficialPortrait?'Revenir au portrait officiel':'Retirer'}</button>}
  </div>}

  <p className="passport-appearance-privacy">{hasOfficialPortrait?'Ton portrait Matrix officiel est publié. Les photos que tu ajoutes ici sont recadrées et compressées dans ton navigateur ; elles restent sur cet appareil et ne sont pas envoyées au serveur 3B.':'La photo est recadrée et compressée dans ton navigateur. Elle reste sur cet appareil et n’est pas envoyée au serveur 3B.'} {director?'L’effet Matrix utilise les couleurs et la luminosité de l’image, sans reconnaissance faciale.':'Le visage digital est un avatar graphique : aucune donnée biométrique n’est analysée.'}</p>
  {message&&<p className="passport-appearance-message" role="status">{message}</p>}
 </section>;
}
