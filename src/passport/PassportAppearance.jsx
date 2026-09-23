import React,{useCallback,useEffect,useId,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {Camera,ImagePlus,ScanFace,Trash2,Type} from 'lucide-react';
import {passportInitials} from './identity.js';
import {appearanceFromSnapshot,appearanceStore,cleanInitials,isDirectorPortraitIdentity} from './appearance-store.js';
import DirectorMatrixPortrait from './DirectorMatrixPortrait.jsx';
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
  image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
  image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Cette image ne peut pas être ouverte.'));};
  image.src=url;
 });
}

async function preparePhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file?.type))throw new Error('Choisis une photo JPG, PNG ou WebP.');
 if(file.size>8*1024*1024)throw new Error('La photo dépasse 8 Mo.');
 const image=await imageElement(file);
 const targetWidth=560,targetHeight=604,targetRatio=targetWidth/targetHeight;
 const sourceRatio=image.naturalWidth/image.naturalHeight;
 let sx=0,sy=0,sw=image.naturalWidth,sh=image.naturalHeight;
 if(sourceRatio>targetRatio){
  sw=image.naturalHeight*targetRatio;
  sx=(image.naturalWidth-sw)/2;
 }else{
  sh=image.naturalWidth/targetRatio;
  sy=(image.naturalHeight-sh)/2;
 }
 const canvas=document.createElement('canvas');
 canvas.width=targetWidth;canvas.height=targetHeight;
 const context=canvas.getContext('2d',{alpha:false});
 if(!context)throw new Error('Le traitement de la photo est indisponible sur cet appareil.');
 context.drawImage(image,sx,sy,sw,sh,0,0,targetWidth,targetHeight);
 return canvas.toDataURL('image/jpeg',.84);
}

function DigitalFace(){
 return <svg className="passport-digital-face" viewBox="0 0 220 238" aria-hidden="true" focusable="false">
  <g className="passport-face-grid">
   <path d="M26 40H194M20 72H200M17 104H203M17 136H203M20 168H200M27 200H193"/>
   <path d="M44 22V216M77 16V222M110 13V225M143 16V222M176 22V216"/>
  </g>
  <g className="passport-face-outline">
   <path d="M110 26c-43 0-68 31-65 79 2 32 11 67 29 89 11 14 23 21 36 21s25-7 36-21c18-22 27-57 29-89 3-48-22-79-65-79Z"/>
   <path d="M61 96c12-12 28-17 46-14M159 96c-12-12-28-17-46-14M110 88v62l-15 14 15 6 15-6"/>
   <path d="M80 181c20 13 40 13 60 0"/>
  </g>
  <g className="passport-face-eyes"><path d="M68 111c13-8 26-8 39 0-11 9-26 9-39 0ZM152 111c-13-8-26-8-39 0 11 9 26 9 39 0Z"/></g>
  <g className="passport-face-nodes">
   <circle cx="49" cy="72" r="3"/><circle cx="171" cy="70" r="3"/><circle cx="60" cy="177" r="3"/><circle cx="160" cy="177" r="3"/><circle cx="110" cy="43" r="3"/>
  </g>
  <path className="passport-face-scanline" d="M30 118H190"/>
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
  {mode==='photo'?<img className="passport-portrait-photo" src={appearance.photo} alt={identity?.name?`Photo de ${identity.name}`:'Photo du titulaire'}/>
   :mode==='matrix'?<DirectorMatrixPortrait photo={appearance.photo} name={identity?.name} animated={animated}/>
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
 const digitalMode=director?'matrix':'digital';
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);
 const inputRef=useRef(null);
 const uploadVersion=useRef(0);
 const headingId=useId();
 const fallback=useMemo(()=>fallbackFor(identity),[identity?.userId,identity?.name,identity?.handle]);
 useEffect(()=>()=>{uploadVersion.current+=1;},[]);
 useEffect(()=>{uploadVersion.current+=1;setBusy(false);},[appearance.mode,appearance.photo]);

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
   const saved=setAppearance({photo},appearance);
   if(saved===null)return;
   setMessage(saved?appearance.mode==='matrix'?'Photo enregistrée pour composer ton visage en caractères Matrix bleus. Elle reste sur cet appareil.':'Photo prête. Elle reste stockée uniquement sur cet appareil.':STORAGE_ERROR);
  }catch(error){if(version===uploadVersion.current)setMessage(error.message||'La photo n’a pas pu être préparée.');}
  finally{if(version===uploadVersion.current)setBusy(false);}
 };

 const removePhoto=()=>{
  uploadVersion.current+=1;setBusy(false);
  const saved=setAppearance(current=>({...current,mode:current.mode==='matrix'?'matrix':'initials',photo:''}));
  setMessage(saved?'Photo retirée de cet appareil.':STORAGE_ERROR);
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

  {appearance.mode==='matrix'&&!appearance.photo&&<p className="passport-appearance-message">Ajoute ta photo pour composer ton vrai visage en caractères Matrix. En attendant, ton avatar numérique exclusif est affiché.</p>}
  {(appearance.mode==='photo'||appearance.mode==='matrix')&&<div className="passport-photo-actions">
   <input ref={inputRef} className="passport-photo-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Photo du Passeport" onChange={upload}/>
   <button type="button" className="surface-button" disabled={busy} onClick={()=>inputRef.current?.click()}><ImagePlus size={17}/>{busy?'Préparation…':appearance.photo?'Changer ma photo':'Ajouter ma photo'}</button>
   {appearance.photo&&<button type="button" className="quiet-button" onClick={removePhoto}><Trash2 size={16}/>Retirer</button>}
  </div>}

  <p className="passport-appearance-privacy">La photo est recadrée et compressée dans ton navigateur. Elle reste sur cet appareil et n’est pas envoyée au serveur 3B. {director?'L’effet Matrix utilise les couleurs et la luminosité de l’image, sans reconnaissance faciale.':'Le visage digital est un avatar graphique : aucune donnée biométrique n’est analysée.'}</p>
  {message&&<p className="passport-appearance-message" role="status">{message}</p>}
 </section>;
}
