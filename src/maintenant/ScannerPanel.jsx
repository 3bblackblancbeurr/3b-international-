import {useEffect,useRef,useState} from 'react';
import {Camera,ScanLine,Copy,ArrowRight,ShieldCheck,ImagePlus,Barcode} from 'lucide-react';

const MAX_IMAGE=5*1024*1024;
export default function ScannerPanel({goTo}){
 const [value,setValue]=useState('');
 const [state,setState]=useState('idle');
 const [notice,setNotice]=useState('');
 const [name,setName]=useState('');
 const running=useRef(0);
 useEffect(()=>()=>{running.current+=1;},[]);
 async function inspect(event){
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  const generation=++running.current;
  setState('loading');setValue('');setNotice('');setName(file.name.slice(0,90));
  if(!file.type.startsWith('image/')||file.size>MAX_IMAGE){setState('error');setNotice('Choisis une photo de moins de 5 Mo.');return;}
  if(!('BarcodeDetector' in window)||!('createImageBitmap' in window)){setState('unavailable');setNotice('Lecture des codes non disponible sur cet appareil. Tu peux ouvrir le scanner 3B existant.');return;}
  let bitmap;
  try{
   const detector=new window.BarcodeDetector();
   bitmap=await createImageBitmap(file);
   const found=await detector.detect(bitmap);
   if(generation!==running.current)return;
   const code=found.find(x=>typeof x.rawValue==='string'&&x.rawValue.trim());
   if(!code){setState('empty');setNotice('Aucun code-barres lisible trouvé. Essaie une photo plus nette.');return;}
   setValue(code.rawValue.slice(0,250));
   setState('success');setNotice('Code détecté localement. Aucun renseignement sur le produit n’a été inventé.');
  }catch{if(generation===running.current){setState('error');setNotice('Lecture impossible sur cet appareil ou cette photo.');}}
  finally{bitmap?.close?.();}
 }
 async function copy(){
  try{await navigator.clipboard.writeText(value);setNotice('Code copié.');}
  catch{setNotice('Copie indisponible : sélectionne le code pour le copier.');}
 }
 return <section className="now-pane now-scanner" aria-labelledby="now-scanner-title">
  <p className="now-overline"><ScanLine size={16}/> DÉCOUVRIR · COMPRENDRE · EN GARDANT LE CONTRÔLE</p>
  <h2 id="now-scanner-title">Le monde s’ouvre sous tes yeux.</h2>
  <p className="now-lead">Utilise le scanner du Monde caché pour explorer 3B. Tu peux aussi choisir une photo pour essayer de lire un code-barres directement sur ton téléphone.</p>
  <div className="now-scan-spot" aria-hidden="true"><div className="now-scan-corners"><Barcode size={70} strokeWidth={1.1}/></div></div>
  <div className="now-actions">
   <button type="button" className="now-cta" onClick={()=>goTo('scanner')}>Ouvrir le scanner 3B <Camera size={18}/></button>
   <label className="now-file-button"><ImagePlus size={18}/> Lire un code sur une photo<input type="file" hidden accept="image/*" aria-label="Lire un code-barres depuis une photo" onChange={inspect}/></label>
  </div>
  {name&&<p className="now-small">Photo sélectionnée : {name}</p>}
  {state==='loading'&&<p className="now-notice" role="status">Analyse locale du code…</p>}
  {value&&<div className="now-barcode-result"><span>CODE LU · NON VÉRIFIÉ</span><output>{value}</output><button type="button" onClick={copy}><Copy size={17}/> Copier</button></div>}
  {notice&&<p className={state==='error'?'now-error':'now-notice'} role="status">{notice}</p>}
  <p className="now-disclaimer"><ShieldCheck size={15}/> Cette fonction lit uniquement le contenu brut d’un code compatible. Elle n’identifie pas un produit, n’analyse pas sa composition et ne traduit pas encore les étiquettes. Aucune photo n’est envoyée aux serveurs 3B par cet outil.</p>
 </section>;
}
