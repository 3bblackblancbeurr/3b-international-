import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Camera,ImagePlus,ScanFace,Trash2,Type} from 'lucide-react';
import {passportInitials} from './identity.js';
import './passport-appearance.css';

const MODES=new Set(['initials','digital','photo']);
const EVENT='3b-passport-appearance';
const KEY_PREFIX='3b-passport-appearance-v1:';

const cleanInitials=value=>{
 const normalized=String(value||'')
  .normalize('NFKC')
  .replace(/[^\p{L}\p{N}]/gu,'')
  .slice(0,4);
 return normalized.toLocaleUpperCase('fr-FR');
};

const fallbackFor=identity=>passportInitials(identity);
const storageKey=identity=>identity?.userId?KEY_PREFIX+identity.userId:null;

function normalizeAppearance(value,identity){
 const fallback=fallbackFor(identity);
 const mode=MODES.has(value?.mode)?value.mode:'initials';
 const initials=cleanInitials(value?.initials)||fallback;
 const photo=typeof value?.photo==='string'&&/^data:image\/(jpeg|png|webp);base64,/i.test(value.photo)?value.photo:'';
 return {mode,initials,photo};
}

function readAppearance(identity){
 const key=storageKey(identity);
 if(!key)return normalizeAppearance(null,identity);
 try{return normalizeAppearance(JSON.parse(localStorage.getItem(key)||'null'),identity);}
 catch{return normalizeAppearance(null,identity);}
}

function persistAppearance(identity,next){
 const key=storageKey(identity);
 if(!key)return false;
 try{
  localStorage.setItem(key,JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT,{detail:{key}}));
  return true;
 }catch{return false;}
}

export function usePassportAppearance(identity){
 const identityKey=identity?.userId||'guest';
 const[appearance,setAppearance]=useState(()=>readAppearance(identity));

 useEffect(()=>setAppearance(readAppearance(identity)),[identityKey]);

 useEffect(()=>{
  const key=storageKey(identity);
  if(!key)return;
  const sync=event=>{
   if(event.type==='storage'&&event.key!==key)return;
   if(event.type===EVENT&&event.detail?.key!==key)return;
   setAppearance(readAppearance(identity));
  };
  window.addEventListener('storage',sync);
  window.addEventListener(EVENT,sync);
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener(EVENT,sync);};
 },[identityKey]);

 const update=useCallback(change=>{
  setAppearance(current=>{
   const candidate=normalizeAppearance(typeof change==='function'?change(current):{...current,...change},identity);
   persistAppearance(identity,candidate);
   return candidate;
  });
 },[identityKey]);

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
 if(!file?.type?.startsWith('image/'))throw new Error('Choisis une photo JPG, PNG ou WebP.');
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

 return <div className={['passport-portrait','passport-portrait-'+mode,className].filter(Boolean).join(' ')} data-animated={animated}>
  {mode==='photo'?<img className="passport-portrait-photo" src={appearance.photo} alt={identity?.name?`Photo de ${identity.name}`:'Photo du titulaire'}/>
   :mode==='digital'?<DigitalFace/>
   :<div className="passport-portrait-initials" aria-label={`Monogramme ${initials}`}>{initials}</div>}
  <span className="passport-portrait-scanbar" aria-hidden="true"/>
  <small className="passport-portrait-kind">{mode==='photo'?'PHOTO':mode==='digital'?'BIO DIGITAL':'MONOGRAMME'}</small>
 </div>;
}

export default function PassportAppearanceSettings({identity,compact=false}){
 const[appearance,setAppearance]=usePassportAppearance(identity);
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);
 const inputRef=useRef(null);
 const fallback=useMemo(()=>fallbackFor(identity),[identity?.userId,identity?.name,identity?.handle]);

 if(!identity?.userId)return null;

 const chooseMode=mode=>{
  setAppearance(current=>({...current,mode}));
  setMessage(mode==='photo'&&!appearance.photo?'Ajoute une photo pour activer ce mode.':'Choix enregistré sur cet appareil.');
 };

 const upload=async event=>{
  const file=event.target.files?.[0];
  event.target.value='';
  if(!file)return;
  setBusy(true);setMessage('');
  try{
   const photo=await preparePhoto(file);
   setAppearance(current=>({...current,mode:'photo',photo}));
   setMessage('Photo prête. Elle reste stockée uniquement sur cet appareil.');
  }catch(error){setMessage(error.message||'La photo n’a pas pu être préparée.');}
  finally{setBusy(false);}
 };

 const removePhoto=()=>{
  setAppearance(current=>({...current,mode:'initials',photo:''}));
  setMessage('Photo retirée de cet appareil.');
 };

 return <section className={compact?'passport-appearance passport-appearance-compact':'passport-appearance'} aria-labelledby="passport-appearance-title">
  <div className="passport-appearance-heading">
   <div><p className="eyebrow">IDENTITÉ VISUELLE</p><h2 id="passport-appearance-title">Ton visage sur le Passeport.</h2><p>Choisis ce qui apparaît dans la zone d’identité. Tu peux changer d’avis plus tard.</p></div>
   <PassportPortrait identity={identity} className="passport-appearance-preview"/>
  </div>

  <div className="passport-appearance-modes" role="group" aria-label="Type de portrait du Passeport">
   <button type="button" aria-pressed={appearance.mode==='initials'} onClick={()=>chooseMode('initials')}><Type size={18}/><span><strong>Initiales</strong><small>2 à 4 caractères</small></span></button>
   <button type="button" aria-pressed={appearance.mode==='digital'} onClick={()=>chooseMode('digital')}><ScanFace size={18}/><span><strong>Visage digital</strong><small>Animé bleu Matrix</small></span></button>
   <button type="button" aria-pressed={appearance.mode==='photo'} onClick={()=>chooseMode('photo')}><Camera size={18}/><span><strong>Ma photo</strong><small>Portrait personnel</small></span></button>
  </div>

  {appearance.mode==='initials'&&<label className="passport-initials-field">Initiales affichées
   <input value={appearance.initials} maxLength={4} inputMode="text" autoCapitalize="characters" spellCheck="false"
    onChange={event=>setAppearance(current=>({...current,initials:cleanInitials(event.target.value)||fallback}))}/>
   <small>Par défaut : {fallback}. Maximum 4 lettres ou chiffres.</small>
  </label>}

  {appearance.mode==='photo'&&<div className="passport-photo-actions">
   <input ref={inputRef} className="passport-photo-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload}/>
   <button type="button" className="surface-button" disabled={busy} onClick={()=>inputRef.current?.click()}><ImagePlus size={17}/>{busy?'Préparation…':appearance.photo?'Changer ma photo':'Ajouter ma photo'}</button>
   {appearance.photo&&<button type="button" className="quiet-button" onClick={removePhoto}><Trash2 size={16}/>Retirer</button>}
  </div>}

  <p className="passport-appearance-privacy">La photo est recadrée et compressée dans ton navigateur. Dans cette version, elle reste privée sur cet appareil et n’est pas envoyée automatiquement au serveur 3B.</p>
  {message&&<p className="passport-appearance-message" role="status">{message}</p>}
 </section>;
}
