import {useEffect,useRef,useState} from 'react';
import {Camera,CameraOff,ScanText,Barcode,Volume2,ExternalLink} from 'lucide-react';

export default function UsefulScanner(){
 const video=useRef(null),stream=useRef(null),active=useRef(true);
 const [on,setOn]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [content,setContent]=useState(''),[kind,setKind]=useState('Texte libre');
 const stop=()=>{
  if(stream.current){for(const track of stream.current.getTracks())track.stop();stream.current=null;}
  if(video.current){video.current.pause();video.current.srcObject=null;}
  setOn(false);
 };
 useEffect(()=>{
  active.current=true;
  const hide=()=>{if(document.hidden)stop()};
  document.addEventListener('visibilitychange',hide);
  return()=>{active.current=false;document.removeEventListener('visibilitychange',hide);if(stream.current){for(const track of stream.current.getTracks())track.stop();stream.current=null;}};
 },[]);
 async function openCamera(){
  if(!navigator.mediaDevices?.getUserMedia){setMessage('La caméra n’est pas disponible dans ce navigateur. Tu peux coller du texte ci-dessous.');return;}
  setBusy(true);setMessage('');
  try{
   const feed=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
   if(!active.current||document.hidden){feed.getTracks().forEach(t=>t.stop());return;}
   stream.current=feed;
   if(video.current){video.current.srcObject=feed;try{await video.current.play()}catch{}}
   setOn(true);setMessage('Caméra active uniquement sur cet écran. Aucune image n’est envoyée à 3B.');
  }catch{setMessage('Autorisation refusée ou caméra indisponible. La saisie manuelle reste utilisable.')}
  finally{if(active.current)setBusy(false)}
 }
 async function detect(type){
  const Detector=type==='texte'?window.TextDetector:window.BarcodeDetector;
  if(!on||!video.current){setMessage('Active d’abord la caméra.');return;}
  if(typeof Detector!=='function'){setMessage(type==='texte'?'La reconnaissance de texte n’est pas disponible ici. Recopie ou colle le texte à lire.':'La lecture des codes-barres n’est pas disponible sur cet appareil.');return;}
  setBusy(true);
  try{
   const found=await new Detector().detect(video.current);
   if(!active.current)return;
   const value=found.slice(0,12).map(v=>type==='texte'?(v.rawValue||''):(v.rawValue||'')).filter(Boolean).join('\n').slice(0,2400);
   if(value){setContent(value);setKind(type==='texte'?'Texte reconnu localement':'Code reconnu localement');setMessage('Contenu reconnu. Vérifie-le avant de l’utiliser.');}
   else setMessage('Aucun contenu détecté. Rapproche-toi, augmente la lumière ou saisis le texte.');
  }catch{setMessage('Impossible d’analyser l’image sur cet appareil. Tu peux saisir le contenu manuellement.');}
  finally{if(active.current)setBusy(false)}
 }
 function read(){
  if(!content.trim())return;
  if(!('speechSynthesis'in window)){setMessage('Lecture vocale indisponible dans ce navigateur.');return;}
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(content.slice(0,1800));
  utterance.lang='fr-FR';utterance.rate=.92;
  window.speechSynthesis.speak(utterance);
  setMessage('Lecture demandée à la voix de ton appareil. Son fonctionnement dépend du système.');
 }
 const text=content.trim();
 const translateHref='https://translate.google.com/?sl=auto&tl=fr&text='+encodeURIComponent(text.slice(0,1800))+'&op=translate';
 return <section className="now-feature" aria-labelledby="scanner-utile-title">
  <p className="now-eyebrow">04 / REGARD UTILE</p><h2 id="scanner-utile-title">Comprendre ce qui t’entoure.</h2>
  <p className="now-intro">Lis un texte ou un code avec les fonctions compatibles de ton téléphone. Rien ne démarre sans ton geste.</p>
  <div className="now-camera-area">
   <video ref={video} playsInline muted autoPlay aria-label="Aperçu de la caméra" hidden={!on}/>
   {!on&&<div className="now-camera-placeholder" aria-hidden="true"><Camera size={54} strokeWidth={1}/><span>CAMÉRA À LA DEMANDE</span></div>}
   <div className="now-camera-actions">
    {!on?<button type="button" className="now-primary" disabled={busy} onClick={openCamera}><Camera size={18}/> {busy?'Autorisation…':'Activer la caméra'}</button>:
     <button type="button" className="now-quiet" onClick={stop}><CameraOff size={18}/> Éteindre la caméra</button>}
   </div>
  </div>
  {on&&<div className="now-action-row">
   <button type="button" disabled={busy} className="now-quiet" onClick={()=>detect('texte')}><ScanText size={18}/> Reconnaître un texte</button>
   <button type="button" disabled={busy} className="now-quiet" onClick={()=>detect('code')}><Barcode size={18}/> Lire un code</button>
  </div>}
  <label className="now-field">Texte à comprendre ou à écouter
   <textarea rows={4} maxLength={2400} value={content} onChange={e=>{setContent(e.target.value);setKind('Texte saisi');}} placeholder="Colle ici le texte d’une étiquette, d’un panneau ou d’un document."/>
  </label>
  <div className="now-action-row">
   <button type="button" className="now-primary" disabled={!text} onClick={read}><Volume2 size={18}/> Lire à voix haute</button>
   {text&&<a className="now-quiet" href={translateHref} target="_blank" rel="noreferrer noopener" onClick={()=>window.speechSynthesis?.cancel?.()}><ExternalLink size={18}/> Traduire sur Google</a>}
  </div>
  {text&&<p className="now-discretion">{kind} · La traduction ouvre un site externe et lui transmet uniquement le texte choisi. Ne transmets pas de données confidentielles.</p>}
  <p className="now-message" role="status">{message||'Compatible avec les fonctions du navigateur. Aucun stockage de photo ni reconnaissance IA distante.'}</p>
 </section>;
}
